<script lang="ts">
	import type { CtxItem } from '$lib/components/CtxMenu.svelte';
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import { Block, DataTypeIndicator, LiteralValue, StartBlock, VariableBlock } from '$lib/editor';
	import { Engine, MouseButton } from '$lib/engine/Engine';
	import { Point } from '$lib/engine/Point';
	import { DataType } from '$lib/utils/DataType';

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

		// [VariableBlock, SetVarBlock, IfBlock, WhileBlock, PrintBlock, IfElseBlock].forEach((Block, i) => {
		// 	const spot = new BlockSpot<InstanceType<typeof Block>>(Block, new Point(-canvas.width / 2 + 100, canvas.height / 2 - 20 - 70 * i));

		// 	engine.add(spot, 0);
		// });

		// [GTPredicate, GTEPredicate, EqualityPredicate, LTEPredicate, LTPredicate, LiteralValue, AdditionValue, ModulusValue].forEach((Block, i) => {
		// 	const spot = new BlockSpot<InstanceType<typeof Block>>(Block, new Point(-canvas.width / 2 + 250, canvas.height / 2 - 20 - 65 * i));

		// 	engine.add(spot, 0);
		// });

		engine.add((block = new StartBlock()), 1);

		(window as any).Point = Point;
		(window as any).engine = engine;

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
						{ type: 'input', label: 'Name', dataType: DataType.PRIMITIVES.STRING, init: entity.name, onChange: (val) => (entity.name = val) }
					];
				} else if (entity instanceof LiteralValue) {
					ctxOptions = [
						{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) },
						{ type: 'input', label: 'Value', dataType: entity.dataType, init: `${entity.value}`, onChange: (val) => (entity.value = val) }
					];
				} else if (entity instanceof DataTypeIndicator) {
					ctxOptions = [
						{ type: 'button', label: 'String', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.STRING)) },
						{ type: 'button', label: 'Boolean', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.BOOL)) },
						{ type: 'button', label: 'Char', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.BYTE)) },
						{ type: 'button', label: 'Integer', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.INT)) },
						{ type: 'button', label: 'Long', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.LONG)) },
						{ type: 'button', label: 'Float', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.FLOAT)) },
						{ type: 'button', label: 'Double', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.DOUBLE)) }
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
