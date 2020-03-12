var isDev = (process.env.NODE_ENV || 'development') !== 'production';

module.exports = {
  baseUrl: isDev
    ? "http://172.21.21.60:7000" // dev
    : "https://crowdin-typeform-app.herokuapp.com/",
  crowdinClientId: isDev
    ? "lXlJBL6NQetO3z7Jg1JW"  // dev
    : "ikwEMWOH6b5gWiXo1Apv",
  crowdinClientSecret: isDev
    ? "QEQE8ysDya4W1iDmXuBRVEzT4bQETPhTK9h4oEiu" // dev
    : "aD48fy1WV5agzZEdPcAv4QgJw1lWkJpDJh9PoNOY",
  integrationClientId: isDev
    ? "566339240479" // dev
    : "6WayTi4aBJTGotMbUBFA8BtYj49hDjjywZfN1UhUxTEJ",
  integrationSecret: isDev
    ? "78a10623f59ea976ac4cbc480260456ac1b8e02ebde4b58f94" // dev
    : "22fdPAnX93mdsMXyx7wSPDJsydFbPaBrq8H47ni7sdHi",
  callbackUrl: isDev
    ? "http://172.21.21.60:7000/integration-token" // dev
    : "https://crowdin-typeform-app.herokuapp.com/integration-token",
};