import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User],
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTableName: 'user_service_migrations',
  logging: process.env.NODE_ENV === 'development',
  synchronize: false, // Always false for production safety
});
