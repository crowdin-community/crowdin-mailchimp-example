const catchRejection = (message, res) => e => {
  console.log('message ---------------------------------------->', message);
  console.log('e ---------------------------------------------->', e);
  res.status(500).send(message);
};

module.exports = {catchRejection};