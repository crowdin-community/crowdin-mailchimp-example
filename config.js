var isDev = (process.env.NODE_ENV || 'development') !== 'production';

const manifest = {
  "identifier": "type-form-app",
  "name": "Typeform app",
  "baseUrl": isDev
    ? "http://172.21.21.60:8000/" // dev
    : "https://crowdin-typeform-app.herokuapp.com/",
  "authentication": {
      "type": "authorization_code",
      // crowdin client ID
      "clientId": isDev
        ? "trjBbjAue27tY7Hw0phH"  // dev
        : "ikwEMWOH6b5gWiXo1Apv"
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
              "key": "typeform_app_test",
              "name": "Typeform Integration",
              "description": "Data sync between Typeform and Crowdin",
              "logo": "/assets/logo.png",
              "url": "/"
          }
      ]
  },
  // crowdin client secret
  "clientSecret": isDev
    ? "n3fsQOtG3D2fqPhBwkBq02A7HnsmUzaxHIWy9FpN" // dev
    : "aD48fy1WV5agzZEdPcAv4QgJw1lWkJpDJh9PoNOY",

  "integrationClientId": isDev
    ? "FzzC2UBbCjhNt9CYACYXvfo42P572xXhDkVoKKBkddtM" // dev
    : "6WayTi4aBJTGotMbUBFA8BtYj49hDjjywZfN1UhUxTEJ",
  "integrationSecret": isDev
    ? "Ea3GVEYKJtJkQHzHXVJ5QueR2eeEaDXF1sbjG7TLZhbz" // dev
    : "22fdPAnX93mdsMXyx7wSPDJsydFbPaBrq8H47ni7sdHi",
  "callbackUrl": isDev
    ? "http://172.21.21.60:8000/integration-token" // dev
    : "https://crowdin-typeform-app.herokuapp.com/integration-token",

  scope: [
    'forms:read',
    'accounts:read',
    'themes:read',
    'responses:read',
    'workspaces:read',
    'forms:write',
    'themes:write',
    'responses:write',
    'workspaces:write',
  ].join('+')
};

module.exports = manifest;