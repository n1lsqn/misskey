/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/vue';
import MkFormula from '@/components/MkFormula.vue';
import { isSunDarkMode } from '@/utility/sun-dark-mode.js';
import { dataSaver, isDataSavingConnection } from '@/utility/data-saver.js';
import { getReactionFallback } from '@/utility/reaction-fallback.js';
import { prefer } from '@/preferences.js';

describe('ported client features', () => {
	test('remote emoji only falls back to an existing local emoji of the same name', () => {
		const names = new Map([['happy', {}]]);
		expect(getReactionFallback(':happy@example.com:', names)).toBe(':happy@.:');
		expect(getReactionFallback(':missing@example.com:', names)).toBeNull();
		expect(getReactionFallback(':happy@.:', names)).toBeNull();
		expect(getReactionFallback('❤️', names)).toBeNull();
	});
	test('Tokyo daylight works with UTC dates crossing midnight', () => {
		expect(isSunDarkMode(new Date('2026-10-02T03:00:00Z'))).toBe(false);
		expect(isSunDarkMode(new Date('2026-10-02T15:00:00Z'))).toBe(true);
		expect(isSunDarkMode(new Date('2026-10-01T22:00:00Z'))).toBe(false);
	});
	test('recognizes cellular, slow and explicitly metered connections', () => {
		expect(isDataSavingConnection({ type: 'cellular' })).toBe(true);
		expect(isDataSavingConnection({ effectiveType: '2g' })).toBe(true);
		expect(isDataSavingConnection({ saveData: true })).toBe(true);
		expect(isDataSavingConnection({ type: 'wifi', effectiveType: '4g' })).toBe(false);
		expect(isDataSavingConnection()).toBe(false);
	});
	test('automatic saver leaves manual preferences unchanged', () => {
		const original = { ...prefer.s.dataSaver };
		Object.assign(prefer.s.dataSaver, { disableUrlPreview: true });
		Object.assign(prefer.s, { autoDataSaver: true });
		expect(dataSaver.disableUrlPreview).toBe(true);
		expect(prefer.s.dataSaver.disableUrlPreview).toBe(true);
		Object.assign(prefer.s, { autoDataSaver: false });
		expect(dataSaver.disableUrlPreview).toBe(true);
		Object.assign(prefer.s.dataSaver, original);
	});
	test('renders block equations with MathML and refuses trusted HTML', () => {
		const result = render(MkFormula, { props: { formula: 'x^2', block: true } });
		expect(result.container.querySelector('math')).not.toBeNull();
		expect(result.container.querySelector('.katex-display')).not.toBeNull();
		const unsafe = render(MkFormula, { props: { formula: '\\href{javascript:alert(1)}{x}', block: false } });
		expect(unsafe.container.querySelector('a')).toBeNull();
	});
});
