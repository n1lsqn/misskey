<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer _gaps" style="--MI_SPACER-w: 800px;">
		<form class="_gaps" @submit.prevent="open">
			<label :class="$style.label">
				{{ i18n.ts.host }}
				<input v-model="inputHost" :class="$style.input" type="text" :spellcheck="false" autocapitalize="none" :disabled="busy" required>
			</label>
			<div class="_caption">{{ i18n.ts.remoteTimelineDescription }}</div>
			<MkButton type="submit" primary :disabled="busy || !inputHost.trim()"><i class="ti ti-world-search"></i> {{ i18n.ts.show }}</MkButton>
		</form>
		<div v-if="host" :class="$style.heading">
			<span>{{ host }}</span>
			<MkButton small :disabled="busy" @click="reload"><i class="ti ti-refresh"></i> {{ i18n.ts.reload }}</MkButton>
		</div>
		<MkInfo v-if="error" warn role="alert">{{ errorMessage }} <MkButton small :disabled="busy" @click="load">{{ i18n.ts.retry }}</MkButton></MkInfo>
		<MkInfo v-if="skipped > 0">{{ i18n.tsx.remoteTimelineSkipped({ count: skipped }) }}</MkInfo>
		<div class="_gaps" :aria-busy="busy">
			<MkNote v-for="note in notes" :key="note.id" :note="note" :withHardMute="true" :class="$style.note"/>
		</div>
		<MkLoading v-if="busy"/>
		<MkResult v-else-if="loaded && notes.length === 0" type="empty" :text="i18n.ts.noNotes"/>
		<MkButton v-if="loaded && untilId" :disabled="busy" @click="load">{{ i18n.ts.loadMore }}</MkButton>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkNote from '@/components/MkNote.vue';
import { useRemoteTimeline } from '@/composables/use-remote-timeline.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { useGlobalEvent } from '@/events.js';

const inputHost = ref('');
const { host, notes, untilId, skipped, busy, loaded, error, open: openTimeline, load } = useRemoteTimeline(
	(host, untilId, signal) => misskeyApi('notes/remote-timeline', { host, untilId }, undefined, signal),
);
const errorMessage = computed(() => {
	if (error.value?.code === 'INVALID_HOST' || error.value?.code === 'INVALID_PARAM') return i18n.ts.remoteTimelineInvalidHost;
	if (error.value?.code === 'FEDERATION_NOT_ALLOWED') return i18n.ts.remoteTimelineBlocked;
	if (error.value?.code === 'RATE_LIMIT_EXCEEDED') return i18n.ts.rateLimitExceeded;
	return i18n.ts.remoteTimelineUnavailable;
});

function open() {
	if (!busy.value) void openTimeline(inputHost.value.trim());
}

function reload() {
	if (!busy.value) void openTimeline(host.value);
}

useGlobalEvent('noteDeleted', id => {
	notes.value = notes.value.filter(note => note.id !== id);
});

definePage(() => ({ title: i18n.ts.remoteTimeline, icon: 'ti ti-world-search' }));
</script>

<style lang="scss" module>
.label {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.input {
	font: inherit;
	color: inherit;
	background: var(--MI_THEME-panel);
	border: solid 1px var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	padding: 12px;
	min-width: 0;
}

.heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--MI-margin);
	overflow-wrap: anywhere;
}

.note {
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
}
</style>
