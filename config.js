const manifest = {
  "identifier": "type-form-app",
  "name": "Typeform app",
  "baseUrl": "https://crowdin-typeform-app.herokuapp.com/",
  "authentication": {
      "type": "authorization_code",
      // crowdin client ID
      "clientId": "pKiA8X5ktxVPJDrxSX8F"
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
              "logo": "/logo.png",
              "url": "/"
          }
      ]
  },
  // crowdin client secret
  "clientSecret":"AMi5vYVdXp7vg0Sa8Tm8mMe3DMAo8oiPkSi1oNtX",
  // "clientSecret":"n3fsQOtG3D2fqPhBwkBq02A7HnsmUzaxHIWy9FpN", // dev

//   "typeformClientId": "G25nWB8vGKWk9ijFCcx4eK1wdJBgdDD8qQQwuQkrqs6B", // dev
//   "typeformSecret": "HGPci6i9jZFyQZTYVVa6MCAmwRs9QpxUb592u1pDxFdB", // dev
//   "callbackUrl": "http://localhost:8000/integration-token", // dev

  "typeformClientId": "4kMKx4mFa9YZ27PCAzGfGyVv6tpP2vrR9RL7ZAg27bLv",
  "typeformSecret": "31mnX7t7jjjngKbdmqkYnVHhbp8is3rn9PK9xwuxhcNT",
  "callbackUrl": "https://crowdin-typeform-app.herokuapp.com/",
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
}

module.exports = manifest;