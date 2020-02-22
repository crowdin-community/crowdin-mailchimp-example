const { createClient } = require('@typeform/api-client');
const crowdin = require('@crowdin/crowdin-api-client').default;
const AdmZip = require('adm-zip');
const axios = require('axios').default;

// function typeformUpdate() {
//     return (req, res) => {
//         return new Promise ((resolve, reject) => {
//             const typeformAPI = createClient({ token: res.integration.integrationToken });
//             const crowdinApi = new crowdin({
//                 token: res.crowdin.token,
//                 organization: res.origin.domain
//             });
//             const formIds = req.body;
//             const projectId = res.origin.context.project_id;
//             let forms = [];
//             typeformAPI.forms.list()
//             .then(response => {
//                 forms = response.items;
//                 return new Promise ((resolve, reject) => {
//                     crowdinApi.translationsApi.buildProject(projectId, {})
//                     .then(build => {
//                         let finished = false;
//                         while (!finished) {
//                             crowdinApi.translationsApi.checkBuildStatus(projectId, build.data.id)
//                             .then(status => {
//                                 finished = status.data.status === 'finished';
//                                 console.log("Still checking build");
//                             })
//                             .catch( e => { console.log(e); res.status(500).send(); reject(); })
//                         }
//                         resolve(build);
//                     })
//                     .catch( e => {
//                         console.log(e);
//                         res.status(500).send();
//                         reject();
//                     })
//                 })
//             })
//             .then( build => {
//                 return crowdinApi.translationsApi.downloadTranslations(projectId, build.data.id)
//             })
//             .then( downloadLink => {
//                 return axios.get(downloadLink.data.url, { responseType: 'arraybuffer' })
//             })
//             then( response => {
//                 const zip = new AdmZip(response.data);
//                 const zipEntries = zip.getEntries();
//             })
//         })
//     }
// }

function typeformUpdate() {
    return async (req, res) => {
        try {
            const typeformAPI = createClient({ token: res.integration.integrationToken });
            const crowdinApi = new crowdin({
                token: res.crowdin.token,
                organization: res.origin.domain
            });
            const formIds = req.body;
            const projectId = res.origin.context.project_id;

            let forms = await typeformAPI.forms.list();
            forms = forms.items;

            const build = await crowdinApi.translationsApi.buildProject(projectId, {});

            let finished = false;

            while (!finished) {
                const status = await crowdinApi.translationsApi.checkBuildStatus(projectId, build.data.id);
                finished = status.data.status === 'finished';
                console.log("Still checking build");
            }

            console.log('Built well');

            const downloadLink = await crowdinApi.translationsApi.downloadTranslations(projectId, build.data.id);

            const resp = await axios.get(downloadLink.data.url, { responseType: 'arraybuffer' });
            const zip = new AdmZip(resp.data);
            const zipEntries = zip.getEntries();
            
            for (let i = 0; i < formIds.length; i++) {
                const formId = formIds[i];
                const entries = zipEntries.filter(entry => {
                    const parst = entry.entryName.split('/');
                    if (parst.length === 2) {
                        return entry.entryName.split('/')[1] === `${formId}.json`;
                    }
                    return false;
                });

                console.log('here', entries, formIds, zipEntries.map(e => e.entryName.split('/')[1]));

                const promises = entries.map(async entry => {
                    const translationLanguage = entry.entryName.split('/')[0];
                    const translations = JSON.parse(entry.getData().toString('utf8'));

                    let form = await typeformAPI.forms.get({ uid: formId });

                    form.title = `${form.title} [${translationLanguage}]lang`;

                    let formToUpdate = forms.find(f => f.title === form.title);

                    if (!formToUpdate) {
                        delete form.id;
                        form = updateForm(form, translations, true);

                        form.settings.language = translationLanguage;

                        console.log(`Creating form ${form.title}`);
                        try {
                            await typeformAPI.forms.create({
                                data: {
                                    title: form.title,
                                    settings: form.settings,
                                    theme: form.theme,
                                    workspace: form.workspace,
                                    hidden: form.hidden,
                                    variables: form.variables,
                                    welcome_screens: form.welcome_screens,
                                    thankyou_screens: form.thankyou_screens,
                                    fields: form.fields,
                                    logic: form.logic
                                }
                            });
                        } catch (e) {
                            console.log(JSON.stringify(e));
                        }

                    } else {
                        formToUpdate = await typeformAPI.forms.get({ uid: formToUpdate.id });

                        formToUpdate = updateForm(formToUpdate, translations, false);

                        formToUpdate.settings.language = translationLanguage;

                        console.log(`Updating form ${formToUpdate.title}`);
                        await typeformAPI.forms.update({
                            uid: formToUpdate.id, override: true, data: {
                                title: formToUpdate.title,
                                settings: formToUpdate.settings,
                                theme: formToUpdate.theme,
                                workspace: formToUpdate.workspace,
                                hidden: formToUpdate.hidden,
                                variables: formToUpdate.variables,
                                welcome_screens: formToUpdate.welcome_screens,
                                thankyou_screens: formToUpdate.thankyou_screens,
                                fields: formToUpdate.fields,
                                logic: formToUpdate.logic
                            }
                        })
                    }
                });
                await Promise.all(promises);
            }
            res.send({ success: true });
        } catch (error) {
            res.send({ success: false });
        }
    };
}

function updateForm(form, translations, cleanIds) {
    Object.keys(translations).forEach(trKey => {
        if (trKey.endsWith('_field')) {
            const txt = translations[trKey];
            const ref = trKey.split('_field')[0];
            const fields = form.fields || [];
            for (let i = 0; i < fields.length; i++) {
                if (fields[i].ref === ref) {
                    form.fields[i].title = txt;
                    if (cleanIds) {
                        form.fields[i].id = undefined;
                    }
                }
            }
            return;
        }
        if (trKey.endsWith('_button_welcome_screen')) {
            const txt = translations[trKey];
            const ref = trKey.split('_button_welcome_screen')[0];
            const wScreens = form.welcome_screens || [];
            for (let i = 0; i < wScreens.length; i++) {
                if (wScreens[i].ref === ref) {
                    form.welcome_screens[i].properties.button_text = txt;
                }
            }
            return;
        }
        if (trKey.endsWith('_welcome_screen')) {
            const txt = translations[trKey];
            const ref = trKey.split('_welcome_screen')[0];
            const wScreens = form.welcome_screens || [];
            for (let i = 0; i < wScreens.length; i++) {
                if (wScreens[i].ref === ref) {
                    form.welcome_screens[i].title = txt;
                }
            }
            return;
        }
        if (trKey.endsWith('_button_thankyou_screens')) {
            const txt = translations[trKey];
            const ref = trKey.split('_button_thankyou_screens')[0];
            const tScreens = form.thankyou_screens || [];
            for (let i = 0; i < tScreens.length; i++) {
                if (tScreens[i].ref === ref) {
                    form.thankyou_screens[i].properties.button_text = txt;
                }
            }
            return;
        }
        if (trKey.endsWith('_thankyou_screens')) {
            const txt = translations[trKey];
            const ref = trKey.split('_thankyou_screens')[0];
            const tScreens = form.thankyou_screens || [];
            for (let i = 0; i < tScreens.length; i++) {
                if (tScreens[i].ref === ref) {
                    form.thankyou_screens[i].title = txt;
                }
            }
            return;
        }
    });
    return form;
}

module.exports = typeformUpdate;