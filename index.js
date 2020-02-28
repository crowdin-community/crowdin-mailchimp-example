const axios = require('axios');
const _ = require('underscore');
const qs = require('querystring');
var jwt = require('jsonwebtoken');
const express = require('express');
const bodyParser = require('body-parser');
const crowdin = require('@crowdin/crowdin-api-client').default;
const {createClient: createIntegrationClient} = require('@typeform/api-client');

const db = require('./db');
const config = require('./config');
const PORT = process.env.PORT || 8000;
const middleware = require('./middleware.js')(db);
const crowdinUpdate = require('./uploadToCrowdin');
const typeformUpdate = require('./uploadToIntegration');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/assets/logo.png', (req, res) => res.sendFile(__dirname + '/assets/logo.png'));

app.get('/', middleware.requireAuthentication, (req, res) => res.sendFile(__dirname + '/templates/app.html'));

app.get('/manifest.json', (req, res) => {
  console.log('get manifest');
  var sanitizedConfig = _.pick(config, 'identifier', 'name', 'baseUrl', 'authentication', 'events', 'scopes', 'modules');
  res.json(sanitizedConfig);
});

const catchRejection = (message, res) => e => {
  console.log(message);
  console.log(e);
  res.status(500).send(message);
};

app.get('/status', middleware.requireAuthentication, (req, res) => {

  let status = {isInstalled: false, isLoggedIn: false};

  db.organization.findOne({where: {uid: res.origin.domain}})
    .then(organization => {
      status.isInstalled = !!organization;
      return db.integration.findOne({where: {uid: res.clientId}})
    })
    .then(integration => {
      status.isLoggedIn = !!integration
      return res.json(status);
    })
    .catch(catchRejection('Some problem to fetch organization or integration', res))
  });

app.get('/integration-login', middleware.requireAuthentication, (req, res) => {
  let clientId = null;
  try {
    clientId = jwt.sign({clientId: res.clientId}, config.clientSecret);
  } catch(e) {
    catchRejection('Cant sign JWT token', res)(e);
  }
  const url = `https://api.typeform.com/oauth/authorize?client_id=${config.integrationClientId}&redirect_uri=${config.callbackUrl}&scope=${config.scope}&state=${clientId}`;
  res.send({url});
});

app.get('/integration-token', (req, res) => {
  var clientId = null;
  try {
    clientId = (jwt.verify(req.query.state, config.clientSecret) || {}).clientId;
  } catch(e) {
    catchRejection('Cant decode JWT', res)(e);
  }
  const payload = {
    grant_type: 'authorization_code',
    code: req.query.code,
    client_id: config.integrationClientId,
    client_secret: config.integrationSecret,
    redirect_uri: config.callbackUrl,
  };
  let tokenRes = {};
  return axios.post(`https://api.typeform.com/oauth/token`, qs.stringify(payload))
    .then((response) => {
      tokenRes = response;
      return db.integration.findOne({where: {uid: clientId}})
    })
    .then((integration) => {
      let params = {
        integrationTokenExpiresIn: (new Date().getTime()/1000) + +tokenRes.data.expires_in,
        integrationToken: tokenRes.data.access_token,
        integrationTokenType: tokenRes.data.token_type,
        integrationRefreshToken: tokenRes.data.refresh_token || '',
      };
      if(integration) {
        return integration.update(params);
      } else {
        params.uid = clientId;
        return db.integration.create(params);
      }
    })
    .then(() => {
      res.sendFile(__dirname + '/templates/closeAuthModal.html');
    })
    .catch(catchRejection('Cant create or update integrations', res))
});

app.get('/integration-data', middleware.requireAuthentication, middleware.withIntegration, (req, res) => {
  const typeformAPI = createIntegrationClient({token: res.integration.integrationToken});
  typeformAPI.forms.list()
  .then((response) => {
    res.send(response.items);
  })
  .catch(catchRejection('Cant fetch integration data', res));
});

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

app.get('/integration-log-out', middleware.requireAuthentication, middleware.withIntegration, (req, res) => {
  res.integration.destroy()
  .then(() => {
    res.status(204).send();
  })
  .catch(catchRejection('Cant destroy integration', res));
});

app.get('/crowdin-data', middleware.requireAuthentication, middleware.withCrowdinToken, (req, res) => {
  const crowdinApi = new crowdin({
    token: res.crowdin.token,
    organization: res.origin.domain,
  });
  let files = [];
  const projectId = res.origin.context.project_id;
    crowdinApi.sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500)
      .then( response => {
        files.push(...response.data.map(({data}) => ({...data, node_type: '0'})));
        return crowdinApi.sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500);
      })
      .then( response => {
        files.push(...response.data.map(({data}) => data));
        return crowdinApi.sourceFilesApi.listProjectBranches(projectId, undefined, 500);
      })
      .then( response => {
        files.push(...response.data.map(({data}) => ({...data, node_type: '2'})));
        res.json(files);
      })
      .catch(catchRejection('Cant fetch data from Crowdin', res));
});

app.post('/installed', (req, res) => {
  let client = null;
  db.organization.findOne({where: {uid: req.body.domain}})
    .then(organization => {
      client = organization;
      let payload = {
        grant_type: 'authorization_code',
        client_id: config.authentication.clientId,
        client_secret: config.clientSecret,
        code: req.body.code,
      };
      // todo: do not forget change this line before production!!!
      return axios.post(process.env.NODE_ENV === 'production' ? 'https://accounts.crowdin.com/oauth/token' : 'http://accounts.yevhen.dev.crowdin.com/oauth/token', payload)
    })
    .then(resp => {
      const params = {
        uid: req.body.domain,
        accessToken: resp.data.access_token,
        refreshToken: resp.data.refresh_token,
        expire: new Date().getTime()/1000 + +resp.data.expires_in
      }
      if(!!client){
        return client.update(params);
      } else {
        return db.organization.create(params);
      }
    })
    .then(organization => {
      res.status(204).send();
    })
    .catch(catchRejection('Cant install application', res));
});

app.post('/upload-to-crowdin', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdinToken, crowdinUpdate()); 

app.post('/upload-to-integration', middleware.requireAuthentication, middleware.withIntegration, middleware.withCrowdinToken, typeformUpdate());

db.sequelize.sync({force: false}).then(function() {
  app.listen(PORT, () => {
    console.log(`Crowdin apps listening on ${PORT}! Good luck!!!`);
  });
});