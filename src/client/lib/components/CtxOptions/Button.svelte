<script lang="ts">
	import type { Snippet } from 'svelte';

	const { onclick = () => {}, children }: { onclick?: (evt: MouseEvent) => any; children: Snippet<[]> } = $props();
</script>

<div class="option btn" {onclick}>
	<span>
		{@render children()}
	</span>
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

		&:hover {
			cursor: pointer;
			background: darken(white, 10%);
		}
	}
</style>
