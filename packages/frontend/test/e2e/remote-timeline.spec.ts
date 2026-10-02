/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { test, expect } from './fixtures.js';
import { BASE_URL, resetState, registerUser, signIn, closeUserSetupDialog } from './utils.js';
import type { RegisteredUser } from './utils.js';

test.describe('Remote local timeline', () => {
	let alice: RegisteredUser;
	test.beforeAll(async () => {
		await resetState();
		await registerUser('admin', 'pass', true);
		alice = await registerUser('alice', 'alice1234');
	});

	test('opens from the timeline, labels the host input, renders notes and pages with the remote cursor', async ({ page, request }) => {
		const created = await request.post(`${BASE_URL}/api/notes/create`, { data: { i: alice.token, text: 'Remote timeline browser fixture' } });
		expect(created.ok()).toBe(true);
		const { createdNote } = await created.json();
		await signIn(page, 'alice', 'alice1234');
		await page.getByTestId('open-post-form').waitFor({ state: 'visible' });
		await closeUserSetupDialog(page);
		const tab = page.locator('button').filter({ has: page.locator('.ti-world-search') });
		await tab.first().click();
		await expect(page).toHaveURL(/\/timeline\/remote$/);
		const input = page.getByRole('textbox', { name: 'Host', exact: true });
		await expect(input).toBeVisible();

		// The server-side guards are exercised without making an external request.
		await input.fill('https://remote.example');
		await input.press('Enter');
		await expect(page.getByRole('alert')).toContainText('ドメインだけ');

		const cursors: (string | undefined)[] = [];
		await page.route('**/api/notes/remote-timeline', async route => {
			const data = route.request().postDataJSON();
			cursors.push(data.untilId);
			await route.fulfill({ json: data.untilId ? { notes: [], untilId: null, skipped: 0 } : { notes: [createdNote], untilId: 'remoteCursor1', skipped: 1 } });
		});
		await input.fill('remote.example');
		await input.press('Enter');
		await expect(page.getByText('Remote timeline browser fixture', { exact: true })).toBeVisible();
		await expect(page.locator('button').filter({ has: page.locator('.ti-arrow-back-up') })).toBeVisible();
		await page.getByRole('button', { name: 'Load more', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
		expect(cursors).toEqual([undefined, 'remoteCursor1']);
		await expect(page.getByText('Remote timeline browser fixture', { exact: true })).toBeVisible();
	});
});
