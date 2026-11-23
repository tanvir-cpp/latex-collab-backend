import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkspacesProjectsDocuments1795456502606 implements MigrationInterface {
    name = 'CreateWorkspacesProjectsDocuments1795456502606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workspaces" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "description" text NOT NULL DEFAULT '', "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_098656ae401f3e1a4586f47fd8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_77607c5b6af821ec294d33aab0" ON "workspaces"  ("ownerId") `);
        await queryRunner.query(`CREATE TYPE "public"."project_members_role_enum" AS ENUM('owner', 'editor', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "project_members" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "projectId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."project_members_role_enum" NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_08d1346ff91abba68e5a637cfd" ON "project_members"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_326b2a901eb18ac24eabc9b058" ON "project_members"  ("projectId", "userId") `);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "description" text NOT NULL DEFAULT '', "ownerId" uuid NOT NULL, "workspaceId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a8e7e6c3f9d9528ed35fe5bae3" ON "projects"  ("ownerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_108ff8a2d40c2b294511c92a7c" ON "projects"  ("workspaceId") `);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "projectId" uuid NOT NULL, "path" character varying(255) NOT NULL, "content" text NOT NULL DEFAULT '', "yjsState" bytea, "createdById" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc4158686ad37c2bf7f6fbfe26" ON "documents"  ("projectId", "path") `);
        await queryRunner.query(`CREATE TYPE "public"."project_invitations_role_enum" AS ENUM('owner', 'editor', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "project_invitations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "projectId" uuid NOT NULL, "email" character varying(255) NOT NULL, "role" "public"."project_invitations_role_enum" NOT NULL, "invitedById" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "acceptedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bddf504e527c1c64289e2c9cfd8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_55c8a93fcb3af8430c930e3a26" ON "project_invitations"  ("projectId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_95ee31e163d57eeef842edc8e8" ON "project_invitations"  ("tokenHash") `);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD CONSTRAINT "FK_77607c5b6af821ec294d33aab0c" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_d19892d8f03928e5bfc7313780c" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_08d1346ff91abba68e5a637cfdb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_a8e7e6c3f9d9528ed35fe5bae33" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_108ff8a2d40c2b294511c92a7c8" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_fe6ebd6e679c0feee3a7ecc0354" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_129be5647f7217471286e249c34" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_invitations" ADD CONSTRAINT "FK_55c8a93fcb3af8430c930e3a26a" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_invitations" ADD CONSTRAINT "FK_dcf3a7d5896351463148bf29027" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_invitations" DROP CONSTRAINT "FK_dcf3a7d5896351463148bf29027"`);
        await queryRunner.query(`ALTER TABLE "project_invitations" DROP CONSTRAINT "FK_55c8a93fcb3af8430c930e3a26a"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_129be5647f7217471286e249c34"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_fe6ebd6e679c0feee3a7ecc0354"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_108ff8a2d40c2b294511c92a7c8"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_a8e7e6c3f9d9528ed35fe5bae33"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_08d1346ff91abba68e5a637cfdb"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_d19892d8f03928e5bfc7313780c"`);
        await queryRunner.query(`ALTER TABLE "workspaces" DROP CONSTRAINT "FK_77607c5b6af821ec294d33aab0c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95ee31e163d57eeef842edc8e8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_55c8a93fcb3af8430c930e3a26"`);
        await queryRunner.query(`DROP TABLE "project_invitations"`);
        await queryRunner.query(`DROP TYPE "public"."project_invitations_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc4158686ad37c2bf7f6fbfe26"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_108ff8a2d40c2b294511c92a7c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8e7e6c3f9d9528ed35fe5bae3"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_326b2a901eb18ac24eabc9b058"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_08d1346ff91abba68e5a637cfd"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TYPE "public"."project_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77607c5b6af821ec294d33aab0"`);
        await queryRunner.query(`DROP TABLE "workspaces"`);
    }

}
