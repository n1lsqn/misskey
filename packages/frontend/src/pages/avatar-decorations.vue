<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :contentMax="900">
		<div class="_gaps">
			<div :class="$style.decorations">
				<div
					v-for="avatarDecoration in avatarDecorations"
					:key="avatarDecoration.id"
					v-panel
					:class="$style.decoration"
					@click="edit(avatarDecoration)"
				>
					<div :class="$style.decorationName"><MkCondensedLine :minScale="0.5">{{ avatarDecoration.name }}</MkCondensedLine></div>
					<MkAvatar style="width: 60px; height: 60px;" :user="$i" :decorations="[{ url: avatarDecoration.url }]" forceShowDecoration/>
				</div>
			</div>
		</div>
		<!--
		<MkFolder>
			<template #label>ローカル</template>
			<div class="_gaps">
				<MkFolder v-for="localAvatarDecoration in localAvatarDecorations" :key="localAvatarDecoration.id ?? localAvatarDecoration._id" :defaultOpen="localAvatarDecoration.id == null">
					<template #label>{{ localAvatarDecoration.name }}</template>
					<template #caption>{{ localAvatarDecoration.description }}</template>
					<div class="_gaps_m">
						<MkInput v-model="localAvatarDecoration.name">
							<template #label>{{ i18n.ts.name }}</template>
						</MkInput>
						<MkTextarea v-model="localAvatarDecoration.description">
							<template #label>{{ i18n.ts.description }}</template>
						</MkTextarea>
						<MkInput v-model="localAvatarDecoration.url">
							<template #label>{{ i18n.ts.imageUrl }}</template>
						</MkInput>
						<div class="buttons _buttons">
							<MkButton class="button" inline primary @click="save(localAvatarDecoration)"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
							<MkButton v-if="localAvatarDecoration.id != null" class="button" inline danger @click="del(localAvatarDecoration)"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
						</div>
					</div>
				</MkFolder>
			</div>
		</MkFolder>
		<br>
		<MkFolder>
			<template #label>リモート</template>
			<div class="_gaps">
				<MkFolder v-for="remoteAvatarDecoration in remoteAvatarDecorations" :key="remoteAvatarDecoration.id ?? remoteAvatarDecoration._id" :defaultOpen="remoteAvatarDecoration.id == null">
					<template #label>{{ remoteAvatarDecoration.name }}</template>
					<template #caption>{{ remoteAvatarDecoration.description }}</template>
					<div class="_gaps_m">
						<MkInput v-model="remoteAvatarDecoration.name">
							<template #label>{{ i18n.ts.name }}</template>
						</MkInput>
						<MkTextarea v-model="remoteAvatarDecoration.description">
							<template #label>{{ i18n.ts.description }}</template>
						</MkTextarea>
						<MkInput v-model="remoteAvatarDecoration.url">
							<template #label>{{ i18n.ts.imageUrl }}</template>
						</MkInput>
						<div class="buttons _buttons">
							<MkButton class="button" inline primary @click="save(remoteAvatarDecoration)"><i class="ti ti-device-floppy"></i> {{ i18n.ts.save }}</MkButton>
							<MkButton v-if="remoteAvatarDecoration.id != null" class="button" inline danger @click="del(remoteAvatarDecoration)"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
						</div>
					</div>
				</MkFolder>
			</div>
		</MkFolder>
		-->
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed, defineAsyncComponent } from 'vue';
import * as Misskey from 'misskey-js';
import { signinRequired } from '@/account.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import MkFolder from '@/components/MkFolder.vue';

const avatarDecorations = ref<Misskey.entities.AdminAvatarDecorationsListResponse>([]);
const localAvatarDecorations = ref<Misskey.entities.AdminAvatarDecorationsListResponse>([]);
const remoteAvatarDecorations = ref<Misskey.entities.AdminAvatarDecorationsListResponse>([]);

const $i = signinRequired();

function load() {
	misskeyApi('admin/avatar-decorations/list').then(_avatarDecorations => {
		avatarDecorations.value = _avatarDecorations;
		_avatarDecorations.forEach(item => {
			if (item.name.includes('import_')) {
				remoteAvatarDecorations.value.push(item);
			} else {
				localAvatarDecorations.value.push(item);
			}
		});
	},
	);
}

load();

async function add(ev: MouseEvent) {
	const { dispose } = os.popup(defineAsyncComponent(() => import('./avatar-decoration-edit-dialog.vue')), {
	}, {
		done: result => {
			if (result.created) {
				avatarDecorations.value.unshift(result.created);
			}
		},
		closed: () => dispose(),
	});
}

function edit(avatarDecoration) {
	const { dispose } = os.popup(defineAsyncComponent(() => import('./avatar-decoration-edit-dialog.vue')), {
		avatarDecoration: avatarDecoration,
	}, {
		done: result => {
			if (result.updated) {
				const index = avatarDecorations.value.findIndex(x => x.id === avatarDecoration.id);
				avatarDecorations.value[index] = {
					...avatarDecorations.value[index],
					...result.updated,
				};
			} else if (result.deleted) {
				avatarDecorations.value = avatarDecorations.value.filter(x => x.id !== avatarDecoration.id);
			}
		},
		closed: () => dispose(),
	});
}

const headerActions = computed(() => [{
	asFullButton: true,
	icon: 'ti ti-plus',
	text: i18n.ts.add,
	handler: add,
}]);

const headerTabs = computed(() => []);

definePageMetadata(() => ({
	title: i18n.ts.avatarDecorations,
	icon: 'ti ti-sparkles',
}));
</script>

<style lang="scss" module>
.decorations {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	grid-gap: 12px;
}

.decoration {
	cursor: pointer;
	padding: 16px 16px 28px 16px;
	border-radius: 8px;
	text-align: center;
	font-size: 90%;
	overflow: clip;
	contain: content;
}

.decorationName {
	position: relative;
	z-index: 10;
	font-weight: bold;
	margin-bottom: 20px;
}
</style>
