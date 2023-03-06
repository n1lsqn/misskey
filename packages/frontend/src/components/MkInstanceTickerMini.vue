<template>
<div v-tooltip="instance.name" :class="$style.root" :style="bg">
	<img v-if="faviconUrl" :class="$style.icon" :src="faviconUrl"/>
	<span v-if="!faviconUrl" :class="$style.name">{{ firstLetter }}</span>
</div>
</template>

<script lang="ts" setup>
import { } from 'vue';
import { instanceName } from '@/config';
import { instance as Instance } from '@/instance';
import { getProxiedImageUrlNullable } from '@/scripts/media-proxy';

const props = defineProps<{
	instance?: {
		faviconUrl?: string
		name: string
		themeColor?: string
	}
}>();

// if no instance data is given, this is for the local instance
const instance = props.instance ?? {
	name: instanceName,
	themeColor: (document.querySelector('meta[name="theme-color-orig"]') as HTMLMetaElement).content,
};

const faviconUrl = $computed(() => props.instance ? getProxiedImageUrlNullable(props.instance.faviconUrl, 'preview') : getProxiedImageUrlNullable(Instance.iconUrl, 'preview') ?? getProxiedImageUrlNullable(Instance.faviconUrl, 'preview') ?? '/favicon.ico');
const firstLetter = instance.name.slice(0, 1);

const themeColor = instance.themeColor ?? '#777777';

const bg = {
	background: themeColor,
};
</script>

<style lang="scss" module>

.root {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 3.5ex;
	width: 3.5ex;
	border-radius: 0 0 8px 0;
}

.icon {
	height: 2ex;
	flex-shrink: 0;
	border-radius: 25%;
	filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.75));
}

.name {
	font-size: 1em;
	font-weight: bold;
	filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.75));
}
</style>
