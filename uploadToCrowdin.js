
function crowdinUpdate(db) {
  return (req, res) => {
    const mailChimpApi = res.integrationClient;
    const crowdinApi = res.crowdinApiClient;
    const fileIds = req.body;
    const projectId = res.origin.context.project_id;

    let integrationFiles = [];

    Promise.all(fileIds.map(fid => mailChimpApi.get({path: `/${fid.parent_id}/${fid.id}/content`})))
      .then((values) => {
        integrationFiles = values.map(
          (f, index) => ({
            ...f,
            title: fileIds[index].name || (fileIds[index].settings || {}).name || fileIds[index].id,
            name: fileIds[index].id,
          })
        );
        return Promise.all(
          integrationFiles.map(f => crowdinApi.uploadStorageApi.addStorage(`${f.name}.html`, `${f.archive_html || f.html}`))
        )
      })
      .then(storageIds => {
        let addedFiles = storageIds.map((f, i) =>
          ({
            ...f.data,
            title: integrationFiles[i].title,
            integrationFileId: integrationFiles[i].name,
            integrationUpdatedAt: fileIds[i].create_time || Date.now(),
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
                  name: f.fileName || 'no file name',
                  title: f.title || 'no title'
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

module.exports = crowdinUpdate;