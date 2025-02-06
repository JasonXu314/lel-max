<script lang="ts">
	import type { Point } from '$lib/engine/Point';
	import type { DataType } from '$lib/utils/DataType';
	import CtxOption from './CtxOption.svelte';

	export interface ButtonCtxItem {
		type: 'button';
		label: string;
		action: () => void;
	}

	export interface InputCtxItem {
		type: 'input';
		label: string;
		dataType: DataType;
		// TODO: see if i can make this generic (probably not)
		init: any;
		onChange: (val: any) => void;
	}

	export type CtxItem = ButtonCtxItem | InputCtxItem;

	const { pos, options }: { pos: Point | null; options: CtxItem[] } = $props();
</script>

{#if pos !== null}
	<div class="menu" style="top: {pos.y}px; left: {pos.x}px; height: {options.length * 24}px">
		{#each options as option}
			<CtxOption {option} />
		{/each}
	</div>
{/if}

<style lang="scss">
	.menu {
		position: absolute;
		width: 200px;
		display: flex;
		flex-direction: column;
		gap: 0;
		background: white;
		border-radius: 4px;
		border: 1px solid rgb(50, 50, 50);
		box-shadow: inset 6px -6px 8px -8px rgba(0, 0, 0, 0.5);

		:global(input) {
			box-shadow: inset 0px -6px 8px -8px rgba(0, 0, 0, 0.5);
		}
	}
</style>
