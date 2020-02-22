const { createClient } = require('@typeform/api-client');
const crowdin = require('@crowdin/crowdin-api-client').default;
const _ = require('lodash');

function crowdinUpdate() {
    return async (req, res) => {
        try {
            const typeformAPI = createClient({ token: res.integration.integrationToken });
            const crowdinApi = new crowdin({
                token: res.crowdin.token,
                organization: res.origin.domain
            });
            const formIds = req.body;
            const projectId = res.origin.context.project_id;

            const projectFiles = await crowdinApi.sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500);
            const projecctFilesMap = projectFiles.data.map(f => f.data);
            const resp = await typeformAPI.forms.list();
            const forms = resp.items;
            const filteredForms = forms.filter(form => formIds.includes(form.id));
            if (filteredForms.length === 0) {
                res.send({ success: false, message: 'no forms' });
                return;
            }
            for (let i = 0; i < filteredForms.length; i++) {
                const form = filteredForms[i];
                const formId = form.id;
                const fullForm = await typeformAPI.forms.get({ uid: formId });
                const translatableForm = getTranslatableStrings(fullForm);

                const fileName = `${formId}.json`;
                const fileTitle = form.title;

                const storage = await crowdinApi.uploadStorageApi.addStorage(`file_${formId}.json`, JSON.stringify(translatableForm));
                const storageId = storage.data.id;

                const file = projecctFilesMap.find(f => f.name === fileName);

                if (!!file) {
                    console.log(`Updating existing file for page ${fileTitle}`);
                    await crowdinApi.sourceFilesApi.updateOrRestoreFile(projectId, file.id, { storageId });
                } else {
                    console.log(`Creating new file for page ${fileTitle}`);
                    await crowdinApi.sourceFilesApi.createFile(projectId, {
                        storageId: storageId,
                        name: fileName,
                        title: fileTitle
                    });
                }
            }
            res.send({ success: true });
        } catch (error) {
            res.send({ success: false });
        }
    };
}

/* function crowdinUpdate() {
    return (req, res) => {
        return new Promise ((resolve, reject) => {
            const typeformAPI = createClient({ token: res.integration.integrationToken });
            const crowdinApi = new crowdin({
                token: res.crowdin.token,
                organization: res.origin.domain
            });
            const fileIds = req.body;
            const projectId = res.origin.context.project_id;
            let mappedFiles = [];
            let integrationFiles = [];

            crowdinApi.sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500)
            .then( files => {
                mappedFiles = files.data.map(f => f.data);
                return typeformAPI.forms.list(); 
            })
            .then( response => {
                integrationFiles = response.items;
            
                Promise.all(fileIds.map(fid => typeformAPI.forms.get({ uid: fid })))
                .then((values) => {
                    return Promise.all(
                        values.map( f =>  crowdinApi.uploadStorageApi.addStorage(`${f.title}.json`, JSON.stringify(getTranslatableStrings(f))))
                    )
                })
                .then(storageIds => {
                    console.log(storageIds, integrationFiles);
                    addedFiles = storageIds.map((f, i) => 
                        ({...f.data, integrationFileId: integrationFiles[i].id, integrationUpdatedAt: integrationFiles[i].last_updated_at})
                    ); 
                    let uploadedFiles = [];
                    try {
                        uploadedFiles = JSON.parse(res.integration.mappedFiles);
                    } catch (e) {
                        uploadedFiles = [];
                    }

                    console.log(mappedFiles);  
                    Promise.all(addedFiles.map(f => {
                        file = mappedFiles.find(u => u.title === f.integrationFileId)
                        if(!!file){
                            console.log('try update');
                            return crowdinApi.sourceFilesApi.updateOrRestoreFile(projectId, file.id, { storageId: f.id })
                        } else {
                            return crowdinApi.sourceFilesApi.createFile(projectId, {
                                storageId: f.id,
                                name: `${f.integrationFileId}.json`,
                                title: f.fileName
                            })
                        }
                    }))
                    .then(responses => {
                        let arr = JSON.stringify(_.unionBy(addedFiles.map(f => ({...f, crowdinUpdatedAt: new Date().getTime()})), uploadedFiles, 'integrationFileId'));
                        res.integration.update({mapingFiles: arr});
                        console.log('db updated', response);
                        res.status(400).json(responses);
                        // wrire with crowdin fileId to db.\
                        // res 200 send
                        resolve();
                    })
                    .catch( e => {
                        console.log(e); 
                        // drop this when api fixes
                        let arr = JSON.stringify(_.unionBy(addedFiles.map(f => ({...f, crowdinUpdatedAt: new Date().getTime()})), uploadedFiles, 'integrationFileId'));
                        res.integration.update({mapingFiles: arr});
                        console.log('db updated');
                        res.status(500).json(e);
                        reject();
                    });
                });
            })
            .catch( e => {
                console.log('some goesf wron g', e);  
                reject();
            }); 
        });
    } 
};
 */
function getTranslatableStrings(form) {
    let result = {};
    if (form.fields) {
        form.fields
            .filter(field => field.ref && field.title)
            .forEach(field => {
                result[field.ref + '_field'] = field.title;
            });
    }
    if (form.welcome_screens) {
        form.welcome_screens
            .filter(wScreen => wScreen.ref && wScreen.title)
            .forEach(wScreen => {
                result[wScreen.ref + '_welcome_screen'] = wScreen.title;
                if (wScreen.properties && wScreen.properties.button_text) {
                    result[wScreen.ref + '_button_welcome_screen'] = wScreen.properties.button_text;
                }
            });
    }
    if (form.thankyou_screens) {
        form.thankyou_screens 
            .filter(tScreen => tScreen.ref && tScreen.title)
            .forEach(tScreen => {
                result[tScreen.ref + '_thankyou_screens'] = tScreen.title;
                if (tScreen.properties && tScreen.properties.button_text) {
                    result[tScreen.ref + '_button_thankyou_screens'] = tScreen.properties.button_text;
                }
            });
    }
    return result;
}

module.exports = crowdinUpdate;