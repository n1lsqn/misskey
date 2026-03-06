<template>
<div v-tooltip="instance.name" :class="$style.root">
	<img v-if="faviconUrl && instance.themeColor && !darkMode" :class="$style.icon" :src="faviconUrl" :style="{ backgroundColor: instance.themeColor }"/>
	<img v-else-if="faviconUrl && instance.themeColor" :class="$style.icon" :src="faviconUrl"/>
	<i v-if="!faviconUrl" class="ti ti-whirl"></i>
</div>
</template>

<script lang="ts" setup>
import { computed, defineProps } from 'vue';
import * as Misskey from 'misskey-js';
import { instanceName } from '@@/js/config';
import { getProxiedImageUrlNullable } from '@/utility/media-proxy.js';
import { store } from '@/store';
import { instance as Instance } from '@/instance.js';

const props = defineProps<{
	instance?: Misskey.entities.User['instance'];
}>();

const instance = computed(() => props.instance ?? {
	name: instanceName,
	themeColor: (window.document.querySelector('meta[name="theme-color"]') as HTMLMetaElement).content,
});

const faviconUrl = computed(() =>
	props.instance ?
		getProxiedImageUrlNullable(props.instance.faviconUrl, 'preview') :
		getProxiedImageUrlNullable(Instance.iconUrl, 'preview') ??
		getProxiedImageUrlNullable(Instance.iconUrl, 'preview') ?? '/favicon.ico');

const darkMode = store.s.darkMode;
const TickerStyle = store.s.instanceTickerStyle;
</script>

<style lang="scss" module>

.root {
	display: inline-flex;
	justify-content: center;
	vertical-align: top;
}

.icon {
	height: 1.3em;
	flex-shrink: 0;
	border-radius: 25%;
}
</style>
