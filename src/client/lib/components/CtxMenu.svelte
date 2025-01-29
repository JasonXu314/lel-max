<script lang="ts">
	import type { Point } from '$lib/engine/Point';
	import CtxOption from './CtxOption.svelte';

	export interface ButtonCtxItem {
		type: 'button';
		label: string;
		action: () => void;
	}

	export interface InputCtxItem {
		type: 'input';
		label: string;
		init: string;
		onChange: (val: string) => void;
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
	}
</style>
