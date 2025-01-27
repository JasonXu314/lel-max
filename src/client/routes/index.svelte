<script lang="ts">
	import { StartBlock } from '$lib/editor/blocks/control/StartBlock';
	import { VariableBlock } from '$lib/editor/blocks/data/VariableBlock';
	import { Engine } from '$lib/engine/Engine';
	import { Point } from '$lib/engine/Point';

	let canvas: HTMLCanvasElement;

	$effect(() => {
		const engine = new Engine(canvas);

		const block = new StartBlock();
		block.position = new Point();

		engine.add(block, 0);

		for (let i = 0; i < 5; i++) {
			const v = new VariableBlock();
			v.position = new Point(400, 0);
			engine.add(v, 0);
		}

		(window as any).Point = Point;

		engine.start();
	});
</script>

<canvas bind:this={canvas} height={800} width={1200}></canvas>
