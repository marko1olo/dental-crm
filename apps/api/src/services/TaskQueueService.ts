/**
 * TaskQueueService.ts — персистентная очередь фоновых задач (TASK-2.3).
 * Canonical facade re-exporting from ./tasks/TaskQueueService.js
 */

export {
	TaskQueueService,
	calculateExponentialBackoffWithJitter,
} from "./tasks/TaskQueueService.js";

export type {
	JobStatus,
	EnqueueJobParams,
	TaskHandlerContext,
	TaskHandler,
	WorkerOptions,
	WorkerHandle,
	DequeueOptions,
	FailJobOptions,
	RecoverStaleOptions,
} from "./tasks/TaskQueueService.js";
