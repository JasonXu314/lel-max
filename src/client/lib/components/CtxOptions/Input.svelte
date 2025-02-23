<script lang="ts" generics="T">
	import { untrack } from 'svelte';

	let {
		label,
		value = $bindable(null),
		onChange = () => {},
		stringify = (val) => `${val}`,
		parse = (str) => str as T
	}: { label: string; value?: T; onChange?: (val: T) => any; stringify?: (val: T) => string; parse?: (str: string) => T } = $props();

	let val: string = $state(stringify(value));

	$effect(() => {
		try {
			const parsed = parse(val);

			if (parsed !== untrack(() => value)) {
				onChange(parsed);
			}
		} catch {}
	});

	$effect(() => {
		try {
			const parsed = parse(val);

			if (parsed !== untrack(() => value)) {
				value = parsed;
			}
		} catch {}
	});
</script>

<div class="option">
	<label>
		{label}
		<input type="text" bind:value={val} />
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
				background: white;
				border: none;
				border-left: 1px solid black;
				border-radius: 0;
				color: black;
				font-size: 14px;
				padding-left: 1em;
			}
		}
	}
</style>
