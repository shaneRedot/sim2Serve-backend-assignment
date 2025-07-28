import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TweetsModule } from './tweets/tweets.module';
import { AuthModule } from './auth/auth.module';
import { Tweet } from './entities/tweet.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USERNAME || 'sim2serve_user',
      password: process.env.DATABASE_PASSWORD || 'sim2serve_password',
      database: process.env.DATABASE_NAME || 'sim2serve_db',
      entities: [Tweet],
      migrations: ['dist/migrations/*{.ts,.js}'],
      migrationsRun: true, // Auto-run migrations on startup
      synchronize: false, // Use migrations instead of auto-sync
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    TweetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
