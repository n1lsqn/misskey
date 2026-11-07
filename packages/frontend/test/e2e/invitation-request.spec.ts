/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createServer } from 'node:net';
import type { AddressInfo, Socket } from 'node:net';
import { test, expect } from './fixtures.js';
import { BASE_URL, registerUser, resetState, signIn, closeUserSetupDialog, acceptSignupRules, locateMkInput } from './utils.js';

/** Local SMTP sink: exercises Nodemailer without delivering to an external mailbox. */
async function startSmtpSink() {
	const messages: string[] = [];
	const sockets = new Set<Socket>();
	const server = createServer(socket => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
		socket.write('220 localhost ESMTP test receiver\r\n');
		let buffer = '';
		let data = false;
		let message = '';
		socket.on('data', chunk => {
			buffer += chunk.toString();
			let end: number;
			while ((end = buffer.indexOf('\r\n')) >= 0) {
				const line = buffer.slice(0, end);
				buffer = buffer.slice(end + 2);
				if (data) {
					if (line === '.') {
						messages.push(message);
						message = '';
						data = false;
						socket.write('250 Message accepted\r\n');
					} else {
						message += line.replace(/^\.\./, '.') + '\r\n';
					}
				} else if (/^(EHLO|HELO) /i.test(line)) {
					socket.write('250-localhost\r\n250 SIZE 1048576\r\n');
				} else if (/^DATA$/i.test(line)) {
					data = true;
					socket.write('354 End with a dot\r\n');
				} else if (/^QUIT$/i.test(line)) {
					socket.end('221 Bye\r\n');
				} else {
					socket.write('250 OK\r\n');
				}
			}
		});
	});
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
	return {
		messages,
		port: (server.address() as AddressInfo).port,
		async close() {
			for (const socket of sockets) socket.destroy();
			await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
		},
	};
}

test.use({ locale: 'ja-JP' });

test('invitation request: browser submission, moderator approval, SMTP delivery and signup', async ({ page, browser, request }, testInfo) => {
	test.setTimeout(90_000);
	page.setDefaultTimeout(15_000);
	if (!['localhost', '127.0.0.1'].includes(new URL(BASE_URL).hostname)) throw new Error('Local test server required');
	const controller = process.env.MISSKEY_TEST_CONTROLLER_URL;
	if (controller && !['localhost', '127.0.0.1'].includes(new URL(controller).hostname)) throw new Error('Local test controller required');
	const smtp = await startSmtpSink();
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	const api = async (endpoint: string, data: Record<string, unknown>) => {
		const response = await request.post(`${BASE_URL}/api/${endpoint}`, { data });
		expect(response.ok(), `${endpoint}: ${await response.text()}`).toBe(true);
		return response.status() === 204 ? null : await response.json();
	};
	try {
		await resetState();
		const admin = await registerUser('invitationadmin', 'InvitationTest1234!', true);
		await api('admin/update-meta', {
			i: admin.token, name: '招待申請の検証用サーバー', disableRegistration: true,
			enableInvitationRequests: true, enableEmail: true, emailRequiredForSignup: false,
			email: 'admin@example.com', smtpHost: '127.0.0.1', smtpPort: smtp.port,
			smtpSecure: false, smtpUser: null, smtpPass: null,
		});
		await page.addInitScript(() => { localStorage.setItem('lang', 'ja-JP'); });
		await page.goto(`${BASE_URL}/invitation-request`);
		await expect(page.getByRole('textbox', { name: 'メールアドレス' })).toBeVisible();
		await page.getByRole('textbox', { name: 'メールアドレス' }).fill('browser-applicant@example.com');
		await page.getByRole('textbox', { name: '参加理由' }).fill('Misskeyの招待申請機能をブラウザーとメールで確認しています。');
		await expect(page.getByRole('button', { name: '招待コードを申請する' })).toBeDisabled();
		await page.getByRole('checkbox', { name: '同意する', exact: true }).focus();
		await page.keyboard.press('Space');
		await expect(page.getByRole('checkbox', { name: '同意する', exact: true })).toBeChecked();
		await page.locator('#splash').waitFor({ state: 'detached' });
		await page.screenshot({ path: testInfo.outputPath('application-desktop.png'), fullPage: true });
		const submitted = page.waitForResponse(response => response.url().endsWith('/api/invite/request'));
		await page.getByRole('button', { name: '招待コードを申請する' }).click();
		expect((await submitted).status()).toBe(204);
		await expect(page.getByText('申請を受け付けました。', { exact: false })).toBeVisible();
		expect(smtp.messages).toHaveLength(0);

		const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP', colorScheme: 'dark', isMobile: true, deviceScaleFactor: 1 });
		await mobile.addInitScript(() => { localStorage.setItem('lang', 'ja-JP'); });
		try {
			const mobilePage = await mobile.newPage();
			await mobilePage.goto(`${BASE_URL}/invitation-request`);
			await expect(mobilePage.getByRole('textbox', { name: '参加理由' })).toBeVisible();
			await mobilePage.locator('#splash').waitFor({ state: 'detached' });
			await mobilePage.screenshot({ path: testInfo.outputPath('application-mobile-dark.png'), fullPage: true });
			expect(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
		} finally {
			await mobile.close();
		}

		await signIn(page, 'invitationadmin', 'InvitationTest1234!');
		await page.getByTestId('open-post-form').waitFor({ state: 'visible', timeout: 20_000 });
		await closeUserSetupDialog(page);
		await page.getByTestId('user-setup-dialog').waitFor({ state: 'detached' });
		await page.goto(`${BASE_URL}/admin/invites`);
		await expect(page.getByText('browser-applicant@example.com', { exact: true })).toBeVisible();
		await page.locator('#splash').waitFor({ state: 'detached' });
		await page.screenshot({ path: testInfo.outputPath('moderation-pending.png'), fullPage: true });
		await page.getByRole('button', { name: '承認して招待メールを送る' }).click();
		const approved = page.waitForResponse(response => response.url().endsWith('/api/admin/invite/resolve-request'));
		await page.getByTestId('modal-dialog-ok').click();
		expect((await approved).status()).toBe(204);
		await expect.poll(() => smtp.messages.length).toBe(1);
		expect(smtp.messages[0]).toContain('To: browser-applicant@example.com');
		const code = smtp.messages[0].match(/Invitation code: ([A-Z0-9]+)/)?.[1];
		expect(code).toBeTruthy();
		const resolved = await api('admin/invite/requests', { i: admin.token, status: 'approved' });
		expect(resolved).toHaveLength(1);
		expect(resolved[0].sentAt).toBeTruthy();

		// NODE_ENV=test intentionally bypasses invitation checks in SignupApiService.
		// With the backend e2e controller, exercise the normal validation path as well.
		if (controller) {
			const switched = await request.post(`${controller}/env`, { data: { key: 'NODE_ENV', value: 'production' } });
			expect(switched.ok()).toBe(true);
		}
		const signupContext = await browser.newContext({ locale: 'ja-JP' });
		await signupContext.addInitScript(() => { localStorage.setItem('lang', 'ja-JP'); });
		try {
			const applicant = await signupContext.newPage();
			await applicant.goto(BASE_URL);
			await applicant.getByTestId('signup').click();
			await expect(applicant.getByRole('link', { name: '招待コードを申請する' })).toBeVisible();
			await acceptSignupRules(applicant);
			await locateMkInput(applicant, 'signup-invitation-code').fill(code!);
			await locateMkInput(applicant, 'signup-username').fill('invitationapplicant');
			await locateMkInput(applicant, 'signup-password').fill('ApplicantTest1234!');
			await locateMkInput(applicant, 'signup-password-retype').fill('ApplicantTest1234!');
			await expect(applicant.getByTestId('signup-submit')).toBeEnabled();
			const registered = applicant.waitForResponse(response => response.url().endsWith('/api/signup'));
			await applicant.getByTestId('signup-submit').click();
			const result = await registered;
			expect(result.status(), await result.text()).toBe(200);
			expect((await result.json()).username).toBe('invitationapplicant');
		} finally {
			await signupContext.close();
		}
		if (controller) {
			const reused = await request.post(`${BASE_URL}/api/signup`, { data: { username: 'invitationreuse', password: 'ApplicantTest1234!', invitationCode: code } });
			expect(reused.status()).toBe(400);
		} else {
			testInfo.annotations.push({ type: 'note', description: 'Test-mode signup skips invitation consumption; set MISSKEY_TEST_CONTROLLER_URL to also verify normal signup validation.' });
		}
		expect(errors).toEqual([]);
	} finally {
		if (controller) await request.post(`${controller}/env`, { data: { key: 'NODE_ENV', value: 'test' } });
		await smtp.close();
	}
});
