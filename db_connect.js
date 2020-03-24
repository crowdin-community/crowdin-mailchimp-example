const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
let sequelize;

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

module.exports = sequelize;