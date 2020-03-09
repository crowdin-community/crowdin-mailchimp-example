const {createClient} = require('@typeform/api-client');
const crowdin = require('@crowdin/crowdin-api-client').default;
const AdmZip = require('adm-zip');
const axios = require('axios').default;

const helper = require('./helpers');
const catchRejection = helper.catchRejection;

const supportedLanguages = [
  { name: 'Catalan', code: 'ca' },
  { name: 'Chinese (simplified)', code: 'zh-CN' },
  { name: 'Chinese (traditional)', code: 'zh-TW' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English', code: 'en' },
  { name: 'Estonian', code: 'et' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'Greek', code: 'el' },
  { name: 'German', code: 'de' },
  { name: 'Hungarian', code: 'hu' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' },
  { name: 'Norwegian', code: 'no' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Russian', code: 'ru' },
  { name: 'Spanish', code: 'es' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Ukrainian', code: 'uk' }
].map(l => l.code);

function typeformUpdate() {
  return (req, res) => {
    const typeformAPI = createClient({token: res.integration.integrationToken});
    const crowdinApi = new crowdin({
      token: res.crowdin.token,
      organization: res.origin.domain
    });
    const formsTranslations = req.body;
    const projectId = res.origin.context.project_id;

    const translations = Object.keys(formsTranslations).reduce((acc, fileId) =>
      ([...acc, ...formsTranslations[fileId].map(lId =>
        ({fileId: fileId, languageId: lId})
      )]), []
    );

    let filesById = {};
    let fullFormsById = {};
    let integrationFilesList = [];
    typeformAPI.forms.list()
      .then(list => {
        integrationFilesList = list.items;
        return Promise.all(Object.keys(formsTranslations).map( fId => crowdinApi.sourceFilesApi.getFile(projectId, fId)))
      })
      .then( responses => {
        filesById = responses.reduce((acc,fileData) => ({...acc, [`${fileData.data.id}`]: fileData.data}), {});
        return Promise.all(Object.values(filesById).map(({title: formUID}) => typeformAPI.forms.get({uid: formUID})))
      })
      .then( responses => {
        fullFormsById = responses.reduce((acc, form) => ({...acc, [`${form.id}`]: form}), {});
        return Promise.all(translations.map(t => crowdinApi.translationsApi.buildProjectFileTranslation(projectId, t.fileId, {targetLanguageId: t.languageId, exportAsXliff: false})))
      })
      .then( responses => {
        return Promise.all(responses.map(r => axios.get(r.data.url)))
      })
      .then( buffers => {
        const translatedFilesData = buffers.map(b => b.data);
        return Promise.all(translations.map((t, index) => {
          const fileName = `${filesById[t.fileId].name.replace('.json','')}/${t.languageId}/crowdin-translate`;
          const integrationTranslationFile = integrationFilesList.find(f => f.title === fileName);
          if(integrationTranslationFile){
            return typeformAPI.forms.get({uid: integrationTranslationFile.id})
              .then(form => {
                let formToUpdate = form;
                formToUpdate = updateForm(formToUpdate, translatedFilesData[index]);
                  return typeformAPI.forms.update({uid: formToUpdate.id, override: true, data: {...formToUpdate}});
              })
          } else {
            let form = fullFormsById[filesById[t.fileId].title];
            delete form.id;

            form.title = fileName;
            form.settings.language = supportedLanguages.includes(t.languageId) ? t.languageId : 'en';
            form = updateForm(form, translatedFilesData[index]);
            // remove ids to create form ------------------------------>
            // todo: refactor next code to recursive functions
            form.fields.forEach(f => {
              delete f.id;
              if((f.properties || {}).fields){
                f.properties.fields.forEach(field => {
                  delete field.id;
                  if((field.properties || {}).choices){
                    field.properties.choices.forEach(choice => delete choice.id);
                  }
                });
              }
              if((f.properties || {}).choices){
                f.properties.choices.forEach(choice => delete choice.id);
              }
            });

            return typeformAPI.forms.create({ data: {...form} });
          }
        }));
      })
      .then(responses => {
        res.status(200).json(responses);
      })
      .catch(catchRejection('Cant upload files to integration', res));
  }
}

function updateForm(form, translations) {
  Object.keys(translations).forEach(trKey => {
    if(trKey.endsWith('_field')) {
      const txt = translations[trKey];
      const ref = trKey.split('_field')[0];
      const fields = form.fields || [];
      for(let i = 0; i < fields.length; i++) {
        if(fields[i].ref === ref) {
          form.fields[i].title = txt.toString('utf8');
        }
      }
      return;
    }
    if(trKey.endsWith('_button_welcome_screen')) {
      const txt = translations[trKey];
      const ref = trKey.split('_button_welcome_screen')[0];
      const wScreens = form.welcome_screens || [];
      for(let i = 0; i < wScreens.length; i++) {
        if(wScreens[i].ref === ref) {
          form.welcome_screens[i].properties.button_text = txt;
        }
      }
      return;
    }
    if(trKey.endsWith('_welcome_screen')) {
      const txt = translations[trKey];
      const ref = trKey.split('_welcome_screen')[0];
      const wScreens = form.welcome_screens || [];
      for(let i = 0; i < wScreens.length; i++) {
        if(wScreens[i].ref === ref) {
          form.welcome_screens[i].title = txt;
        }
      }
      return;
    }
    if(trKey.endsWith('_button_thankyou_screens')) {
      const txt = translations[trKey];
      const ref = trKey.split('_button_thankyou_screens')[0];
      const tScreens = form.thankyou_screens || [];
      for(let i = 0; i < tScreens.length; i++) {
        if(tScreens[i].ref === ref) {
          form.thankyou_screens[i].properties.button_text = txt;
        }
      }
      return;
    }
    if(trKey.endsWith('_thankyou_screens')) {
      const txt = translations[trKey];
      const ref = trKey.split('_thankyou_screens')[0];
      const tScreens = form.thankyou_screens || [];
      for(let i = 0; i < tScreens.length; i++) {
        if(tScreens[i].ref === ref) {
          form.thankyou_screens[i].title = txt;
        }
      }
      return;
    }
  });
  return form;
}

module.exports = typeformUpdate;