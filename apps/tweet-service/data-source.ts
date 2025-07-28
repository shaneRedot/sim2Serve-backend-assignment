import { DataSource } from 'typeorm';
import { Tweet } from './src/entities/tweet.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [Tweet],
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTableName: 'tweet_service_migrations',
  logging: process.env.NODE_ENV === 'development',
  synchronize: false, // Always false for production safety
});
