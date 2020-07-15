const axios = require('axios');
const Sequelize = require('sequelize');
const crowdin = require('@crowdin/crowdin-api-client').default;

const keys = require('../keys');
const db = require('../db_connect');
const Mapping = require('./mapping');
const { nodeTypes, encryptData, decryptData, catchRejection } = require('../helpers');

// Structure of organization table
const Organization = db.define('organization', {
  uid: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  accessToken: {
    type: Sequelize.STRING(10000),
    allowNull: false,
  },
  refreshToken: {
    type: Sequelize.STRING(10000),
    allowNull: false,
  },
  expire: {
    type: Sequelize.STRING,
    allowNull: false,
  }
});

// Get project data used for showing lists of translations for each file
Organization.getProjectData = () => (req, res) => {
  const projectId = res.origin.context.project_id;
  let languagesById = {};
  // Get all supported languages by Crowdin
  res.crowdinApiClient.languagesApi.listSupportedLanguages(500, 0)
    .then(languages => {
      // Create object where each language is under it id value
      languagesById = languages.data.reduce( (acc, l) => ({...acc, [l.data.id]: l.data}), {});
      // Request to get project data
      return res.crowdinApiClient.projectsGroupsApi.getProject(projectId);
    })
    .then( project => {
      // Convert project.targetLanguagesIds to array with all language object
      let projectTargetLanguages = project.data.targetLanguageIds.map(lId => languagesById[lId]);
      // Connect projectTargetLanguages to project response and send
      res.json({...project.data, projectTargetLanguages})
    })
    .catch(catchRejection('Cant fetch project data', res, req));
};

Organization.getFileProgress = () => (req, res) => {
  const projectId = res.origin.context.project_id;
  // exact request to get progress
  res.crowdinApiClient.translationStatusApi.getFileProgress(projectId, req.body.fileId)
    .then( progress =>
      res.json({ // Send back object with fileId as key and progress.data without useless data nesting as value
        [`${req.body.fileId}`]: progress.data.map(({data}) => ({...data}))
      })
    )
    .catch(catchRejection('Cant fetch progress for file', res, req));
};

Organization.getProjectFiles = () => (req, res) => {
  let files = [];
  const projectId = res.origin.context.project_id;
// -------------------- Start get files with mapping ---------------------------------
  Mapping.getFilesByDomainProjectId(res)
    .then(uploadedFiles => {
      if(!uploadedFiles || !uploadedFiles.length){
        // We haven't uploaded files yet, it's ok return empty array
        return new Promise(resolve => resolve([]));
      }
      // Get each uploaded file with Crowdin API
      return Promise.all(uploadedFiles.map(f =>
        res.crowdinApiClient.sourceFilesApi.getFile(projectId, f.crowdinFileId)
          .catch(e => ({})) // it's ok if we can't get some file, it can be removed from Crowdin
      ))
    })
    .then(filesRes => { // Get array responses with files
      files = filesRes.filter(fr => !!fr.data) // Exclude responses without file data
        .map(({data}) => data) // Remove useless nesting
        .map(({directoryId, branchId, name, title, ...rest}) => ({
          // Normalize file data to UI requirements
          ...rest,
          name: title || name,
          title: title ? name : undefined,
          node_type: nodeTypes.FILE,
          parent_id: '0' // all uploaded files come to root directory
        }));
      res.json(files);
    })
    .catch(catchRejection('Cant fetch data from Crowdin', res, req))
// --------------------- End get files with mapping -------------------------------
// --------------------  Start get all files without mapping from Crowdin ---------
    // Promise.all([
    //   res.crowdinApiClient.sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500),
    //   res.crowdinApiClient.sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500),
    //   res.crowdinApiClient.sourceFilesApi.listProjectBranches(projectId, undefined, 500)
    // ])
    //   .then(responses => {
    //     files.push(...responses[0].data.map(({data}) => ({...data, node_type: '0'})));
    //     files.push(...responses[1].data.map(({data}) => data));
    //     files.push(...responses[2].data.map(({data}) => ({...data, node_type: '2'})));
    //     res.json(files.map(({directoryId, branchId, ...rest}) => ({
    //       ...rest,
    //       parent_id: directoryId || branchId || 0
    //     })));
    //   })
    //   .catch(e => reject('Cant fetch data from Crowdin', e));
// --------------------- End get all files from Crowdin without mapping --------------
};

Organization.install = () => (req, res) => {
  let client = null;
  // Try find record with organization if it was installed some time before
  Organization.findOne({where: {uid: `${req.body.domain || req.body.organizationId}`}})
    .then(organization => {
      client = organization;
      let payload = {
        grant_type: 'authorization_code',
        client_id: keys.crowdinClientId,
        client_secret: keys.crowdinClientSecret,
        code: req.body.code,
      };

      // Try get code for authentication from Crowdin
      return axios.post(keys.crowdinAuthUrl, payload)
    })
    .then(resp => {
      const params = {
        uid: `${req.body.domain || req.body.organizationId}`,
        accessToken: encryptData(resp.data.access_token),
        refreshToken: encryptData(resp.data.refresh_token),
        expire: new Date().getTime()/1000 + +resp.data.expires_in
      };
      // If we find organization update it records else create new one
      if(!!client){
        return client.update(params);
      } else {
        return Organization.create(params);
      }
    })
    .then(organization => {
      if(!!organization){ // If we successfully update or create organization record
        res.status(204).send();
      } else {
        catchRejection('Cant install application', res, req)();
      }
    })
    .catch(catchRejection('Cant install application', res, req));
};

Organization.getOrganization = (res) => {
  return new Promise ( (resolve, reject) => {
    // Try find organization with response domain value
    Organization.findOne({where: {uid: res.origin.domain}})
      .then((organization) => {
        if(!organization) { //  IF we can't find organization exit
          return reject('Can\'t find organization by id');
        }
        // Check has organization record valid not expired token
        const isExpired = +organization.expire < +new Date().getTime() / 1000;
        if(!isExpired) {
          // If token is valid we init crowdin api client with credentials and connect to response. Exit
          res.crowdinToken = decryptData(organization.accessToken);
          res.crowdinApiClient = new crowdin({
            token: decryptData(organization.accessToken),
            ...((res.origin || {}).isCrowdin) ? {} : { organization: organization.uid }
          });
          resolve();
        } else {
          // If token expired prepare new request to get new valid token
          let payload = {
            grant_type: 'refresh_token',
            client_id: keys.crowdinClientId,
            client_secret: keys.crowdinClientSecret,
            refresh_token: decryptData(organization.refreshToken),
          };
          axios.post(keys.crowdinAuthUrl, payload)
            .then(response => {
              // extract new tokens from response, prepare object to update organization record in DB
              let params = {
                refreshToken: encryptData(response.data.refresh_token),
                accessToken: encryptData(response.data.access_token),
                expire: (new Date().getTime() / 1000) + response.data.expires_in
              };
              // update record
              return organization.update(params)
            })
            .then(organization => {
              // Init Crowdin API client, connect to response and exit
              res.crowdinToken = decryptData(organization.accessToken);
              res.crowdinApiClient = new crowdin({
                token: decryptData(organization.accessToken),
                ...((res.origin || {}).isCrowdin) ? {} : { organization: organization.uid }
              });
              resolve();
            })
            .catch(e => reject('Can\'t renew access token', e));
        }
      })
      .catch(e => reject('Can\'t find organization by id', e))
  });
};

module.exports = Organization;