const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('Connected to MySQL.');
    
    const sqlPath = path.join(__dirname, 'database', 'database.sql');
    const sqlString = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL...');
    await connection.query(sqlString);
    console.log('SQL executed successfully!');
    
    await connection.end();
  } catch (error) {
    console.error('Error executing SQL:', error);
  }
}

main();
