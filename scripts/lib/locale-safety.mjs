/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { gitLines, gitPaths } from './git.mjs';

/**
 * マージ中は取り込み元と完全一致する翻訳だけを許可する。
 * @param {string[]} changedFiles
 * @returns {string[]}
 */
export function forbiddenLocaleChanges(changedFiles) {
	const mergeHeadPath = gitLines(['rev-parse', '--git-path', 'MERGE_HEAD'])[0];
	const sources = mergeHeadPath && existsSync(mergeHeadPath)
		? readFileSync(mergeHeadPath, 'utf8').trim().split(/\s+/)
		: [];
	return changedFiles.filter((file) => {
		if (!file.startsWith('locales/') || !file.endsWith('.yml') || file === 'locales/ja-JP.yml') return false;
		return !sources.some((source) => {
			if (!existsSync(file) || gitPaths(['ls-tree', '--name-only', '-z', source, '--', file]).length === 0) return false;
			const upstream = execFileSync('git', ['show', `${source}:${file}`]);
			if (!readFileSync(file).equals(upstream)) return false;
			if (gitPaths(['ls-files', '-z', '--', file]).length === 0) return false;
			const staged = execFileSync('git', ['show', `:${file}`]);
			return staged.equals(upstream);
		});
	});
}
