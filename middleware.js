var config = require('./config');
const jwt = require('jsonwebtoken');
const axios = require('axios');

module.exports = function(db) {
  return {
    requireAuthentication: function(req, res, next) {

      const origin = req.query['origin'];
      const clientId = req.query['client_id'];
      const tokenJwt = req.query['tokenJwt'];

      if(!origin || !clientId || !tokenJwt || clientId !== config.authentication.clientId) {
        return res.status(401).send();
      }

      jwt.verify(tokenJwt, config.clientSecret, (err, decoded) => {
        if(err) {
          res.status(401).send();
        } else {
          res.origin = decoded;
          res.clientId = `${res.origin.domain}__${res.origin.context.project_id}`;
          return next();
        }
      });
    },
    withIntegration: function(req, res, next) {
      db.integration.findOne({where: {uid: `${res.origin.domain}__${res.origin.context.project_id}`}})
        .then((integration) => {
          if(!integration) {
            return res.status(404).send();
          }
          // todo: manage refresh token actions
          res.integration = integration;
          next();
        })
        .catch(e => {
          return res.status(500).send();
        })
    },
    withCrowdinToken: function(req, res, next) {
      db.organization.findOne({where: {uid: res.origin.domain}})
        .then((organization) => {
          if(!organization) {
            return res.status(404).send();
          }
          const isExpired = +organization.expire < +new Date().getTime() / 1000;
          if(!isExpired) {
            res.crowdin = {};
            res.crowdin.token = organization.accessToken;
            next();
          } else {
            let payload = {
              grant_type: 'refresh_token',
              client_id: config.authentication.clientId,
              client_secret: config.clientSecret,
              refresh_token: organization.refreshToken,
            };
            axios.post(process.env.NODE_ENV === 'production' ? 'https://accounts.crowdin.com/oauth/token' : 'http://accounts.yevhen.dev.crowdin.com/oauth/token', payload)
              .then(response => {
                let params = {
                  refreshToken: response.data.refresh_token,
                  accessToken: response.data.access_token,
                  expire: (new Date().getTime() / 1000) + response.data.expires_in
                };
                return organization.update(params)
              })
              .then(organization => {
                res.crowdin = {};
                res.crowdin.token = organization.accessToken;
                next();
              })
              .catch(e => {
                return res.status(500).send();
              });
          }
        })
        .catch(e => {
          return res.status(500).send();
        })
    }
  }
};