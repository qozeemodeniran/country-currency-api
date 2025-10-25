require('dotenv').config();

const getSequelizeConfig = (nodeEnv = process.env.NODE_ENV || 'development') => {
  //Heroku sets JAWSDB_URL or CLEARDB_DATABASE_URL
  const url = process.env.JAWSDB_URL || process.env.CLEARDB_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    // fallback to a required env variable for local dev
    console.error('Missing JAWSDB_URL / CLEARDB_DATABASE_URL / DATABASE_URL in env.');
  }
  return {
    use_env_variable: 'JAWSDB_URL',
    url,
    dialect: 'mysql',
    dialectOptions: {
      // optional SSL if required by provider
      // ssl: { rejectUnauthorized: true }
    },
    logging: false
  }
}

module.exports = getSequelizeConfig();
