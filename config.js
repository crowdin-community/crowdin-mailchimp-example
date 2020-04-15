const keys = require('./keys');

const manifest = {
  "identifier": "mailchimp-app",
  "name": "Mailchimp",
  "baseUrl": keys.baseUrl,
  "authentication": {
      "type": "authorization_code",
      "clientId": keys.crowdinClientId,
  },
  "events": {
      "installed": "/installed"
  },
  "scopes": [
      "project"
  ],
  "modules": {
      "integrations": [
          {
              "key": "mailchimp_app_test",
              "name": "Mailchimp",
              "description": "Upload and localize your marketing content from Mailchimp",
              "logo": "/assets/logo.svg",
              "url": "/"
          }
      ]
  },
};

module.exports = manifest;