var config = require('./config');
const jwt = require('jsonwebtoken');

module.exports = function(db) { 
  return {
    requireAuthentication: function(req, res, next){

      const origin = req.query['origin'];
      const clientId = req.query['client_id'];
      const tokenJwt = req.query['tokenJwt'];

      if(!origin || !clientId || !tokenJwt || clientId !== config.authentication.clientId){
        return res.status(401).send();
      }

      jwt.verify(tokenJwt, config.clientSecret, (err, decoded) => {
        if(err) {
          res.status(401).send();
        } else {
          res.origin = decoded;
          return next();
        }
      });
    },
    withIntegrationToken: function(req, res, next) {
      db.integration.findOne({where: {uid: `${res.origin.domain}__${res.origin.context.project_id}`}})
      .then((integration) => {
        if(!integration){
          return res.status(404).send();
        }
        // todo: manage refresh token actions
        res.integration = {};
        res.integration.token = integration.integrationToken;
        next();
      })
      .catch(e => {
        return res.status(500).send(); 
      })
    },
    withCrowdinToken: function(req, res, next) {
      db.organization.findOne({where: {uid: res.origin.domain}})
      .then((organization) => {
        if(!organization){
          return res.status(404).send();
        }
        const isExpired = organization.expire < new Date().getTime();
        if(!isExpired){
          res.crowdin = {};
          res.crowdin.token = organization.accessToken;
          next();
        } else {
          // todo: manage refresh token actions
          res.status(401).send();
        }
      })
      .catch(e => {
        return res.status(500).send(); 
      })
    }
  }
};