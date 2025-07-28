const { Client } = require('pg');

async function checkMigrations() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'dev-sim2serve-db-instance.cknyyc82yqf8.us-east-1.rds.amazonaws.com',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'sim2serve_db',
    user: process.env.DATABASE_USERNAME || 'sim2serve_db',
    password: process.env.DATABASE_PASSWORD || 'SecurePassword123',
  });

  try {
    await client.connect();
    console.log('🔍 Connected to database');

    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\n📋 Existing tables:');
    tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check migrations
    const migrationsResult = await client.query(`
      SELECT * FROM typeorm_migrations ORDER BY timestamp DESC
    `);
    console.log('\n🔄 Migration history:');
    migrationsResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${new Date(parseInt(row.timestamp))})`);
    });

    // Check users table structure
    const usersStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('\n👥 Users table structure:');
    usersStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Check tweets table structure if it exists
    try {
      const tweetsStructure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tweets' 
        ORDER BY ordinal_position
      `);
      console.log('\n🐦 Tweets table structure:');
      tweetsStructure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } catch (err) {
      console.log('\n🐦 Tweets table does not exist');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkMigrations();
