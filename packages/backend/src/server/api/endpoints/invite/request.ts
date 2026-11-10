/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { InvitationRequestsRepository, MiMeta } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import { IdService } from '@/core/IdService.js';
import { CaptchaService } from '@/core/CaptchaService.js';
import { EmailService } from '@/core/EmailService.js';
import { UtilityService } from '@/core/UtilityService.js';

export const meta = {
	tags: ['meta'],
	description: 'Request an invitation code for this server.',
	requireCredential: false,
	limit: { duration: 1000 * 60 * 60, max: 3, minInterval: 1000 * 10 },
	errors: {
		closed: { message: 'Invitation requests are closed.', code: 'INVITATION_REQUESTS_CLOSED', id: '89a54662-4b4a-4619-a950-5d414e609ff1' },
		invalidEmail: { message: 'Invalid email address.', code: 'INVALID_EMAIL', id: 'eca574fc-722c-487f-8bd6-eb53bcf17df0' },
		invalidReason: { message: 'Please provide a reason.', code: 'INVALID_REASON', id: '19108c6d-fa8b-41d3-bb0a-a9905f0c170a' },
		captchaFailed: { message: 'CAPTCHA verification failed.', code: 'CAPTCHA_FAILED', id: '9ec5bc65-0aaf-4628-a4c9-042299153eb1' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		email: { type: 'string', minLength: 1, maxLength: 256 },
		reason: { type: 'string', minLength: 1, maxLength: 2000 },
		captchaResponse: { type: 'string', maxLength: 10000 },
	},
	required: ['email', 'reason'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta) private instance: MiMeta,
		@Inject(DI.invitationRequestsRepository) private requests: InvitationRequestsRepository,
		private idService: IdService,
		private captchaService: CaptchaService,
		private emailService: EmailService,
		private utilityService: UtilityService,
	) {
		super(meta, paramDef, async (ps) => {
			if (!this.instance.enableInvitationRequests || !this.instance.disableRegistration || !this.instance.enableEmail) {
				throw new ApiError(meta.errors.closed);
			}
			try {
				const settings = await this.captchaService.get();
				switch (settings.provider) {
					case 'hcaptcha': await this.captchaService.verifyHcaptcha(settings.hcaptcha.secretKey!, ps.captchaResponse); break;
					case 'mcaptcha': await this.captchaService.verifyMcaptcha(settings.mcaptcha.secretKey!, settings.mcaptcha.siteKey!, settings.mcaptcha.instanceUrl!, ps.captchaResponse); break;
					case 'recaptcha': await this.captchaService.verifyRecaptcha(settings.recaptcha.secretKey!, ps.captchaResponse); break;
					case 'turnstile': await this.captchaService.verifyTurnstile(settings.turnstile.secretKey!, ps.captchaResponse); break;
					case 'testcaptcha': await this.captchaService.verifyTestcaptcha(ps.captchaResponse); break;
				}
			} catch {
				throw new ApiError(meta.errors.captchaFailed);
			}
			const email = ps.email.trim().toLowerCase();
			const reason = ps.reason.trim();
			if (!reason) throw new ApiError(meta.errors.invalidReason);
			if (!this.utilityService.validateEmailFormat(email)) throw new ApiError(meta.errors.invalidEmail);
			// Return the same response for duplicates and already registered addresses.
			if (await this.requests.existsBy({ email })) return;
			const validation = await this.emailService.validateEmailForAccount(email);
			if (!validation.available) return;
			await this.requests.createQueryBuilder().insert().values({
				id: this.idService.gen(), email, reason,
			}).orIgnore().execute();
		});
	}
}
