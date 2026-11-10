/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue';
import InvitationRequest from '@/pages/invitation-request.vue';
import { i18n } from '@/i18n.js';

const mocks = vi.hoisted(() => ({
	api: vi.fn(),
	alert: vi.fn(),
	instance: { enableInvitationRequests: true, enableHcaptcha: false, enableMcaptcha: false, enableRecaptcha: false, enableTurnstile: false, enableTestcaptcha: false, tosUrl: null, privacyPolicyUrl: null },
}));
vi.mock('@/instance.js', () => ({ instance: mocks.instance }));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/os.js', () => ({ alert: mocks.alert }));
vi.mock('@/page.js', () => ({ definePage: vi.fn() }));

const global = {
	stubs: { PageWithHeader: { template: '<main><slot/></main>' } },
	directives: { 'adaptive-border': {}, panel: {}, tooltip: {} },
};

afterEach(cleanup);
beforeEach(() => {
	vi.resetAllMocks();
	mocks.instance.enableInvitationRequests = true;
	mocks.api.mockResolvedValue(undefined);
});

async function fillForm(result: ReturnType<typeof render>) {
	await fireEvent.update(result.getByRole('textbox', { name: i18n.ts.emailAddress }), 'applicant@example.com');
	await fireEvent.update(result.getByRole('textbox', { name: i18n.ts._invitationRequest.reason }), 'I would like to join.');
	await fireEvent.click(result.getByRole('checkbox', { name: i18n.ts.agree }));
}

describe('invitation request form', () => {
	test('shows a closed message without collecting data when disabled', () => {
		mocks.instance.enableInvitationRequests = false;
		const result = render(InvitationRequest, { global });
		expect(result.getByText(i18n.ts._invitationRequest.closed)).toBeDefined();
		expect(result.queryByRole('textbox')).toBeNull();
	});

	test('requires consent, submits the request, and displays a completion message', async () => {
		const result = render(InvitationRequest, { global });
		const button = result.getByRole('button', { name: i18n.ts._invitationRequest.apply }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		await fillForm(result);
		expect(button.disabled).toBe(false);
		await fireEvent.submit(result.container.querySelector('form')!);
		await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('invite/request', {
			email: 'applicant@example.com', reason: 'I would like to join.', captchaResponse: undefined,
		}));
		await waitFor(() => expect(result.queryByRole('textbox')).toBeNull());
		expect(result.getByText(i18n.ts._invitationRequest.submitted)).toBeDefined();
	});

	test('retains applicant input and allows retry after an API error', async () => {
		mocks.api.mockRejectedValueOnce({ code: 'INVALID_EMAIL' });
		const result = render(InvitationRequest, { global });
		await fillForm(result);
		await fireEvent.submit(result.container.querySelector('form')!);
		await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith({ type: 'error', text: i18n.ts._invitationRequest.invalidEmail }));
		expect((result.getByRole('textbox', { name: i18n.ts.emailAddress }) as HTMLInputElement).value).toBe('applicant@example.com');
		expect((result.getByRole('button', { name: i18n.ts._invitationRequest.apply }) as HTMLButtonElement).disabled).toBe(false);
	});
});
