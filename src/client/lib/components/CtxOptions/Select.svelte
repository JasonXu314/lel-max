<script lang="ts" generics="T">
	import { untrack } from 'svelte';

	let {
		label,
		value = $bindable(null),
		options,
		onChange = () => {}
	}: { label: string; value?: T; options: { value: T; display: string }[]; onChange?: (val: T) => any } = $props();

	let val: T = $state(value);

	$effect(() => {
		if (val !== untrack(() => value)) {
			onChange(val);
		}
	});

	$effect(() => {
		if (val !== untrack(() => value)) {
			value = val;
		}
	});
</script>

<div class="option">
	<label>
		{label}
		<select bind:value={val} name={label} aria-label="Select {label}">
			{#each options as opt}
				<option value={opt.value}>{opt.display}</option>
			{/each}
		</select>
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

			label select {
				border-top-right-radius: 4px;
			}
		}

		&:last-child {
			border-radius: 0 0 4px 4px;

			label select {
				border-bottom-right-radius: 4px;
			}
		}

		label {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			width: 100%;
			gap: 1em;

			select {
				height: 23px;
				margin: 0;
				background: white;
				border: none;
				border-left: 1px solid black;
				border-radius: 0;
				color: black;
				font-size: 14px;
				padding: 0 0 0 1em;
				cursor: pointer;

				&::placeholder {
					color: black;
				}

				option {
					cursor: pointer;
				}
			}
		}
	}
</style>
