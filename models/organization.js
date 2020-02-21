
module.exports = function(sequelize, DataTypes){
  return sequelize.define('organization',{
      uid: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
      },
      accessToken: {
          type: DataTypes.STRING,
          allowNull: false,
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expire: {
        type: DataTypes.STRING,
        allowNull: false,
      }
  });
};