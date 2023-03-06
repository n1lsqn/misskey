<template>
<div v-if="instance" v-tooltip="instance.name" :class="$style.root">
	<img v-if="faviconUrl" :class="$style.icon" :src="faviconUrl"/>
	<i v-if="!faviconUrl" class="ti ti-whirl"></i>
</div>
</template>

<script lang="ts" setup>
import { instance as Instance } from '@/instance';
import { getProxiedImageUrlNullable } from '@/scripts/media-proxy';

const props = defineProps<{
	instance?: {
		faviconUrl?: string
		name: string
	}
}>();

const faviconUrl = $computed(() => props.instance ? getProxiedImageUrlNullable(props.instance.faviconUrl, 'preview') : getProxiedImageUrlNullable(Instance.iconUrl, 'preview') ?? getProxiedImageUrlNullable(Instance.faviconUrl, 'preview') ?? '/favicon.ico');
</script>

<style lang="scss" module>
.root {
	display: inline-flex;
	justify-content: center;
	vertical-align: text-top;
}

.icon {
	height: 2ex;
	flex-shrink: 0;
	border-radius: 25%;
}
</style>
