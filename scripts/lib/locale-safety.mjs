/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { gitLines, gitPaths } from './git.mjs';

function readGitFile(ref, file) {
	try {
		return execFileSync('git', ['show', `${ref}:${file}`]);
	} catch {
		return null;
	}
}

function isOfficialReleaseSource(commit) {
	if (gitLines(['tag', '--contains', commit]).some(tag => /^\d{4}\.\d+\.\d+$/.test(tag))) return true;

	const subject = gitLines(['show', '-s', '--format=%s', commit])[0] ?? '';
	const releaseVersion = /^Release: (\d{4}\.\d+\.\d+)$/.exec(subject)?.[1];
	if (releaseVersion === undefined) return false;

	try {
		const rootVersion = JSON.parse(execFileSync('git', ['show', `${commit}:package.json`], { encoding: 'utf8' })).version;
		const sdkVersion = JSON.parse(execFileSync('git', ['show', `${commit}:packages/misskey-js/package.json`], { encoding: 'utf8' })).version;
		return rootVersion === releaseVersion && sdkVersion === releaseVersion;
	} catch {
		return false;
	}
}

function matchesImportedRelease(file, base) {
	if (!existsSync(file) || gitPaths(['ls-files', '-z', '--', file]).length === 0) return false;
	const workingTree = readFileSync(file);
	const staged = execFileSync('git', ['show', `:${file}`]);
	if (!workingTree.equals(staged)) return false;

	const mergeCommits = gitLines(['rev-list', '--min-parents=2', `${base}..HEAD`]);
	return mergeCommits.some(mergeCommit => {
		const fields = gitLines(['rev-list', '--parents', '-n', '1', mergeCommit])[0]?.split(' ') ?? [];
		const parents = fields.slice(1);
		const target = parents[0];
		if (target === undefined) return false;

		return parents.slice(1).some(source => {
			if (!isOfficialReleaseSource(source)) return false;
			const sourceFile = readGitFile(source, file);
			const targetFile = readGitFile(target, file);
			return sourceFile !== null && !sourceFile.equals(targetFile ?? Buffer.alloc(0)) && workingTree.equals(sourceFile);
		});
	});
}

/**
 * マージ中、または公式リリースコミットから取り込んだ翻訳と完全一致するものだけを許可する。
 * @param {string[]} changedFiles
 * @param {string | null} [base]
 * @returns {string[]}
 */
export function forbiddenLocaleChanges(changedFiles, base = null) {
	const mergeHeadPath = gitLines(['rev-parse', '--git-path', 'MERGE_HEAD'])[0];
	const sources = mergeHeadPath && existsSync(mergeHeadPath)
		? readFileSync(mergeHeadPath, 'utf8').trim().split(/\s+/)
		: [];
	return changedFiles.filter((file) => {
		if (!file.startsWith('locales/') || !file.endsWith('.yml') || file === 'locales/ja-JP.yml') return false;
		const matchesMergeSource = sources.some((source) => {
			if (!existsSync(file) || gitPaths(['ls-tree', '--name-only', '-z', source, '--', file]).length === 0) return false;
			const upstream = execFileSync('git', ['show', `${source}:${file}`]);
			if (!readFileSync(file).equals(upstream)) return false;
			if (gitPaths(['ls-files', '-z', '--', file]).length === 0) return false;
			const staged = execFileSync('git', ['show', `:${file}`]);
			return staged.equals(upstream);
		});
		return !matchesMergeSource && !(base !== null && matchesImportedRelease(file, base));
	});
}
