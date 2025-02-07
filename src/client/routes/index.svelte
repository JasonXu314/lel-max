<script lang="ts">
	import type { CtxItem } from '$lib/components/CtxMenu.svelte';
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import { Block } from '$lib/editor/Block';
	import { EqualityPredicate } from '$lib/editor/blocks/conditions/EqualityPredicate';
	import { GTEPredicate } from '$lib/editor/blocks/conditions/GTEPredicate';
	import { GTPredicate } from '$lib/editor/blocks/conditions/GTPredicate';
	import { LTEPredicate } from '$lib/editor/blocks/conditions/LTEPredicate';
	import { LTPredicate } from '$lib/editor/blocks/conditions/LTPredicate';
	import { IfBlock } from '$lib/editor/blocks/control/IfBlock';
	import { IfElseBlock } from '$lib/editor/blocks/control/IfElseBlock';
	import { StartBlock } from '$lib/editor/blocks/control/StartBlock';
	import { WhileBlock } from '$lib/editor/blocks/control/WhileBlock';
	import { AdditionValue } from '$lib/editor/blocks/data/AdditionValue';
	import { LiteralValue } from '$lib/editor/blocks/data/LiteralValue';
	import { ModulusValue } from '$lib/editor/blocks/data/ModulusValue';
	import { SetVarBlock } from '$lib/editor/blocks/data/SetVarBlock';
	import { VariableBlock } from '$lib/editor/blocks/data/VariableBlock';
	import { PrintBlock } from '$lib/editor/blocks/system/PrintBlock';
	import { BlockSpot } from '$lib/editor/blocks/utils/BlockSpot';
	import { DataTypeIndicator } from '$lib/editor/blocks/utils/DataTypeIndicator';
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

		[VariableBlock, SetVarBlock, IfBlock, WhileBlock, PrintBlock, IfElseBlock].forEach((Block, i) => {
			const spot = new BlockSpot<InstanceType<typeof Block>>(Block, new Point(-canvas.width / 2 + 100, canvas.height / 2 - 20 - 70 * i));

			engine.add(spot, 0);
		});

		[GTPredicate, GTEPredicate, EqualityPredicate, LTEPredicate, LTPredicate, LiteralValue, AdditionValue, ModulusValue].forEach((Block, i) => {
			const spot = new BlockSpot<InstanceType<typeof Block>>(Block, new Point(-canvas.width / 2 + 250, canvas.height / 2 - 20 - 65 * i));

			engine.add(spot, 0);
		});

		engine.add((block = new StartBlock()), 0);

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
						{ type: 'input', label: 'Name', dataType: DataType.PRIMITIVES.STRING, init: entity.name, onChange: (val) => (entity.name = val) }
					];
				} else if (entity instanceof LiteralValue) {
					ctxOptions = [
						{ type: 'button', label: 'Delete', action: withClose(() => entity.delete()) },
						{ type: 'input', label: 'Value', dataType: entity.dataType, init: `${entity.value}`, onChange: (val) => (entity.value = val) }
					];
				} else if (entity instanceof DataTypeIndicator) {
					ctxOptions = [
						{ type: 'button', label: 'String', action: () => (entity.master.dataType = DataType.PRIMITIVES.STRING) },
						{ type: 'button', label: 'Boolean', action: () => (entity.master.dataType = DataType.PRIMITIVES.BOOL) },
						{ type: 'button', label: 'Char', action: () => (entity.master.dataType = DataType.PRIMITIVES.BYTE) },
						{ type: 'button', label: 'Integer', action: () => (entity.master.dataType = DataType.PRIMITIVES.INT) },
						{ type: 'button', label: 'Long', action: () => (entity.master.dataType = DataType.PRIMITIVES.LONG) },
						{ type: 'button', label: 'Float', action: () => (entity.master.dataType = DataType.PRIMITIVES.FLOAT) },
						{ type: 'button', label: 'Double', action: () => (entity.master.dataType = DataType.PRIMITIVES.DOUBLE) }
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
