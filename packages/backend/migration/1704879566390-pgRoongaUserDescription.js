export class PgRoongaUserDescription1704879566390 {
    name = 'PgRoongaUserDescription1704879566390'

		async up(queryRunner) {
			await queryRunner.query(`CREATE INDEX "IDX_PGROONGA_USER_DESCRIPTION" ON "user" USING pgroonga("description");`)
    }

		async down(queryRunner) {
			await queryRunner.query(`DROP INDEX "IDX_PGROONGA_USER_DESCRIPTION";`)
		}
}
