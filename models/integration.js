var Mailchimp = require('mailchimp-api-v3');
const helper = require('../helpers');
const catchRejection = helper.catchRejection;

module.exports = function(sequelize, DataTypes) {
  const Integration = sequelize.define('Integration', {
    uid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    integrationToken: {
      type: DataTypes.STRING,
    },
    integrationRefreshToken: {
      type: DataTypes.STRING,
    },
    integrationTokenExpiresIn: {
      type: DataTypes.STRING,
    },
  });

  Integration.getApiClient = function (req, res) {
    return Integration.findOne({where: {uid: req.user.uid}})
      .then((integration) => {
        if(!integration) {
          return res.status(404).send();
        }
        // todo: manage refresh token actions
        res.integrationClient = new Mailchimp(integration.integrationToken);
        return new Promise (resolve => resolve());
      })
  };

  Integration.getData = () => (req, res) => {
    const mailChimpApi = res.integrationClient;
    let files = [];
    let roots = {
     // 'lists': 'lists',
      'campaigns': 'campaigns',
     // 'templates': 'templates',
      'landing-pages': 'landing_pages'
    };
    files.push(...Object.keys(roots).map(t => ({
      id: t,
      name: t,
      parent_id: 0,
      node_type: '0',
    })));
    Promise.all(Object.keys(roots).map(t => mailChimpApi.get({path: `/${t}`, query: {count: 1000, offset: 0}})))
      .then(responses => {
        responses.forEach((r, index) => {
         // r[roots[Object.keys(roots)[index]]].forEach(f => console.log(f));
          files.push(...r[roots[Object.keys(roots)[index]]].map(f => ({
            ...f,
            node_type: '1',
            type: 'html',
           // icon: 'https://us19.admin.mailchimp.com/images/campaigns/nav-icons/automation.svg',
            name: f.name || (f.settings || {}).title || f.id,
            parent_id: Object.keys(roots)[index],
          })))
        });
        res.send(files);
      })
      .catch(catchRejection('Cant fetch integration data', res));
  };

  return Integration;
};