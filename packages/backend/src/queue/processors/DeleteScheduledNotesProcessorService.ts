/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In, IsNull, LessThanOrEqual, Not } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { NotesRepository, UsersRepository } from '@/models/_.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import { NoteDeleteService } from '@/core/NoteDeleteService.js';

@Injectable()
export class DeleteScheduledNotesProcessorService {
	constructor(
		@Inject(DI.notesRepository) private notesRepository: NotesRepository,
		@Inject(DI.usersRepository) private usersRepository: UsersRepository,
		private noteDeleteService: NoteDeleteService,
		private queueLoggerService: QueueLoggerService,
	) {}

	public async process(): Promise<void> {
		const attempted: string[] = [];
		const cutoff = new Date();
		const deadline = Date.now() + 30_000;
		while (Date.now() < deadline) {
			const notes = await this.notesRepository.find({
				where: { deleteAt: LessThanOrEqual(cutoff), userHost: IsNull(), ...(attempted.length > 0 ? { id: Not(In(attempted)) } : {}) },
				order: { deleteAt: 'ASC' }, take: 100,
			});
			if (notes.length === 0) return;
			for (const note of notes) {
				attempted.push(note.id);
				try {
					const user = await this.usersRepository.findOneBy({ id: note.userId, host: IsNull() });
					if (user) await this.noteDeleteService.delete(user, note);
				} catch (error) {
					this.queueLoggerService.logger.warn(`Scheduled deletion failed for ${note.id}`, error as Error);
				}
			}
			if (notes.length < 100) return;
		}
	}
}
