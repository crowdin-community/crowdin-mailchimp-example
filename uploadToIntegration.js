const axios = require('axios').default;

const { emitEvent } = require('./sockets');
const { catchRejection } = require('./helpers');

function integrationUpdate() {
  return (req, res) => {
    const filesTranslations = req.body;

    // prepare files translations object to translations array for using on map and forEach functions
    const translations = Object.keys(filesTranslations).reduce((acc, fileId) =>
      ([...acc, ...filesTranslations[fileId].map(lId =>
        ({fileId: fileId, languageId: lId})
      )]), []
    );

    prepareData(filesTranslations, translations, res)
      .then(preparedData => {
        // Do next for each selected translations
        return Promise.all(translations.map((t, index) => updateIntegrationFile({...preparedData, t, index, res})));
      })
      .then(responses => {
        // all goes well send response back
        if(!res.headersSent) {
          return res.status(200).json(responses.map(r => r.data));
        }

        emitEvent({
          error: false,
          refreshIntegration: true,
          message: 'Async files upload to MailChimp finished',
        }, res);
      })
      .catch(catchRejection('Cant upload files to integration', res, req));
  }
}

module.exports = integrationUpdate;

const prepareData = (filesTranslations, translations, res) => {
  return new Promise ((resolve, reject) => {
    const crowdinApi = res.crowdinApiClient;
    const projectId = res.origin.context.project_id;
    let filesById = {};
    let integrationFilesById = {};
    let integrationFilesList = [];
    // get all campaigns list and store it on integrationFilesList
    res.ai.get(`/campaigns?count=1000&offset=0`)
      .then(list => {
        integrationFilesList = list.data.campaigns;
        // get all selected source files from Crowdin
        return Promise.all(Object.keys(filesTranslations).map( fId => crowdinApi.sourceFilesApi.getFile(projectId, fId)))
      })
      .then( responses => {
        // Store selected files responses on filesById
        filesById = responses.reduce((acc, fileData) => ({...acc, [`${fileData.data.id}`]: fileData.data}), {});
        // Get all selected files source campaigns
        return Promise.all(Object.values(filesById).map(f => res.ai.get(`campaigns/${f.name.replace('.html','')}`).catch(e => ({}))))
      })
      .then(integrationFiles => {
        // Store campaigns date on object by id
        integrationFilesById = integrationFiles.filter(f => !!f.data).reduce((acc, fileData) => ({...acc, [`${fileData.data.id}`]: fileData.data}), {});
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
    if(!integrationFilesById[filesById[t.fileId].name.replace('.html','')]){
      return {data: null};
    }
    const integrationTranslationFile = integrationFilesList.find(f => f.settings.title === fileName); // Try find translation on

    if(integrationTranslationFile){
      // We find translation for this file and this language, update it
      return res.ai({
        method: 'PUT',
        url: '/campaigns/' + integrationTranslationFile.id + '/content',
        data: {html: translatedFilesData[index]}
      })
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
      return res.ai({
        method: 'POST',
        url: '/campaigns/',
        data: {...payload}
      })
        .then(result => {
          // set current translations as campaign content
          return res.ai({
            method: 'PUT',
            url: '/campaigns/' + result.data.id + '/content',
            data: {html: translatedFilesData[index]}
          })
        })
    }
};