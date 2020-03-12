var isDev = (process.env.NODE_ENV || 'development') !== 'production';

module.exports = {
  baseUrl: isDev
    ? "http://172.21.21.60:7000" // dev
    : "https://crowdin-mailchimp-app.herokuapp.com/",
  crowdinClientId: isDev
    ? "lXlJBL6NQetO3z7Jg1JW"  // dev
    : "pKiA8X5ktxVPJDrxSX8F",
  crowdinClientSecret: isDev
    ? "QEQE8ysDya4W1iDmXuBRVEzT4bQETPhTK9h4oEiu" // dev
    : "AMi5vYVdXp7vg0Sa8Tm8mMe3DMAo8oiPkSi1oNtX",
  integrationClientId: isDev
    ? "566339240479" // dev
    : "512947470701",
  integrationSecret: isDev
    ? "78a10623f59ea976ac4cbc480260456ac1b8e02ebde4b58f94" // dev
    : "8b99c5d250bd5f19e2a3d9278a15e5db944b1bb673e1665cfe",
  callbackUrl: isDev
    ? "http://172.21.21.60:7000/integration-token" // dev
    : "https://crowdin-mailchimp-app.herokuapp.com/integration-token",
};