<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkFormulaCore :formula="formula" :block="block"/>
</template>

<script lang="ts" setup>
import MkFormulaCore from './MkFormulaCore.vue';
defineProps({
	formula: {
		type: String,
		required: true,
	},
	block: {
		type: Boolean,
		required: true,
	},
});
</script>
