<script lang="ts">
	import { Block } from '$lib/editor';
	import type { Entity } from '$lib/engine/Entity';
	import type { Point } from '$lib/engine/Point';
	import type { Snippet } from 'svelte';

	const {
		pos,
		entity,
		entities,
		...entitySnippets
	}: {
		pos: Point | null;
		entities: Record<string, new (...args: any) => Entity>;
		entity: Entity | null;
		[className: string]: null | Point | Record<string, new (...args: any) => Entity> | Entity | Snippet<[Entity, <T>(cb: T) => T]>;
	} = $props();

	const entityType = $derived(entity ? Object.keys(entities).find((k) => entity.constructor === entities[k]) : null);

	let __toggle = $state(true);

	function wrap<T extends (...args: any[]) => any>(cb: T) {
		return ((...args: any[]) => {
			const result = cb(...args);
			__toggle = !__toggle;
			return result;
		}) as T;
	}
</script>

{#if pos !== null && entity !== null}
	<div class="menu" style="top: {pos.y}px; left: {pos.x}px;">
		{#key __toggle}
			{#if entityType in entitySnippets}
				{@render (entitySnippets[entityType] as Snippet<[Entity, <T extends (...args: any[]) => any>(cb: T) => T]>)(entity, wrap)}
			{:else if entity instanceof Block}
				{@render (entitySnippets.DefaultBlock as Snippet<[Block, <T extends (...args: any[]) => any>(cb: T) => T]>)(entity, wrap)}
			{/if}
		{/key}
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
