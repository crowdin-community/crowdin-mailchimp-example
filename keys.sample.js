const isDev = (process.env.NODE_ENV || 'development') !== 'production';

module.exports = {
  baseUrl: isDev
    ? "http://172.21.21.60:7000/" // dev  // localhost will not work use ngrok instead
    : "https://crowdin-typeform-app.herokuapp.com/",
  crowdinClientId: isDev
    ? "clientIdFromCrowdin"  // dev
    : "clientIdFromCrowdin",
  crowdinClientSecret: isDev
    ? "clientSecretFromCrowdin" // dev
    : "clientSecterFromCrowdin",
  integrationClientId: isDev
    ? "IntegrationClientId" // dev
    : "IntegrationClientId",
  integrationSecret: isDev
    ? "IntegrationClientSecret" // dev
    : "IntegrationClientSecret",
  callbackUrl: isDev
    ? "http://172.21.21.60:7000/integration-token" // dev
    : "https://crowdin-typeform-app.herokuapp.com/integration-token",
};