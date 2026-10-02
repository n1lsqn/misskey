/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const concurrently = process.env.MISSKEY_MIGRATION_CREATE_INDEX_CONCURRENTLY === '1';
export class ForkFeatures1790930122383 {
	name = 'ForkFeatures1790930122383';
	transaction = concurrently ? false : undefined;

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "note" ADD "deleteAt" TIMESTAMP WITH TIME ZONE`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "enableAntiSpam" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`CREATE INDEX ${concurrently ? 'CONCURRENTLY' : ''} "IDX_note_deleteAt" ON "note" ("deleteAt") WHERE "deleteAt" IS NOT NULL`);
	}

	async down(queryRunner) {
		await queryRunner.query(`DROP INDEX ${concurrently ? 'CONCURRENTLY' : ''} "IDX_note_deleteAt"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableAntiSpam"`);
		await queryRunner.query(`ALTER TABLE "note" DROP COLUMN "deleteAt"`);
	}
}
