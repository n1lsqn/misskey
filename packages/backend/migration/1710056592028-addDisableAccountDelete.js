/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddDisableAccountDelete1710056592028 {
		name = 'AddDisableAccountDelete1710056592028'

		async up(queryRunner) {
				await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "disableAccountDelete" boolean NOT NULL DEFAULT true;`)
		}

		async down(queryRunner) {
				await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "disableAccountDelete";`)
		}
}
