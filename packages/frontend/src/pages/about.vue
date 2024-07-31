<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs"/></template>
	<MkHorizontalSwipe v-model:tab="tab" :tabs="headerTabs">
		<MkSpacer v-if="tab === 'overview'" :contentMax="600" :marginMin="20">
			<div class="_gaps_m">
				<div :class="$style.banner" :style="{ backgroundImage: `url(${ instance.bannerUrl })` }">
					<div style="overflow: clip;">
						<img :src="instance.iconUrl ?? instance.iconUrl ?? '/favicon.ico'" alt="" :class="$style.bannerIcon"/>
						<div :class="$style.bannerName">
							<b>{{ instance.name ?? host }}</b>
						</div>
					</div>
				</div>

				<MkKeyValue>
					<template #key>{{ i18n.ts.description }}</template>
					<template #value>
						<div v-html="instance.description"></div>
						<br/>
						Special Thanks <a href="https://git.prismisskey.space/mattyatea/misskey">Prismisskey</a>
						<br/>
						Special Thanks <a href="https://misskey.io/@cyberrex_v2">@cyberrex_v2</a>
						<br/>
						Special Thanks <a href="https://github.com/hideki0403/misskey.yukineko.me">隠れ家</a>
					</template>
				</MkKeyValue>

				<FormSection>
					<div class="_gaps_m">
						<MkKeyValue :copy="version">
							<template #key>Misskey</template>
							<template #value>{{ version }}</template>
						</MkKeyValue>
						<div v-html="i18n.tsx.poweredByMisskeyDescription({ name: instance.name ?? host })">
						</div>
						<FormLink to="/about-misskey">
							<template #icon><i class="ti ti-info-circle"></i></template>
							{{ i18n.ts.aboutMisskey }}
						</FormLink>
						<FormLink v-if="instance.repositoryUrl || instance.providesTarball" :to="instance.repositoryUrl || `/tarball/misskey-${version}.tar.gz`" external>
							<template #icon><i class="ti ti-code"></i></template>
							{{ i18n.ts.sourceCode }}
						</FormLink>
						<MkInfo v-else warn>
							{{ i18n.ts.sourceCodeIsNotYetProvided }}
						</MkInfo>
					</div>
				</FormSection>

				<FormSection>
					<div class="_gaps_m">
						<FormSplit>
							<MkKeyValue>
								<template #key>{{ i18n.ts.administrator }}</template>
								<template #value>{{ instance.maintainerName }}</template>
							</MkKeyValue>
							<MkKeyValue>
								<template #key>{{ i18n.ts.contact }}</template>
								<template #value>{{ instance.maintainerEmail }}</template>
							</MkKeyValue>
						</FormSplit>
						<FormLink v-if="instance.impressumUrl" :to="instance.impressumUrl" external>
							<template #icon><i class="ti ti-user-shield"></i></template>
							{{ i18n.ts.impressum }}
						</FormLink>
						<div class="_gaps_s">
							<MkFolder v-if="instance.serverRules.length > 0">
								<template #label>
									<i class="ti ti-checkup-list"></i>
									{{ i18n.ts.serverRules }}
								</template>

								<ol class="_gaps_s" :class="$style.rules">
									<li v-for="(item, index) in instance.serverRules" :key="index" :class="$style.rule"><div :class="$style.ruleText" v-html="item"></div></li>
								</ol>
							</MkFolder>
							<FormLink v-if="instance.tosUrl" :to="instance.tosUrl" external>
								<template #icon><i class="ti ti-license"></i></template>
								{{ i18n.ts.termsOfService }}
							</FormLink>
							<FormLink v-if="instance.privacyPolicyUrl" :to="instance.privacyPolicyUrl" external>
								<template #icon><i class="ti ti-shield-lock"></i></template>
								{{ i18n.ts.privacyPolicy }}
							</FormLink>
							<FormLink v-if="instance.feedbackUrl" :to="instance.feedbackUrl" external>
								<template #icon><i class="ti ti-message"></i></template>
								{{ i18n.ts.feedback }}
							</FormLink>
						</div>
					</div>
				</FormSection>

				<FormSuspense :p="initStats">
					<FormSection>
						<template #label>{{ i18n.ts.statistics }}</template>
						<FormSplit>
							<MkKeyValue>
								<template #key>{{ i18n.ts.users }}</template>
								<template #value>{{ number(stats.originalUsersCount) }}</template>
							</MkKeyValue>
							<MkKeyValue>
								<template #key>{{ i18n.ts.notes }}</template>
								<template #value>{{ number(stats.originalNotesCount) }}</template>
							</MkKeyValue>
						</FormSplit>
					</FormSection>
				</FormSuspense>

				<FormSection>
					<template #label>Well-known resources</template>
					<div class="_gaps_s">
						<FormLink :to="`/.well-known/host-meta`" external>host-meta</FormLink>
						<FormLink :to="`/.well-known/host-meta.json`" external>host-meta.json</FormLink>
						<FormLink :to="`/.well-known/nodeinfo`" external>nodeinfo</FormLink>
						<FormLink :to="`/robots.txt`" external>robots.txt</FormLink>
						<FormLink :to="`/manifest.json`" external>manifest.json</FormLink>
					</div>
				</FormSection>
			</div>
		</MkSpacer>
		<MkSpacer v-else-if="tab === 'emojis'" :contentMax="1000" :marginMin="20">
			<XEmojis/>
		</MkSpacer>
		<MkSpacer v-else-if="tab === 'federation'" :contentMax="1000" :marginMin="20">
			<XFederation/>
		</MkSpacer>
		<MkSpacer v-else-if="tab === 'charts'" :contentMax="1000" :marginMin="20">
			<MkInstanceStats/>
		</MkSpacer>
	</MkHorizontalSwipe>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { i18n } from '@/i18n.js';
import { claimAchievement } from '@/scripts/achievements.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import MkHorizontalSwipe from '@/components/MkHorizontalSwipe.vue';

const XOverview = defineAsyncComponent(() => import('@/pages/about.overview.vue'));
const XEmojis = defineAsyncComponent(() => import('@/pages/about.emojis.vue'));
const XFederation = defineAsyncComponent(() => import('@/pages/about.federation.vue'));
const MkInstanceStats = defineAsyncComponent(() => import('@/components/MkInstanceStats.vue'));

const props = withDefaults(defineProps<{
	initialTab?: string;
}>(), {
	initialTab: 'overview',
});

const tab = ref(props.initialTab);

watch(tab, () => {
	if (tab.value === 'charts') {
		claimAchievement('viewInstanceChart');
	}
});

const headerActions = computed(() => []);

const headerTabs = computed(() => [{
	key: 'overview',
	title: i18n.ts.overview,
}, {
	key: 'emojis',
	title: i18n.ts.customEmojis,
	icon: 'ti ti-icons',
}, {
	key: 'federation',
	title: i18n.ts.federation,
	icon: 'ti ti-whirl',
}, {
	key: 'charts',
	title: i18n.ts.charts,
	icon: 'ti ti-chart-line',
}]);

definePageMetadata(() => ({
	title: i18n.ts.instanceInfo,
	icon: 'ti ti-info-circle',
}));
</script>
