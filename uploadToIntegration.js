const axios = require('axios').default;

const helper = require('./helpers');
const catchRejection = helper.catchRejection;

function integrationUpdate() {
  return (req, res) => {
    const filesTranslations = req.body;

    // prepare files translations object to translations array for using on map and forEach functions
    const translations = Object.keys(filesTranslations).reduce((acc, fileId) =>
      ([...acc, ...filesTranslations[fileId].map(lId =>
        ({fileId: fileId, languageId: lId})
      )]), []
    );

    prepareData(filesTranslations, res)
      .then(preparedData => {
        // Do next for each selected translations
        return Promise.all(translations.map((t, index) => updateIntegrationFile({...preparedData, t, index, res})));
      })
      .then(responses => {
        // all goes well send response back
        res.status(200).json(responses);
      })
      .catch(catchRejection('Cant upload files to integration', res));
  }
}

module.exports = integrationUpdate;

const prepareData = (filesTranslations, res) => {
  return new Promise ((resolve, reject) => {
    const integrationApiClient = res.integrationClient;
    const crowdinApi = res.crowdinApiClient;
    const projectId = res.origin.context.project_id;
    let filesById = {};
    let integrationFilesById = {};
    let integrationFilesList = [];
    // get all campaigns list and store it on integrationFilesList
    integrationApiClient.get({path: `/campaigns`, query: {count: 1000, offset: 0}})
      .then(list => {
        integrationFilesList = list.campaigns;
        // get all selected source files from Crowdin
        return Promise.all(Object.keys(filesTranslations).map( fId => crowdinApi.sourceFilesApi.getFile(projectId, fId)))
      })
      .then( responses => {
        // Store selected files responses on filesById
        filesById = responses.reduce((acc, fileData) => ({...acc, [`${fileData.data.id}`]: fileData.data}), {});
        // Get all selected files source campaigns
        return Promise.all(Object.values(filesById).map(f => integrationApiClient.get({path: `campaigns/${f.name.replace('.html','')}`})))
      })
      .then(integrationFiles => {
        // Store campaigns date on object by id
        integrationFilesById = integrationFiles.reduce((acc, fileData) => ({...acc, [`${fileData.id}`]: fileData}), {});
        // For each selected translation build translation on Crowdin by file id and language
        return Promise.all(translations.map(t =>
          crowdinApi.translationsApi.buildProjectFileTranslation(projectId, t.fileId, {targetLanguageId: t.languageId, exportAsXliff: false})
        ))
      })
      .then( responses => {
        // Get all links for translations build, get date for each link
        return Promise.all(responses.map(r => axios.get(r.data.url)))
      })
      .then( buffers => {
        // Get array of translations content
        const translatedFilesData = buffers.map(b => b.data);
        resolve({filesById, integrationFilesById, integrationFilesList, translatedFilesData})
      })
      .catch(e => reject(e))
  })
};

const updateIntegrationFile = (params) => {
    const {filesById, integrationFilesById, integrationFilesList, translatedFilesData, t, index, res} = params;
    const fileName = `${filesById[t.fileId].title}/${t.languageId}`; // prepare file translation name
    const integrationTranslationFile = integrationFilesList.find(f => f.settings.title === fileName); // Try find translation on
    const integrationApiClient = res.integrationClient;

    if(integrationTranslationFile){
      // We find translation for this file and this language, update it
      return integrationApiClient.put('/campaigns/' + integrationTranslationFile.id + '/content', {html: translatedFilesData[index]})
    } else {
      // We don't find translation for this file and language
      // Get origin file from integration
      let originFile = integrationFilesById[filesById[t.fileId].name.replace('.html','')];
      // Prepare payload to create new campaign
      let payload = {
        type: originFile.type,
        settings: {...originFile.settings, template_id: undefined, title: originFile.settings.title + `/${t.languageId}`},
        variate_settings: originFile.variate_settings,
        tracking: originFile.tracking
      };
      // Create new campaign
      return integrationApiClient.post('/campaigns', payload)
        .then(res => {
          // set current translations as campaign content
          return integrationApiClient.put('/campaigns/' + res.id + '/content', {html: translatedFilesData[index]})
        })
    }
};