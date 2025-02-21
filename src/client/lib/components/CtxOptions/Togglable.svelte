<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import Toggle from './Toggle.svelte';

	let {
		label,
		toggled = false,
		onChange = () => {},
		onTrue,
		onFalse,
		children
	}: { label: string; toggled?: boolean; onChange?: (on: boolean) => any; onTrue?: () => any; onFalse?: () => any; children: Snippet } = $props();

	let on: boolean = $state(toggled);

	$effect(() => {
		if (on !== untrack(() => toggled)) {
			onChange(on);
		}
	});
</script>

<Toggle {label} bind:value={on} {onTrue} {onFalse} />
{#if on}
	{@render children()}
{/if}
