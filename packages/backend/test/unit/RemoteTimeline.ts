/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import RemoteTimeline from '@/server/api/endpoints/notes/remote-timeline.js';
import { normalizeTimelineHost, parseRemoteTimeline } from '@/misc/remote-timeline.js';
import type { MiLocalUser } from '@/models/User.js';

const me = { id: 'viewer' } as MiLocalUser;
const remote = (id: string, extra = {}) => ({ id, visibility: 'public', user: { host: null }, ...extra });

function setup(body: unknown) {
	const query = { where: vi.fn(), andWhere: vi.fn(), innerJoinAndSelect: vi.fn(), leftJoinAndSelect: vi.fn(), getMany: vi.fn().mockResolvedValue([]) };
	for (const method of ['where', 'andWhere', 'innerJoinAndSelect', 'leftJoinAndSelect'] as const) query[method].mockReturnValue(query);
	const send = vi.fn().mockResolvedValue({ url: 'https://remote.example/api/notes/local-timeline', json: async () => body });
	const utility = { isSelfHost: vi.fn().mockReturnValue(false), isFederationAllowedHost: vi.fn().mockReturnValue(true) };
	const resolveNote = vi.fn().mockResolvedValue(null);
	const packMany = vi.fn().mockImplementation(async notes => notes);
	const filtering = { generateVisibilityQuery: vi.fn(), generateBaseNoteFilteringQuery: vi.fn(), generateMutedUserRenotesQueryForNotes: vi.fn() };
	const endpoint = new RemoteTimeline({ createQueryBuilder: () => query } as never, { send } as never, utility as never, { resolveNote } as never, { packMany } as never, filtering as never);
	return { endpoint, query, send, utility, resolveNote, packMany, filtering };
}

describe('remote local timeline', () => {
	test('normalizes domains and rejects URLs, IPs, credentials, ports and malformed hosts', () => {
		expect(normalizeTimelineHost('REMOTE.Example')).toBe('remote.example');
		expect(normalizeTimelineHost('例え.テスト')).toBe('xn--r8jz45g.xn--zckzah');
		for (const host of ['localhost', '127.0.0.1', '0x7f000001', 'https://remote.example', 'user@remote.example', 'remote.example:443', 'remote.example/path', 'remote.example\\path', 'remote.example?', 'remote.example.', '-bad.example', 'remote.example\n']) {
			expect(normalizeTimelineHost(host), host).toBeNull();
		}
	});
	test('invalid and blocked hosts never trigger an outbound request', async () => {
		const { endpoint, send, utility } = setup([]);
		await expect(endpoint.exec({ host: '127.0.0.1' }, me, null)).rejects.toMatchObject({ code: 'INVALID_HOST' });
		utility.isSelfHost.mockReturnValue(true);
		await expect(endpoint.exec({ host: 'remote.example' }, me, null)).rejects.toMatchObject({ code: 'INVALID_HOST' });
		utility.isSelfHost.mockReturnValue(false);
		utility.isFederationAllowedHost.mockReturnValue(false);
		await expect(endpoint.exec({ host: 'remote.example' }, me, null)).rejects.toMatchObject({ code: 'FEDERATION_NOT_ALLOWED' });
		expect(send).not.toHaveBeenCalled();
	});
	test('keeps a remote cursor even when every note is non-federated or deleted; never sends a token', async () => {
		const { endpoint, send, resolveNote } = setup([remote('r3', { localOnly: true }), remote('r2', { visibility: 'followers' }), remote('r1')]);
		const result = await endpoint.exec({ host: 'remote.example', limit: 3, untilId: 'r4', i: 'local-secret' }, me, null);
		expect(result).toEqual({ notes: [], untilId: 'r1', skipped: 3 });
		expect(resolveNote).toHaveBeenCalledTimes(1);
		expect(resolveNote).toHaveBeenCalledWith('https://remote.example/notes/r1');
		expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({ limit: 3, untilId: 'r4', withRenotes: true });
		expect(send.mock.calls[0][1].redirect).toBe('error');
	});
	test('preserves remote ordering, applies viewer filters and skips individual failures', async () => {
		const { endpoint, query, resolveNote, filtering } = setup([remote('r3'), remote('r2'), remote('r1')]);
		const a = { id: 'localA', userHost: 'remote.example', visibility: 'public', localOnly: false };
		const b = { ...a, id: 'localB' };
		resolveNote.mockResolvedValueOnce(a).mockRejectedValueOnce(new Error('deleted')).mockResolvedValueOnce(b);
		query.getMany.mockResolvedValue([b, a]);
		const result = await endpoint.exec({ host: 'remote.example', limit: 3 }, me, null);
		expect(result).toEqual({ notes: [a, b], untilId: 'r1', skipped: 1 });
		for (const fn of Object.values(filtering)) expect(fn).toHaveBeenCalledWith(query, me);
	});
	test('rejects non-public AP notes and mismatched author hosts even if the LTL claims otherwise', async () => {
		const { endpoint, resolveNote } = setup([remote('r3'), remote('r2'), remote('r1')]);
		resolveNote.mockResolvedValueOnce({ id: 'a', userHost: 'remote.example', visibility: 'followers' })
			.mockResolvedValueOnce({ id: 'b', userHost: 'other.example', visibility: 'public' })
			.mockResolvedValueOnce({ id: 'c', userHost: 'remote.example', visibility: 'public', localOnly: true });
		expect(await endpoint.exec({ host: 'remote.example' }, me, null)).toEqual({ notes: [], untilId: null, skipped: 3 });
	});
	test('reports remote errors and invalid responses without importing notes', async () => {
		const { endpoint, send, resolveNote } = setup({ error: 'not an array' });
		await expect(endpoint.exec({ host: 'remote.example' }, me, null)).rejects.toMatchObject({ code: 'REMOTE_TIMELINE_INVALID' });
		send.mockRejectedValueOnce(new Error('403'));
		await expect(endpoint.exec({ host: 'remote.example' }, me, null)).rejects.toMatchObject({ code: 'REMOTE_TIMELINE_UNAVAILABLE' });
		send.mockResolvedValueOnce({ url: 'https://other.example/api/notes/local-timeline', json: async () => [] });
		await expect(endpoint.exec({ host: 'remote.example' }, me, null)).rejects.toMatchObject({ code: 'REMOTE_TIMELINE_UNAVAILABLE' });
		expect(resolveNote).not.toHaveBeenCalled();
		for (const body of [[remote('../x')], [remote('r1'), remote('r1')], [remote('r1'), remote('r2')]]) {
			expect(() => parseRemoteTimeline(body, 1)).toThrow();
		}
	});
});
