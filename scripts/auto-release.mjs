/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function checksPassed(checks, required) {
	const latest = new Map();
	for (const check of [...checks].sort((a, b) => a.id - b.id)) {
		if (check.name !== 'Release after successful CI') latest.set(check.name, check);
	}
	return required.length > 0 && required.every(name => {
		const check = latest.get(name);
		return check?.status === 'completed' && check.conclusion === 'success';
	}) && [...latest.values()].every(check => check.status === 'completed' &&
		['success', 'skipped', 'neutral'].includes(check.conclusion));
}

export function releasePlan(version, sdkVersion, tags, sha) {
	if (version !== sdkVersion) throw new Error('Application and SDK versions differ');
	const match = /^(\d+\.\d+\.\d+-n1l)(?:\.(\d+))?$/.exec(version);
	if (!match) throw new Error('Unsupported release version');
	if (!tags.has(version)) return { action: 'tag', version };
	if (tags.get(version) === sha) return { action: 'none', version };
	let number = Number(match[2] ?? 0);
	for (const tag of tags.keys()) {
		if (tag.startsWith(match[1] + '.') && /^\d+$/.test(tag.slice(match[1].length + 1))) {
			number = Math.max(number, Number(tag.slice(match[1].length + 1)));
		}
	}
	return { action: 'pr', version: `${match[1]}.${number + 1}` };
}

function main() {
	const repo = process.env.GITHUB_REPOSITORY;
	if (!repo || !process.env.GH_TOKEN) throw new Error('RELEASE_TOKEN is required');
	const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
	const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
	const api = (path, ...args) => JSON.parse(gh('api', `repos/${repo}/${path}`, ...args));
	const sha = git('rev-parse', 'HEAD');
	const currentHead = () => api('git/ref/heads/n1l').object.sha;
	const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
	if (event.workflow_run && (event.workflow_run.event !== 'push' ||
		event.workflow_run.head_branch !== 'n1l' || event.workflow_run.head_repository.full_name !== repo ||
		event.workflow_run.head_sha !== sha)) return;
	if (currentHead() !== sha) return;
	const protection = api('branches/n1l/protection');
	if (!protection.enforce_admins?.enabled || !protection.required_status_checks?.strict ||
		!protection.required_pull_request_reviews) throw new Error('CI and PR branch protection is required');
	const pages = api(`commits/${sha}/check-runs?per_page=100`, '--paginate', '--slurp');
	if (!checksPassed(pages.flatMap(page => page.check_runs), protection.required_status_checks.contexts)) {
		console.log('CI is pending or failed; no release action');
		return;
	}
	git('fetch', 'origin', '--tags');
	const tags = new Map(git('tag', '--list').split('\n').filter(Boolean).map(tag => [tag, git('rev-list', '-n', '1', tag)]));
	const paths = ['package.json', 'packages/misskey-js/package.json'];
	const versions = paths.map(path => JSON.parse(readFileSync(path, 'utf8')).version);
	const plan = releasePlan(...versions, tags, sha);
	if (plan.action === 'none' || currentHead() !== sha) return;
	if (plan.action === 'tag') {
		git('tag', '-a', plan.version, sha, '-m', `${plan.version}: all required CI checks passed`);
		git('push', 'origin', `refs/tags/${plan.version}`);
		console.log(`Published ${plan.version} at ${sha}`);
		return;
	}
	if (!api('').allow_auto_merge) throw new Error('Enable repository auto-merge');
	const branch = `release/${plan.version}`;
	const existing = JSON.parse(gh('pr', 'list', '--repo', repo, '--base', 'n1l', '--head', branch, '--json', 'number,headRefOid'));
	let number = existing[0]?.number;
	let releaseSha = existing[0]?.headRefOid;
	if (!number) {
		git('switch', '-c', branch);
		for (const [index, path] of paths.entries()) {
			const text = readFileSync(path, 'utf8');
			writeFileSync(path, text.replace(`"version": "${versions[index]}"`, `"version": "${plan.version}"`));
		}
		git('add', '--', ...paths);
		git('commit', '-m', `chore(release): bump version to ${plan.version}`);
		releaseSha = git('rev-parse', 'HEAD');
		if (currentHead() !== sha) return;
		git('push', 'origin', branch);
		const body = `## What\nUpdate the application and SDK to ${plan.version}.\n\n## Why\nRelease changes verified at ${sha}.\n\n## Additional info (optional)\nAuto-merge waits for all required PR checks. The tag is created only after n1l CI passes.\n\n## Checklist\n- [x] Application and SDK versions match\n- [ ] Required PR CI checks passed\n`;
		const result = gh('pr', 'create', '--repo', repo, '--base', 'n1l', '--head', branch,
			'--title', `chore(release): ${plan.version}`, '--body', body);
		number = result.split('/').at(-1);
	}
	gh('pr', 'merge', String(number), '--repo', repo, '--auto', '--merge', '--match-head-commit', releaseSha);
	console.log(`Release PR #${number} waits for required CI`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
