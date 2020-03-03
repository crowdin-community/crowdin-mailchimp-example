const axios = require('axios');
const config = require('./../config');
const crowdin = require('@crowdin/crowdin-api-client').default;

module.exports = function(sequelize, DataTypes) {
  const Organization = sequelize.define('organization', {
    uid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    accessToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expire: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  });

  Organization.getProjectData = function(res) {
    return new Promise ((resolve, reject) => {
      const crowdinApi = new crowdin({
        token: res.crowdin.token,
        organization: res.origin.domain,
      });
      let files = [];
      const projectId = res.origin.context.project_id;
      Promise.all([
        crowdinApi.sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500),
        crowdinApi.sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500),
        crowdinApi.sourceFilesApi.listProjectBranches(projectId, undefined, 500)
      ])
        .then(responses => {
          files.push(...responses[0].data.map(({data}) => ({...data, node_type: '0'})));
          files.push(...responses[1].data.map(({data}) => data));
          files.push(...responses[2].data.map(({data}) => ({...data, node_type: '2'})));
          resolve(files.map(({directoryId, branchId, ...rest}) => ({
            ...rest,
            parent_id: directoryId || branchId || 0
          })));
        })
        .catch(e => reject('Cant fetch data from Crowdin', e));
    });
  };

  Organization.install = function(req, res) {
    return new Promise ( (resolve, reject) => {
      let client = null;
      Organization.findOne({where: {uid: req.body.domain}})
        .then(organization => {
          client = organization;
          let payload = {
            grant_type: 'authorization_code',
            client_id: config.authentication.clientId,
            client_secret: config.clientSecret,
            code: req.body.code,
          };
          // todo: do not forget change this line before production!!!
          return axios.post(process.env.NODE_ENV === 'production' ? 'https://accounts.crowdin.com/oauth/token' : 'http://accounts.yevhen.dev.crowdin.com/oauth/token', payload)
        })
        .then(resp => {
          const params = {
            uid: req.body.domain,
            accessToken: resp.data.access_token,
            refreshToken: resp.data.refresh_token,
            expire: new Date().getTime()/1000 + +resp.data.expires_in
          };
          if(!!client){
            return client.update(params);
          } else {
            return Organization.create(params);
          }
        })
        .then(organization => {
          if(!!organization){
            resolve();
          } else {
            reject('Cant update/create organization');
          }
        })
        .catch(e => reject('Cant install application', e));
    });
  };

  Organization.getOrganization = function(res) {
    return new Promise ( (resolve, reject) => {
      Organization.findOne({where: {uid: res.origin.domain}})
        .then((organization) => {
          if(!organization) {
            return reject('Can\'t find organization by id');
          }
          const isExpired = +organization.expire < +new Date().getTime() / 1000;
          if(!isExpired) {
            resolve(organization);
          } else {
            let payload = {
              grant_type: 'refresh_token',
              client_id: config.authentication.clientId,
              client_secret: config.clientSecret,
              refresh_token: organization.refreshToken,
            };
            axios.post(process.env.NODE_ENV === 'production' ? 'https://accounts.crowdin.com/oauth/token' : 'http://accounts.yevhen.dev.crowdin.com/oauth/token', payload)
              .then(response => {
                let params = {
                  refreshToken: response.data.refresh_token,
                  accessToken: response.data.access_token,
                  expire: (new Date().getTime() / 1000) + response.data.expires_in
                };
                return organization.update(params)
              })
              .then(organization => resolve(organization))
              .catch(e => reject('Can\'t renew access token', e));
          }
        })
        .catch(e => reject('Can\'t find organization by id', e))
    });
  };

  return Organization;
};