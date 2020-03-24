const isDev = (process.env.NODE_ENV || 'development') !== 'production';
const useCopyAuth = true;

module.exports = {
  baseUrl: isDev
    ? "http://172.21.21.60:7000" // dev
    : "https://crowdin-mailchimp-app.herokuapp.com/",
  crowdinClientId: process.env.CROWDIN_CLIENT_ID || "lXlJBL6NQetO3z7Jg1JW",  // dev
  crowdinClientSecret: process.env.CROWDIN_CLIENT_SECRET || "QEQE8ysDya4W1iDmXuBRVEzT4bQETPhTK9h4oEiu", // dev
  integrationClientId: process.env.INTEGRATION_CLIENT_ID || "566339240479", // dev
  integrationSecret: process.env.INTEGRATION_CLIENT_SECRET || "78a10623f59ea976ac4cbc480260456ac1b8e02ebde4b58f94", // dev
  callbackUrl: isDev
    ? "http://172.21.21.60:7000/integration-token" // dev
    : "https://crowdin-mailchimp-app.herokuapp.com/integration-token",
  cryptoSecret: process.env.CRYPTO_SECRET || '78a10623f59ea976456ac1b8e02ebde4b58f94',
  crowdinAuthUrl : isDev && useCopyAuth
    ? "http://accounts.yevhen.dev.crowdin.com/oauth/token" // Local copy auth service
    : "https://accounts.crowdin.com/oauth/token"
};