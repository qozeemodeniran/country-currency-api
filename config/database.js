const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.config = this.getConfig();
  }

  getConfig() {
    // Use ONLY JawsDB - no localhost fallback
    if (process.env.JAWSDB_URL) {
      return {
        uri: process.env.JAWSDB_URL
      };
    }
    
    if (process.env.JAWSDB_HOST) {
      return {
        host: process.env.JAWSDB_HOST,
        user: process.env.JAWSDB_USER,
        password: process.env.JAWSDB_PASSWORD,
        database: process.env.JAWSDB_DATABASE,
        port: process.env.JAWSDB_PORT || 3306
      };
    }

    throw new Error('JAWSDB configuration not found. Please set JAWSDB_URL or JAWSDB_* environment variables.');
  }

  async createConnection() {
    try {
      if (this.config.uri) {
        return await mysql.createConnection(this.config.uri);
      }
      return await mysql.createConnection(this.config);
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error('Database connection failed');
    }
  }

  async initDatabase() {
    const connection = await this.createConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS countries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        capital VARCHAR(255),
        region VARCHAR(255),
        population BIGINT NOT NULL,
        currency_code VARCHAR(10),
        exchange_rate DECIMAL(20,6),
        estimated_gdp DECIMAL(30,6),
        flag_url VARCHAR(500),
        last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_region (region),
        INDEX idx_currency (currency_code),
        INDEX idx_gdp (estimated_gdp)
      )
    `;

    const createMetadataTableQuery = `
      CREATE TABLE IF NOT EXISTS refresh_metadata (
        id INT PRIMARY KEY DEFAULT 1,
        last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_countries INT DEFAULT 0
      )
    `;

    try {
      await connection.execute(createTableQuery);
      await connection.execute(createMetadataTableQuery);
      
      // Initialize metadata
      await connection.execute(`
        INSERT IGNORE INTO refresh_metadata (id, last_refreshed_at, total_countries) 
        VALUES (1, NOW(), 0)
      `);
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    } finally {
      await connection.end();
    }
  }
}

module.exports = new Database();