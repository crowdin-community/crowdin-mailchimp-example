# crowdin-apps
## Requirements
1. Nodejs
2. Npm (yarn, etc)
## How to get started
1. Navigate to your working folder.
2. Run command git clone https://github.com/yevhen-o/crowdin-apps.git crowdin-apps
3. Run command npm install -g nodemon
4. cd crowdin-apps && npm install.
5. cd ..
6. nodemon --watch crowdin-apps crowdin-apps/index.js  (this command starts node server and watch changes on crowdin-apps directory and restart server every time when got some changes)
## Structure
1. assets/logo.png (your aplication logo, fill free to change image, but don't change the image name)
2. data/integration.sqlite (folder with database, no need to change anything in it)
3. models
 3.1 integration.js (logic to work with integration, configuring oauth links, tokens, data transfers and formatting etc.)
 3.2 organization.js (logic to work with Crowdin, for basic setup you don't need to change anything in it)
4. node_modules.
5. templates
 5.1 app.html (Small front application that configured to work with current backend, for basic setup don't need change it)
 5.2 closeAuthModal.html (helper file to close integration authModal and reload the page, don't need to change anything)
6. config.js (Configuration file, change credentials, links, name, description, etc.)
7. db.js (database configuration file, don't need to change anything)
8. helpers.js (some small helper to prevent code duplication, don't need to change anything)
9. index.js (application backend routes configuration file, for basic setup don't need to change it)
10. middleware.js (routes validation, check and provide some important data, close routes if request has no permissions, don't need change it)
11. package.json && package-lock.json (describe which packages use this app)
12. uploadToCrowdin.js (logic to upload files to Crowdin, change it to new requirements)
13. uploadToIntegration (logic to upload translations to integration, this file also need change to new requirements)
