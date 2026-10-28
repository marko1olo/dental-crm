/**
 * DENTE CRM — Sliding Window Long Task Observer
 */

export interface LongTaskMetrics {
	longTaskCount: number;
	totalLongTaskDurationMs: number;
	maxLongTaskDurationMs: number;
}

export class LongTaskObserver {
	private readonly timestamps: Float64Array;
	private readonly durations: Float32Array;
	private readonly maxTasks = 32;
	private head = 0;
	private totalRecorded = 0;

	constructor() {
		this.timestamps = new Float64Array(this.maxTasks);
		this.durations = new Float32Array(this.maxTasks);
	}

	public record(durationMs: number, startTime: number): void {
		if (durationMs <= 0) return;
		const idx = this.head;
		this.timestamps[idx] = startTime;
		this.durations[idx] = durationMs;
		this.head = (this.head + 1) % this.maxTasks;
		this.totalRecorded++;
	}

	public reset(): void {
		this.head = 0;
		this.totalRecorded = 0;
	}

	public computeMetrics(now: number, windowMs: number = 6000): LongTaskMetrics {
		const windowStart = now - windowMs;
		let count = 0;
		let total = 0;
		let maxDuration = 0;

		const recorded = Math.min(this.totalRecorded, this.maxTasks);
		for (let i = 0; i < recorded; i++) {
			const idx = (this.head - 1 - i + this.maxTasks * 10) % this.maxTasks;
			const time = this.timestamps[idx];
			if (time !== undefined && time >= windowStart) {
				const duration = this.durations[idx];
				if (duration !== undefined) {
					count++;
					total += duration;
					if (duration > maxDuration) maxDuration = duration;
				}
			}
		}

		return {
			longTaskCount: count,
			totalLongTaskDurationMs: Math.round(total),
			maxLongTaskDurationMs: Math.round(maxDuration),
		};
	}
}
