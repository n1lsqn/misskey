/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { StoryObj } from '@storybook/vue3';
import MkFormula from './MkFormula.vue';
export const Inline = {
	render: args => ({ components: { MkFormula }, setup: () => ({ args }), template: '<MkFormula v-bind="args"/>' }),
	args: { formula: 'x^2 + y^2 = z^2', block: false },
} satisfies StoryObj<typeof MkFormula>;
export const Block = { ...Inline, args: { formula: '\\frac{1}{2}', block: true } } satisfies StoryObj<typeof MkFormula>;
export const Invalid = { ...Inline, args: { formula: '\\unknowncommand', block: false } } satisfies StoryObj<typeof MkFormula>;
