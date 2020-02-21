var Sequelize = require('sequelize');
var env = process.env.NODE_ENV || 'development';
var sequelize;

if(env === 'production'){
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        'dialect': 'postgress',
    })

} else {
    sequelize = new Sequelize(undefined, undefined, undefined, {
        'dialect': 'sqlite',
        'storage': __dirname + '/data/integration.sqlite',
    });
}

var db = {};

db.organization = sequelize.import(__dirname + '/models/organization.js');
db.integration = sequelize.import(__dirname + '/models/integration.js');
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;