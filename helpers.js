const crypto = require("crypto-js");
const keys = require('./keys');

const catchRejection = (message, res) => e => {
  // here the right place to console.log what goes wrong
   console.log('message ---------------------------------------->', message);
   console.log('e ---------------------------------------------->', e);
  res.status(500).send(message);
};

const nodeTypes = {
  FOLDER: '0',
  FILE: '1',
  BRANCH: '2',
};

const encryptData = (data) => crypto.AES.encrypt(data, keys.cryptoSecret).toString();

const decryptData = (encryptedData) => {
  const bytes = crypto.AES.decrypt(encryptedData, keys.cryptoSecret);
  return bytes.toString(crypto.enc.Utf8);
};

module.exports = {catchRejection, nodeTypes, encryptData, decryptData};