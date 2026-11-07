/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';

const global = { directives: { 'adaptive-border': {}, panel: {} }, stubs: { Mfm: true } };
afterEach(cleanup);

describe('form input accessibility', () => {
	test('email input uses its visible label and caption, and limits length', () => {
		const result = render(MkInput, {
			props: { modelValue: '', type: 'email', maxLength: 256 },
			slots: { label: 'Email address', caption: 'For your invitation' },
			global,
		});
		const input = result.getByRole('textbox', { name: 'Email address' }) as HTMLInputElement;
		expect(input.maxLength).toBe(256);
		expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('For your invitation');
	});

	test('textarea uses its visible label and character-count caption', () => {
		const result = render(MkTextarea, {
			props: { modelValue: 'Hello', maxLength: 2000 },
			slots: { label: 'Reason for joining', caption: '5/2000' },
			global,
		});
		const input = result.getByRole('textbox', { name: 'Reason for joining' }) as HTMLTextAreaElement;
		expect(input.maxLength).toBe(2000);
		expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('5/2000');
	});

	test('each input receives a separate accessible label', () => {
		const email = render(MkInput, { props: { modelValue: '' }, slots: { label: 'Email address' }, global });
		const reason = render(MkTextarea, { props: { modelValue: '' }, slots: { label: 'Reason for joining' }, global });
		expect(email.getByRole('textbox', { name: 'Email address' }).getAttribute('aria-labelledby')).not.toBe(reason.getByRole('textbox', { name: 'Reason for joining' }).getAttribute('aria-labelledby'));
	});
	test('switch exposes its label and synchronizes native checked state after label clicks', async () => {
		const result = render(MkSwitch, {
			props: { modelValue: false, 'onUpdate:modelValue': (value: boolean) => result.rerender({ modelValue: value }) },
			slots: { default: 'I agree' },
			global,
		});
		const checkbox = result.getByRole('checkbox', { name: 'I agree' }) as HTMLInputElement;
		expect(checkbox.checked).toBe(false);
		await fireEvent.click(result.getByText('I agree'));
		expect(checkbox.checked).toBe(true);
		await fireEvent.click(result.getByText('I agree'));
		expect(checkbox.checked).toBe(false);
	});
});
