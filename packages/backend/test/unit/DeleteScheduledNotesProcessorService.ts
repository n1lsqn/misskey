/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { NotesRepository, UsersRepository, MiNote } from '@/models/_.js';
import { NoteDeleteService } from '@/core/NoteDeleteService.js';
import { QueueLoggerService } from '@/queue/QueueLoggerService.js';
import { DeleteScheduledNotesProcessorService } from '@/queue/processors/DeleteScheduledNotesProcessorService.js';

describe('scheduled note deletion', () => {
	test('a failing deletion does not prevent later notes or the next batch', async () => {
		const notes = mock<NotesRepository>();
		const users = mock<UsersRepository>();
		const deletion = mock<NoteDeleteService>();
		const logger = { logger: { warn: vi.fn() } } as unknown as QueueLoggerService;
		const batch = Array.from({ length: 100 }, (_, i) => ({ id: String(i), userId: 'author' })) as MiNote[];
		notes.find.mockResolvedValueOnce(batch).mockResolvedValueOnce([{ id: '101', userId: 'author' } as MiNote]);
		users.findOneBy.mockResolvedValue({ id: 'author', host: null } as never);
		deletion.delete.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValue(undefined);
		await new DeleteScheduledNotesProcessorService(notes, users, deletion, logger).process();
		expect(deletion.delete).toHaveBeenCalledTimes(101);
		expect(notes.find).toHaveBeenCalledTimes(2);
		expect(logger.logger.warn).toHaveBeenCalledTimes(1);
		expect(notes.find.mock.calls[0][0]?.where).toHaveProperty('userHost');
		expect(notes.find.mock.calls[1][0]?.where).toHaveProperty('id');
	});
});
