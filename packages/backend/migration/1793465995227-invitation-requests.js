/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class InvitationRequests1793465995227 {
    name = 'InvitationRequests1793465995227';

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "enableInvitationRequests" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE TABLE "invitation_request" ("id" character varying(32) NOT NULL, "email" character varying(256) NOT NULL, "reason" character varying(2000) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "ticketId" character varying(32), "sentAt" TIMESTAMP WITH TIME ZONE, "sendingAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_invitation_request" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_invitation_request_email" ON "invitation_request" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_invitation_request_status" ON "invitation_request" ("status")`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "invitation_request"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableInvitationRequests"`);
    }
}
