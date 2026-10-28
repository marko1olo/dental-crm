/**
 * DENTE CRM — Telemetry Burst Sampling Loop
 */

import type { FpsTelemetrySampler } from "./fpsTelemetrySampler.js";

export interface BurstSamplerContext {
	isRunning: () => boolean;
	isTabVisible: () => boolean;
	now: () => number;
	raf: (cb: (time: number) => void) => number;
	caf: (id: number) => void;
	sampleWindowFrames: number;
	fpsSampler: FpsTelemetrySampler;
	onBurstComplete: (now: number) => void;
}

export class PerformanceSamplerLoop {
	private sampleTimerId: ReturnType<typeof setTimeout> | null = null;
	private currentRafId: number | null = null;
	private isSamplingBurst = false;

	constructor(private readonly ctx: BurstSamplerContext) {}

	public isSampling(): boolean { return this.isSamplingBurst; }

	public cancel(): void {
		if (this.sampleTimerId !== null) { clearTimeout(this.sampleTimerId); this.sampleTimerId = null; }
		if (this.currentRafId !== null) { this.ctx.caf(this.currentRafId); this.currentRafId = null; }
		this.isSamplingBurst = false;
	}

	public schedule(delayMs: number): void {
		if (!this.ctx.isRunning() || !this.ctx.isTabVisible()) return;
		this.cancel();
		this.sampleTimerId = setTimeout(() => {
			this.sampleTimerId = null;
			this.startBurst();
		}, delayMs);
	}

	public startBurst(): void {
		if (!this.ctx.isRunning() || !this.ctx.isTabVisible()) return;
		this.isSamplingBurst = true;
		let burstCount = 0;
		let lastTimestamp = this.ctx.now();

		const onFrame = (now: number) => {
			if (!this.ctx.isRunning() || !this.ctx.isTabVisible() || !this.isSamplingBurst) {
				this.currentRafId = null;
				return;
			}
			const delta = now - lastTimestamp;
			lastTimestamp = now;
			if (burstCount > 0 && delta > 0 && delta < 2000) this.ctx.fpsSampler.recordDelta(delta);
			burstCount++;
			if (burstCount >= this.ctx.sampleWindowFrames) {
				this.isSamplingBurst = false;
				this.currentRafId = null;
				this.ctx.onBurstComplete(now);
			} else {
				this.currentRafId = this.ctx.raf(onFrame);
			}
		};
		this.currentRafId = this.ctx.raf(onFrame);
	}
}
