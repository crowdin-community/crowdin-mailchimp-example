// Structure of mapping table
module.exports = function(sequelize, DataTypes) {
  const Mapping = sequelize.define('mapping', {
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    integrationFileId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    crowdinFileId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    crowdinUpdatedAt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    integrationUpdatedAt: {
      type: DataTypes.STRING,
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

  return Mapping;
};