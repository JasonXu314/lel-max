import type { EngineContext } from '$lib/engine/EngineContext';
import { Entity, type Metadata } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import type { DataType } from '$lib/utils/DataType';
import { COLORS } from '../blocks/colors/colors';

export interface ActuatorConfig {
	hwType: 'actuator';
	name: string;
	type: DataType;
}

export class PhantomActuator extends Entity {
	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		const off = context.engine.on('entityClicked', (entity) => {
			if (entity === this) {
				context.engine.appendActuator(this);
				off();
			}
		});
	}

	public update(metadata: Metadata): void {
		if (metadata.mouse?.position) {
			this.position = metadata.mouse.position;
		}
	}

	public render(): void {
		this.renderEngine.circle(this.position, 10, 'black');
	}

	public selectedBy(): boolean {
		return true;
	}
}

export class Actuator extends Entity {
	public constructor(public readonly config: ActuatorConfig) {
		super();
	}

	public update(metadata: Metadata): void {}

	public render(metadata: Metadata): void {
		this.renderEngine.circle(this.position, 10, 'black');

		if (metadata.selectedEntity === this) {
			this.renderEngine.circle(this.position, 10, COLORS.SPECIAL.HIGHLIGHT);
		}
	}

	public selectedBy(point: Point): boolean {
		return point.distanceTo(this.position) <= 10;
	}
}

