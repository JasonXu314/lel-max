<script lang="ts">
	import type { Block } from '$lib/editor';
	import type { Point } from '$lib/engine/Point';
	import type { DataType } from '$lib/utils/DataType';
	import type { Snippet } from 'svelte';

	export interface ButtonCtxItem {
		type: 'button';
		label: string;
		togglable?: boolean;
		toggled?: boolean;
		toggleLabel?: string;
		action: () => void;
	}

	export interface InputCtxItem {
		type: 'input';
		label: string;
		dataType: DataType;
		// TODO: see if i can make this generic (probably not)
		init: any;
		togglable?: boolean;
		toggled?: boolean;
		toggleLabel?: string;
		onChange: (val: any) => void;
	}

	export interface SelectCtxItem {
		type: 'select';
		label: string;
		// TODO: see if i can make this generic (probably not)
		init: any;
		options: any[];
		togglable?: boolean;
		toggled?: boolean;
		toggleLabel?: string;
		onChange: (val: any) => void;
	}

	export type CtxItem = ButtonCtxItem | InputCtxItem | SelectCtxItem;

	const {
		pos,
		block,
		blocks,
		...blockSnippets
	}: {
		pos: Point | null;
		blocks: Record<string, new (...args: any) => Block>;
		block: Block | null;
		[className: string]: null | Point | Record<string, new (...args: any) => Block> | Block | Snippet<[Block]>;
	} = $props();

	const blockType = $derived(block ? Object.keys(blocks).find((k) => block.constructor === blocks[k]) : null);
</script>

{#if pos !== null}
	<div class="menu" style="top: {pos.y}px; left: {pos.x}px;">
		{#if block && blockType in blockSnippets}
			{@render (blockSnippets[blockType] as Snippet<[Block]>)(block)}
		{/if}
	</div>
{/if}

<style lang="scss">
	.menu {
		position: absolute;
		width: 200px;
		height: fit-content;
		display: flex;
		flex-direction: column;
		gap: 0;
		background: white;
		border-radius: 4px;
		border: 1px solid rgb(50, 50, 50);
		box-shadow: inset 6px -6px 8px -8px rgba(0, 0, 0, 0.5);

		:global(.option:last-child input:not([type='checkbox'])) {
			box-shadow: inset 0px -6px 8px -8px rgba(0, 0, 0, 0.5);
		}
	}
</style>
