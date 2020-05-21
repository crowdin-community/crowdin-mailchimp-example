const axios = require('axios');
const Sequelize = require('sequelize');

const db = require('../db_connect');
const { catchRejection, decryptData, nodeTypes } = require('../helpers');

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

const instanceRequest = {};

Integration.getApiClient = function (req, res) {
  return Integration.findOne({where: {uid: req.user.uid}})
    .then((integration) => {
      if(!integration) {
        // if we don't find Integration, we can't create Integration API client. Exit
        return res.status(404).send();
      }
      const token = decryptData(integration.integrationToken);
      const instance = axios.create({
        baseURL: `https://${token.split('-').pop()}.api.mailchimp.com/3.0/`,
        headers: {'Authorization': `Basic ${token}`}
      });

      instanceRequest[integration.uid] = {
        'second-limit': 10,
        parallelRequests: 0,
        timeOutId: null,
        ...instanceRequest[integration.uid] || {}
      };

      const checkTimeout = config => {
        return new Promise((resolve, reject) => {
          if(instanceRequest[integration.uid].parallelRequests >= instanceRequest[integration.uid]['second-limit'] - 3){
            return setTimeout(() =>  resolve(checkTimeout(config)), 1000);
          }
          instanceRequest[integration.uid].parallelRequests += 1;
          instanceRequest[integration.uid].timeOutId && clearTimeout(instanceRequest[integration.uid].timeOutId);
          instanceRequest[integration.uid].timeOutId = setTimeout(() => { instanceRequest[integration.uid].parallelRequests = 0; }, 1000);
          resolve(config);
        });
      };

      instance.interceptors.request.use(function (config) {
        return checkTimeout(config);
      }, function (error) {
        return Promise.reject(error);
      });

      res.ai = instance;

      return new Promise (resolve => resolve());
    })
};

// Get date from integration
Integration.getData = () => (req, res) => {
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
    res.ai.get(`/${t}?count=1000&offset=0`)
  ))
    .then(responses => { // get responses for each root element
      responses.forEach((r, index) => { // Get records from each response
        files.push( // Push records as files to main files array
          ...r.data[roots[Object.keys(roots)[index]]].map(f => ({  // Extract exact records array from full response object
          ...f,
          node_type: nodeTypes.FILE,
          type: 'html', // we upload source file as HTML in this integration, type used for file icon on UI
          name: f.name || (f.settings || {}).title || f.id,
          parent_id: Object.keys(roots)[index], // Set file parent_id to roots folder used to group records
        })))
      });
      res.send(files);
    })
    .catch(catchRejection('Cant fetch integration data', res, req));
};

module.exports = Integration;