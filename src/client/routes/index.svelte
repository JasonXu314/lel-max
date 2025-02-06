<script lang="ts">
	import type { CtxItem } from '$lib/components/CtxMenu.svelte';
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import { Block } from '$lib/editor/Block';
	import { IfBlock } from '$lib/editor/blocks/control/IfBlock';
	import { StartBlock } from '$lib/editor/blocks/control/StartBlock';
	import { LiteralValue } from '$lib/editor/blocks/data/LiteralValue';
	import { VariableBlock } from '$lib/editor/blocks/data/VariableBlock';
	import { PrintBlock } from '$lib/editor/blocks/system/PrintBlock';
	import { EqualityPredicate } from '$lib/editor/blocks/values/EqualityPredicate';
	import { GTEPredicate } from '$lib/editor/blocks/values/GTEPredicate';
	import { GTPredicate } from '$lib/editor/blocks/values/GTPredicate';
	import { LTEPredicate } from '$lib/editor/blocks/values/LTEPredicate';
	import { LTPredicate } from '$lib/editor/blocks/values/LTPredicate';
	import { BlockSpot } from '$lib/editor/BlockSpot';
	import { Engine, MouseButton } from '$lib/engine/Engine';
	import { Point } from '$lib/engine/Point';

	let canvas: HTMLCanvasElement;

	let ctxPos: Point | null = $state(null),
		ctxOptions: CtxItem[] = $state([]),
		block: StartBlock = null;

	function withClose<F extends (...args: any) => any>(fn: F): F {
		return ((...args: any) => {
			ctxPos = null;
			ctxOptions = [];

			return fn(...args);
		}) as F;
	}

	function compile() {
		const code = block.compile().lines.join('\n');

		const file = new File([code], 'main.cpp');
		const url = URL.createObjectURL(file);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'main.cpp';

		a.click();
	}

	$effect(() => {
		const engine = new Engine(canvas);

		[VariableBlock, IfBlock, GTPredicate, GTEPredicate, EqualityPredicate, LTEPredicate, LTPredicate, PrintBlock, LiteralValue].forEach((Block, i) => {
			const spot = new BlockSpot<InstanceType<typeof Block>>(Block, new Point(-canvas.width / 2 + 100, canvas.height / 2 - 20 - 60 * i));

			engine.add(spot, 0);
		});

		engine.add(new StartBlock(), 0);

		(window as any).Point = Point;

		engine.on('click', () => {
			ctxPos = null;
			ctxOptions = [];
		});

		engine.on('entityClicked', (entity, evt) => {
			if (evt.button === MouseButton.RIGHT) {
				ctxPos = evt.pagePos;

				if (entity instanceof Block) {
					ctxOptions = [{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) }];
				}
				if (entity instanceof VariableBlock) {
					ctxOptions = [
						{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) },
						{ type: 'input', label: 'Name', init: entity.name, onChange: (val) => (entity.name = val) }
					];
				}
				if (entity instanceof LiteralValue) {
					ctxOptions = [
						{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) },
						{ type: 'input', label: 'Value', init: `${entity.value}`, onChange: (val) => (entity.value = val) }
					];
				}
			}
		});

		engine.start();
	});
</script>

<canvas bind:this={canvas} height={800} width={1200}></canvas>

<CtxMenu pos={ctxPos} options={ctxOptions} />

<button onclick={compile}>Compile</button>
