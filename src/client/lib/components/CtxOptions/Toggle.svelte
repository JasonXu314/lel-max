<script lang="ts">
	import { untrack } from 'svelte';

	let {
		label,
		value = $bindable(false),
		onChange = () => {},
		onTrue = () => {},
		onFalse = () => {}
	}: { label: string; value?: boolean; onChange?: (val: boolean) => any; onTrue?: () => any; onFalse?: () => any } = $props();

	let checked: boolean = $state(value);

	$effect(() => {
		if (checked !== untrack(() => value)) {
			onChange(checked);

			if (checked) onTrue();
			else onFalse();
		}
	});

	$effect(() => {
		if (checked !== untrack(() => value)) {
			value = checked;
		}
	});
</script>

<div class="option">
	<label>
		{label}
		<input type="checkbox" role="switch" bind:checked />
	</label>
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
			}
		}
	}
</style>
