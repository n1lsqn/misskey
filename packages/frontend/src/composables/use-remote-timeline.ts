/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { onScopeDispose, ref } from 'vue';
import type { Note } from 'misskey-js/entities.js';

type RemoteTimelinePage = { notes: Note[]; untilId: string | null; skipped: number };
type FetchPage = (host: string, untilId: string | undefined, signal: AbortSignal) => Promise<RemoteTimelinePage>;

export function useRemoteTimeline(fetchPage: FetchPage) {
	const host = ref('');
	const notes = ref<Note[]>([]);
	const untilId = ref<string | null>(null);
	const skipped = ref(0);
	const busy = ref(false);
	const loaded = ref(false);
	const error = ref<{ code?: string } | null>(null);
	let generation = 0;
	let controller: AbortController | undefined;
	const seenCursors = new Set<string>();

	async function load() {
		if (busy.value || !host.value) return;
		const current = generation;
		controller = new AbortController();
		busy.value = true;
		error.value = null;
		try {
			const page = await fetchPage(host.value, untilId.value ?? undefined, controller.signal);
			if (current !== generation) return;
			const seen = new Set(notes.value.map(note => note.id));
			notes.value.push(...page.notes.filter(note => {
				if (seen.has(note.id)) return false;
				seen.add(note.id);
				return true;
			}));
			skipped.value = page.skipped;
			untilId.value = page.untilId != null && !seenCursors.has(page.untilId) ? page.untilId : null;
			if (page.untilId != null) seenCursors.add(page.untilId);
			loaded.value = true;
		} catch (err) {
			if (current === generation) error.value = err != null && typeof err === 'object' ? err : {};
		} finally {
			if (current === generation) busy.value = false;
		}
	}

	function open(newHost: string) {
		generation++;
		controller?.abort();
		host.value = newHost;
		notes.value = [];
		untilId.value = null;
		skipped.value = 0;
		busy.value = false;
		loaded.value = false;
		error.value = null;
		seenCursors.clear();
		return load();
	}

	onScopeDispose(() => {
		generation++;
		controller?.abort();
	});
	return { host, notes, untilId, skipped, busy, loaded, error, open, load };
}
