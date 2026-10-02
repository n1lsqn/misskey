/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import type { MiRemoteUser } from '@/models/User.js';

describe('fork federation features', () => {
	test('remote decorations validate identity, reject non-HTTPS and cap offsets', async () => {
		const service = Object.create(ApPersonService.prototype) as ApPersonService;
		const send = vi.fn().mockResolvedValue({ json: async () => ({ username: 'remote', host: null, avatarDecorations: [
			{ id: 'valid', url: 'https://example.com/deco.png', offsetX: 20 },
			{ id: 'invalid', url: 'javascript:alert(1)' },
		] }) });
		Object.assign(service, { httpRequestService: { send } });
		const result = await service['resolveRemoteDecorations']({ host: 'example.com', username: 'remote' } as MiRemoteUser);
		expect(result.avatarDecorations).toHaveLength(1);
		expect(result.avatarDecorations?.[0].offsetX).toBe(1);
		send.mockResolvedValue({ json: async () => ({ username: 'other', avatarDecorations: [] }) });
		expect(await service['resolveRemoteDecorations']({ host: 'example.com', username: 'remote' } as MiRemoteUser)).toEqual({});
	});
	test('anti-spam only blocks remote mentions without a local follower when enabled', async () => {
		const service = Object.create(NoteCreateService.prototype) as NoteCreateService;
		const meta = { enableAntiSpam: false };
		const existsBy = vi.fn().mockResolvedValue(false);
		Object.assign(service, { meta, followingsRepository: { existsBy } });
		const sender = { id: 'remote', host: 'example.com' };
		const targets = [{ id: 'local', host: null, username: 'local', uri: null }];
		await service['assertRemoteMentionsAllowed'](sender, targets);
		expect(existsBy).not.toHaveBeenCalled();
		meta.enableAntiSpam = true;
		await expect(service['assertRemoteMentionsAllowed'](sender, targets)).rejects.toThrow('without local followers');
		existsBy.mockResolvedValue(true);
		await expect(service['assertRemoteMentionsAllowed'](sender, targets)).resolves.toBeUndefined();
		await expect(service['assertRemoteMentionsAllowed']({ ...sender, host: null }, targets)).resolves.toBeUndefined();
	});
});
