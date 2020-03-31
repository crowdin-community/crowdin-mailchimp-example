const isDev = (process.env.NODE_ENV || 'development') !== 'production';

const baseUrl = isDev
  ? "https://<your_ngrok_tunnel>.ngrok.io"
  : "https://<app_name>.herokuapp.com";

module.exports = {
  baseUrl: baseUrl,
  crowdinClientId: process.env.CROWDIN_CLIENT_ID || "crowdinClientId",
  crowdinClientSecret: process.env.CROWDIN_CLIENT_SECRET || "crowdinClientSecret",
  integrationClientId: process.env.INTEGRATION_CLIENT_ID || "IntegrationClientId",
  integrationSecret: process.env.INTEGRATION_CLIENT_SECRET || "IntegrationClientSecret",
  callbackUrl: baseUrl + "/integration-token",
  cryptoSecret: process.env.CRYPTO_SECRET || 'UniqueCryptoSecret',
  crowdinAuthUrl : "https://accounts.crowdin.com/oauth/token"
};