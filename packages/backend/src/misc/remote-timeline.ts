/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

export function normalizeTimelineHost(value: string): string | null {
	if (/[\s/\\:@?#%]/u.test(value)) return null;
	const host = domainToASCII(value).toLowerCase();
	if (host.length > 253 || isIP(host) || !host.includes('.')) return null;
	if (!host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
	return host;
}

export function parseRemoteTimeline(value: unknown, limit: number): { id: string; eligible: boolean }[] {
	if (!Array.isArray(value) || value.length > limit) throw new Error('Invalid remote timeline');
	const seen = new Set<string>();
	return value.map((note: unknown) => {
		if (note == null || typeof note !== 'object' || !('id' in note) || typeof note.id !== 'string' || !/^[a-zA-Z0-9]{1,128}$/.test(note.id) || seen.has(note.id)) {
			throw new Error('Invalid remote note ID');
		}
		seen.add(note.id);
		const eligible = 'visibility' in note && note.visibility === 'public'
			&& !('localOnly' in note && note.localOnly === true)
			&& 'user' in note && note.user != null && typeof note.user === 'object'
			&& 'host' in note.user && note.user.host === null;
		return { id: note.id, eligible };
	});
}
