

module.exports = function(sequelize, DataTypes) {
  const State = sequelize.define('state', {
    uid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expireAt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    data: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  })};