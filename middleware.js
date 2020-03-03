var config = require('./config');
const jwt = require('jsonwebtoken');
const helper = require('./helpers');
const catchRejection = helper.catchRejection;

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
        .catch(catchRejection('Can\'t find integration by id', res))
    },
    withCrowdinToken: function(req, res, next) {
      db.organization.getOrganization(res)
        .then(organization => {
          res.crowdin = {};
          res.crowdin.token = organization.accessToken;
          next();
        })
        .catch(catchRejection('Can\'t find organization by id', res));
    }
  }
};