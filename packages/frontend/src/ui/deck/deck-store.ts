/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { markRaw } from 'vue';
import type { Column } from '@/deck.js';
import { Pizzax } from '@/lib/pizzax.js';

type ColumnWidget = {
	name: string;
	id: string;
	data: Record<string, any>;
};

export const columnTypes = [
	'main',
	'widgets',
	'notifications',
	'tl',
	'antenna',
	'list',
	'channel',
	'mentions',
	'direct',
	'roleTimeline',
] as const;

export type ColumnType = typeof columnTypes[number];

export type Column = {
	id: string;
	type: ColumnType;
	name: string | null;
	width: number;
	widgets?: ColumnWidget[];
	active?: boolean;
	flexible?: boolean;
	antennaId?: string;
	listId?: string;
	channelId?: string;
	roleId?: string;
	excludeTypes?: typeof notificationTypes[number][];
	tl?: BasicTimelineType |
	'custom-timeline-1' |
	'custom-timeline-2' |
	'custom-timeline-3' |
	'custom-timeline-4' |
	'custom-timeline-5';
	withRenotes?: boolean;
	withReplies?: boolean;
	withSensitive?: boolean;
	onlyFiles?: boolean;
	soundSetting?: SoundStore;
};
// TODO: 消す(移行済みのため)
export const deckStore = markRaw(new Pizzax('deck', {
	profile: {
		where: 'deviceAccount',
		default: 'default',
	},
	columns: {
		where: 'deviceAccount',
		default: [] as Column[],
	},
	layout: {
		where: 'deviceAccount',
		default: [] as Column['id'][][],
	},
}));
