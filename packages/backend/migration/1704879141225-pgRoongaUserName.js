export class PgRoongaUserName1704879141225 {
    name = 'PgRoongaUserName1704879141225'

		async up(queryRunner) {
			await queryRunner.query(`CREATE INDEX "IDX_PGROONGA_USER_NAME" ON "user" USING pgroonga("name", pgroonga_varchar_full_text_search_ops_v2);`)
    }

		async down(queryRunner) {
			await queryRunner.query(`DROP INDEX "IDX_PGROONGA_USER_NAME";`)
		}
}
