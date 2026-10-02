/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NotesRepository } from '@/models/_.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { ApNoteService } from '@/core/activitypub/models/ApNoteService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { QueryService } from '@/core/QueryService.js';
import { normalizeTimelineHost, parseRemoteTimeline } from '@/misc/remote-timeline.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['notes', 'federation'],
	requireCredential: true,
	kind: 'read:account',
	limit: { duration: 60 * 60 * 1000, max: 120, minInterval: 3000 },
	errors: {
		invalidHost: { message: 'Specify a remote server domain.', code: 'INVALID_HOST', id: 'fe1c3150-b8c2-47a5-be87-6a5760d27c50' },
		federationNotAllowed: { message: 'Federation for this host is not allowed.', code: 'FEDERATION_NOT_ALLOWED', id: 'a42fb569-0291-4399-9e59-2354422af4f8' },
		requestFailed: { message: 'The remote public local timeline is unavailable.', code: 'REMOTE_TIMELINE_UNAVAILABLE', id: 'b05c49c9-e1e7-4973-bc4b-cad9f3f7ea35' },
		responseInvalid: { message: 'Invalid response from the remote server.', code: 'REMOTE_TIMELINE_INVALID', id: '833c116f-9e9d-440d-b1ab-333edfc11a1d' },
	},
	res: {
		type: 'object', optional: false, nullable: false,
		properties: {
			notes: { type: 'array', optional: false, nullable: false, items: { type: 'object', optional: false, nullable: false, ref: 'Note' } },
			// The remote cursor must never be replaced with a local note ID.
			untilId: { type: 'string', optional: false, nullable: true },
			skipped: { type: 'integer', optional: false, nullable: false },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		host: { type: 'string', minLength: 1, maxLength: 253 },
		limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
		untilId: { type: 'string', format: 'misskey:id', maxLength: 128 },
	},
	required: ['host'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository) private notesRepository: NotesRepository,
		private httpRequestService: HttpRequestService,
		private utilityService: UtilityService,
		private apNoteService: ApNoteService,
		private noteEntityService: NoteEntityService,
		private queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const host = normalizeTimelineHost(ps.host);
			if (host == null || this.utilityService.isSelfHost(host)) throw new ApiError(meta.errors.invalidHost);
			if (!this.utilityService.isFederationAllowedHost(host)) throw new ApiError(meta.errors.federationNotAllowed);

			let body: unknown;
			try {
				const response = await this.httpRequestService.send(`https://${host}/api/notes/local-timeline`, {
					method: 'POST', headers: { 'Content-Type': 'application/json' },
					// No local or remote credential is ever forwarded.
					body: JSON.stringify({ limit: ps.limit, untilId: ps.untilId, withRenotes: true }),
					timeout: 5000, size: 1024 * 1024, redirect: 'error',
				});
				if (new URL(response.url).origin !== `https://${host}`) throw new Error('Cross-origin timeline redirect');
				body = await response.json();
			} catch {
				throw new ApiError(meta.errors.requestFailed);
			}
			let remote;
			try {
				remote = parseRemoteTimeline(body, ps.limit);
			} catch {
				throw new ApiError(meta.errors.responseInvalid);
			}
			const lastId = remote.at(-1)?.id;
			const untilId = remote.length === ps.limit && lastId !== ps.untilId ? lastId ?? null : null;
			const noteIds: string[] = [];
			// Keep remote fetch concurrency bounded, and let deleted/non-federated notes fail independently.
			for (let offset = 0; offset < remote.length; offset += 3) {
				const batch = await Promise.all(remote.slice(offset, offset + 3).map(async item => {
					if (!item.eligible) return null;
					const note = await this.apNoteService.resolveNote(`https://${host}/notes/${item.id}`).catch(() => null);
					return note?.userHost === host && note.visibility === 'public' && !note.localOnly ? note.id : null;
				}));
				noteIds.push(...batch.filter((id): id is string => id != null));
			}
			if (noteIds.length === 0) return { notes: [], untilId, skipped: remote.length };
			const query = this.notesRepository.createQueryBuilder('note')
				.where('note.id IN (:...noteIds)', { noteIds })
				.andWhere('note.visibility = :visibility', { visibility: 'public' })
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');
			this.queryService.generateVisibilityQuery(query, me);
			this.queryService.generateBaseNoteFilteringQuery(query, me);
			this.queryService.generateMutedUserRenotesQueryForNotes(query, me);
			const notes = await query.getMany();
			const byId = new Map(notes.map(note => [note.id, note]));
			const ordered = noteIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
			return { notes: await this.noteEntityService.packMany(ordered, me, { detail: true }), untilId, skipped: remote.length - ordered.length };
		});
	}
}
