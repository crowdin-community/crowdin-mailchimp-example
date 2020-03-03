const catchRejection = (message, res) => e => {
  console.log(message);
  console.log(e);
  res.status(500).send(message);
};

module.exports = {catchRejection};