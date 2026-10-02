/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';
import { prefer } from '@/preferences.js';

type Connection = EventTarget & { type?: string; effectiveType?: string; saveData?: boolean };
export function isDataSavingConnection(connection?: Pick<Connection, 'type' | 'effectiveType' | 'saveData'>): boolean {
	return connection?.saveData === true || connection?.type === 'cellular' || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
}
const connection = (navigator as Navigator & { connection?: Connection }).connection;
const automatic = ref(isDataSavingConnection(connection));
connection?.addEventListener('change', () => { automatic.value = isDataSavingConnection(connection); });

// Keep manual preferences intact when the network changes.
export const dataSaver = Object.fromEntries((['media', 'avatar', 'urlPreviewThumbnail', 'disableUrlPreview', 'code'] as const).map(key => [key, false])) as typeof prefer.s.dataSaver;
for (const key of Object.keys(dataSaver) as (keyof typeof dataSaver)[]) {
	Object.defineProperty(dataSaver, key, {
		get: () => prefer.s.dataSaver[key] && (!prefer.s.autoDataSaver || connection == null || automatic.value),
	});
}
