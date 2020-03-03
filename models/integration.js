const axios = require('axios');
var jwt = require('jsonwebtoken');
const qs = require('querystring');
const config = require('./../config');
const {createClient: createIntegrationClient} = require('@typeform/api-client');

module.exports = function(sequelize, DataTypes) {
  const Integration = sequelize.define('Integration', {
    uid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    integrationToken: {
      type: DataTypes.STRING,
    },
    integrationRefreshToken: {
      type: DataTypes.STRING,
    },
    integrationTokenExpiresIn: {
      type: DataTypes.STRING,
    },
    mapingFiles: {
      type: DataTypes.STRING,
    }
  });

  Integration.getLoginUrl = function (res) {
    return new Promise ( (resolve, reject) => {
      let clientId = null;
      try {
        clientId = jwt.sign({clientId: res.clientId}, config.clientSecret);
      } catch(e) {
        reject();
      }
      resolve(`https://api.typeform.com/oauth/authorize?client_id=${config.integrationClientId}&redirect_uri=${config.callbackUrl}&scope=${config.scope}&state=${clientId}`);
    });
  };

  Integration.setupToken = function (req) {
    return new Promise ((resolve, reject) => {
      var clientId = null;
      try {
        clientId = (jwt.verify(req.query.state, config.clientSecret) || {}).clientId;
      } catch(e) {
        reject('Cant decode JWT', e);
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
          return Integration.findOne({where: {uid: clientId}})
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
            return Integration.create(params);
          }
        })
        .then(() => resolve())
        .catch(e => reject('Cant update token', e));
    });
  };

  Integration.getData = function (res) {
    return new Promise ( (resolve, reject) => {
      const typeformAPI = createIntegrationClient({token: res.integration.integrationToken});
      typeformAPI.forms.list()
        .then((response) => {
          resolve(response.items.map(({title, ...rest}) => ({
            name: title,
            icon: '/assets/logo.png',
            parent_id: 0,
            ...rest
          })));
        })
        .catch(e => reject('Cant fetch data from integration', e));
    });
  };

  return Integration;
};