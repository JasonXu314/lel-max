<script lang="ts">
	import type { CtxItem } from './CtxMenu.svelte';

	const { option }: { option: CtxItem } = $props();

	let val: string = $state(option.type === 'input' ? option.init : '');

	$effect(() => {
		if (option.type === 'input') {
			option.onChange(val);
		}
	});
</script>

<div class="option" class:btn={option.type === 'button'} onclick={() => option.type === 'button' && option.action()}>
	{#if option.type === 'input'}
		{#if option.dataType.name === 'string'}
			<label>
				{option.label}
				<input type="text" bind:value={val} />
			</label>
		{:else if option.dataType.name === 'byte' || option.dataType.name === 'int' || option.dataType.name === 'long' || option.dataType.name === 'float' || option.dataType.name === 'double'}
			<label>
				{option.label}
				<input type="number" bind:value={val} />
			</label>
		{:else if option.dataType.name === 'bool'}
			<label>
				{option.label}
				<input type="checkbox" role="switch" bind:value={val} />
			</label>
		{/if}
	{:else}
		<span>{option.label}</span>
	{/if}
</div>

<style lang="scss">
	.option {
		height: 24px;
		font-size: 14px;
		color: black;
		padding-left: 0.5em;

		&:not(:first-child) {
			border-top: 1px solid rgba(50, 50, 50);
		}

		&:first-child {
			border-radius: 4px 4px 0 0;
		}

		&:last-child {
			border-radius: 0 0 4px 4px;

			label input {
				border-bottom-right-radius: 4px;
			}
		}

		label {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			width: 100%;
			gap: 1em;

			input {
				height: 23px;
				margin: 0;
				background: white;
				border: none;
				border-left: 1px solid black;
				border-radius: 0;
				color: black;
				font-size: 14px;
				padding-left: 1em;
			}
		}

		&.btn:hover {
			cursor: pointer;
			background: darken(white, 10%);
		}
	}
</style>
