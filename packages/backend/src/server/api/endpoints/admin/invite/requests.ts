/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { InvitationRequestsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';

export const meta = {
	tags: ['admin'],
	description: 'List invitation requests for moderation.',
	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:invite-codes',
	res: {
		type: 'array', optional: false, nullable: false,
		items: {
			type: 'object', optional: false, nullable: false,
			properties: {
				id: { type: 'string', format: 'id', optional: false, nullable: false },
				createdAt: { type: 'string', format: 'date-time', optional: false, nullable: false },
				email: { type: 'string', optional: false, nullable: false },
				reason: { type: 'string', optional: false, nullable: false },
				status: { type: 'string', enum: ['pending', 'approved', 'rejected'], optional: false, nullable: false },
				sentAt: { type: 'string', format: 'date-time', optional: false, nullable: true },
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		status: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.invitationRequestsRepository) private requests: InvitationRequestsRepository,
		private queryService: QueryService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps) => {
			const requests = await this.queryService.makePaginationQuery(this.requests.createQueryBuilder('request'), ps.sinceId, ps.untilId)
				.andWhere('request.status = :status', { status: ps.status }).take(ps.limit).getMany();
			return requests.map(request => ({
				id: request.id,
				createdAt: this.idService.parse(request.id).date.toISOString(),
				email: request.email,
				reason: request.reason,
				status: request.status,
				sentAt: request.sentAt?.toISOString() ?? null,
			}));
		});
	}
}
