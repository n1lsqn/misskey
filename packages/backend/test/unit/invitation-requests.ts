/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { DataSource } from 'typeorm';
import { loadConfig } from '@/config.js';
import { entities } from '@/postgres.js';
import { IdService } from '@/core/IdService.js';
import { EmailService } from '@/core/EmailService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { CaptchaService } from '@/core/CaptchaService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { MiInvitationRequest, MiRegistrationTicket, MiUser, MiMeta, miRepository, type MiRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import RequestEndpoint from '@/server/api/endpoints/invite/request.js';
import ResolveEndpoint from '@/server/api/endpoints/admin/invite/resolve-request.js';
import DeleteEndpoint from '@/server/api/endpoints/admin/invite/delete-request.js';

// Use the isolated test database; never synchronize an arbitrary configured database.
describe('invitation requests', () => {
	const config = loadConfig();
	const ids = new IdService(config);
	const emailService = mockDeep<EmailService>();
	const utilityService = mockDeep<UtilityService>();
	const captchaService = mockDeep<CaptchaService>();
	const moderationLogService = mockDeep<ModerationLogService>();
	const instance = new MiMeta();
	let db: DataSource;
	let submit: RequestEndpoint;
	let resolve: ResolveEndpoint;
	let remove: DeleteEndpoint;
	let moderator: MiLocalUser;

	beforeAll(async () => {
		if (config.db.db !== 'test-misskey' || config.db.port !== 54312) throw new Error('An isolated test-misskey database on port 54312 is required.');
		db = await new DataSource({
			type: 'postgres', host: config.db.host, port: config.db.port,
			username: config.db.user, password: config.db.pass, database: config.db.db,
			entities, synchronize: true,
		}).initialize();
		const requests = db.getRepository(MiInvitationRequest).extend(miRepository as MiRepository<MiInvitationRequest>);
		submit = new RequestEndpoint(instance, requests, ids, captchaService, emailService, utilityService);
		resolve = new ResolveEndpoint(db, instance, config, ids, emailService, moderationLogService);
		remove = new DeleteEndpoint(requests);
		moderator = await db.getRepository(MiUser).save({ id: ids.gen(), username: 'invitationModerator', usernameLower: 'invitationmoderator', host: null }) as MiLocalUser;
	});

	afterAll(async () => {
		if (!db?.isInitialized) return;
		await db.getRepository(MiInvitationRequest).deleteAll();
		await db.getRepository(MiRegistrationTicket).deleteAll();
		if (moderator) await db.getRepository(MiUser).delete(moderator.id);
		await db.destroy();
	});

	beforeEach(async () => {
		vi.resetAllMocks();
		instance.enableInvitationRequests = true;
		instance.disableRegistration = true;
		instance.enableEmail = true;
		utilityService.validateEmailFormat.mockReturnValue(true);
		emailService.validateEmailForAccount.mockResolvedValue({ available: true, reason: null });
		emailService.sendEmail.mockResolvedValue(undefined);
		captchaService.get.mockResolvedValue({ provider: 'none' } as Awaited<ReturnType<CaptchaService['get']>>);
		await db.getRepository(MiInvitationRequest).deleteAll();
		await db.getRepository(MiRegistrationTicket).deleteAll();
	});

	const apply = (params: Record<string, unknown> = {}) => submit.exec({ email: 'applicant@example.com', reason: 'I would like to join.', ...params }, null, null);
	const act = (requestId: string, approve = true) => resolve.exec({ requestId, approve }, moderator, null);
	async function request() {
		await apply();
		return await db.getRepository(MiInvitationRequest).findOneByOrFail({ email: 'applicant@example.com' });
	}

	test.each(['enableInvitationRequests', 'disableRegistration', 'enableEmail'] as const)('rejects submissions when %s is off', async key => {
		instance[key] = false;
		await expect(apply()).rejects.toMatchObject({ code: 'INVITATION_REQUESTS_CLOSED' });
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(0);
	});

	test('normalizes and trims input, without sending mail before approval', async () => {
		await apply({ email: ' APPLICANT@EXAMPLE.COM ', reason: '  Hello  ' });
		expect(await db.getRepository(MiInvitationRequest).findOneByOrFail({ email: 'applicant@example.com' })).toMatchObject({ reason: 'Hello', status: 'pending', sentAt: null, ticketId: null });
		expect(emailService.sendEmail).not.toHaveBeenCalled();
	});

	test('concurrent submissions for the same normalized email create one request', async () => {
		await Promise.all([apply(), apply({ email: 'APPLICANT@example.com' })]);
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(1);
	});

	test('does not expose or overwrite an existing request', async () => {
		await request();
		await expect(apply({ reason: 'overwrite' })).resolves.toBeUndefined();
		expect((await db.getRepository(MiInvitationRequest).findOneByOrFail({ email: 'applicant@example.com' })).reason).toBe('I would like to join.');
	});

	test.each(['used', 'banned', 'disposable', 'mx'] as const)('does not reveal policy validation results: %s', async reason => {
		emailService.validateEmailForAccount.mockResolvedValue({ available: false, reason });
		await expect(apply()).resolves.toBeUndefined();
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(0);
	});

	test('hides already registered addresses', async () => {
		emailService.validateEmailForAccount.mockResolvedValue({ available: false, reason: 'used' });
		await expect(apply()).resolves.toBeUndefined();
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(0);
	});

	test('rejects invalid email and whitespace-only reasons', async () => {
		utilityService.validateEmailFormat.mockReturnValue(false);
		await expect(apply()).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
		await expect(apply({ reason: '   ' })).rejects.toMatchObject({ code: 'INVALID_REASON' });
	});

	test('bounds email, reason, and CAPTCHA inputs', async () => {
		for (const params of [{ email: 'x'.repeat(257) }, { reason: 'x'.repeat(2001) }, { captchaResponse: 'x'.repeat(10001) }]) {
			await expect(apply(params)).rejects.toMatchObject({ code: 'INVALID_PARAM' });
		}
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(0);
	});

	test('checks CAPTCHA before accepting submissions', async () => {
		captchaService.get.mockResolvedValue({ provider: 'testcaptcha' } as Awaited<ReturnType<CaptchaService['get']>>);
		captchaService.verifyTestcaptcha.mockRejectedValueOnce(new Error('bad CAPTCHA'));
		await expect(apply()).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(0);
		await apply({ captchaResponse: 'testcaptcha-passed' });
		expect(captchaService.verifyTestcaptcha).toHaveBeenLastCalledWith('testcaptcha-passed');
	});

	test('approval sends an expiring invitation and records delivery', async () => {
		const item = await request();
		await act(item.id);
		const approved = await db.getRepository(MiInvitationRequest).findOneByOrFail({ id: item.id });
		const ticket = await db.getRepository(MiRegistrationTicket).findOneByOrFail({ id: approved.ticketId! });
		expect(approved.status).toBe('approved');
		expect(approved.sentAt).toBeInstanceOf(Date);
		expect(ticket.createdById).toBe(moderator.id);
		expect(ticket.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
		expect(emailService.sendEmail).toHaveBeenCalledWith(item.email, expect.any(String), expect.stringContaining(ticket.code), expect.stringContaining(ticket.code));
		await act(item.id);
		expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
	});

	test('concurrent approvals create exactly one invitation code', async () => {
		const item = await request();
		await Promise.all([act(item.id), act(item.id)]);
		expect(await db.getRepository(MiRegistrationTicket).count()).toBe(1);
		expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
	});

	test('an in-flight delivery cannot be duplicated by another approval', async () => {
		const item = await request();
		let release!: () => void;
		let started!: () => void;
		const sent = new Promise<void>(resolve => { started = resolve; });
		emailService.sendEmail.mockImplementationOnce(async () => {
			started();
			await new Promise<void>(resolve => { release = resolve; });
		});
		const first = act(item.id);
		await sent;
		try {
			await act(item.id);
			expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
		} finally {
			release();
			await first;
		}
	});

	test('recovers a stale delivery claim after a process interruption', async () => {
		const item = await request();
		emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
		await expect(act(item.id)).rejects.toMatchObject({ code: 'INVITATION_EMAIL_FAILED' });
		await db.getRepository(MiInvitationRequest).update(item.id, { sendingAt: new Date(Date.now() - 16 * 60 * 1000) });
		await act(item.id);
		expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
		expect((await db.getRepository(MiInvitationRequest).findOneByOrFail({ id: item.id })).sentAt).not.toBeNull();
	});

	test('a failed delivery can be retried with the same code', async () => {
		const item = await request();
		emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
		await expect(act(item.id)).rejects.toMatchObject({ code: 'INVITATION_EMAIL_FAILED' });
		const failed = await db.getRepository(MiInvitationRequest).findOneByOrFail({ id: item.id });
		expect(failed.status).toBe('approved');
		expect(failed.sentAt).toBeNull();
		await act(item.id);
		expect(await db.getRepository(MiRegistrationTicket).count()).toBe(1);
		expect(emailService.sendEmail.mock.calls[0][3]).toBe(emailService.sendEmail.mock.calls[1][3]);
	});

	test('rejecting does not issue a code or email, and cannot be approved later', async () => {
		const item = await request();
		await act(item.id, false);
		await expect(act(item.id)).rejects.toMatchObject({ code: 'NO_SUCH_INVITATION_REQUEST' });
		expect(await db.getRepository(MiRegistrationTicket).count()).toBe(0);
		expect(emailService.sendEmail).not.toHaveBeenCalled();
	});

	test('concurrent approval and rejection cannot overwrite each other', async () => {
		const item = await request();
		await Promise.allSettled([act(item.id), act(item.id, false)]);
		const resolved = await db.getRepository(MiInvitationRequest).findOneByOrFail({ id: item.id });
		expect(await db.getRepository(MiRegistrationTicket).count()).toBe(resolved.status === 'approved' ? 1 : 0);
	});

	test('refuses approval when email is disabled', async () => {
		const item = await request();
		instance.enableEmail = false;
		await expect(act(item.id)).rejects.toMatchObject({ code: 'EMAIL_DISABLED' });
		expect(await db.getRepository(MiRegistrationTicket).count()).toBe(0);
	});

	test('deleting a request removes personal data without deleting the invitation', async () => {
		const item = await request();
		await act(item.id);
		await remove.exec({ requestId: item.id }, moderator, null);
		expect(await db.getRepository(MiInvitationRequest).count()).toBe(0);
		expect(await db.getRepository(MiRegistrationTicket).count()).toBe(1);
	});
});
