const _ = require('underscore');
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');

const db = require('./db');
const keys = require('./keys');
const config = require('./config');
const PORT = process.env.PORT || 7000;
const middleware = require('./middleware.js')(db);
const passportSetup = require('./passportSetup');
const crowdinUpdate = require('./uploadToCrowdin');
const integrationUpdate = require('./uploadToIntegration');
const cookieSession = require('cookie-session');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieSession({
  sameSite: 'none',
  maxAge: 24 * 60 * 60 * 1000,
  keys: [keys.integrationSecret]
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/assets/logo.png', (req, res) => res.sendFile(__dirname + '/assets/logo.png'));

app.get('/', middleware.requireAuthentication, (req, res) => res.sendFile(__dirname + '/templates/app.html'));

app.get('/manifest.json', (req, res) =>
  res.json(_.pick(config, 'identifier', 'name', 'baseUrl', 'authentication', 'events', 'scopes', 'modules')));

app.get('/status', middleware.requireAuthentication, (req, res) =>
  res.json({isInstalled: !!req.session.crowdin, isLoggedIn: !!req.user}));

app.get('/integration-login', passport.authenticate('mailchimp'));

app.get('/integration-log-out', middleware.requireAuthentication, (req, res) => {
  req.logout();
  res.status(204).send();
});

app.get('/integration-token', passport.authenticate('mailchimp', {failureRedirect: '/integration-login'}),
  (req, res) => res.sendFile(__dirname + '/templates/closeAuthModal.html'));

app.get('/integration-data', middleware.requireAuthentication, middleware.withIntegration, db.integration.getData());

app.get('/crowdin-data', middleware.requireAuthentication, middleware.withCrowdin, db.organization.getProjectFiles(db));

app.post('/installed', db.organization.install());

app.post('/get-file-progress', middleware.requireAuthentication, middleware.withCrowdin, db.organization.getFileProgress());

app.get('/get-project-data', middleware.requireAuthentication, middleware.withCrowdin, db.organization.getProjectData());


app.post('/upload-to-crowdin', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdin, crowdinUpdate(db));

app.post('/upload-to-integration', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdin, integrationUpdate());

// ------------------------------ start routes for debugging only ---------------------------

// app.get('/mapping', (req, res) => {
//   db.mapping.findAll()
//     .then(r => res.json(r))
//     .catch(catchRejection('Cant fetch mappings', res));
// });
//
// app.get('/organizations', (req, res) => {
//   db.organization.findAll()
//     .then(organizations => {
//       res.json(organizations);
//     })
//     .catch(e => console.log(e));
// });
//
// app.get('/integrations', (req, res) => {
//   db.integration.findAll()
//     .then(integrations => {
//       res.json(integrations);
//     })
//     .catch(catchRejection('Cant fetch integrations', res));
// });

// ------------------------------ end routes for debugging only ---------------------------

db.sequelize.sync({force: false}).then(function() {
  app.listen(PORT, () => {
    console.log(`Crowdin apps listening on ${PORT}! Good luck!!!`);
  });
});