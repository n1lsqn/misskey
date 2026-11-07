<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 600px;">
		<div class="_gaps_m">
			<MkInfo v-if="submitted">{{ i18n.ts._invitationRequest.submitted }}</MkInfo>
			<MkInfo v-else-if="!instance.enableInvitationRequests" warn>{{ i18n.ts._invitationRequest.closed }}</MkInfo>
			<form v-else class="_gaps_m" @submit.prevent="submit">
				<p>{{ i18n.ts._invitationRequest.description }}</p>
				<MkInput v-model="email" type="email" autocomplete="email" :spellcheck="false" :disabled="submitting" required :maxLength="256">
					<template #label>{{ i18n.ts.emailAddress }}</template>
					<template #prefix><i class="ti ti-mail"></i></template>
				</MkInput>
				<MkTextarea v-model="reason" :disabled="submitting" :maxLength="2000" required>
					<template #label>{{ i18n.ts._invitationRequest.reason }}</template>
					<template #caption>{{ i18n.ts._invitationRequest.reasonCaption }} {{ reason.length }}/2000</template>
				</MkTextarea>
				<MkInfo>{{ i18n.ts._invitationRequest.privacy }}</MkInfo>
				<div class="_gaps_s">
					<a v-if="instance.tosUrl" class="_link" :href="instance.tosUrl" target="_blank" rel="noopener noreferrer">{{ i18n.ts.termsOfService }} <i class="ti ti-external-link"></i></a>
					<a v-if="instance.privacyPolicyUrl" class="_link" :href="instance.privacyPolicyUrl" target="_blank" rel="noopener noreferrer">{{ i18n.ts.privacyPolicy }} <i class="ti ti-external-link"></i></a>
				</div>
				<MkSwitch v-model="agreed" :disabled="submitting">{{ i18n.ts.agree }}</MkSwitch>
				<MkCaptcha v-if="captchaProvider" ref="captcha" v-model="captchaResponse" :provider="captchaProvider" :sitekey="captchaSitekey" :instanceUrl="instance.mcaptchaInstanceUrl"/>
				<MkButton type="submit" primary rounded :disabled="disabled" :wait="submitting">{{ i18n.ts._invitationRequest.apply }}</MkButton>
			</form>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkCaptcha from '@/components/MkCaptcha.vue';
import { instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

const email = ref('');
const reason = ref('');
const agreed = ref(false);
const submitting = ref(false);
const submitted = ref(false);
const captchaResponse = ref<string | null>(null);
const captcha = useTemplateRef('captcha');
const captchaProvider = computed(() => {
	if (instance.enableHcaptcha) return 'hcaptcha';
	if (instance.enableMcaptcha) return 'mcaptcha';
	if (instance.enableRecaptcha) return 'recaptcha';
	if (instance.enableTurnstile) return 'turnstile';
	if (instance.enableTestcaptcha) return 'testcaptcha';
	return null;
});
const captchaSitekey = computed(() => {
	switch (captchaProvider.value) {
		case 'hcaptcha': return instance.hcaptchaSiteKey;
		case 'mcaptcha': return instance.mcaptchaSiteKey;
		case 'recaptcha': return instance.recaptchaSiteKey;
		case 'turnstile': return instance.turnstileSiteKey;
		default: return null;
	}
});
const disabled = computed(() => submitting.value || !agreed.value || !email.value.trim() || !reason.value.trim() || reason.value.length > 2000 || (!!captchaProvider.value && !captchaResponse.value));

async function submit() {
	if (disabled.value || !instance.enableInvitationRequests) return;
	submitting.value = true;
	try {
		await misskeyApi('invite/request', {
			email: email.value,
			reason: reason.value,
			captchaResponse: captchaResponse.value ?? undefined,
		});
		submitted.value = true;
		email.value = '';
		reason.value = '';
	} catch (err) {
		captcha.value?.reset();
		captchaResponse.value = null;
		const code = (err as { code?: string }).code;
		await os.alert({
			type: 'error',
			text: code === 'CAPTCHA_FAILED' ? i18n.ts._invitationRequest.captchaFailed
				: code === 'INVALID_EMAIL' ? i18n.ts._invitationRequest.invalidEmail
					: code === 'INVITATION_REQUESTS_CLOSED' ? i18n.ts._invitationRequest.closed : i18n.ts.somethingHappened,
		});
	} finally {
		submitting.value = false;
	}
}

definePage(() => ({ title: i18n.ts._invitationRequest.title, icon: 'ti ti-mail-plus' }));
</script>
