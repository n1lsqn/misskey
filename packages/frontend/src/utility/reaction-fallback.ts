/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function getReactionFallback(reaction: string, localNames: ReadonlyMap<string, unknown>): string | null {
	const match = /^:([^:@]+)@([^:]+):$/.exec(reaction);
	if (!match || match[2] === '.' || !localNames.has(match[1])) return null;
	return `:${match[1]}@.:`;
}
