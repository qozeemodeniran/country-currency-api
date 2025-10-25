require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 3000;

// Ensure DB connection before listening
async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected');
    // run migrations automatically? We will not auto-run migrations here; we instruct to run CLI
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  } catch (err) {
    console.error('Unable to connect to DB:', err);
    process.exit(1);
  }
}

start();
