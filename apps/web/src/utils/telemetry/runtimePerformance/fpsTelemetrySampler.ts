/**
 * DENTE CRM — Zero-GC Frame Timing & FPS Telemetry Sampler
 */

export interface FpsMetrics {
	instantFps: number;
	averageFps: number;
	minFps: number;
	maxFps: number;
	jitterMs: number;
	p95FrameTimeMs: number;
	sampleCount: number;
}

export class FpsTelemetrySampler {
	private readonly frameDeltas: Float32Array;
	private readonly capacity: number;
	private sampleCount = 0;

	constructor(sampleWindowFrames: number = 30) {
		this.capacity = Math.max(32, sampleWindowFrames * 2);
		this.frameDeltas = new Float32Array(this.capacity);
	}

	public recordDelta(deltaMs: number): void {
		if (deltaMs <= 0) return;
		const idx = this.sampleCount % this.capacity;
		this.frameDeltas[idx] = deltaMs;
		this.sampleCount++;
	}

	public getSampleCount(): number {
		return this.sampleCount;
	}

	public reset(): void {
		this.sampleCount = 0;
	}

	public computeMetrics(windowFrames: number = 30): FpsMetrics {
		const count = Math.min(this.sampleCount, windowFrames);
		if (count <= 0) {
			return { instantFps: 60, averageFps: 60, minFps: 60, maxFps: 60, jitterMs: 0, p95FrameTimeMs: 16.6, sampleCount: 0 };
		}

		let sumDelta = 0;
		let minDelta = Infinity;
		let maxDelta = 0;
		const recentDeltas: number[] = [];

		for (let i = 0; i < count; i++) {
			const idx = (this.sampleCount - 1 - i + this.capacity * 10) % this.capacity;
			const d = this.frameDeltas[idx];
			if (d !== undefined && d > 0) {
				sumDelta += d;
				if (d < minDelta) minDelta = d;
				if (d > maxDelta) maxDelta = d;
				recentDeltas.push(d);
			}
		}

		if (recentDeltas.length === 0) {
			return { instantFps: 60, averageFps: 60, minFps: 60, maxFps: 60, jitterMs: 0, p95FrameTimeMs: 16.6, sampleCount: this.sampleCount };
		}

		const avgDelta = sumDelta / recentDeltas.length;
		const instantDelta = recentDeltas[0] ?? 16.6;

		let varianceSum = 0;
		for (const val of recentDeltas) {
			const diff = val - avgDelta;
			varianceSum += diff * diff;
		}
		const jitterMs = Math.round(Math.sqrt(varianceSum / recentDeltas.length) * 10) / 10;

		recentDeltas.sort((a, b) => a - b);
		const p95Idx = Math.min(recentDeltas.length - 1, Math.floor(recentDeltas.length * 0.95));
		const p95FrameTimeMs = Math.round((recentDeltas[p95Idx] ?? avgDelta) * 10) / 10;

		return {
			instantFps: Math.min(120, Math.max(1, Math.round(1000 / instantDelta))),
			averageFps: Math.min(120, Math.max(1, Math.round(1000 / avgDelta))),
			minFps: maxDelta > 0 ? Math.max(1, Math.round(1000 / maxDelta)) : 60,
			maxFps: minDelta > 0 ? Math.min(120, Math.round(1000 / minDelta)) : 60,
			jitterMs,
			p95FrameTimeMs,
			sampleCount: this.sampleCount,
		};
	}
}
