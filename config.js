const manifest = {
  "identifier": "type-form-app",
  "name": "Typeform app",
  "baseUrl": "https://crowdin-typeform-app.herokuapp.com/",
  "authentication": {
      "type": "authorization_code",
      // crowdin client ID
      "clientId": "ikwEMWOH6b5gWiXo1Apv"
    // "clientId": "trjBbjAue27tY7Hw0phH" // dev
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
  "clientSecret":"aD48fy1WV5agzZEdPcAv4QgJw1lWkJpDJh9PoNOY",
  // "clientSecret":"n3fsQOtG3D2fqPhBwkBq02A7HnsmUzaxHIWy9FpN", // dev

//   "typeformClientId": "G25nWB8vGKWk9ijFCcx4eK1wdJBgdDD8qQQwuQkrqs6B", // dev
//   "typeformSecret": "HGPci6i9jZFyQZTYVVa6MCAmwRs9QpxUb592u1pDxFdB", // dev
//   "callbackUrl": "http://localhost:8000/integration-token", // dev

  "typeformClientId": "6WayTi4aBJTGotMbUBFA8BtYj49hDjjywZfN1UhUxTEJ",
  "typeformSecret": "22fdPAnX93mdsMXyx7wSPDJsydFbPaBrq8H47ni7sdHi",
  "callbackUrl": "https://crowdin-typeform-app.herokuapp.com/integration-token",
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