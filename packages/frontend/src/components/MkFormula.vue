<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<!-- KaTeX escapes input and disables trusted HTML commands. -->
<!-- eslint-disable vue/no-v-html -->
<div v-if="block" :class="$style.root" v-html="compiled"></div>
<span v-else :class="$style.root" v-html="compiled"></span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { renderToString } from 'katex';
import 'katex/dist/katex.min.css';

const props = defineProps<{ formula: string; block: boolean }>();
const compiled = computed(() => renderToString(props.formula, {
	displayMode: props.block,
	throwOnError: false,
	trust: false,
	maxExpand: 1000,
	maxSize: 10,
}));
</script>

<style lang="scss" module>
.root {
	max-width: 100%;
	overflow-x: auto;
}
</style>
