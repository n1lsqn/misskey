/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed, reactive } from 'vue';
import { ui } from '@@/js/config.js';
import { clearCache } from './utility/clear-cache.js';
import { $i } from '@/i.js';
import { miLocalStorage } from '@/local-storage.js';
import { openInstanceMenu, openToolsMenu } from '@/ui/_common_/common.js';
import { lookup } from '@/utility/lookup.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { unisonReload } from '@/utility/unison-reload.js';
import { store } from '@/store.js';
import { prefer } from '@/preferences.js';

export const navbarItemDef = reactive({
	notifications: {
		title: i18n.ts.notifications,
		icon: 'ti ti-bell',
		show: computed(() => $i != null),
		indicated: computed(() => $i != null && $i.hasUnreadNotification),
		indicateValue: computed(() => {
			if (!$i || $i.unreadNotificationsCount === 0) return '';

			if ($i.unreadNotificationsCount > 99) {
				return '99+';
			} else {
				return $i.unreadNotificationsCount.toString();
			}
		}),
		to: '/my/notifications',
	},
	drive: {
		title: i18n.ts.drive,
		icon: 'ti ti-cloud',
		show: computed(() => $i != null),
		to: '/my/drive',
	},
	followRequests: {
		title: i18n.ts.followRequests,
		icon: 'ti ti-user-plus',
		indicated: computed(() => $i != null && $i.hasPendingReceivedFollowRequest),
		to: '/my/follow-requests',
	},
	explore: {
		title: i18n.ts.explore,
		show: computed(() => $i != null && $i.policies.canUseHighlight),
		icon: 'ti ti-hash',
		to: '/explore',
	},
	announcements: {
		title: i18n.ts.announcements,
		icon: 'ti ti-speakerphone',
		indicated: computed(() => $i != null && $i.hasUnreadAnnouncement),
		to: '/announcements',
	},
	search: {
		title: i18n.ts.search,
		icon: 'ti ti-search',
		to: '/search',
	},
	lookup: {
		title: i18n.ts.lookup,
		icon: 'ti ti-world-search',
		action: (ev) => {
			lookup();
		},
	},
	lists: {
		title: i18n.ts.lists,
		icon: 'ti ti-list',
		show: computed(() => $i != null),
		to: '/my/lists',
	},
	antennas: {
		title: i18n.ts.antennas,
		icon: 'ti ti-antenna',
		show: computed(() => $i != null),
		to: '/my/antennas',
	},
	favorites: {
		title: i18n.ts.favorites,
		icon: 'ti ti-star',
		show: computed(() => $i != null),
		to: '/my/favorites',
	},
	pages: {
		title: i18n.ts.pages,
		icon: 'ti ti-news',
		to: '/pages',
	},
	play: {
		title: 'Play',
		icon: 'ti ti-player-play',
		to: '/play',
	},
	gallery: {
		title: i18n.ts.gallery,
		icon: 'ti ti-icons',
		to: '/gallery',
	},
	clips: {
		title: i18n.ts.clip,
		icon: 'ti ti-paperclip',
		show: computed(() => $i != null),
		to: '/my/clips',
	},
	channels: {
		title: i18n.ts.channel,
		show: computed(() => $i != null && ($i.isAdmin || $i.policies.canUseChannel)),
		icon: 'ti ti-device-tv',
		to: '/channels',
	},
	chat: {
		title: i18n.ts.chat,
		icon: 'ti ti-messages',
		to: '/chat',
		show: computed(() => $i != null && $i.policies.chatAvailability !== 'unavailable'),
		indicated: computed(() => $i != null && $i.hasUnreadChatMessages),
	},
	achievements: {
		title: i18n.ts.achievements,
		icon: 'ti ti-medal',
		show: computed(() => $i != null),
		to: '/my/achievements',
	},
	games: {
		title: 'Misskey Games',
		icon: 'ti ti-device-gamepad',
		to: '/games',
	},
	ui: {
		title: i18n.ts.switchUi,
		icon: 'ti ti-devices',
		action: (ev: MouseEvent) => {
			os.popupMenu([{
				text: i18n.ts.default,
				active: ui === 'default' || ui === null,
				action: () => {
					miLocalStorage.setItem('ui', 'default');
					unisonReload();
				},
			}, {
				text: i18n.ts.deck,
				active: ui === 'deck',
				action: () => {
					miLocalStorage.setItem('ui', 'deck');
					unisonReload();
				},
			}], ev.currentTarget ?? ev.target);
		},
	},
	quickSettings: {
		title: i18n.ts.quickSettings,
		icon: 'ti ti-tool',
		action: (ev) => {
			os.popupMenu([{
				type: 'parent',
				text: i18n.ts.withSensitive,
				children: [{
					text: i18n.ts.on,
					active: prefer.s.tl.filter.withSensitive,
					action: () => {
						const out = { ...prefer.s.tl };

						if (!out.filter) {
							out.filter = {
								withRenotes: true,
								withReplies: true,
								withSensitive: true,
								onlyFiles: false,
							};
						}
						out.filter.withSensitive = true;
						store.set('tl', out);
						unisonReload();
					},
				}, {
					text: i18n.ts.off,
					active: !prefer.s.tl.filter.withSensitive,
					action: () => {
						const out = { ...prefer.s.tl };

						if (!out.filter) {
							out.filter = {
								withRenotes: true,
								withReplies: true,
								withSensitive: true,
								onlyFiles: false,
							};
						}
						out.filter.withSensitive = false;
						store.set('tl', out);
						unisonReload();
					},
				}],
			}, {
				type: 'parent',
				text: i18n.ts.dataSaver,
				children: [{
					text: i18n.ts.on,
					active: prefer.s.enableDataSaverMode,
					action: () => {
						if (!prefer.s.enableDataSaverMode) {
							store.set('enableDataSaverMode', true);
							store.set('dataSaver', {
								media: true,
								avatar: true,
								urlPreview: true,
								code: true,
							});
							unisonReload();
						}
					},
				}, {
					text: i18n.ts.off,
					active: !prefer.s.enableDataSaverMode,
					action: () => {
						if (prefer.s.enableDataSaverMode) {
							store.set('enableDataSaverMode', false);
							store.set('dataSaver', {
								media: false,
								avatar: false,
								urlPreview: false,
								code: false,
							});
							unisonReload();
						}
					},
				}],
			}], ev.currentTarget ?? ev.target);
		},
	},
	about: {
		title: i18n.ts.about,
		icon: 'ti ti-info-circle',
		action: (ev) => {
			openInstanceMenu(ev);
		},
	},
	tools: {
		title: i18n.ts.tools,
		icon: 'ti ti-tool',
		action: (ev) => {
			openToolsMenu(ev);
		},
	},
	reload: {
		title: i18n.ts.reload,
		icon: 'ti ti-refresh',
		action: (ev) => {
			window.location.reload();
		},
	},
	profile: {
		title: i18n.ts.profile,
		icon: 'ti ti-user',
		show: computed(() => $i != null),
		to: `/@${$i?.username}`,
	},
	cacheClear: {
		title: i18n.ts.clearCache,
		icon: 'ti ti-trash',
		action: (ev) => {
			clearCache();
		},
	},
	bubbleGame: {
		title: i18n.ts.bubbleGame,
		icon: 'ti ti-apple',
		to: '/bubble-game',
	},
	clicker: {
		title: '🍪👈',
		icon: 'ti ti-cookie',
		to: '/clicker',
	},
	manageCustomEmojis: {
		title: i18n.ts.manageCustomEmojis,
		icon: 'ti ti-icons',
		show: computed(() => $i != null && ($i.isAdmin || $i.policies.canManageCustomEmojis)),
		to: '/custom-emojis-manager',
	},
	scheduledNotes: {
		title: i18n.ts._schedulePost.list,
		icon: 'ti ti-calendar-event',
		show: computed(() => $i && $i.policies.canScheduleNote),
		action: (ev) => {
			os.listSchedulePost();
		},
	},
});
