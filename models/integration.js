const Mailchimp = require('mailchimp-api-v3');
const Sequelize = require('sequelize');

const helper = require('../helpers');
const db = require('../db_connect');

const catchRejection = helper.catchRejection;
const decryptData = helper.decryptData;
const nodeTypes = helper.nodeTypes;


// Database structure Integration table
const Integration = db.define('Integration', {
  uid: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  integrationToken: {
    type: Sequelize.STRING(10000),
  },
  integrationRefreshToken: {
    type: Sequelize.STRING(10000),
  },
  integrationTokenExpiresIn: {
    type: Sequelize.STRING,
  },
});

Integration.getApiClient = function (req, res) {
  return Integration.findOne({where: {uid: req.user.uid}})
    .then((integration) => {
      if(!integration) {
        // if we don't find Integration, we can't create Integration API client. Exit
        return res.status(404).send();
      }

      // initialize Integration API client and connect it to response object
      res.integrationClient = new Mailchimp(decryptData(integration.integrationToken));

      return new Promise (resolve => resolve());
    })
};

// Get date from integration
Integration.getData = () => (req, res) => {
  const mailChimpApi = res.integrationClient; // Destruct integration client from response
  let files = [];

  // Define root elements for integration
  let roots = {
    'campaigns': 'campaigns',
  };

  // Convert root elements to Folders, for future use in integration web component
  files.push(...Object.keys(roots).map(t => ({
    id: t,
    name: t,
    parent_id: 0,
    node_type: nodeTypes.FOLDER,
  })));

  // Get records for each root element
  Promise.all(Object.keys(roots).map(t =>
    mailChimpApi.get({path: `/${t}`, query: {count: 1000, offset: 0}})
  ))
    .then(responses => { // get responses for each root element
      responses.forEach((r, index) => { // Get records from each response
        files.push( // Push records as files to main files array
          ...r[roots[Object.keys(roots)[index]]].map(f => ({  // Extract exact records array from full response object
          ...f,
          node_type: nodeTypes.FILE,
          type: 'html', // we upload source file as HTML in this integration, type used for file icon on UI
          name: f.name || (f.settings || {}).title || f.id,
          parent_id: Object.keys(roots)[index], // Set file parent_id to roots folder used to group records
        })))
      });
      res.send(files);
    })
    .catch(catchRejection('Cant fetch integration data', res));
};

module.exports = Integration;