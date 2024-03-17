import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { isInstanceMuted } from '@/misc/is-instance-muted.js';
import { isUserRelated } from '@/misc/is-user-related.js';
import type { Packed } from '@/misc/json-schema.js';
import Channel, { type MiChannelService } from '../channel.js';

class CustomTimelineChannel extends Channel {
	public readonly chName = 'customTimeline';
	public static shouldShare = false;
	public static requireCredential = false as const;
	private withRenotes: boolean;
	private withFiles: boolean;

	constructor(
		private noteEntityService: NoteEntityService,

		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
	}

	@bindThis
	public async init(params: any) {
		this.withRenotes = params.withRenotes ?? true;
		this.withFiles = params.withFiles ?? false;

		this.subscriber.on('notesStream', this.onNote);
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		if (this.withFiles && (note.fileIds == null || note.fileIds.length === 0)) return;

		if (note.channelId != null) return;

		if (note.renote && note.text == null && (note.fileIds == null || note.fileIds.length === 0) && !this.withRenotes) return;

		if (isInstanceMuted(note, new Set<string>(this.userProfile?.mutedInstances ?? []))) return;

		if (isUserRelated(note, this.userIdsWhoMeMuting)) return;
		if (isUserRelated(note, this.userIdsWhoBlockingMe)) return;

		if (this.user && note.renoteId && !note.text) {
			if (note.renote && Object.keys(note.renote.reactions).length > 0) {
				const myRenoteReaction = await this.noteEntityService.populateMyReaction(note.renote, this.user.id);
				note.renote.myReaction = myRenoteReaction;
			}
		}

		this.connection.cacheNote(note);

		this.send('note', note);
	}

	@bindThis
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}

@Injectable()
export class CustomTimelineChannelService implements MiChannelService<false> {
	public readonly shouldShare = CustomTimelineChannel.shouldShare;
	public readonly requireCredential = CustomTimelineChannel.requireCredential;
	public readonly kind = CustomTimelineChannel.kind;

	constructor(
		private noteEntityService: NoteEntityService,
	) {
	}

	@bindThis
	public create(id: string, connection: Channel['connection']): CustomTimelineChannel {
		return new CustomTimelineChannel(
			this.noteEntityService,
			id,
			connection,
		);
	}
}
