const axios = require('axios');
const { PatchOperation } = require('@crowdin/crowdin-api-client');

const Mapping = require('./models/mapping');
const { emitEvent } = require('./sockets');
const { nodeTypes } = require('./helpers');

function crowdinUpdate() {
  return (req, res) => {
    const crowdinApi = res.crowdinApiClient;
    const fileIds = req.body.filter(f => f.node_type === nodeTypes.FILE);
    const projectId = res.origin.context.project_id;

    let integrationFiles = [];

    // Get content for all selected integration files
    Promise.all(fileIds.map(fid => res.ai.get(`/${fid.parent_id}/${fid.id}/content`).catch(e => ({}))))
      .then((values) => {
        // Prepare responses for better use in next function
        integrationFiles = values.filter(f => f.data).map(
          (f, index) => ({
            ...f.data,
            content: f.data.archive_html || f.data.html,
            title: fileIds[index].name || (fileIds[index].settings || {}).name || fileIds[index].id,
            name: fileIds[index].id,
          })
        );
        // Upload all integration file content to Crowdin storage
        return Promise.all(
          integrationFiles.map(f => crowdinApi.uploadStorageApi.addStorage(`${f.name}.html`, `${f.content}`))
        )
      })
      .then(storageIds => {
        // Prepare added files from returned storageIds and integration files
        let addedFiles = storageIds.map((f, i) =>
          ({
            ...f.data,
            title: integrationFiles[i].title,
            integrationFileId: integrationFiles[i].name,
            integrationUpdatedAt: fileIds[i].create_time || Date.now(),
          })
        );

        // for each added file do next
        return Promise.all(addedFiles.map(f => {
          // Try find file on mapping table
          return Mapping.findOne({
            where: {
              projectId: projectId, 
              domain: res.origin.domain,
              integrationFileId: f.integrationFileId
            }
          })
            .then(file => {
              if(!!file) {
                // Find file try get it
                return crowdinApi.sourceFilesApi.getFile(projectId, file.crowdinFileId)
                  .then(() => {
                    return axios({
                      method: 'patch',
                      url: `${crowdinApi.uploadStorageApi.url}/projects/${projectId}/files/${file.crowdinFileId}`,
                      data: [{value: `${f.title}`, op:PatchOperation.REPLACE , path: '/title'}],
                      headers: {
                        Authorization: `Bearer ${res.crowdinToken}`,
                      }
                    });
                  })
                  .then(() => {
                    // Try update file on crowdin
                    return crowdinApi.sourceFilesApi.updateOrRestoreFile(projectId, file.crowdinFileId, {storageId: f.id})
                  })
                  .then(response => {
                    // Update mapping record on DB
                    return file.update({crowdinUpdatedAt: response.data.updatedAt, integrationUpdatedAt: f.integrationUpdatedAt})
                  })
                  .catch(() => {
                    // Can't get file from crowdin, looks like it removed, try create new one
                    return crowdinApi.sourceFilesApi.createFile(projectId, {
                      storageId: f.id,
                      name: f.fileName,
                      title: f.title
                    })
                      .then(response => {
                        // update mapping record on DB
                        return file.update({
                          integrationUpdatedAt: f.integrationUpdatedAt,
                          crowdinUpdatedAt: response.data.updatedAt,
                          crowdinFileId: response.data.id,
                        })
                      })
                  });
              } else {
                // Can't find file on mapping table create new on Crowdin
                return crowdinApi.sourceFilesApi.createFile(projectId, {
                  storageId: f.id,
                  name: f.fileName || 'no file name',
                  title: f.title || 'no title'
                })
                  .then(response => {
                    // Create new record on mapping table
                    return Mapping.create({
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
        // all goes good rend response back
        if(!res.headersSent) {
          return res.json(responses);
        }

        emitEvent({
          error: false,
          refreshCrowdin: true,
          message: 'Async files upload to Crowdin finished',
        }, res);
      })
      .catch(e => {
        // something goes wrong, send exact error back
        return res.status(500).send(e);
      });
  }
}

module.exports = crowdinUpdate;
