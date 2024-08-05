/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defaultStore } from './store.js';
import { $i } from '@/account.js';
import { instance } from '@/instance.js';

export const basicTimelineTypes = [
	'home',
	'local',
	'social',
	'global',
	'custom-timeline-1',
	'custom-timeline-2',
	'custom-timeline-3',
	'custom-timeline-4',
	'custom-timeline-5',
] as const;

export type BasicTimelineType = typeof basicTimelineTypes[number];

export function isBasicTimeline(timeline: string): timeline is BasicTimelineType {
	return basicTimelineTypes.includes(timeline as BasicTimelineType);
}

export function basicTimelineIconClass(timeline: BasicTimelineType): string {
	switch (timeline) {
		case 'home':
			return 'ti ti-home';
		case 'local':
			return 'ti ti-planet';
		case 'social':
			return 'ti ti-universe';
		case 'global':
			return 'ti ti-whirl';
		case 'custom-timeline-1':
			return 'ti ti-plus';
		case 'custom-timeline-2':
			return 'ti ti-plus';
		case 'custom-timeline-3':
			return 'ti ti-plus';
		case 'custom-timeline-4':
			return 'ti ti-plus';
		case 'custom-timeline-5':
			return 'ti ti-plus';
	}
}

export function isAvailableBasicTimeline(timeline: BasicTimelineType | undefined | null): boolean {
	switch (timeline) {
		case 'home':
			return $i != null;
		case 'local':
			return ($i == null && instance.policies.ltlAvailable) || ($i != null && $i.policies.ltlAvailable);
		case 'social':
			return $i != null && $i.policies.ltlAvailable;
		case 'global':
			return ($i == null && instance.policies.gtlAvailable) || ($i != null && $i.policies.gtlAvailable);
		case 'custom-timeline-1':
			return (defaultStore.state['remoteLocalTimelineEnable1']);
		case 'custom-timeline-2':
			return (defaultStore.state['remoteLocalTimelineEnable2']);
		case 'custom-timeline-3':
			return (defaultStore.state['remoteLocalTimelineEnable3']);
		case 'custom-timeline-4':
			return (defaultStore.state['remoteLocalTimelineEnable4']);
		case 'custom-timeline-5':
			return (defaultStore.state['remoteLocalTimelineEnable5']);
		default:
			return false;
	}
}

export function availableBasicTimelines(): BasicTimelineType[] {
	return basicTimelineTypes.filter(isAvailableBasicTimeline);
}

export function hasWithReplies(timeline: BasicTimelineType | undefined | null): boolean {
	return timeline === 'local' || timeline === 'social';
}
