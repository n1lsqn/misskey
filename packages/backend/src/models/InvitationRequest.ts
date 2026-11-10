/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { id } from './util/id.js';

@Entity('invitation_request')
export class MiInvitationRequest {
	@PrimaryColumn(id())
	public id: string;

	@Index('IDX_invitation_request_email', { unique: true })
	@Column('varchar', { length: 256 })
	public email: string;

	@Column('varchar', { length: 2000 })
	public reason: string;

	@Index('IDX_invitation_request_status')
	@Column('varchar', { length: 16, default: 'pending' })
	public status: 'pending' | 'approved' | 'rejected';

	@Column({ ...id(), nullable: true })
	public ticketId: string | null;

	@Column('timestamp with time zone', { nullable: true })
	public sentAt: Date | null;

	@Column('timestamp with time zone', { nullable: true })
	public sendingAt: Date | null;
}
