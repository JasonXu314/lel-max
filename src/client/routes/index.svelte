<script lang="ts">
	import { LexicalScope } from '$lib/compiler';
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import Button from '$lib/components/CtxOptions/Button.svelte';
	import Input from '$lib/components/CtxOptions/Input.svelte';
	import Select from '$lib/components/CtxOptions/Select.svelte';
	import Togglable from '$lib/components/CtxOptions/Togglable.svelte';
	import Toggle from '$lib/components/CtxOptions/Toggle.svelte';
	import {
		Block,
		DataTypeIndicator,
		ForBlock,
		LiteralValue,
		StartBlock,
		VariableBlock,
		type GeneratorIterationConfig,
		type IntervalIterationConfig
	} from '$lib/editor';
	import { Engine, MouseButton } from '$lib/engine/Engine';
	import { Point } from '$lib/engine/Point';
	import { DataType } from '$lib/utils/DataType';
	import { notNaN } from '$lib/utils/utils';

	let canvas: HTMLCanvasElement;

	let ctxPos: Point | null = $state(null),
		ctxBlock: Block | null = $state(null),
		block: StartBlock = null,
		engine: Engine;

	const blocks = {
		DataTypeIndicator,
		LiteralValue,
		VariableBlock,
		ForBlock
	};

	function withClose<F extends (...args: any) => any>(fn: F): F {
		return ((...args: any) => {
			ctxPos = null;
			ctxBlock = null;

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
		engine = new Engine(canvas);

		(engine as any).activePanes[1].add((block = new StartBlock()));

		(window as any).Point = Point;
		(window as any).engine = engine;

		engine.on('click', () => {
			ctxPos = null;
			ctxBlock = null;
		});

		engine.on('entityClicked', (entity, evt) => {
			if (evt.button === MouseButton.RIGHT) {
				ctxPos = evt.pagePos;

				if (entity instanceof Block) {
					ctxBlock = entity;
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

<CtxMenu pos={ctxPos} block={ctxBlock} {blocks}>
	{#snippet DataTypeIndicator(dti: DataTypeIndicator<any>)}
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.STRING))}>String</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.BOOL))}>Boolean</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.BYTE))}>Byte</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.INT))}>Integer</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.LONG))}>Long</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.FLOAT))}>Float</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.DOUBLE))}>Double</Button>
	{/snippet}
	{#snippet VariableBlock(block: VariableBlock)}
		<Button onclick={withClose(() => block.delete())}>Delete</Button>
		<Input label="Name" value={block.name} onChange={(val) => (block.name = val)} />
		<Toggle label="Range Checking" value={block.checked} onChange={(val) => (block.checked = val)} />
		<Button onclick={withClose(() => engine.duplicate(block))}>Duplicate</Button>
	{/snippet}
	{#snippet LiteralValue(block: LiteralValue)}
		<Button onclick={withClose(() => block.delete())}>Delete</Button>
		{#if block.dataType === DataType.PRIMITIVES.STRING}
			<Input label="Value" value={block.value} onChange={(val) => (block.value = val)} />
		{:else if block.dataType === DataType.PRIMITIVES.BOOL}
			<Toggle label="Value" value={block.value as boolean} onChange={(val) => (block.value = val)} />
		{:else if [DataType.PRIMITIVES.BYTE, DataType.PRIMITIVES.INT, DataType.PRIMITIVES.LONG, DataType.PRIMITIVES.FLOAT, DataType.PRIMITIVES.DOUBLE].includes(block.dataType)}
			<Input label="Value" value={block.value} onChange={(val) => (block.value = val)} parse={notNaN(Number)} />
		{/if}
		<Button onclick={withClose(() => engine.duplicate(block))}>Duplicate</Button>
	{/snippet}
	{#snippet ForBlock(block: ForBlock)}
		<Button onclick={withClose(() => block.delete())}>Delete</Button>
		<Select
			label="Type"
			value={block.config.type}
			options={[
				{ value: 'interval', display: 'Numerical Range' },
				{ value: 'iterable', display: 'Iterable Value' },
				{ value: 'generator', display: 'Sequence' }
			]}
			onChange={(type) => {
				switch (type) {
					case 'interval':
						block.config = {
							type,
							from: block.config.type === 'interval' ? block.config.from : block.config.type === 'generator' ? block.config.start : 0,
							to: block.config.type === 'interval' ? block.config.to : 10,
							step: block.config.type === 'interval' ? block.config.step : 1
						};
						break;
					case 'iterable':
						block.config = { type };
						break;
					case 'generator':
						block.config = {
							type,
							start: block.config.type === 'interval' ? block.config.from : block.config.type === 'generator' ? block.config.start : 0,
							step: block.config.type === 'interval' ? block.config.step : 1
						};
						break;
				}
			}}
		/>
		{#if block.config.type === 'generator'}
			<Togglable
				label="Constant Start"
				toggled={block.config.start !== null}
				onFalse={() => (block.config = { ...block.config, start: null } as GeneratorIterationConfig)}
				onTrue={() => (block.config = { ...block.config, start: 1 } as GeneratorIterationConfig)}
			>
				<Input
					label="Start"
					value={block.config.start}
					onChange={(start) => (block.config = { ...block.config, start } as GeneratorIterationConfig)}
					parse={notNaN(Number)}
				/>
			</Togglable>
			<Togglable
				label="Constant Step"
				toggled={block.config.step !== null}
				onFalse={() => (block.config = { ...block.config, step: null } as GeneratorIterationConfig)}
				onTrue={() => (block.config = { ...block.config, step: 1 } as GeneratorIterationConfig)}
			>
				<Input
					label="Step"
					value={block.config.step}
					onChange={(step) => (block.config = { ...block.config, step } as GeneratorIterationConfig)}
					parse={notNaN(Number)}
				/>
			</Togglable>
		{:else if block.config.type === 'interval'}
			<Togglable
				label="Constant Start"
				toggled={block.config.from !== null}
				onFalse={() => (block.config = { ...block.config, from: null } as IntervalIterationConfig)}
				onTrue={() => (block.config = { ...block.config, from: 1 } as IntervalIterationConfig)}
			>
				<Input
					label="Start"
					value={block.config.from}
					onChange={(from) => (block.config = { ...block.config, from } as IntervalIterationConfig)}
					parse={notNaN(Number)}
				/>
			</Togglable>
			<Togglable
				label="Constant End"
				toggled={block.config.to !== null}
				onFalse={() => (block.config = { ...block.config, to: null } as IntervalIterationConfig)}
				onTrue={() => (block.config = { ...block.config, to: 10 } as IntervalIterationConfig)}
			>
				<Input
					label="End"
					value={block.config.to}
					onChange={(to) => (block.config = { ...block.config, to } as IntervalIterationConfig)}
					parse={notNaN(Number)}
				/>
			</Togglable>
			<Togglable
				label="Constant Step"
				toggled={block.config.step !== null}
				onFalse={() => (block.config = { ...block.config, step: null } as IntervalIterationConfig)}
				onTrue={() => (block.config = { ...block.config, step: 1 } as IntervalIterationConfig)}
			>
				<Input
					label="Step"
					value={block.config.step}
					onChange={(step) => (block.config = { ...block.config, step } as IntervalIterationConfig)}
					parse={notNaN(Number)}
				/>
			</Togglable>
		{/if}
		<Button onclick={withClose(() => engine.duplicate(block))}>Duplicate</Button>
	{/snippet}
</CtxMenu>

<button onclick={compile}>Compile</button>
