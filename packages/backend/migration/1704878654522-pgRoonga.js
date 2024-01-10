export class PgRoonga1704878654522 {
    name = 'PgRoonga1704878654522'

		async up(queryRunner) {
			await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgroonga;`)
			await queryRunner.query(`CREATE INDEX "IDX_PGROONGA_NOTE" ON "note" USING pgroonga("text", "cw");`)
		}

		async down(queryRunner) {
			await queryRunner.query(`DROP INDEX "IDX_PGROONGA_NOTE";`)
		}
}
