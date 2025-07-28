const { exec } = require('child_process');
const { Client } = require('pg');

async function waitForDatabase() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  });

  let retries = 30;
  while (retries > 0) {
    try {
      console.log(`🔍 Checking database connection... (${31 - retries}/30)`);
      await client.connect();
      await client.end();
      console.log('✅ Database connection successful!');
      return true;
    } catch (error) {
      console.log(`⏳ Database not ready yet. Retrying in 2 seconds... (${retries} attempts left)`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('❌ Could not connect to database after 30 attempts');
}

async function runMigrations() {
  console.log('🔄 Running user-service migrations...');
  console.log('⏳ Please wait while database migrations are running...');
  
  return new Promise((resolve, reject) => {
    const command = 'npm run migration:run';
    
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Migration failed:', error);
        console.error('stderr:', stderr);
        reject(error);
        return;
      }
      
      console.log('✅ User service migrations completed successfully');
      console.log(stdout);
      resolve();
    });
  });
}

// Run the process
async function main() {
  try {
    await waitForDatabase();
    await runMigrations();
    console.log('🎉 All user-service migrations completed!');
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  }
}

main();
