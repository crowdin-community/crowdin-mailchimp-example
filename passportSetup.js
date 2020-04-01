const passport = require('passport');
const PassportStrategy = require('passport-mailchimp').Strategy;

const keys = require('./keys');
const helpers = require('./helpers');
const Integration = require('./models/integration');

const encryptData = helpers.encryptData;

passport.serializeUser((user, done) => {
  // Create user session and set cookies
  done(null, user.uid);
});

passport.deserializeUser((uid, done) => {
  // get user cookies and find Integration to provide credentials
  Integration.findOne({where: {uid: uid}})
    .then((integration) => {
      if(integration && integration.hasOwnProperty('toJSON')){
        integration = integration.toJSON();
      }
      done(null, integration)
    })
    .catch(e => done(e, null));
});

passport.use(
  // Define passport strategy
  new PassportStrategy({
    clientID: keys.integrationClientId,
    clientSecret: keys.integrationSecret,
    callbackURL: keys.callbackUrl
  }, (accessToken, refreshToken, profile, done) => {
    // Callback function after user success authentication on integration
    // Try find record with current user
    Integration.findOne({where: {uid: `${profile._json.user_id}`}})
      .then(currentUser => {
        // Prepare parameters to create or update integration credentials
        let params = {
          integrationTokenExpiresIn: '0',
          integrationToken: encryptData(`${accessToken}-${profile._json.dc}`),
          integrationRefreshToken: '',
        };
        if(currentUser) {
          // Update integration user credentials
          return currentUser.update(params);
        } else {
          // Create new user with current credentials
          params.uid = profile._json.user_id;
          return Integration.create(params);
        }
      })
      .then(user => done(null, user))
      .catch(e => done(e, null));
  })
);

auth = () => passport.authenticate('mailchimp');

middleware = () => passport.authenticate('mailchimp', {failureRedirect: '/integration-login'});

module.exports = {auth, middleware};