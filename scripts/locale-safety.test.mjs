/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { forbiddenLocaleChanges } from './lib/locale-safety.mjs';

test('only exact incoming translations are allowed during a merge', () => {
	const previous = process.cwd();
	const dir = mkdtempSync(join(tmpdir(), 'misskey-locale-test-'));
	try {
		process.chdir(dir);
		const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
		git('init', '--quiet');
		mkdirSync('locales');
		writeFileSync('locales/en-US.yml', 'hello: Hello\n');
		git('add', '.');
		git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'translation');
		const source = git('rev-parse', 'HEAD');
		const files = ['locales/en-US.yml', 'locales/ja-JP.yml', 'README.md'];
		assert.deepEqual(forbiddenLocaleChanges(files), ['locales/en-US.yml']);
		writeFileSync('.git/MERGE_HEAD', `${source}\n`);
		assert.deepEqual(forbiddenLocaleChanges(files), []);
		writeFileSync('locales/en-US.yml', 'hello: Manual edit\n');
		assert.deepEqual(forbiddenLocaleChanges(files), ['locales/en-US.yml']);
		git('add', 'locales/en-US.yml');
		writeFileSync('locales/en-US.yml', 'hello: Hello\n');
		assert.deepEqual(forbiddenLocaleChanges(files), ['locales/en-US.yml']);
		unlinkSync('locales/en-US.yml');
		assert.deepEqual(forbiddenLocaleChanges(files), ['locales/en-US.yml']);
		writeFileSync('locales/new.yml', 'hello: New\n');
		assert.deepEqual(forbiddenLocaleChanges(['locales/new.yml']), ['locales/new.yml']);
	} finally {
		process.chdir(previous);
		rmSync(dir, { recursive: true, force: true });
	}
});
