/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { MiInvitationRequest, MiRegistrationTicket, type MiMeta } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import { IdService } from '@/core/IdService.js';
import { EmailService } from '@/core/EmailService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { generateInviteCode } from '@/misc/generate-invite-code.js';
import { escapeHtml } from '@/misc/escape-html.js';

export const meta = {
	tags: ['admin'],
	description: 'Approve or reject an invitation request, or retry a failed invitation email.',
	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:invite-codes',
	limit: { duration: 1000 * 60, max: 30 },
	errors: {
		noSuchRequest: { message: 'No pending invitation request.', code: 'NO_SUCH_INVITATION_REQUEST', id: 'a814bcb8-f1ac-4892-aa7a-68513baf4a9f' },
		emailDisabled: { message: 'Email delivery is disabled.', code: 'EMAIL_DISABLED', id: '7b657070-fd71-4d09-9e01-4df4072a86ab' },
		deliveryFailed: { message: 'Failed to send the invitation email. Please retry.', code: 'INVITATION_EMAIL_FAILED', id: '5aef230d-e7a2-486b-b1b0-0f8cebdb3618' },
		invalidTicket: { message: 'The invitation code is no longer available.', code: 'INVITATION_CODE_UNAVAILABLE', id: 'd90f2855-ccaa-4447-9396-2cdcb9ff06bf' },
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		requestId: { type: 'string', format: 'misskey:id' },
		approve: { type: 'boolean' },
	},
	required: ['requestId', 'approve'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db) private db: DataSource,
		@Inject(DI.meta) private instance: MiMeta,
		@Inject(DI.config) private config: Config,
		private idService: IdService,
		private emailService: EmailService,
		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const requests = this.db.getRepository(MiInvitationRequest);
			if (!ps.approve) {
				const result = await requests.update({ id: ps.requestId, status: 'pending' }, { status: 'rejected' });
				if (!result.affected) throw new ApiError(meta.errors.noSuchRequest);
				return;
			}
			if (!this.instance.enableEmail) throw new ApiError(meta.errors.emailDisabled);
			const created = await this.db.transaction(async manager => {
				const repository = manager.getRepository(MiInvitationRequest);
				const result = await repository.update({ id: ps.requestId, status: 'pending' }, { status: 'approved' });
				if (!result.affected) return null;
				const ticket = await manager.getRepository(MiRegistrationTicket).save({
					id: this.idService.gen(), code: generateInviteCode(), createdById: me.id,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				});
				await repository.update(ps.requestId, { ticketId: ticket.id });
				return ticket;
			});
			if (created) {
				this.moderationLogService.log(me, 'createInvitation', { invitations: [created] });
			}
			const request = await requests.findOneBy({ id: ps.requestId });
			if (!request || request.status !== 'approved') throw new ApiError(meta.errors.noSuchRequest);
			if (request.sentAt) return;
			const ticket = request.ticketId ? await this.db.getRepository(MiRegistrationTicket).findOneBy({ id: request.ticketId }) : null;
			if (!ticket || ticket.usedById || ticket.pendingUserId || (ticket.expiresAt && ticket.expiresAt.getTime() <= Date.now())) {
				throw new ApiError(meta.errors.invalidTicket);
			}
			const sendingAt = new Date();
			const claim = await requests.createQueryBuilder().update().set({ sendingAt })
				.where('id = :id', { id: request.id })
				.andWhere('status = :status', { status: 'approved' })
				.andWhere('"sentAt" IS NULL')
				.andWhere('("sendingAt" IS NULL OR "sendingAt" < :expired)', { expired: new Date(Date.now() - 15 * 60 * 1000) })
				.execute();
			if (!claim.affected) return;
			const link = this.config.url;
			try {
				await this.emailService.sendEmail(request.email, 'Invitation request approved',
					`Your invitation request has been approved.<br>Invitation code: <b>${escapeHtml(ticket.code)}</b><br>This code expires in 7 days after approval.<br><a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`,
					`Your invitation request has been approved.\nInvitation code: ${ticket.code}\nThis code expires in 7 days after approval.\n${link}`);
			} catch {
				await requests.update({ id: request.id, sendingAt }, { sendingAt: null });
				throw new ApiError(meta.errors.deliveryFailed);
			}
			await requests.update({ id: request.id, sendingAt }, { sentAt: new Date(), sendingAt: null });
		});
	}
}
