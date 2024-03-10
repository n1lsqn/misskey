export class AddDisableAccountDelete1710056592028 {
		name = 'AddDisableAccountDelete1710056592028'

		async up(queryRunner) {
				await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "disableAccountDelete" boolean NOT NULL DEFAULT true;`)
		}

		async down(queryRunner) {
				await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "disableAccountDelete";`)
		}
}
