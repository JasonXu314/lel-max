<script lang="ts">
	import CtxMenu from '$lib/components/CtxMenu.svelte';
	import Button from '$lib/components/CtxOptions/Button.svelte';
	import Input from '$lib/components/CtxOptions/Input.svelte';
	import Select from '$lib/components/CtxOptions/Select.svelte';
	import Togglable from '$lib/components/CtxOptions/Togglable.svelte';
	import Toggle from '$lib/components/CtxOptions/Toggle.svelte';
	import Notifications, { createNotification } from '$lib/components/Notifications.svelte';
	import {
		Block,
		DataTypeIndicator,
		ForBlock,
		LiteralValue,
		Sensor,
		StartBlock,
		VariableBlock,
		type GeneratorIterationConfig,
		type IntervalIterationConfig
	} from '$lib/editor';
	import { Engine, MouseButton } from '$lib/engine/Engine';
	import type { Entity } from '$lib/engine/Entity';
	import { Point } from '$lib/engine/Point';
	import { ArrayDataType } from '$lib/utils/ArrayDataType';
	import { DataType } from '$lib/utils/DataType';
	import { notNaN } from '$lib/utils/utils';

	let canvas: HTMLCanvasElement;

	let ctxPos: Point | null = $state(null),
		ctxEntity: Entity | null = $state(null),
		engine: Engine;

	const entities = {
		DataTypeIndicator,
		LiteralValue,
		VariableBlock,
		ForBlock,
		Sensor
	};

	function withClose<F extends (...args: any) => any>(fn: F): F {
		return ((...args: any) => {
			const result = fn(...args);

			ctxPos = null;
			ctxEntity = null;

			return result;
		}) as F;
	}

	function compile() {
		engine
			.compile()
			.then((file) => {
				const url = URL.createObjectURL(file);

				const a = document.createElement('a');
				a.href = url;
				a.download = file.name;

				a.click();
			})
			.catch((err: Error) => {
				createNotification({
					type: 'error',
					text: err.message,
					expiration: 5000
				});
			});
	}

	$effect(() => {
		engine = new Engine(canvas);

		(engine as any).activePanes[1].add(new StartBlock());

		(window as any).Point = Point;
		(window as any).engine = engine;

		engine.on('click', () => {
			ctxPos = null;
			ctxEntity = null;
		});

		engine.on('entityClicked', (entity, evt) => {
			if (evt.button === MouseButton.RIGHT) {
				ctxPos = evt.pagePos;

				if ((entity instanceof Block && entity.ctxEnabled) || entity instanceof Sensor) {
					ctxEntity = entity;
				}
			}
		});

		engine.start();
	});
</script>

<svelte:head>
	<link rel="icon" href="favicon.svg" />
	<title>LEL-MAX</title>
	<meta name="author" content="Jason Xu" />
	<meta name="description" content="Resolving Bo(e)ing devs' skill issue" />
	<meta name="keywords" content="" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="LEL-MAX" />
	<meta property="og:description" content="Resolving Bo(e)ing devs' skill issue" />
	<meta property="og:url" content="https://lel-max.jasonxu.dev" />
	<meta property="og:site_name" content="LEL-MAX" />
	<meta property="og:image" content="https://lel-max.jasonxu.dev/logo.svg" />
	<meta name="theme-color" content="#0172AD" />
</svelte:head>

<Notifications />

<div class="row">
	<img src="logo.svg" alt="LEL-MAX" />
	<button onclick={compile}>Compile</button>
	<button onclick={() => engine.toggleHW()}>HW Config</button>
</div>

<canvas
	bind:this={canvas}
	height={typeof window !== 'undefined' ? window.innerHeight * 0.9 : 800}
	width={typeof window !== 'undefined' ? window.innerWidth : 1200}
></canvas>

<CtxMenu pos={ctxPos} entity={ctxEntity} {entities}>
	{#snippet DataTypeIndicator(dti: DataTypeIndicator<any>)}
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.STRING))}>String</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.BOOL))}>Boolean</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.BYTE))}>Byte</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.INT))}>Integer</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.LONG))}>Long</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.FLOAT))}>Float</Button>
		<Button onclick={withClose(() => (dti.master.dataType = DataType.PRIMITIVES.DOUBLE))}>Double</Button>
	{/snippet}
	{#snippet VariableBlock(block: VariableBlock, withRerender)}
		<Button onclick={withClose(() => block.delete())}>Delete</Button>
		<Input label="Name" value={block.name} onChange={(val) => (block.name = val)} />
		<Toggle label="Range Checking" value={block.checked} onChange={(val) => (block.checked = val)} />
		<Toggle
			label="Array"
			value={block.dataType instanceof ArrayDataType}
			onFalse={withRerender(() => (block.dataType = (block.dataType as ArrayDataType).rootScalar))}
			onTrue={withRerender(() => (block.dataType = ArrayDataType.for(block.dataType, 1)))}
		/>
		{#if block.dataType instanceof ArrayDataType}
			<Input
				label="Dimensions"
				value={block.dataType.dimensions}
				onChange={(val) => (block.dataType = ArrayDataType.for((block.dataType as ArrayDataType).rootScalar, val))}
				parse={notNaN(parseInt)}
			/>
			{#each new Array(block.dataType.dimensions).fill(null) as _, i}
				<Input
					label="Dim {i + 1} Size"
					value={block.dataType.getDimension(i + 1)}
					onChange={(val) => (block.dataType as ArrayDataType).setDimension(i + 1, val)}
					parse={notNaN(parseInt)}
				/>
			{/each}
		{/if}
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
	{#snippet ForBlock(block: ForBlock, withRerender)}
		<Button onclick={withClose(() => block.delete())}>Delete</Button>
		<Select
			label="Type"
			value={block.config.type}
			options={[
				{ value: 'interval', display: 'Numerical Range' },
				{ value: 'iterable', display: 'Iterable Value' },
				{ value: 'generator', display: 'Sequence' }
			]}
			onChange={withRerender((type) => {
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
			})}
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
	{#snippet Sensor(sensor: Sensor, withRerender)}
		<Input label="Name" value={sensor.config.name} onChange={(val) => (sensor.config.name = val)} />
		<Select
			label="Type"
			value={sensor.config.type}
			options={[
				{ value: DataType.PRIMITIVES.BOOL, display: 'Boolean' },
				{ value: DataType.PRIMITIVES.BYTE, display: 'Byte' },
				{ value: DataType.PRIMITIVES.INT, display: 'Integer' },
				{ value: DataType.PRIMITIVES.LONG, display: 'Long Integer' },
				{ value: DataType.PRIMITIVES.FLOAT, display: 'Float' },
				{ value: DataType.PRIMITIVES.DOUBLE, display: 'Double' }
			]}
			onChange={withRerender((type) => (sensor.config.type = type))}
		/>
	{/snippet}
	{#snippet DefaultBlock(block: Block)}
		<Button onclick={withClose(() => block.delete())}>Delete</Button>
		<Button onclick={withClose(() => engine.duplicate(block))}>Duplicate</Button>
	{/snippet}
</CtxMenu>

<style lang="scss">
	.row {
		gap: 1em;
		align-items: center;

		button {
			height: fit-content;
		}
	}
</style>
