import type { GradientCheckpoint } from './GradientBuilder';

export class MovableGradient {
	public constructor(public readonly checkpoints: GradientCheckpoint[]) {}

	public print(grad: CanvasGradient): void {
		this.checkpoints.forEach(({ color, offset }) => grad.addColorStop(offset, color));
	}
}

