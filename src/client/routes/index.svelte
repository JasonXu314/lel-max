<script lang="ts">
	import type { CtxItem } from '$lib/components/CtxMenu.svelte';
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import { IfBlock } from '$lib/editor/blocks/control/IfBlock';
	import { StartBlock } from '$lib/editor/blocks/control/StartBlock';
	import { VariableBlock, VariableRefPill } from '$lib/editor/blocks/data/VariableBlock';
	import { Engine, MouseButton } from '$lib/engine/Engine';
	import { Point } from '$lib/engine/Point';

	let canvas: HTMLCanvasElement;

	let ctxPos: Point | null = $state(null),
		ctxOptions: CtxItem[] = $state([]);

	function withClose<F extends (...args: any) => any>(fn: F): F {
		return ((...args: any) => {
			ctxPos = null;
			ctxOptions = [];

			return fn(...args);
		}) as F;
	}

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

		engine.add(new IfBlock(), 0);

		(window as any).Point = Point;

		engine.on('click', () => {
			ctxPos = null;
			ctxOptions = [];
		});

		engine.on('entityClicked', (entity, evt) => {
			if (evt.button === MouseButton.RIGHT) {
				ctxPos = evt.pagePos;

				if (entity instanceof StartBlock) {
					ctxOptions = [{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) }];
				} else if (entity instanceof VariableRefPill) {
					ctxOptions = [{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) }];
				} else if (entity instanceof VariableBlock) {
					ctxOptions = [
						{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) },
						{ type: 'input', label: 'Name', init: entity.name, onChange: (val) => (entity.name = val) }
					];
				}
			}
		});

		engine.start();
	});
</script>

<canvas bind:this={canvas} height={800} width={1200}></canvas>

<CtxMenu pos={ctxPos} options={ctxOptions} />
