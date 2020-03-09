const _ = require('underscore');
const express = require('express');
const bodyParser = require('body-parser');

const db = require('./db');
const config = require('./config');
const helper = require('./helpers');
const PORT = process.env.PORT || 8000;
const catchRejection = helper.catchRejection;
const middleware = require('./middleware.js')(db);
const crowdinUpdate = require('./uploadToCrowdin');
const typeformUpdate = require('./uploadToIntegration');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/assets/logo.png', (req, res) => res.sendFile(__dirname + '/assets/logo.png'));

app.get('/', middleware.requireAuthentication, (req, res) => res.sendFile(__dirname + '/templates/app.html'));

app.get('/manifest.json', (req, res) => {
  var sanitizedConfig = _.pick(config, 'identifier', 'name', 'baseUrl', 'authentication', 'events', 'scopes', 'modules');
  res.json(sanitizedConfig);
});

app.get('/status', middleware.requireAuthentication, (req, res) => {
  let status = {isInstalled: false, isLoggedIn: false};
  db.organization.findOne({where: {uid: res.origin.domain}})
    .then(organization => {
      status.isInstalled = !!organization;
      return db.integration.findOne({where: {uid: res.clientId}})
    })
    .then(integration => {
      status.isLoggedIn = !!integration;
      return res.json(status);
    })
    .catch(catchRejection('Some problem to fetch organization or integration', res))
  });

app.get('/integration-login', middleware.requireAuthentication, (req, res) => {
  db.integration.getLoginUrl(res)
    .then( url => res.send({url}))
    .catch(catchRejection('Cant sign JWT token', res));
});

app.get('/integration-log-out', middleware.requireAuthentication, middleware.withIntegration, (req, res) => {
  res.integration.destroy()
    .then(() => res.status(204).send())
    .catch(catchRejection('Cant destroy integration', res));
});

app.get('/integration-token', (req, res) => {
  db.integration.setupToken(req)
    .then(() => res.sendFile(__dirname + '/templates/closeAuthModal.html'))
    .catch(catchRejection('Cant create or update integration', res))
});

app.get('/integration-data', middleware.requireAuthentication, middleware.withIntegration, (req, res) => {
  db.integration.getData(res)
    .then(response => res.send(response))
    .catch(catchRejection('Cant fetch integration data', res));
});

// app.get('/mapping', (req, res) => {
//   db.mapping.findAll()
//     .then(r => res.json(r))
//     .catch(catchRejection('Cant fetch mappings', res));
// });
//
// app.get('/organizations', (req, res) => {
//   db.organization.findAll()
//   .then(organizations => {
//     res.json(organizations);
//   })
//   .catch(catchRejection('Cnat fetch organizations', res));
// });
//
// app.get('/integrations', (req, res) => {
//   db.integration.findAll()
//     .then(integrations => {
//       res.json(integrations);
//     })
//     .catch(catchRejection('Cant fetch integrations', res));
// });

app.get('/crowdin-data', middleware.requireAuthentication, middleware.withCrowdinToken, middleware.withIntegration, (req, res) => {
  db.organization.getProjectFiles(res, db)
    .then(response => res.json(response))
    .catch(catchRejection('Cant fetch data from Crowdin', res));
});

app.post('/installed', (req, res) => {
  db.organization.install(req, res)
    .then(() => res.status(204).send())
    .catch(catchRejection('Cant install application', res));
});

app.post('/get-file-progress', middleware.requireAuthentication, middleware.withCrowdinToken, (req, res) => {
  db.organization.getFileProgress(req, res)
    .then((progress) => res.json(progress))
    .catch(catchRejection('Cant fetch progress for file', res));
});

app.get('/get-project-data', middleware.requireAuthentication, middleware.withCrowdinToken, (req, res) => {
  db.organization.getProjectData(res)
    .then((project) => res.json(project))
    .catch(catchRejection('Cant fetch project data', res));
});

app.post('/upload-to-crowdin', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdinToken, crowdinUpdate(db));

app.post('/upload-to-integration', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdinToken, typeformUpdate());

db.sequelize.sync({force: false}).then(function() {
  app.listen(PORT, () => {
    console.log(`Crowdin apps listening on ${PORT}! Good luck!!!`);
  });
});