var config = require('./config');
const jwt = require('jsonwebtoken');
const helper = require('./helpers');
const catchRejection = helper.catchRejection;

module.exports = (db) => {
  return {
    requireAuthentication: (req, res, next) => {

      let origin = null;
      let clientId = null;
      let tokenJwt = null;

      if(req.session.crowdin) {
        const crowdin = JSON.parse(req.session.crowdin);
        origin = crowdin.origin;
        clientId = crowdin.clientId;
        tokenJwt = crowdin.tokenJwt;
      }
      if(req.query) {
        origin = req.query['origin'];
        clientId = req.query['client_id'];
        tokenJwt = req.query['tokenJwt'];
      }

      if(!origin || !clientId || !tokenJwt || clientId !== config.authentication.clientId) {
        return res.status(401).send('No origin');
      }

      jwt.verify(tokenJwt, config.clientSecret, (err, decoded) => {
        if(err) {
          res.status(401).send('Cant verify');
        } else {
          req.session.crowdin = JSON.stringify({origin, clientId, tokenJwt});
          res.origin = decoded;
          res.clientId = `${res.origin.domain}__${res.origin.context.project_id}`;
          return next();
        }
      });
    },

    withIntegration: (req, res, next) => {
      db.integration.getApiClient(req, res)
        .then(() => next())
        .catch(catchRejection('Can\'t find integration by id', res))
    },

    withCrowdin: (req, res, next) => {
      db.organization.getOrganization(res)
        .then(() => next())
        .catch(catchRejection('Can\'t find organization by id', res));
    },
  }
};