module.exports = (sequelize, DataTypes) => {
  const Meta = sequelize.define('Meta', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.TEXT }
  }, {
    tableName: 'meta',
    timestamps: false
  });
  return Meta;
};
