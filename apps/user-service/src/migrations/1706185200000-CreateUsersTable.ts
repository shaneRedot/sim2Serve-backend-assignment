import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1706185200000 implements MigrationInterface {
    name = 'CreateUsersTable1706185200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "username" character varying(50) NOT NULL,
                "email" character varying(255) NOT NULL,
                "password_hash" character varying(255) NOT NULL,
                "first_name" character varying(100),
                "last_name" character varying(100),
                "bio" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_username" UNIQUE ("username"),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username")`);

        // Create or replace trigger function for automatic updated_at (user-service specific)
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_users_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updated_at" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Drop trigger if exists and recreate
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON "users"`);
        await queryRunner.query(`
            CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON "users" 
            FOR EACH ROW EXECUTE FUNCTION update_users_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON "users"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_users_updated_at_column() CASCADE`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_username"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }
}
