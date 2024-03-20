export class AddDisableVillageMode1710432846857 {
	name = 'AddDisableVillageMode1710432846857'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN "disableVillageMode" boolean NOT NULL DEFAULT true;`)
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "disableVillageMode";`)
	}
}
