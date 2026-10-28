/**
 * DENTE CRM — Dynamic Performance Evaluator & State Transitions
 */

import type { FpsTelemetrySampler } from "./fpsTelemetrySampler.js";
import type { LongTaskObserver } from "./longTaskObserver.js";
import { sampleMemoryPressure } from "./memoryPressureWatcher.js";
import { computeRawState, SEVERITY_RANK } from "./performanceStateMachine.js";
import type { PerformanceStateStore } from "./performanceStateStore.js";
import type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
} from "./performanceTypes.js";

export interface EvaluatorContext {
	currentState: DynamicLoadState;
	candidateBetterState: DynamicLoadState | null;
	candidateStableSince: number | null;
	recoveryDurationMs: number;
}

export interface EvaluationResult {
	nextState: DynamicLoadState | null;
	candidateBetterState: DynamicLoadState | null;
	candidateStableSince: number | null;
}

export function evaluateStateTransition(
	metrics: DynamicPerformanceMetrics,
	ctx: EvaluatorContext,
	now: number,
): EvaluationResult {
	const rawState = computeRawState(metrics);
	const currentRank = SEVERITY_RANK[ctx.currentState];
	const rawRank = SEVERITY_RANK[rawState];

	if (rawRank > currentRank) {
		return { nextState: rawState, candidateBetterState: null, candidateStableSince: null };
	}

	if (rawRank < currentRank) {
		if (ctx.candidateBetterState !== rawState) {
			return { nextState: null, candidateBetterState: rawState, candidateStableSince: now };
		}
		if (ctx.candidateStableSince !== null && now - ctx.candidateStableSince >= ctx.recoveryDurationMs) {
			return { nextState: rawState, candidateBetterState: null, candidateStableSince: null };
		}
		return { nextState: null, candidateBetterState: ctx.candidateBetterState, candidateStableSince: ctx.candidateStableSince };
	}

	return { nextState: null, candidateBetterState: null, candidateStableSince: null };
}

export function processBurstMetrics(
	fpsSampler: FpsTelemetrySampler,
	longTaskObs: LongTaskObserver,
	store: PerformanceStateStore,
	opts: any,
	now: number,
	isTabVisible: boolean,
): { metrics: DynamicPerformanceMetrics; nextState: DynamicLoadState | null; candidate: { better: DynamicLoadState | null; since: number | null } } {
	const fps = fpsSampler.computeMetrics(opts.sampleWindowFrames);
	const mem = sampleMemoryPressure(opts.enableMemory);
	const lt = longTaskObs.computeMetrics(now, opts.longTaskWindowMs);
	const metrics = { ...store.currentMetrics, ...fps, ...mem, ...lt, isTabVisible };
	const res = evaluateStateTransition(metrics, opts, now);
	return { metrics, nextState: res.nextState, candidate: { better: res.candidateBetterState, since: res.candidateStableSince } };
}

export { sampleMemoryPressure };
