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

test('allows locale updates that exactly match an imported official release', () => {
	const previous = process.cwd();
	const dir = mkdtempSync(join(tmpdir(), 'misskey-locale-release-test-'));
	try {
		process.chdir(dir);
		const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
		const gitCommit = (...args) => git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', ...args);
		git('init', '--quiet');
		const targetBranch = git('branch', '--show-current');
		mkdirSync('locales');
		mkdirSync('packages/misskey-js', { recursive: true });
		writeFileSync('locales/en-US.yml', 'hello: Hello\n');
		writeFileSync('package.json', JSON.stringify({ version: '2026.10.0' }));
		writeFileSync('packages/misskey-js/package.json', JSON.stringify({ version: '2026.10.0' }));
		writeFileSync('README.md', 'base\n');
		git('add', '.');
		gitCommit('-m', 'base');
		const base = git('rev-parse', 'HEAD');

		git('checkout', '-b', 'release-source');
		writeFileSync('locales/en-US.yml', 'hello: Hello from Crowdin\n');
		git('add', 'locales/en-US.yml');
		gitCommit('-m', 'New Crowdin updates (#123)');
		writeFileSync('package.json', JSON.stringify({ version: '2026.10.1' }));
		writeFileSync('packages/misskey-js/package.json', JSON.stringify({ version: '2026.10.1' }));
		git('add', 'package.json', 'packages/misskey-js/package.json');
		gitCommit('-m', 'Release: 2026.10.1');

		git('checkout', targetBranch);
		writeFileSync('README.md', 'target update\n');
		git('add', 'README.md');
		gitCommit('-m', 'target update');
		git('merge', '--no-edit', 'release-source');

		const files = ['locales/en-US.yml'];
		assert.deepEqual(forbiddenLocaleChanges(files, base), []);

		writeFileSync('locales/en-US.yml', 'hello: Manual edit\n');
		assert.deepEqual(forbiddenLocaleChanges(files, base), files);
	} finally {
		process.chdir(previous);
		rmSync(dir, { recursive: true, force: true });
	}
});
