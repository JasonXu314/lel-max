import { generateHWDecls, LexicalScope, type CompilerOptions } from '$lib/compiler';
import {
	Actuator,
	ActuatorButton,
	AdditionValue,
	AndPredicate,
	Block,
	BlockSpot,
	DataTypeIndicator,
	DivisionValue,
	ElementOfValue,
	EqualityPredicate,
	ForBlock,
	GTEPredicate,
	GTPredicate,
	HWVarRefValue,
	IfBlock,
	IfElseBlock,
	InputBlock,
	InterruptPredicate,
	LiteralValue,
	LTEPredicate,
	LTPredicate,
	ModulusValue,
	MultiplicationValue,
	NotPredicate,
	OrPredicate,
	PhantomActuator,
	PhantomSensor,
	PlaneOutline,
	PrintBlock,
	Sensor,
	SensorButton,
	SetVarBlock,
	StartBlock,
	SubtractionValue,
	VariableBlock,
	WhenBlock,
	WhileBlock,
	type ActuatorConfig,
	type Connection,
	type ExprCompileResult,
	type SensorConfig
} from '$lib/editor';
import { COLORS } from '$lib/editor/blocks/colors/colors';
import { DataType } from '$lib/utils/DataType';
import { EngineContext } from './EngineContext';
import type { Entity, Metadata, MouseData } from './Entity';
import type { ResolvedPath } from './MovablePath';
import { PathBuilder } from './PathBuilder';
import { Point } from './Point';
import { RenderEngine } from './RenderEngine';
import { TabButton } from './TabButton';
import { BlockPages } from './utils';

interface EngineEvents {
	entityClicked: (entity: Entity, metadata: { button: MouseButton; spacePos: Point; pagePos: Point }) => void;
	entityDblClicked: (entity: Entity) => void;
	click: (evt: MouseEvent) => void;
}

export enum MouseButton {
	LEFT,
	MIDDLE,
	RIGHT,
	BACK,
	FORWARD
}

export class Engine {
	// tuple [spawner pane, editor pane] (turn to array if allow dynamic paning, but keep element 0 as spawner pane)
	public readonly activePanes: [EngineContext, EngineContext];
	private readonly editorPanes: EngineContext[];
	private readonly spawnPanes: EngineContext[];
	private readonly hwPane: EngineContext;
	private readonly hwConfigPane: EngineContext;
	private readonly renderEngine: RenderEngine;
	public readonly hwDevices: (SensorConfig | ActuatorConfig)[];
	private readonly systemBlocks: ((new () => Block) & { EMPTY_HEIGHT: number })[];

	private _mousePos: Point | null = null;
	private _mouseDown = false;
	private _dropped = false;
	private _mouseDelta: Point | null = null;
	private _mouseButton: MouseButton | null = null;
	private _blockPage: BlockPages = BlockPages.CONTROL;
	private _migrationUnit: Block[][] | null = null;

	private _listeners: { [K in keyof EngineEvents]: EngineEvents[K][] };

	private mouseListener: (evt: MouseEvent) => void = (evt) => {
		if (this._mousePos) {
			this._mousePos = this.renderEngine.canvasToSpace(new Point(evt.offsetX, evt.offsetY));

			if (this._mouseDelta) {
				this._mouseDelta.x += evt.movementX;
				this._mouseDelta.y -= evt.movementY;
			}
		}
	};

	constructor(private readonly canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');

		if (ctx) {
			this.renderEngine = new RenderEngine(ctx, canvas);

			this._listeners = { entityClicked: [], click: [], entityDblClicked: [] };

			canvas.addEventListener('mouseout', () => {
				this._mousePos = null;

				canvas.removeEventListener('mousemove', this.mouseListener);
			});

			canvas.addEventListener('mouseover', (evt) => {
				this._mousePos = new Point(evt.offsetX, evt.offsetY);

				canvas.addEventListener('mousemove', this.mouseListener);
			});

			canvas.addEventListener('mousedown', (evt) => {
				this._mouseDown = true;
				this._dropped = false;
				this._mouseDelta = new Point();
				this._mouseButton = evt.button;
			});

			canvas.addEventListener('mouseup', (evt: MouseEvent) => {
				this._mouseDown = false;
				this._dropped = true;
				this._mouseDelta = null;
				this._mouseButton = null;

				const se =
					this.activePanes[1].selectedEntity ??
					(this.activePanes[0].selectedEntity instanceof TabButton ||
					this.activePanes[0].selectedEntity instanceof SensorButton ||
					this.activePanes[0].selectedEntity instanceof ActuatorButton
						? this.activePanes[0].selectedEntity
						: null);

				if (se) {
					for (const listener of this._listeners.entityClicked) {
						listener(se, {
							button: evt.button,
							spacePos: this._mousePos!,
							pagePos: this.renderEngine.spaceToCanvas(this._mousePos!)
						});
					}
				} else {
					for (const listener of this._listeners.click) {
						listener(evt);
					}
				}
			});

			canvas.addEventListener('dblclick', () => {
				if (this.activePanes[1].selectedEntity) {
					for (const listener of this._listeners.entityDblClicked) {
						listener(this.activePanes[1].selectedEntity);
					}
				}
			});

			canvas.addEventListener('contextmenu', (evt: MouseEvent) => {
				if (this.activePanes[1].selectedEntity) {
					evt.preventDefault();
				}
			});
		} else {
			throw new Error('Unable to get canvas context');
		}

		this.hwDevices = [];
		this.editorPanes = [new EngineContext(this, new Point(100, 0), canvas.width - 200, canvas.height)];

		const spawnPanePos = new Point(-canvas.width / 2 + 100, 0);
		this.spawnPanes = [
			[WhenBlock, IfBlock, IfElseBlock, WhileBlock, ForBlock],
			[NotPredicate, GTPredicate, GTEPredicate, EqualityPredicate, LTEPredicate, LTPredicate, AndPredicate, OrPredicate],
			[LiteralValue, VariableBlock, SetVarBlock, AdditionValue, SubtractionValue, MultiplicationValue, DivisionValue, ModulusValue, ElementOfValue],
			[PrintBlock, InputBlock]
		].map((group) => {
			const ctx = new EngineContext(this, spawnPanePos.clone(), 200, canvas.height, 'gray', true);

			[
				{
					tab: BlockPages.CONTROL,
					color: COLORS.CONTROL.LIGHT,
					pos: new Point(-canvas.width / 2 + 50, canvas.height / 2 - 10),
					label: 'Control Flow'
				},
				{ tab: BlockPages.DATA, color: COLORS.DATA.LIGHT, pos: new Point(-canvas.width / 2 + 150, canvas.height / 2 - 10), label: 'Data' },
				{
					tab: BlockPages.CONDITION,
					color: COLORS.CONDITION.LIGHT,
					pos: new Point(-canvas.width / 2 + 50, canvas.height / 2 - 29),
					label: 'Conditionals'
				},
				{ tab: BlockPages.SYSTEM, color: COLORS.SYSTEM.LIGHT, pos: new Point(-canvas.width / 2 + 150, canvas.height / 2 - 29), label: 'System' }
			].forEach(({ tab, color, pos, label }) => {
				const btn = new TabButton(tab, color, label, this);
				btn.position = pos;

				ctx.add(btn);
			});

			const x = -canvas.width / 2 + 100;
			let y = canvas.height / 2 - 75;

			group.forEach((Blk: { EMPTY_HEIGHT: number } & (new () => Block)) => {
				y -= Blk.EMPTY_HEIGHT / 2 + 20;

				const spot = new BlockSpot<InstanceType<typeof Blk>>(Blk, new Point(x, y));

				y -= Blk.EMPTY_HEIGHT / 2;

				ctx.add(spot);
			});

			return ctx;
		});
		this.systemBlocks = [PrintBlock, InputBlock];

		this.hwPane = new EngineContext(this, new Point(100, 0), canvas.width - 200, canvas.height);
		this.hwPane.add(new PlaneOutline());

		this.hwConfigPane = new EngineContext(this, spawnPanePos.clone(), 200, canvas.height, 'gray', true);
		const sensorButton = new SensorButton();
		sensorButton.position = spawnPanePos.add(new Point(0, canvas.height / 2 - 50));
		const actuatorButton = new ActuatorButton();
		actuatorButton.position = spawnPanePos.add(new Point(0, canvas.height / 2 - 100));

		this.hwConfigPane.add(sensorButton);
		this.hwConfigPane.add(actuatorButton);

		this.activePanes = [this.spawnPanes[BlockPages.CONTROL], this.editorPanes[0]];
	}

	public get blockPage(): BlockPages {
		return this._blockPage;
	}

	public get migrationUnit(): Block[][] {
		return this._migrationUnit;
	}

	public setPage(page: BlockPages): void {
		this._blockPage = page;
		this.activePanes[0] = this.spawnPanes[page];
	}

	public toggleHW(): void {
		if (this.activePanes[1] === this.hwPane) {
			this.activePanes[1] = this.editorPanes[0];
			this.activePanes[0] = this.spawnPanes[BlockPages.CONTROL];
			this._blockPage = BlockPages.CONTROL;
		} else {
			this.activePanes[1] = this.hwPane;
			this.activePanes[0] = this.hwConfigPane;
		}
	}

	public appendSensor(phantom: PhantomSensor): void {
		const config: SensorConfig = {
			hwType: 'sensor',
			name: 'new_sensor',
			type: DataType.PRIMITIVES.INT // EXP: svelte fucks with these and turns them into proxies, account for this during compilation
		};

		const sensor = new Sensor(config);
		sensor.position = phantom.position;

		this.activePanes[1].add(sensor);
		this.activePanes[1].remove(phantom);

		class SensorRef extends HWVarRefValue {
			public static readonly EMPTY_HEIGHT = 14;

			public readonly type = 'SYSTEM';
			public readonly lvalue = false; // TODO: consider refining for flight surface controls
			public readonly shape: ResolvedPath<{}>;

			private _dti: DataTypeIndicator<SensorRef>;

			public constructor() {
				super();

				this._dti = new DataTypeIndicator(this, false);

				this.shape = new PathBuilder<{ width: number }>(({ width }) => width, 14)
					.begin(new Point(0, 7))
					.lineTo(({ width }) => new Point(width / 2 - 7, 7))
					.arc(7)
					.arc(7)
					.line(({ width }) => new Point(-(width - 14), 0))
					.arc(7)
					.arc(7)
					.build()
					.withParams(
						((that) => ({
							get width() {
								return that.width;
							}
						}))(this)
					);
			}

			public get width(): number {
				return 14 + this.renderEngine.measureWidth(config.name) + 8;
			}

			public get height(): number {
				return 14;
			}

			public get alignGroup(): Connection[] {
				const that = this;

				return [
					{
						block: this._dti,
						get position() {
							return that.position.add(new Point(-that.width / 2 + 7, 0));
						}
					}
				];
			}

			public get name(): string {
				return config.name;
			}

			public set dataType(type: DataType) {
				config.type = type;
			}

			public get dataType(): DataType {
				return Object.values(DataType.PRIMITIVES).find((type) => type.name === config.type.name);
			}

			public init(renderEngine: RenderEngine, context: EngineContext): void {
				super.init(renderEngine, context);

				context.add(this._dti);
			}

			public render(metadata: Metadata): void {
				super.render(metadata);

				this.renderEngine.text(this.position.add(new Point(4, 0)), config.name, { color: 'white' }, this.shape);
			}

			// NOTE: do not duplicate variable refs to allow for easy substitution
			public duplicate(): Block[][] {
				return [[]];
			}

			public duplicateChain(): Block[][] {
				return [[]];
			}

			public traverseChain(cb: (block: Block) => void): void {
				cb(this);
			}

			public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
				cb(this, depth);

				this._dti.traverseByLayer(cb, depth + 1);
			}

			public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
				return cb(init, this, (arg) => arg);
			}

			public traverseChainUp(cb: (block: Block) => void): void {
				cb(this);

				if (this.host !== null) this.host.traverseChain(cb);
			}

			public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
				let cont = true;

				const thisResult = cb(init, this, (arg) => {
					cont = false;
					return arg;
				});

				if (cont) {
					return this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult;
				} else {
					return thisResult;
				}
			}

			public compile(): ExprCompileResult {
				return {
					code: config.name,
					meta: {
						requires: new Set(['$lib:hw']),
						precedence: null,
						checks: [],
						attributes: { lvalue: false, resolvedType: Object.values(DataType.PRIMITIVES).find((type) => type.name === config.type.name) },
						ISRs: [],
						parentISR: null
					}
				};
			}
		}

		this.hwDevices.push(config);

		const spot = new BlockSpot<SensorRef>(
			SensorRef,
			new Point(
				-this.canvas.width / 2 + 100,
				this.canvas.height / 2 - 75 - this.systemBlocks.reduce((total, Blk) => total + Blk.EMPTY_HEIGHT + 20, 0) - 20 - SensorRef.EMPTY_HEIGHT / 2
			)
		);
		this.systemBlocks.push(SensorRef);
		this.spawnPanes[BlockPages.SYSTEM].add(spot);
	}

	public appendActuator(phantom: PhantomActuator): void {
		const config: ActuatorConfig = {
			hwType: 'actuator',
			name: 'new_control_surface',
			type: DataType.PRIMITIVES.INT // EXP: svelte fucks with these and turns them into proxies, account for this during compilation
		};

		const actuator = new Actuator(config);
		actuator.position = phantom.position;

		this.activePanes[1].add(actuator);
		this.activePanes[1].remove(phantom);

		class ActuatorRef extends HWVarRefValue {
			public static readonly EMPTY_HEIGHT = 14;

			public readonly type = 'SYSTEM';
			public readonly lvalue = true;
			public readonly shape: ResolvedPath<{}>;

			private _dti: DataTypeIndicator<ActuatorRef>;

			public constructor() {
				super();

				this._dti = new DataTypeIndicator(this, false);

				this.shape = new PathBuilder<{ width: number }>(({ width }) => width, 14)
					.begin(new Point(0, 7))
					.lineTo(({ width }) => new Point(width / 2 - 7, 7))
					.arc(7)
					.arc(7)
					.line(({ width }) => new Point(-(width - 14), 0))
					.arc(7)
					.arc(7)
					.build()
					.withParams(
						((that) => ({
							get width() {
								return that.width;
							}
						}))(this)
					);
			}

			public get width(): number {
				return 14 + this.renderEngine.measureWidth(config.name) + 8;
			}

			public get height(): number {
				return 14;
			}

			public get alignGroup(): Connection[] {
				const that = this;

				return [
					{
						block: this._dti,
						get position() {
							return that.position.add(new Point(-that.width / 2 + 7, 0));
						}
					}
				];
			}

			public get name(): string {
				return config.name;
			}

			public set dataType(type: DataType) {
				config.type = type;
			}

			public get dataType(): DataType {
				return Object.values(DataType.PRIMITIVES).find((type) => type.name === config.type.name);
			}

			public init(renderEngine: RenderEngine, context: EngineContext): void {
				super.init(renderEngine, context);

				context.add(this._dti);
			}

			public render(metadata: Metadata): void {
				super.render(metadata);

				this.renderEngine.text(this.position.add(new Point(4, 0)), config.name, { color: 'white' }, this.shape);
			}

			// NOTE: do not duplicate variable refs to allow for easy substitution
			public duplicate(): Block[][] {
				return [[]];
			}

			public duplicateChain(): Block[][] {
				return [[]];
			}

			public traverseChain(cb: (block: Block) => void): void {
				cb(this);
			}

			public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
				cb(this, depth);

				this._dti.traverseByLayer(cb, depth + 1);
			}

			public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
				return cb(init, this, (arg) => arg);
			}

			public traverseChainUp(cb: (block: Block) => void): void {
				cb(this);

				if (this.host !== null) this.host.traverseChain(cb);
			}

			public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
				let cont = true;

				const thisResult = cb(init, this, (arg) => {
					cont = false;
					return arg;
				});

				if (cont) {
					return this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult;
				} else {
					return thisResult;
				}
			}

			public compile(): ExprCompileResult {
				return {
					code: config.name,
					meta: {
						requires: new Set(['$lib:hw']),
						precedence: null,
						checks: [],
						attributes: { lvalue: false, resolvedType: Object.values(DataType.PRIMITIVES).find((type) => type.name === config.type.name) },
						ISRs: [],
						parentISR: null
					}
				};
			}
		}

		this.hwDevices.push(config);

		const spot = new BlockSpot<ActuatorRef>(
			ActuatorRef,
			new Point(
				-this.canvas.width / 2 + 100,
				this.canvas.height / 2 - 75 - this.systemBlocks.reduce((total, Blk) => total + Blk.EMPTY_HEIGHT + 20, 0) - 20 - ActuatorRef.EMPTY_HEIGHT / 2
			)
		);
		this.systemBlocks.push(ActuatorRef);
		this.spawnPanes[BlockPages.SYSTEM].add(spot);
	}

	public addInterrupt(interrupt: string): void {
		class InterruptRef extends InterruptPredicate {
			public static readonly EMPTY_HEIGHT = 14;

			public readonly shape: ResolvedPath<{}>;
			public readonly name = interrupt;

			public constructor() {
				super();

				this.shape = new PathBuilder<{ width: number; height: number; angleInset: number }>(
					({ width }) => width,
					({ height }) => height
				)
					.begin(({ height }) => new Point(0, height / 2))
					.line(({ width, angleInset }) => new Point(width / 2 - angleInset, 0))
					.line(({ height, angleInset }) => new Point(angleInset, -height / 2))
					.line(({ height, angleInset }) => new Point(-angleInset, -height / 2))
					.line(({ width, angleInset }) => new Point(-width + 2 * angleInset, 0))
					.line(({ height, angleInset }) => new Point(-angleInset, height / 2))
					.line(({ height, angleInset }) => new Point(angleInset, height / 2))
					.build()
					.withParams(
						((that) => ({
							get width() {
								return that.width;
							},
							get height() {
								return that.height;
							},
							get angleInset() {
								return ((that.height / 2) * 5) / 7;
							}
						}))(this)
					);
			}

			public get width(): number {
				return 8 + this.renderEngine.measureWidth(this.name) + 8;
			}

			public get height(): number {
				return 14;
			}

			public get alignGroup(): Connection[] {
				return [];
			}

			public render(metadata: Metadata): void {
				super.render(metadata);

				this.renderEngine.text(this.position, this.name, { color: 'white' }, this.shape);
			}

			// NOTE: do not duplicate variable refs to allow for easy substitution
			public duplicate(): Block[][] {
				return [[]];
			}

			public duplicateChain(): Block[][] {
				return [[]];
			}

			public traverseChain(cb: (block: Block) => void): void {
				cb(this);
			}

			public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
				cb(this, depth);
			}

			public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
				return cb(init, this, (arg) => arg);
			}

			public traverseChainUp(cb: (block: Block) => void): void {
				cb(this);

				if (this.host !== null) this.host.traverseChain(cb);
			}

			public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
				let cont = true;

				const thisResult = cb(init, this, (arg) => {
					cont = false;
					return arg;
				});

				if (cont) {
					return this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult;
				} else {
					return thisResult;
				}
			}

			public compile(): ExprCompileResult {
				return {
					code: this.name,
					meta: {
						requires: new Set(['$lib:hw']),
						precedence: null,
						checks: [],
						attributes: { lvalue: false, resolvedType: DataType.PRIMITIVES.BOOL },
						ISRs: [],
						parentISR: null
					}
				};
			}
		}

		const spot = new BlockSpot<InterruptRef>(
			InterruptRef,
			new Point(
				-this.canvas.width / 2 + 100,
				this.canvas.height / 2 - 75 - this.systemBlocks.reduce((total, Blk) => total + Blk.EMPTY_HEIGHT + 20, 0) - 20 - InterruptRef.EMPTY_HEIGHT / 2
			)
		);
		this.systemBlocks.push(InterruptRef);
		this.spawnPanes[BlockPages.SYSTEM].add(spot);
	}

	public async compile(options: CompilerOptions): Promise<File> {
		const start = this.activePanes[1].find(StartBlock);

		const rootScope = new LexicalScope();
		const result = start.compile(rootScope, options);

		const libDeps = [...result.meta.requires].filter((dep) => dep.startsWith('$lib:'));

		if (libDeps.length === 0) {
			return new File([result.lines.join('\n')], 'main.cpp');
		} else {
			return fetch('/bundle', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					includes: libDeps.map((dep) => /^\$lib:(.+)$/!.exec(dep)[1]).filter((lib) => lib !== 'hw'),
					sources: {
						'main.cpp': result.lines.join('\n'),
						'lib/hw.h': libDeps.includes('$lib:hw') ? generateHWDecls(this.hwDevices, result.meta.ISRs) : undefined
					}
				})
			})
				.then((res) => res.blob())
				.then((blob) => new File([blob], 'bundle.tar.gz'));
		}
	}

	public duplicate(block: Block): void {
		// TODO: enhance this to lock block to cursor till click
		const newBlocks = block.duplicateChain();

		if (newBlocks.length > 0) {
			// TODO: rework Block::duplicate api to return unlayered array of blocks
			newBlocks.forEach((layer) => layer.forEach((b) => block.context.add(b)));
		}
	}

	public migrate(layers: Block[][]): void {
		this._migrationUnit = layers;
		this._migrationUnit.forEach((layer) => layer.forEach((block) => ((block as any).renderEngine = this.renderEngine)));
	}

	public start(): void {
		this._tick();
	}

	public on<T extends keyof EngineEvents>(evt: T, listener: EngineEvents[T]): () => void {
		this._listeners[evt].push(listener);

		return () => {
			this._listeners[evt].splice(this._listeners[evt].indexOf(listener), 1);
		};
	}

	private _tick(): void {
		requestAnimationFrame(() => this._tick());

		const mouseData = {
			position: this._mousePos?.clone() ?? null,
			dropped: this._dropped,
			down: this._mouseDown,
			button: this._mouseButton,
			delta: this._mouseDelta
		} as MouseData;

		let [snappedBlock, nub] = this.activePanes[1].calculateSnapping(mouseData);

		if (this._migrationUnit) {
			if (mouseData.dropped) {
				if (this.activePanes[0].encapsulates(this._migrationUnit[0][0])) {
					// destroy blocks if dropped in spawn area
					this._migrationUnit = null;
				} else {
					this._migrationUnit.flat().forEach((block) => this.activePanes[1].add(block));
					this.activePanes[1].forceSelection(this._migrationUnit[0][0]);
					this._migrationUnit = null;
				}
			} else {
				// migratory unit must be selected, and root should be first block of first layer
				this._migrationUnit.flat().forEach((block) =>
					block.update({
						selectedEntity: this._migrationUnit[0][0],
						mouse: mouseData,
						snappingTo: snappedBlock !== null && nub !== null && block === this._migrationUnit[0][0] ? { block: snappedBlock, nub } : null
					})
				);
			}
		}

		this.activePanes.forEach((ctx) => ctx.update(mouseData));

		[snappedBlock, nub] = this.activePanes[1].calculateSnapping(mouseData);

		if (this._migrationUnit || this.activePanes.some((ctx) => ctx.selectedEntity)) {
			this.canvas.style.cursor = 'pointer';
		} else {
			this.canvas.style.cursor = 'unset';
		}

		this.activePanes.forEach((ctx) => ctx.render(mouseData));
		this.activePanes.forEach((ctx) => this.renderEngine.print(ctx));

		if (this._migrationUnit) {
			// migratory unit must be selected, and root should be first block of first layer
			this._migrationUnit.forEach((layer, i) =>
				layer.forEach((block, j) =>
					block.render({
						selectedEntity: this._migrationUnit[0][0],
						mouse: mouseData,
						snappingTo: snappedBlock !== null && nub !== null && i === 0 && j === 0 ? { block: snappedBlock, nub } : null
					})
				)
			);
		}

		// dbg crosshairs
		// this.renderEngine.line(new Point(-600, 0), new Point(600, 0));
		// this.renderEngine.line(new Point(0, 400), new Point(0, -400));

		if (this._mouseDelta) this._mouseDelta = new Point();
		if (this._dropped) this._dropped = false;
	}
}

