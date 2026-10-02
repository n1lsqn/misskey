/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { getTimes } from 'suncalc';
import { watch } from 'vue';
import { prefer } from '@/preferences.js';
import { isDeviceDarkmode } from '@/utility/is-device-darkmode.js';
import { store } from '@/store.js';

export function isSunDarkMode(now: Date): boolean {
	// Use Tokyo's calendar day even when the browser is in another time zone.
	const tokyoDay = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const noon = new Date(Date.UTC(tokyoDay.getUTCFullYear(), tokyoDay.getUTCMonth(), tokyoDay.getUTCDate(), 3));
	const { sunrise, sunset } = getTimes(noon, 35.68, 139.75);
	return sunrise != null && sunset != null && (now < sunrise || now >= sunset);
}

export function initializeSunDarkMode(): void {
	const update = () => {
		if (prefer.s.sunBasedDarkMode) store.set('darkMode', isSunDarkMode(new Date()));
	};
	watch(prefer.r.sunBasedDarkMode, () => {
		if (!prefer.s.sunBasedDarkMode && prefer.s.syncDeviceDarkMode) store.set('darkMode', isDeviceDarkmode());
		update();
	}, { immediate: true });
	window.setInterval(update, 60_000);
	window.document.addEventListener('visibilitychange', update);
}
