<script lang="ts">
	import { LexicalScope } from '$lib/compiler';
	import type { CtxItem } from '$lib/components/CtxMenu.svelte';
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import { Block, DataTypeIndicator, LiteralValue, StartBlock, VariableBlock, VariableRefValue } from '$lib/editor';
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
		const rootScope = new LexicalScope();
		const code = block.compile(rootScope).lines.join('\n');

		const file = new File([code], 'main.cpp');
		const url = URL.createObjectURL(file);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'main.cpp';

		a.click();
	}

	$effect(() => {
		const engine = new Engine(canvas);

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

					if (entity instanceof DataTypeIndicator) {
						ctxOptions.push(
							{ type: 'button', label: 'String', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.STRING)) },
							{ type: 'button', label: 'Boolean', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.BOOL)) },
							{ type: 'button', label: 'Byte', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.BYTE)) },
							{ type: 'button', label: 'Integer', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.INT)) },
							{ type: 'button', label: 'Long', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.LONG)) },
							{ type: 'button', label: 'Float', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.FLOAT)) },
							{ type: 'button', label: 'Double', action: withClose(() => (entity.master.dataType = DataType.PRIMITIVES.DOUBLE)) }
						);
					} else {
						if (entity instanceof VariableBlock) {
							ctxOptions.push(
								{
									type: 'input',
									label: 'Name',
									dataType: DataType.PRIMITIVES.STRING,
									init: entity.name,
									onChange: (val) => (entity.name = val)
								},
								{
									type: 'input',
									label: 'Range Checking',
									dataType: DataType.PRIMITIVES.BOOL,
									init: entity.checked,
									onChange: (val) => (entity.checked = val)
								}
							);
						} else if (entity instanceof LiteralValue) {
							ctxOptions.push({
								type: 'input',
								label: 'Value',
								dataType: entity.dataType,
								init: `${entity.value}`,
								onChange: (val) => (entity.value = val)
							});
						}

						if (!(entity instanceof VariableRefValue)) {
							ctxOptions.push({
								type: 'button',
								label: 'Duplicate',
								action: withClose(() => engine.duplicate(entity))
							});
						}
					}
				}
			}
		});

		engine.start();
	});
</script>

<canvas
	bind:this={canvas}
	height={typeof window !== 'undefined' ? window.innerHeight * 0.9 : 800}
	width={typeof window !== 'undefined' ? window.innerWidth : 1200}
></canvas>

<CtxMenu pos={ctxPos} options={ctxOptions} />

<button onclick={compile}>Compile</button>
