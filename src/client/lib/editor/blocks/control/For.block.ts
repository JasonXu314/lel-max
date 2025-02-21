import { LexicalScope, union } from '$lib/compiler';
import {
	Block,
	ChainBranchBlock,
	DataTypeIndicator,
	effectiveHeight,
	EMPTY_PREDICATE,
	EMPTY_VALUE,
	findDelta,
	hasIfBlock,
	Predicate,
	Slot,
	Value,
	type BlockCompileResult,
	type Connection,
	type ExprCompileResult,
	type IPredicateHost,
	type IValueHost,
	type StructureChangeEvent
} from '$lib/editor';
import { MouseButton } from '$lib/engine/Engine';
import type { EngineContext } from '$lib/engine/EngineContext';
import type { Metadata } from '$lib/engine/Entity';
import type { ResolvedPath } from '$lib/engine/MovablePath';
import { PathBuilder } from '$lib/engine/PathBuilder';
import { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import { DataType } from '$lib/utils/DataType';
import { lns, mergeLayers } from '$lib/utils/utils';

export interface IntervalIterationConfig {
	type: 'interval';

	from: number | null;
	to: number | null;
	step: number | null;
}

export interface GeneratorIterationConfig {
	type: 'generator';

	start: number | null;
	step: number | null;
}

export interface IterableIterationConfig {
	type: 'iterable';
}

type IterationConfig = IntervalIterationConfig | GeneratorIterationConfig | IterableIterationConfig;

interface ForBlockShapeParams {
	width: number;
	height: number;
	topTineHeight: number;
}

interface ForIndexRefValueShapeParams {
	width: number;
}

// experimentally verified via canvas measurements
const FOR_WIDTH = 15.669921875,
	IN_WIDTH = 6,
	LBRACK_WIDTH = 3,
	COMMA_WIDTH = 3,
	RBRACK_WIDTH = 3,
	WITH_WIDTH = 19.2216796875,
	UNTIL_WIDTH = 18.123046875,
	LEFT_PAD_WIDTH = 5 + FOR_WIDTH + 3;

export class ForBlock extends ChainBranchBlock implements IValueHost, IPredicateHost {
	public static readonly EMPTY_HEIGHT: number = 20 * 3;

	public readonly type = 'CONTROL';
	public readonly shape: ResolvedPath<ForBlockShapeParams>;

	public readonly iterable: Slot<Value>;
	public readonly from: Slot<Value>;
	public readonly to: Slot<Value>;
	public readonly end: Slot<Predicate>;
	public readonly step: Slot<Value>;

	public loopChild: ChainBranchBlock | null;
	public afterChild: ChainBranchBlock | null;

	private _ref: ForIndexRefValue;
	private _name: string;
	private _config: IterationConfig;

	public constructor() {
		super();

		this.iterable = new Slot(
			this,
			(width, height) => new Point(-this.width / 2 + LEFT_PAD_WIDTH + this._ref.width + 3 + IN_WIDTH + 3 + width / 2, this.height / 2 - (height / 2 + 3))
		);
		this.from = new Slot(
			this,
			(width, height) =>
				new Point(
					-this.width / 2 +
						LEFT_PAD_WIDTH +
						this._ref.width +
						3 +
						(this._config.type === 'interval' ? IN_WIDTH + 3 + LBRACK_WIDTH : WITH_WIDTH + 3 + this.renderEngine.measureWidth(`${this._name} =`)) +
						3 +
						width / 2,
					this.height / 2 - (height / 2 + 3)
				)
		);
		this.to = new Slot(
			this,
			(width, height) =>
				new Point(
					-this.width / 2 +
						LEFT_PAD_WIDTH +
						this._ref.width +
						3 +
						IN_WIDTH +
						3 +
						(this._config.type === 'interval' && this._config.from !== null
							? this.renderEngine.measureWidth(`[${this._config.from},`)
							: LBRACK_WIDTH + 3 + this.from.width + 3 + COMMA_WIDTH + 3) +
						3 +
						width / 2,
					this.height / 2 - (height / 2 + 3)
				)
		);
		this.end = new Slot(
			this,
			(width, height) =>
				new Point(
					-this.width / 2 +
						LEFT_PAD_WIDTH +
						this._ref.width +
						3 +
						WITH_WIDTH +
						3 +
						(this._config.type === 'generator' && this._config.start !== null
							? this.renderEngine.measureWidth(`${this._name} = ${this._config.start}`)
							: this.renderEngine.measureWidth(`${this._name} =`) + 3 + this.from.width) +
						3 +
						UNTIL_WIDTH +
						3 +
						width / 2,
					this.height / 2 - (height / 2 + 3)
				)
		);
		this.step = new Slot(
			this,
			(width, height) =>
				new Point(
					-this.width / 2 +
						LEFT_PAD_WIDTH +
						this._ref.width +
						3 +
						(this._config.type === 'interval'
							? IN_WIDTH +
							  3 +
							  (this._config.from !== null
									? this._config.to !== null
										? this.renderEngine.measureWidth(`[${this._config.from}, ${this._config.to}]`)
										: this.renderEngine.measureWidth(`[${this._config.from},`) + 3 + this.to.width + 3 + RBRACK_WIDTH
									: this._config.to !== null
									? LBRACK_WIDTH + 3 + this.from.width + 3 + this.renderEngine.measureWidth(`, ${this._config.to}]`)
									: LBRACK_WIDTH + 3 + this.from.width + 3 + COMMA_WIDTH + 3 + this.to.width + 3 + RBRACK_WIDTH)
							: WITH_WIDTH +
							  3 +
							  (this._config.type === 'generator' && this._config.start !== null
									? this.renderEngine.measureWidth(`${this._name} = ${this._config.start}`)
									: this.renderEngine.measureWidth(`${this._name} =`) + 3 + this.from.width) +
							  3 +
							  UNTIL_WIDTH +
							  3 +
							  this.end.width) +
						3 +
						this.renderEngine.measureWidth(`${this._name} \u2192`) +
						3 +
						width / 2,
					this.height / 2 - (height / 2 + 3)
				)
		);

		this.loopChild = null;
		this.afterChild = null;
		this.parent = null;

		this._name = 'i';
		this._config = {
			type: 'interval',
			from: 1,
			to: 10,
			step: 1
		};

		this.shape = new PathBuilder<ForBlockShapeParams>(
			({ width }) => width,
			({ height }) => height
		)
			.begin(({ height }) => new Point(0, height / 2))
			.lineToCorner(({ width, height }) => new Point(width / 2, height / 2))
			.lineToCorner(({ width, height, topTineHeight }) => new Point(width / 2, height / 2 - topTineHeight))
			.nubAt(() => this.nubs[0])
			.lineToCorner(({ width, height, topTineHeight }) => new Point(-width / 2 + 20, height / 2 - topTineHeight), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20, -height / 2 + 20), -Math.PI / 2)
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20 + Math.min(width / 2, 35), -height / 2 + 20))
			.lineToCorner(({ width, height }) => new Point(-width / 2 + 20 + Math.min(width / 2, 35), -height / 2))
			.nubAt(() => this.nubs[1])
			.lineToCorner(({ width, height }) => new Point(-width / 2, -height / 2))
			.lineToCorner(({ width, height }) => new Point(-width / 2, height / 2))
			.notchAt(() => this.notch)
			.build()
			.withParams(
				((that) => ({
					get width() {
						return that.width;
					},
					get height() {
						return that.height;
					},
					get topTineHeight() {
						return that.topTineHeight;
					}
				}))(this)
			);
	}

	public get notch(): Point | null {
		return new Point(-this.width / 2 + 15, this.height / 2);
	}

	public get nubs(): Point[] {
		return [new Point(-this.width / 2 + 20 + 15, this.height / 2 - this.topTineHeight), new Point(-this.width / 2 + 15, -this.height / 2)];
	}

	public get name(): string {
		return this._name;
	}

	public get width(): number {
		let iterationConfigWidth: number;

		switch (this._config.type) {
			case 'iterable':
				iterationConfigWidth = this.iterable.width;
				break;
			case 'interval':
				if (this._config.from !== null && this._config.to !== null) {
					iterationConfigWidth = this.renderEngine.measureWidth(`[${this._config.from}, ${this._config.to}]`);
				} else if (this._config.from !== null) {
					iterationConfigWidth = this.renderEngine.measureWidth(`[${this._config.from},`) + 3 + this.to.width + 3 + RBRACK_WIDTH;
				} else if (this._config.to !== null) {
					iterationConfigWidth = LBRACK_WIDTH + 3 + this.from.width + 3 + this.renderEngine.measureWidth(`, ${this._config.to}]`);
				} else {
					iterationConfigWidth = LBRACK_WIDTH + 3 + this.from.width + 3 + this.renderEngine.measureWidth(',') + 3 + this.to.width + 3 + RBRACK_WIDTH;
				}

				iterationConfigWidth +=
					this._config.step === 1
						? 0
						: 3 +
						  (this._config.step !== null
								? this.renderEngine.measureWidth(`, step: ${this._config.step}`)
								: this.renderEngine.measureWidth(`${this._name} \u2192`) + this.step.width);
				break;
			case 'generator':
				if (this._config.start !== null) {
					iterationConfigWidth = this.renderEngine.measureWidth(`${this._name} = ${this._config.start}`) + 3 + UNTIL_WIDTH + 3;
				} else {
					iterationConfigWidth = this.renderEngine.measureWidth(`${this._name} =`) + 3 + this.from.width + 3 + UNTIL_WIDTH + 3;
				}

				iterationConfigWidth +=
					this.end.width +
					(this._config.step === 1
						? 0
						: 3 +
						  (this._config.step !== null
								? this.renderEngine.measureWidth(`, step: ${this._config.step}`)
								: this.renderEngine.measureWidth(`${this._name} \u2192`) + 3 + this.step.width));
				break;
		}

		return LEFT_PAD_WIDTH + this._ref.width + 3 + (this._config.type === 'generator' ? WITH_WIDTH : IN_WIDTH + 3) + iterationConfigWidth + 5;
	}

	public get topTineHeight(): number {
		switch (this._config.type) {
			case 'iterable':
				return this.iterable.height + 6;
			case 'interval':
				return (
					Math.max(
						this._config.from === null ? this.from.height : 14,
						this._config.to === null ? this.to.height : 14,
						this._config.step === null ? this.step.height : 14
					) + 6
				);
			case 'generator':
				return Math.max(this._config.start === null ? this.from.height : 14, this.end.height, this._config.step === null ? this.step.height : 14) + 6;
		}
	}

	public get height(): number {
		// NOTE: reduce(effectiveHeight, 0) + 20 is different from reduce(effectiveHeight, 20) because it's required to
		// signal that this is the root of the chain to measure
		return 20 + this.topTineHeight + (this.loopChild === null ? 20 : this.loopChild.reduceChain<number>(effectiveHeight, 0) + 20);
	}

	public get indexDataType(): DataType {
		return DataType.PRIMITIVES.INT;
	}

	// prevent reference property updates because need side-effects to run on setter to maintain consistency
	public get config(): Readonly<IterationConfig> {
		return this._config;
	}

	public set name(val: string) {
		const widthBefore = this.width;

		this._name = val;

		const widthAfter = this.width;

		this.position = this.position.add(new Point((widthAfter - widthBefore) / 2, 0));
		this._ref.position = this._ref.position.add(new Point((widthAfter - widthBefore) / 2, 0));
	}

	public set config(config: IterationConfig) {
		switch (this._config.type) {
			case 'interval':
				if (
					this.from.value &&
					(config.type === 'iterable' ||
						(config.type === 'generator' && config.start !== null) ||
						(config.type === 'interval' && config.from !== null))
				) {
					const from = this.from.value;
					this.from.value.host = null;
					this.disown(this.from.value);
					from.drag(findDelta(this, from));
				}

				if (this.to.value && (config.type === 'iterable' || config.type === 'generator' || (config.type === 'interval' && config.to !== null))) {
					const to = this.to.value;
					this.to.value.host = null;
					this.disown(this.to.value);
					to.drag(findDelta(this, to));
				}

				if (
					this.step.value &&
					(config.type === 'iterable' ||
						(config.type === 'generator' && config.step !== null) ||
						(config.type === 'interval' && config.step !== null))
				) {
					const step = this.step.value;
					this.step.value.host = null;
					this.disown(this.step.value);
					step.drag(findDelta(this, step));
				}
				break;
			case 'iterable':
				if (this.iterable.value && config.type !== 'iterable') {
					const iterable = this.iterable.value;
					this.iterable.value.host = null;
					this.disown(this.iterable.value);
					iterable.drag(findDelta(this, iterable));
				}
				break;
			case 'generator':
				if (
					this.from.value &&
					(config.type === 'iterable' ||
						(config.type === 'generator' && config.start !== null) ||
						(config.type === 'interval' && config.from !== null))
				) {
					const from = this.from.value;
					this.from.value.host = null;
					this.disown(this.from.value);
					from.drag(findDelta(this, from));
				}

				if (this.end.value && (config.type === 'iterable' || config.type === 'interval')) {
					const end = this.end.value;
					this.end.value.host = null;
					this.disown(this.end.value);
					end.drag(findDelta(this, end));
				}

				if (
					this.step.value &&
					(config.type === 'iterable' ||
						(config.type === 'generator' && config.step !== null) ||
						(config.type === 'interval' && config.step !== null))
				) {
					const step = this.step.value;
					this.step.value.host = null;
					this.disown(this.step.value);
					step.drag(findDelta(this, step));
				}
				break;
		}

		this._config = config;
	}

	public get valueSlots(): Slot<Value>[] {
		if (this._config.type === 'iterable') {
			return [this.iterable];
		} else {
			return [
				(this._config.type === 'interval' ? this._config.from !== null : this._config.start !== null) ? null : this.from,
				this._config.type === 'generator' || this._config.to !== null ? null : this.to,
				this._config.step !== null ? null : this.step
			].filter((s): s is Slot<Value> => !!s);
		}
	}

	public get predicateSlots(): Slot<Predicate>[] {
		if (this._config.type === 'generator') {
			return [this.end];
		} else {
			return [];
		}
	}

	public get alignGroup(): Connection[] {
		const that = this;

		return [
			this.iterable,
			this.from,
			this.to,
			this.end,
			this.step,
			{
				block: this.loopChild,
				get position() {
					return that.position.add(that.nubs[0]);
				}
			},
			{
				block: this.afterChild,
				get position() {
					return that.position.add(that.nubs[1]);
				}
			},
			{
				block: this._ref,
				get position() {
					return that.position.add(new Point(-that.width / 2 + LEFT_PAD_WIDTH + that._ref.width / 2, that.height / 2 - that.topTineHeight / 2));
				}
			}
		];
	}

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);
		console.log(renderEngine.measureWidth('until'));

		if (!this._ref) this.refDetached();
	}

	public render(metadata: Metadata): void {
		const shape = this.shape.move(this.position);
		super.render(metadata);

		this.renderEngine.text(
			this.position.add(new Point(0, this.height / 2 - this.topTineHeight / 2)),
			'For',
			{ align: 'left', paddingLeft: 5, color: 'white' },
			shape
		);
		switch (this._config.type) {
			case 'interval': {
				const lnY = this.height / 2 - this.topTineHeight / 2;
				let lnX = 0;

				lnX = -this.width / 2 + LEFT_PAD_WIDTH + this._ref.width + 3 + IN_WIDTH / 2;
				this.renderEngine.text(this.position.add(new Point(lnX, lnY)), '\u2208', { color: 'white' });
				lnX += IN_WIDTH / 2;

				if (this._config.from !== null && this._config.to !== null) {
					const intervalText = `[${this._config.from}, ${this._config.to}]`;
					const width = this.renderEngine.measureWidth(intervalText);

					lnX += 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), intervalText, { color: 'white' });
					lnX += width / 2;
				} else if (this._config.from !== null) {
					const intervalText = `[${this._config.from},`;
					const width = this.renderEngine.measureWidth(intervalText);

					lnX += 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), intervalText, { color: 'white' });
					lnX += width / 2 + 3 + this.to.width + 3 + RBRACK_WIDTH / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), ']', { color: 'white' });
					lnX += RBRACK_WIDTH / 2;
				} else if (this._config.to !== null) {
					const intervalText = `, ${this._config.to}]`;
					const width = this.renderEngine.measureWidth(intervalText);

					lnX += 3 + LBRACK_WIDTH / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), '[', { color: 'white' });
					lnX += LBRACK_WIDTH / 2 + 3 + this.from.width + 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), intervalText, { color: 'white' });
					lnX += width / 2;
				} else {
					lnX += 3 + LBRACK_WIDTH / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), '[', { color: 'white' });
					lnX += LBRACK_WIDTH / 2 + 3 + this.from.width + 3 + COMMA_WIDTH / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), ',', { color: 'white' });
					lnX += COMMA_WIDTH / 2 + 3 + this.to.width + 3 + RBRACK_WIDTH / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), ']', { color: 'white' });
					lnX += RBRACK_WIDTH / 2;
				}

				if (this._config.step !== null) {
					if (this._config.step !== 1) {
						const stepText = `, step: ${this._config.step}`;
						const width = this.renderEngine.measureWidth(stepText);

						lnX += width / 2;
						this.renderEngine.text(this.position.add(new Point(lnX, lnY)), stepText, { color: 'white' });
					}
				} else {
					const stepText = `${this._name} \u2192`;
					const width = this.renderEngine.measureWidth(stepText);

					lnX += 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), stepText, { color: 'white' });
				}

				break;
			}
			case 'iterable':
				this.renderEngine.text(
					this.position.add(
						new Point(-this.width / 2 + LEFT_PAD_WIDTH + this._ref.width + 3 + IN_WIDTH / 2, this.height / 2 - this.topTineHeight / 2)
					),
					'\u2208',
					{ color: 'white' }
				);
				break;
			case 'generator': {
				const lnY = this.height / 2 - this.topTineHeight / 2;
				let lnX = 0;

				lnX = -this.width / 2 + LEFT_PAD_WIDTH + this._ref.width + 3 + WITH_WIDTH / 2;
				this.renderEngine.text(this.position.add(new Point(lnX, lnY)), 'with', { color: 'white' });
				lnX += WITH_WIDTH / 2;

				if (this._config.start !== null) {
					const startText = `${this._name} = ${this._config.start}`;
					const width = this.renderEngine.measureWidth(startText);

					lnX += 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), startText, { color: 'white' });
					lnX += width / 2;
				} else {
					const startText = `${this._name} =`;
					const width = this.renderEngine.measureWidth(startText);

					lnX += 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), startText, { color: 'white' });
					lnX += width / 2 + 3 + this.from.width;
				}

				lnX += 3 + UNTIL_WIDTH / 2;
				this.renderEngine.text(this.position.add(new Point(lnX, lnY)), 'until', { color: 'white' });
				lnX += UNTIL_WIDTH / 2 + 3 + this.end.width;

				if (this._config.step !== null) {
					if (this._config.step !== 1) {
						const stepText = `, step: ${this._config.step}`;
						const width = this.renderEngine.measureWidth(stepText);

						lnX += width / 2;
						this.renderEngine.text(this.position.add(new Point(lnX, lnY)), stepText, { color: 'white' });
					}
				} else {
					const stepText = `${this._name} \u2192`;
					const width = this.renderEngine.measureWidth(stepText);

					lnX += 3 + width / 2;
					this.renderEngine.text(this.position.add(new Point(lnX, lnY)), stepText, { color: 'white' });
				}

				break;
			}
		}

		this.renderEngine.text(this.position, '➡️', { align: 'left', paddingLeft: 5, color: 'white' }, shape);
	}
	public adopt(other: ChainBranchBlock, slot: undefined): void;
	public adopt(other: Value, slot: Slot<Value>): void;
	public adopt(other: Predicate, slot: Slot<Predicate>): void;
	public adopt(other: Block, slot?: Slot<Predicate> | Slot<Value>): void {
		this.ensureAlignment((reval) => {
			if (other instanceof ChainBranchBlock) {
				const nub = other.snap(this)!;

				if (nub.distanceTo(this.position.add(this.nubs[0])) < 20) {
					const loopChild = this.loopChild;

					if (loopChild) {
						loopChild.parent = null;
						this.disown(loopChild);
						reval();
					}

					this.loopChild = other;
					if (loopChild) loopChild.drag(findDelta(this, loopChild));
				} else {
					const afterChild = this.afterChild;

					if (afterChild) {
						afterChild.parent = null;
						this.disown(afterChild);
						reval();
					}

					this.afterChild = other;
					if (afterChild) afterChild.drag(findDelta(this, afterChild));
				}

				super.adopt(other);
			} else if (other instanceof Predicate) {
				const condition = this.end.value;

				if (condition) {
					this.disown(condition);
					reval();
				}

				slot.value = other;
				if (condition) condition.drag(findDelta(this, condition));

				if (this.parent)
					this.parent.notifyAdoption({ child: this, block: other, chain: [this], delta: new Point(0, other.height - EMPTY_PREDICATE.height) });
			} else if (other instanceof Value) {
				const value = slot.value;

				if (value) {
					this.disown(value);
					reval();
				}

				if (this.parent) {
					this.parent.notifyAdoption({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(other.width - EMPTY_VALUE.width, other.height - EMPTY_VALUE.height)
					});
				}

				slot.value = other;
				if (value) value.drag(findDelta(this, value));
			}
		});
	}

	public disown(other: Block): void {
		this.ensureAlignment(() => {
			if (this.loopChild === other) {
				this.loopChild = null;

				super.disown(other);
			} else if (this.afterChild === other) {
				this.afterChild = null;

				super.disown(other);
			} else if (this.iterable.value === other) {
				this.iterable.value = null;

				if (this.parent)
					this.parent.notifyDisownment({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
					});
			} else if (this.from.value === other) {
				this.from.value = null;

				if (this.parent)
					this.parent.notifyDisownment({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
					});
			} else if (this.to.value === other) {
				this.to.value = null;

				if (this.parent)
					this.parent.notifyDisownment({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
					});
			} else if (this.end.value === other) {
				this.end.value = null;

				if (this.parent)
					this.parent.notifyDisownment({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(EMPTY_PREDICATE.width - other.width, EMPTY_PREDICATE.height - other.height)
					});
			} else if (this.step.value === other) {
				this.step.value = null;

				if (this.parent)
					this.parent.notifyDisownment({
						child: this,
						block: other,
						chain: [this],
						delta: new Point(EMPTY_VALUE.width - other.width, EMPTY_VALUE.height - other.height)
					});
			} else {
				console.error(other);
				throw new Error('If block disowning non-child');
			}
		});
	}

	public notifyAdoption(evt: StructureChangeEvent): void {
		const { child, delta } = evt;

		if (!this.parent?.reduceChainUp(hasIfBlock, false)) {
			if (child === this.loopChild) {
				this.drag(new Point(0, -delta.y / 2));
			}
		}

		super.notifyAdoption(evt);
	}

	public notifyDisownment(evt: StructureChangeEvent): void {
		const { child, delta } = evt;

		if (!this.parent?.reduceChainUp(hasIfBlock, false)) {
			if (child === this.loopChild) {
				this.drag(new Point(0, -delta.y / 2));
			}
		}

		super.notifyDisownment(evt);
	}

	public duplicate(): Block[][] {
		const loopChainDupe = this.loopChild?.duplicateChain() ?? [[]];

		const [[loopChild]] = loopChainDupe as [[ChainBranchBlock]];

		const [[that]] = super.duplicate() as [[ForBlock]];

		const match = /(.+)(\d+)/.exec(this._name);

		if (match) {
			const num = Number(match[2]);

			that._name = match[1] + (num + 1);
		} else {
			that._name = this._name + '2';
		}

		that.loopChild = loopChild ?? null;
		if (loopChild) loopChild.parent = that;

		return mergeLayers<Block>([[that]], loopChainDupe);
	}

	public duplicateChain(): Block[][] {
		const thisDupe = this.duplicate(),
			nextDupe = this.afterChild?.duplicateChain() ?? [[]];

		const [[that]] = thisDupe as [[ForBlock]],
			[[next]] = nextDupe as [[ChainBranchBlock]];

		that.afterChild = next ?? null;
		if (next) next.parent = that;

		return mergeLayers<Block>(thisDupe, nextDupe);
	}

	public refDetached(): void {
		const newRef = new ForIndexRefValue(this);

		// have to calculate width from scratch because initial render (and ref pre-add width)
		const refWidth = 14 + this.renderEngine.measureWidth(this._name) + 8;
		const width = refWidth + 40;

		newRef.position = this.position.add(new Point(-width / 2 + 25 + refWidth / 2, this.height / 2 - this.topTineHeight / 2));

		this.context.add(newRef);
		this._ref = newRef;
	}

	public encapsulates(block: Block): boolean {
		return block === this.loopChild;
	}

	public traverseChain(cb: (block: Block) => void): void {
		cb(this);

		if (this.loopChild !== null) this.loopChild.traverseChain(cb);
		if (this.afterChild !== null) this.afterChild.traverseChain(cb);
	}

	public traverseByLayer(cb: (block: Block, depth: number) => void, depth: number = 0): void {
		cb(this, depth);

		this._ref.traverseByLayer(cb, depth + 1);
		if (this.from.value !== null) this.from.value.traverseByLayer(cb, depth + 1);
		if (this.to.value !== null) this.to.value.traverseByLayer(cb, depth + 1);
		if (this.end.value !== null) this.end.value.traverseByLayer(cb, depth + 1);
		if (this.step.value !== null) this.step.value.traverseByLayer(cb, depth + 1);
		if (this.loopChild !== null) this.loopChild.traverseByLayer(cb, depth);
		if (this.afterChild !== null) this.afterChild.traverseByLayer(cb, depth);
	}

	public reduceChain<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.afterChild !== null
				? this.afterChild.reduceChain(cb, this.loopChild !== null ? this.loopChild.reduceChain(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): BlockCompileResult {
		const loopResult = this.loopChild !== null ? this.loopChild.compile(scope) : { lines: [], meta: { requires: [] } };
		const afterResult = this.afterChild !== null ? this.afterChild.compile(scope) : { lines: [], meta: { requires: [] } };

		return {
			lines: lns([`for (;true;) {`, loopResult.lines, '}', ...afterResult.lines]),
			meta: {
				requires: union(loopResult.meta.requires, afterResult.meta.requires),
				precedence: null,
				checks: []
			}
		};
	}
}

export class ForIndexRefValue extends Value {
	public readonly type = 'DATA';
	public readonly shape: ResolvedPath<ForIndexRefValueShapeParams>;

	private _attached: boolean;
	private _dti: DataTypeIndicator<ForIndexRefValue>;

	public constructor(public readonly master: ForBlock) {
		super();

		this.host = null;

		this._attached = true;
		this._dti = new DataTypeIndicator(this);

		// double 8-radius arc of pi/2 to do arc of pi for numerical stability (or possibly because im bad at math lol)
		this.shape = new PathBuilder<ForIndexRefValueShapeParams>(({ width }) => width, 14)
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
		const metrics = this.renderEngine.measure(this.master.name);
		return 14 + metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft + 8;
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

	public get dataType(): DataType {
		return this.master.indexDataType;
	}

	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		this.context.add(this._dti);
	}

	public update(metadata: Metadata): void {
		super.update(metadata);

		if (metadata.selectedEntity === this && metadata.mouse?.down && metadata.mouse.button === MouseButton.LEFT && this._attached) {
			this.master.refDetached();
			this._attached = false;
		}
	}

	public render(metadata: Metadata): void {
		super.render(metadata);

		this.renderEngine.text(this.position.add(new Point(4, 0)), this.master.name, { color: 'white' }, this.shape);
	}

	public delete(): void {
		if (!this._attached) {
			super.delete();
		}
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
		if (this.master !== null) this.master.traverseChain(cb);
	}

	public reduceChainUp<T>(cb: (prev: T, block: Block, prune: (arg: T) => T) => T, init: T): T {
		let cont = true;

		const thisResult = cb(init, this, (arg) => {
			cont = false;
			return arg;
		});

		if (cont) {
			return this.master !== null
				? this.master.reduceChainUp(cb, this.host !== null ? this.host.reduceChainUp(cb, thisResult) : thisResult)
				: thisResult;
		} else {
			return thisResult;
		}
	}

	public compile(scope: LexicalScope): ExprCompileResult {
		const entry = scope.lookup(this);

		if (!entry) throw new Error(`Variable ${this.master.name} not declared in current scope!`);

		return { code: this.master.name, meta: { requires: new Set(), precedence: null, checks: [] } };
	}
}

