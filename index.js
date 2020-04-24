const _ = require('lodash');
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');

const keys = require('./keys');
const db = require('./db_connect');
const config = require('./config');
const PORT = process.env.PORT || 7000;
const middleware = require('./middleware.js');
const passportSetup = require('./passportSetup');
const crowdinUpdate = require('./uploadToCrowdin');
const integrationUpdate = require('./uploadToIntegration');

const Mapping = require('./models/mapping');
const Integration = require('./models/integration');
const Organization = require('./models/organization');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.set('trust proxy', 1); // trust first proxy

app.use(cookieSession({
  sameSite: 'None',
  secure: true,
  maxAge: 24 * 60 * 60 * 1000,
  keys: [keys.integrationSecret]
}));
app.use(passport.initialize());
app.use(passport.session());

app.use("/polyfills", express.static(__dirname + '/polyfills'));

app.use("/assets", express.static(__dirname + '/assets'));

app.get('/', middleware.requireAuthentication, (req, res) => res.sendFile(__dirname + '/templates/app.html'));

app.get('/manifest.json', (req, res) =>
  res.json(_.pick(config, 'identifier', 'name', 'baseUrl', 'authentication', 'events', 'scopes', 'modules')));

app.get('/status', middleware.requireAuthentication, (req, res) =>
  res.json({isInstalled: !!req.session.crowdin, isLoggedIn: !!req.user}));

app.get('/integration-login', passportSetup.auth());

app.get('/integration-log-out', middleware.requireAuthentication, (req, res) => {
  req.logout();
  res.status(204).send();
});

app.get('/integration-token', passportSetup.middleware(),
  (req, res) => res.sendFile(__dirname + '/templates/closeAuthModal.html'));

app.get('/integration-data', middleware.requireAuthentication, middleware.withIntegration, Integration.getData());

app.get('/crowdin-data', middleware.requireAuthentication, middleware.withCrowdin, Organization.getProjectFiles());

app.post('/installed', Organization.install());

app.post('/get-file-progress', middleware.requireAuthentication, middleware.withCrowdin, Organization.getFileProgress());

app.get('/get-project-data', middleware.requireAuthentication, middleware.withCrowdin, Organization.getProjectData());

app.post('/upload-to-crowdin', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdin, crowdinUpdate());

app.post('/upload-to-integration', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdin, integrationUpdate());

// ------------------------------ start routes for debugging only ---------------------------
if(process.env.NODE_ENV !== 'production') {
  app.get('/mapping', (req, res) => {
    Mapping.findAll()
      .then(r => res.json(r))
      .catch(e => console.log(e));
  });

  app.get('/organizations', (req, res) => {
    Organization.findAll()
      .then(organizations => {
        res.json(organizations);
      })
      .catch(e => console.log(e));
  });

  app.get('/integrations', (req, res) => {
    Integration.findAll()
      .then(integrations => {
        res.json(integrations);
      })
      .catch(e => console.log(e));
  });
}
// ------------------------------ end routes for debugging only ---------------------------

db.sync({force: false}).then(function() {
  app.listen(PORT, () => {
    console.log(`Crowdin apps listening on ${PORT}! Good luck!!!`);
  });
});