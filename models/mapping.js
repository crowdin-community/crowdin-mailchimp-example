
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

  Mapping.getFilesByDomainProjectId= function(res) {
    return new Promise ((resolve, reject) => {
      Mapping.findAll({where: {
          domain: res.origin.domain,
          projectId: res.origin.context.project_id,
        }})
        .then( reccords => resolve(reccords))
        .catch(e => reject('Cant get data from mapping', e));
    });
  };

  return Mapping;
};