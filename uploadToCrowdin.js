const {createClient} = require('@typeform/api-client');
const crowdin = require('@crowdin/crowdin-api-client').default;
const _ = require('lodash');

function crowdinUpdate(db) {
  return (req, res) => {
    const typeformAPI = createClient({token: res.integration.integrationToken});
    const crowdinApi = new crowdin({
      token: res.crowdin.token,
      organization: res.origin.domain
    });
    const fileIds = req.body;
    const projectId = res.origin.context.project_id;

    let integrationFiles = [];
    let integrationFilesList = {};

    typeformAPI.forms.list()
      .then(list => integrationFilesList = list.items.reduce((acc, item) => ({...acc, [item.id]: {...item}}), {}))
      .catch(e => console.log('cant fetch forms list', e));

    Promise.all(fileIds.map(fid => typeformAPI.forms.get({uid: fid})))
      .then((values) => {
        integrationFiles = values;
        return Promise.all(
          values.map(f => crowdinApi.uploadStorageApi.addStorage(`${f.id}.json`, JSON.stringify( getTranslatableStrings(f))))
        )
      })
      .then(storageIds => {
        addedFiles = storageIds.map((f, i) =>
          ({
            ...f.data,
            title: integrationFiles[i].title,
            integrationFileId: integrationFiles[i].id,
            integrationUpdatedAt: integrationFilesList[integrationFiles[i].id].last_updated_at
          })
        );

        return Promise.all(addedFiles.map(f => {
          return db.mapping.findOne({where: {projectId: projectId, integrationFileId: f.integrationFileId}})
            .then(file => {
              if(!!file) {
                return crowdinApi.sourceFilesApi.getFile(projectId, file.crowdinFileId)
                  .then(() => {
                    return crowdinApi.sourceFilesApi.updateOrRestoreFile(projectId, file.crowdinFileId, {storageId: f.id})
                  })
                  .then(response => {
                    return file.update({crowdinUpdatedAt: response.data.updatedAt, integrationUpdatedAt: f.integrationUpdatedAt})
                  })
                  .catch(() => {
                    console.log(f);

                    return crowdinApi.sourceFilesApi.createFile(projectId, {
                      storageId: f.id,
                      name: f.fileName,
                      title: f.title
                    })
                      .then(response => {
                        return file.update({
                          integrationUpdatedAt: f.integrationUpdatedAt,
                          crowdinUpdatedAt: response.data.updatedAt,
                          crowdinFileId: response.data.id,
                        })
                      })
                  });
              } else {
                return crowdinApi.sourceFilesApi.createFile(projectId, {
                  storageId: f.id,
                  name: f.fileName,
                  title: f.title
                })
                  .then(response => {
                    return db.mapping.create({
                      domain: res.origin.domain,
                      projectId: projectId,
                      integrationUpdatedAt: f.integrationUpdatedAt,
                      crowdinUpdatedAt: response.data.updatedAt,
                      integrationFileId: f.integrationFileId,
                      crowdinFileId: response.data.id,
                    })
                  })
              }
            })
        }))
      })
      .then(responses => {
        res.json(responses);
      })
      .catch(e => {
        return res.status(500).send(e);
      });
  }
}

function getTranslatableStrings(form) {
  let result = {};
  if(form.fields) {
    form.fields
      .filter(field => field.ref && field.title)
      .forEach(field => {
        result[field.ref + '_field'] = field.title;
      });
  }
  if(form.welcome_screens) {
    form.welcome_screens
      .filter(wScreen => wScreen.ref && wScreen.title)
      .forEach(wScreen => {
        result[wScreen.ref + '_welcome_screen'] = wScreen.title;
        if(wScreen.properties && wScreen.properties.button_text) {
          result[wScreen.ref + '_button_welcome_screen'] = wScreen.properties.button_text;
        }
      });
  }
  if(form.thankyou_screens) {
    form.thankyou_screens
      .filter(tScreen => tScreen.ref && tScreen.title)
      .forEach(tScreen => {
        result[tScreen.ref + '_thankyou_screens'] = tScreen.title;
        if(tScreen.properties && tScreen.properties.button_text) {
          result[tScreen.ref + '_button_thankyou_screens'] = tScreen.properties.button_text;
        }
      });
  }
  return result;
}

module.exports = crowdinUpdate;