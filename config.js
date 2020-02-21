const manifest = {
  "identifier": "crowdin-mailchimp-app",
  "name": "Mail chimp App",
  "baseUrl": "http://172.21.21.60:8000",
  "authentication": {
      "type": "authorization_code",
      // crowdin client ID
    //  "clientId": "pKiA8X5ktxVPJDrxSX8F"
     "clientId": "trjBbjAue27tY7Hw0phH" // dev
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
              "name": "Mailchimp Integration",
              "description": "Data sync between Mailchimp and Crowdin",
              "logo": "/logo.png",
              "url": "/"
          }
      ]
  },
  // crowdin client secret
  // "clientSecret":"AMi5vYVdXp7vg0Sa8Tm8mMe3DMAo8oiPkSi1oNtX",
  "clientSecret":"n3fsQOtG3D2fqPhBwkBq02A7HnsmUzaxHIWy9FpN", // dev

  "typeformClientId": "G25nWB8vGKWk9ijFCcx4eK1wdJBgdDD8qQQwuQkrqs6B",
  "typeformSecret": "HGPci6i9jZFyQZTYVVa6MCAmwRs9QpxUb592u1pDxFdB",
  "callbackUrl": "http://localhost:8000/integration-token",
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