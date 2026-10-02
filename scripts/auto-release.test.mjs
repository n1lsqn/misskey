/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checksPassed, releasePlan } from './auto-release.mjs';
const passed = { id: 1, name: 'test', status: 'completed', conclusion: 'success' };
test('requires every required check to finish successfully', () => {
	assert.equal(checksPassed([], ['test']), false);
	assert.equal(checksPassed([passed], []), false);
	for (const conclusion of ['failure', 'cancelled', 'skipped', 'neutral', null]) {
		assert.equal(checksPassed([{ ...passed, conclusion }], ['test']), false);
	}
	assert.equal(checksPassed([{ ...passed, status: 'in_progress' }], ['test']), false);
	assert.equal(checksPassed([passed], ['test']), true);
});
test('a rerun supersedes an older result and extra failed checks block release', () => {
	assert.equal(checksPassed([passed, { ...passed, id: 2, conclusion: 'failure' }], ['test']), false);
	assert.equal(checksPassed([{ ...passed, conclusion: 'failure' }, { ...passed, id: 2 }], ['test']), true);
	assert.equal(checksPassed([passed, { ...passed, name: 'other', conclusion: 'failure' }], ['test']), false);
	assert.equal(checksPassed([passed, { ...passed, name: 'Release after successful CI', status: 'in_progress' }], ['test']), true);
});
test('never moves an existing tag or releases the same commit twice', () => {
	assert.deepEqual(releasePlan('2026.10.0-n1l.3', '2026.10.0-n1l.3', new Map(), 'abc'), { action: 'tag', version: '2026.10.0-n1l.3' });
	const tags = new Map([['2026.10.0-n1l.3', 'abc'], ['2026.10.0-n1l.5', 'other']]);
	assert.equal(releasePlan('2026.10.0-n1l.3', '2026.10.0-n1l.3', tags, 'abc').action, 'none');
	assert.deepEqual(releasePlan('2026.10.0-n1l.3', '2026.10.0-n1l.3', tags, 'new'), { action: 'pr', version: '2026.10.0-n1l.6' });
	assert.throws(() => releasePlan('2026.10.0-n1l.3', '2026.10.0-n1l.2', tags, 'new'));
	assert.throws(() => releasePlan('invalid', 'invalid', tags, 'new'));
});
