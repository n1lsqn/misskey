/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { effectScope } from 'vue';
import { describe, expect, test, vi } from 'vitest';
import type { Note } from 'misskey-js/entities.js';
import { useRemoteTimeline } from '@/composables/use-remote-timeline.js';

const note = (id: string) => ({ id } as Note);

describe('remote timeline paging', () => {
	test('uses remote cursors across empty pages and deduplicates local notes', async () => {
		const fetch = vi.fn().mockResolvedValueOnce({ notes: [], untilId: 'remote3', skipped: 10 })
			.mockResolvedValueOnce({ notes: [note('local1'), note('local1')], untilId: 'remote2', skipped: 0 })
			.mockResolvedValueOnce({ notes: [note('local1'), note('local2')], untilId: null, skipped: 0 });
		const scope = effectScope();
		const timeline = scope.run(() => useRemoteTimeline(fetch))!;
		await timeline.open('remote.example');
		expect(timeline.untilId.value).toBe('remote3');
		await timeline.load();
		await timeline.load();
		expect(fetch.mock.calls.map(args => args.slice(0, 2))).toEqual([['remote.example', undefined], ['remote.example', 'remote3'], ['remote.example', 'remote2']]);
		expect(timeline.notes.value.map(note => note.id)).toEqual(['local1', 'local2']);
		expect(timeline.untilId.value).toBeNull();
		scope.stop();
	});
	test('retains the cursor on failure for retry and stops repeated cursors', async () => {
		const fetch = vi.fn().mockResolvedValueOnce({ notes: [note('a')], untilId: 'remote2', skipped: 0 })
			.mockRejectedValueOnce({ code: 'REMOTE_TIMELINE_UNAVAILABLE' })
			.mockResolvedValueOnce({ notes: [note('b')], untilId: 'remote2', skipped: 0 });
		const scope = effectScope();
		const timeline = scope.run(() => useRemoteTimeline(fetch))!;
		await timeline.open('remote.example');
		await timeline.load();
		expect(timeline.error.value?.code).toBe('REMOTE_TIMELINE_UNAVAILABLE');
		expect(timeline.untilId.value).toBe('remote2');
		await timeline.load();
		expect(timeline.error.value).toBeNull();
		expect(timeline.untilId.value).toBeNull();
		scope.stop();
	});
	test('ignores stale requests after changing the server and cancels on disposal', async () => {
		let finish!: (value: { notes: Note[]; untilId: null; skipped: number }) => void;
		const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
			.mockResolvedValueOnce({ notes: [note('new')], untilId: null, skipped: 0 });
		const scope = effectScope();
		const timeline = scope.run(() => useRemoteTimeline(fetch))!;
		const old = timeline.open('old.example');
		await timeline.open('new.example');
		expect(fetch.mock.calls[0][2].aborted).toBe(true);
		finish({ notes: [note('old')], untilId: null, skipped: 0 });
		await old;
		expect(timeline.notes.value.map(note => note.id)).toEqual(['new']);
		scope.stop();
		expect(fetch.mock.calls[1][2].aborted).toBe(true);
	});
});
