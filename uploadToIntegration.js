const axios = require('axios').default;

const helper = require('./helpers');
const catchRejection = helper.catchRejection;

function integrationUpdate() {
  return (req, res) => {
    const integrationApiClient = res.integrationClient;
    const crowdinApi = res.crowdinApiClient;
    const filesTranslations = req.body;
    const projectId = res.origin.context.project_id;

    const translations = Object.keys(filesTranslations).reduce((acc, fileId) =>
      ([...acc, ...filesTranslations[fileId].map(lId =>
        ({fileId: fileId, languageId: lId})
      )]), []
    );

    let filesById = {};
    let integrationFilesById = {};
    let integrationFilesList = [];

    integrationApiClient.get({path: `/campaigns`, query: {count: 1000, offset: 0}})
      .then(list => {
        integrationFilesList = list.campaigns;
        return Promise.all(Object.keys(filesTranslations).map( fId => crowdinApi.sourceFilesApi.getFile(projectId, fId)))
      })
      .then( responses => {
        filesById = responses.reduce((acc, fileData) => ({...acc, [`${fileData.data.id}`]: fileData.data}), {});
        return Promise.all(Object.values(filesById).map(f => integrationApiClient.get({path: `campaigns/${f.name.replace('.html','')}`})))
      })
      .then(integrationFiles => {
        integrationFilesById = integrationFiles.reduce((acc, fileData) => ({...acc, [`${fileData.id}`]: fileData}), {});
        return Promise.all(translations.map(t =>
          crowdinApi.translationsApi.buildProjectFileTranslation(projectId, t.fileId, {targetLanguageId: t.languageId, exportAsXliff: false})
        ))
      })
      .then( responses => {
        return Promise.all(responses.map(r => axios.get(r.data.url)))
      })
      .then( buffers => {
        const translatedFilesData = buffers.map(b => b.data);
        return Promise.all(translations.map((t, index) => {
          const fileName = `${filesById[t.fileId].title}/${t.languageId}`;
          const integrationTranslationFile = integrationFilesList.find(f => f.settings.title === fileName);
          if(integrationTranslationFile){
            return integrationApiClient.put('/campaigns/' + integrationTranslationFile.id + '/content', {html: translatedFilesData[index]})
          } else {
            let originFile = integrationFilesById[filesById[t.fileId].name.replace('.html','')];
            var payload = {
              type: originFile.type,
              settings: {...originFile.settings, template_id: undefined, title: originFile.settings.title + `/${t.languageId}`},
              variate_settings: originFile.variate_settings,
              tracking: originFile.tracking
            };

            return integrationApiClient.post('/campaigns', payload)
              .then(res => {
                return integrationApiClient.put('/campaigns/' + res.id + '/content', {html: translatedFilesData[index]})
              })
          }
        }));
      })
      .then(responses => {
        res.status(200).json(responses);
      })
      .catch(catchRejection('Cant upload files to integration', res));
  }
}

module.exports = integrationUpdate;