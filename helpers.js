const catchRejection = (message, res) => e => {
  console.log('message ---------------------------------------->', message);
  console.log('e ---------------------------------------------->', e);
  res.status(500).send(message);
};

const nodeTypes = {
  FOLDER: '0',
  FILE: '1',
  BRANCH: '2',
};

module.exports = {catchRejection, nodeTypes};