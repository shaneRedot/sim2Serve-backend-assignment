const { Client } = require('pg');

async function resetDatabase() {
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

    console.log('🧹 Dropping all triggers...');
    await client.query(`DROP TRIGGER IF EXISTS update_tweets_updated_at ON tweets`);
    await client.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);

    console.log('🧹 Dropping all tables...');
    await client.query(`DROP TABLE IF EXISTS tweets CASCADE`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE`);
    
    console.log('🧹 Dropping all functions...');
    await client.query(`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`);
    
    console.log('🧹 Clearing migration history...');
    await client.query(`DELETE FROM typeorm_migrations`);

    console.log('✅ Database reset complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetDatabase();
