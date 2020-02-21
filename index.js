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

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', middleware.requireAuthentication, (req, res) => {
  res
    .cookie('host', `${req.protocol}://${req.headers.host}`)
    .cookie('origin', req.query['origin'])
    .sendFile(__dirname + '/templates/app.html');
});

app.get('/manifest.json', (req, res) => {
  console.log('get manifest');
  var sanitizedConfig = _.pick(config, 'identifier', 'name', 'baseUrl', 'authentication', 'events', 'scopes', 'modules');
  res.json(sanitizedConfig);
});

app.get('/status', middleware.requireAuthentication, (req, res) => {

  // return res.json({isInstalled: false, isLoggedIn: false});

  let status = {isInstalled: false, isLoggedIn: false};

  db.organization.findOne({where: {uid: res.origin.domain}})
    .then(organization => {
      return new Promise(resolve => {
        resolve({isInstalled: !!organization})
      })
    })
    .then(isInstalled => {
      status.isInstalled = isInstalled;
      return db.integration.findOne({where: {uid: `${res.origin.domain}__${res.origin.context.project_id}`}})
    })
    .then(integration => {
      return new Promise(resolve => {
        resolve({isLoggedIn: !!integration});
      })
    })
    .then(isLoggedIn => {
      status.isLoggedIn = isLoggedIn;
      return res.json(status);
    })
    .catch(e => {
      console.log(e);
      res.status(500).send();
    })
  }, function(e) {
    console.log(e);
    res.status(500).send();
});


app.get('/integration-login', middleware.requireAuthentication, (req, res) => {
  let clientId = null;
  try {
    clientId = jwt.sign({clientId: `${res.origin.domain}__${res.origin.context.project_id}`}, config.clientSecret);
    console.log(clientId);
  } catch(e) {
    res.status(500).send();
  }
  const url = `https://api.typeform.com/oauth/authorize?client_id=${config.typeformClientId}&redirect_uri=${config.callbackUrl}&scope=${config.scope}&state=${clientId}`;
  res.send({url});
});

app.get('/integration-token', (req, res) => {
  var clientId = null;
  try {
    var decodedJwt = jwt.verify(req.query.state, config.clientSecret);
    clientId = decodedJwt.clientId;
  } catch(e) {
    return res.status(500).send();
  }
  const payload = {
    grant_type: 'authorization_code',
    code: req.query.code,
    client_id: config.typeformClientId,
    client_secret: config.typeformSecret,
    redirect_uri: config.callbackUrl,
  };
  return axios.post(`https://api.typeform.com/oauth/token`, qs.stringify(payload))
    .then((response) => {
      return db.integration.findOne({where: {uid: clientId}}).then((integration) => {
        let params = {
          integrationTokenExpiresIn: +(new Date().getTime()) + +response.data.expires_in,
          integrationToken: response.data.access_token,
          integrationTokenType: response.data.token_type,
          integrationRefreshToken: response.data.refresh_token || '',
        };
        if(integration) {
          return integration.update(params);
        } else {
          params.uid = clientId;
          return db.integration.create(params);
        }
      })
      // req.session = {};
      // req.session.user = response.data;
    })
    .then((integration) => {
      console.log(integration);
      // return db.integration.findAll().then((records) => console.log(records));
      return new Promise(res => res());
    })
    .then(() => {
      res.sendFile(__dirname + '/templates/closeAuthModal.html');
    })
    .catch(e => {
      console.log(e);
      res.status(500).send();
    })
});

app.get('/integration-data', middleware.requireAuthentication, middleware.withIntegrationToken, (req, res) => {
  const typeformAPI = createIntegrationClient({token: res.integration.token});
  typeformAPI.forms.list()
  .then((response) => {
    res.send(response.items);
  }).catch( e => {
    res.status(400).send();
  });
});

app.get('/organizations', (req, res) => {
  db.organization.findAll()
  .then(organizations => {
    res.json(organizations);
  }).catch( e => {
    console.log(e);
    res.status(500).send();
  });
});

app.get('/integrations', (req, res) => {
  db.integration.findAll()
    .then(integrations => {
      res.json(integrations);
    }).catch( e => {
    console.log(e);
    res.status(500).send();
  });
});

app.get('/crowdin-data', middleware.requireAuthentication, middleware.withCrowdinToken, (req, res) => {
  console.log('--------->', res.crowdin, res.origin);
  const crowdinApi = new crowdin({
    token: res.crowdin.token,
    organization: res.origin.domain,
  });
  let files = [];
  const projectId = res.origin.context.project_id;
    crowdinApi.sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500)
      .then( response => {
        files.push(response);
        return new Promise ( res => res());
      })
      .then(() => {
        return crowdinApi.sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500);
      })
      .then( response => {
        files.push(response);
        res.json(files);
      })
      .catch( e => {
        console.log(e);
        res.status(500).send();
      });





  // const result = files.data
  // //only at root level
  //   .filter(f => !f.data.directoryId || f.data.directoryId === 0)
  //   //only json files
  //   .filter(f => f.data.name.endsWith('.json'))
  //   .map(f => f.data);
  // res.send(result);
  //
  // res.status(204).send();
});

app.post('/installed', (req, res) => {
  db.organization.findOne({where: {uid: req.body.domain}})
    .then(organization => {
      console.log('-------------->', organization); 
      if(organization) {
        return res.status(204).send();
      } else {
        let payload = {
          grant_type: 'authorization_code',
          client_id: config.authentication.clientId,
          client_secret: config.clientSecret,
          code: req.body.code,
        };
        // todo: do not forget change this line before production!!!
        return axios.post('http://accounts.yevhen.dev.crowdin.com/oauth/token', payload)
      }
    })
    .then(resp => {
      return db.organization.create({
        uid: req.body.domain,
        accessToken: resp.data.access_token,
        refreshToken: resp.data.refresh_token,
        expire: new Date().getTime() + +resp.data.expires_in
      })
    })
    .then(organization => {
      res.status(204).send();
    })
    .catch(e => {
      // console.log(e);
      res.status(500).send();
    });
});

db.sequelize.sync({force: false}).then(function() {
  console.log('Everything is synced!');
  app.listen(PORT, () => {
    console.log(`Crowdin apps listening on ${PORT}! Good luck!!!`);
  });
});