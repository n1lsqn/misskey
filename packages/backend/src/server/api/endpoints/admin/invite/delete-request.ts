/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { InvitationRequestsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['admin'],
	description: 'Delete an invitation request and its personal information.',
	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:invite-codes',
	limit: { duration: 1000 * 60, max: 30 },
} as const;

export const paramDef = {
	type: 'object',
	properties: { requestId: { type: 'string', format: 'misskey:id' } },
	required: ['requestId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(@Inject(DI.invitationRequestsRepository) private requests: InvitationRequestsRepository) {
		super(meta, paramDef, async (ps) => {
			await this.requests.delete(ps.requestId);
		});
	}
}
