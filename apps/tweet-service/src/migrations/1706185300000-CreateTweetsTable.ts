import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTweetsTable1706185300000 implements MigrationInterface {
    name = 'CreateTweetsTable1706185300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tweets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "content" text NOT NULL,
                "author_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_tweets_content_length" CHECK (LENGTH("content") <= 280),
                CONSTRAINT "PK_tweets_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tweets_author_id" ON "tweets" ("author_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tweets_created_at" ON "tweets" ("created_at" DESC)`);

        // Create trigger function for automatic updated_at (tweet-service specific)
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_tweets_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updated_at" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Apply trigger to tweets table
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_tweets_updated_at ON "tweets"`);
        await queryRunner.query(`
            CREATE TRIGGER update_tweets_updated_at 
            BEFORE UPDATE ON "tweets" 
            FOR EACH ROW EXECUTE FUNCTION update_tweets_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_tweets_updated_at ON "tweets"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_tweets_updated_at_column() CASCADE`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tweets_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tweets_author_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tweets"`);
    }
}
