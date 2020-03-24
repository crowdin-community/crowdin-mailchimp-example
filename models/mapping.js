const Sequelize = require('sequelize');
const db = require('../db_connect');

// Structure of mapping table
const Mapping = db.define('mapping', {
  domain: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  projectId: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  integrationFileId: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  crowdinFileId: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  crowdinUpdatedAt: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  integrationUpdatedAt: {
    type: Sequelize.STRING,
    allowNull: false,
  }
});

// Get records of uploaded files from integration to Crowdin
Mapping.getFilesByDomainProjectId = (res) => {
  return Mapping.findAll({where: {
    domain: res.origin.domain,
    projectId: res.origin.context.project_id,
  }})
};

module.exports = Mapping;