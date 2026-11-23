import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersAndAuthTokens1795456260867 implements MigrationInterface {
    name = 'CreateUsersAndAuthTokens1795456260867'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(255) NOT NULL, "fullName" character varying(100) NOT NULL, "passwordHash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isEmailVerified" boolean NOT NULL DEFAULT false, "refreshTokenHash" character varying(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."auth_tokens_type_enum" AS ENUM('email_verification', 'password_reset')`);
        await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "type" "public"."auth_tokens_type_enum" NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c25fb956ebada4b256501585cc" ON "auth_tokens"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_323c4ca6708c6a8b81af2b4ee0" ON "auth_tokens"  ("tokenHash") `);
        await queryRunner.query(`ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_c25fb956ebada4b256501585cca" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_tokens" DROP CONSTRAINT "FK_c25fb956ebada4b256501585cca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_323c4ca6708c6a8b81af2b4ee0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c25fb956ebada4b256501585cc"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`DROP TYPE "public"."auth_tokens_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
