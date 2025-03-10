import type { EngineContext } from '$lib/engine/EngineContext';
import { Entity, type Metadata } from '$lib/engine/Entity';
import type { Point } from '$lib/engine/Point';
import type { RenderEngine } from '$lib/engine/RenderEngine';
import type { DataType } from '$lib/utils/DataType';

export interface SensorConfig {
	name: string;
	type: DataType;
}

export class PhantomSensor extends Entity {
	public init(renderEngine: RenderEngine, context: EngineContext): void {
		super.init(renderEngine, context);

		const off = context.engine.on('entityClicked', (entity) => {
			if (entity === this) {
				context.engine.appendHW(this);
				off();
			}
		});
	}

	public update(metadata: Metadata): void {
		if (metadata.mouse?.position) {
			this.position = metadata.mouse.position;
		}
	}

	public render(metadata: Metadata): void {
		this.renderEngine.circle(this.position, 10, 'black');
	}

	public selectedBy(point: Point): boolean {
		return true;
	}
}

export class Sensor extends Entity {
	public constructor(public readonly config: SensorConfig) {
		super();
	}

	public update(metadata: Metadata): void {}

	public render(metadata: Metadata): void {
		this.renderEngine.circle(this.position, 10, 'black');
	}

	public selectedBy(point: Point): boolean {
		return point.distanceTo(this.position) <= 10;
	}
}

