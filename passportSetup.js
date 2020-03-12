const passport = require('passport');
const MailChimpStrategy = require('passport-mailchimp').Strategy;
const keys = require('./keys');
const db = require('./db');

passport.serializeUser((user, done) => {
  console.log('serialize ------------------------------------>', user.uid);
  done(null, user.uid);
});

passport.deserializeUser((uid, done) => {
  console.log('deserialize -------------------------------------->', uid);
  db.integration.findOne({where: {uid: uid}})
    .then((user) => {
      console.log(user);
      if(user && user.hasOwnProperty('toJSON')){
        user = user.toJSON();
      }
      done(null, user)
    })
    .catch(e => done(e, null));
});

passport.use(
  new MailChimpStrategy({
    clientID: keys.integrationClientId,
    clientSecret: keys.integrationSecret,
    callbackURL: keys.callbackUrl
  }, (accessToken, refreshToken, profile, done) => {

    db.integration.findOne({where: {uid: `${profile._json.user_id}`}})
      .then(currentUser => {
        let params = {
          integrationTokenExpiresIn: '0',
          integrationToken: `${accessToken}-${profile._json.dc}`,
          integrationRefreshToken: '',
        };
        if(currentUser) {
          return currentUser.update(params);
        } else {
          params.uid = profile._json.user_id;
          return db.integration.create(params);
        }
      })
      .then(user => done(null, user))
      .catch(e => done(e, null));
  })
);