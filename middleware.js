const keys = require('./keys');
const jwt = require('jsonwebtoken');

const helper = require('./helpers');
const Integration = require('./models/integration');
const Organization = require('./models/organization');

const catchRejection = helper.catchRejection;

module.exports = {
  requireAuthentication: (req, res, next) => {
    // check all credentials, extract some important data from request
    // connect some useful data to response object for feature use
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

    if(!origin || !clientId || !tokenJwt || clientId !== keys.crowdinClientId) {
      return res.status(401).send('No origin');
    }

    jwt.verify(tokenJwt, keys.crowdinClientSecret, (err, decoded) => {
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
    // Get integration credentials create Integration API client and connect to response
    Integration.getApiClient(req, res)
      .then(() => next())
      .catch(catchRejection('Can\'t find integration by id', res))
  },

  withCrowdin: (req, res, next) => {
    // Get organization credentials create Crowdin API client and connect to response
    Organization.getOrganization(res)
      .then(() => next())
      .catch(catchRejection('Can\'t find organization by id', res));
  },
};