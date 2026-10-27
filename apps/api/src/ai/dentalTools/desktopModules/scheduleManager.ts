/**
 * @file scheduleManager.ts
 * @description Менеджер фоновых таймеров и регламентов (Reactive Wakeup).
 */

import type { WorkstationScheduleEntry } from "./desktopTypes.js";

export class WorkstationScheduleManager {
	private static instance: WorkstationScheduleManager;
	private schedules = new Map<string, WorkstationScheduleEntry>();
	private counter = 0;

	private constructor() {}

	public static getInstance(): WorkstationScheduleManager {
		if (!WorkstationScheduleManager.instance) {
			WorkstationScheduleManager.instance = new WorkstationScheduleManager();
		}
		return WorkstationScheduleManager.instance;
	}

	public createOneShot(
		prompt: string,
		durationSeconds: number,
		timerCondition = "never",
		isDaemon = false,
	): WorkstationScheduleEntry {
		this.counter += 1;
		const scheduleId = `sched-${Date.now()}-${this.counter}`;
		const firesAt = new Date(Date.now() + durationSeconds * 1000);
		const entry: WorkstationScheduleEntry = {
			scheduleId,
			prompt,
			mode: "one_shot",
			durationSeconds,
			timerCondition,
			firesAtIso: firesAt.toISOString(),
			status: "active",
			iterationsFired: 0,
			isDaemon,
		};
		entry.timerHandle = setTimeout(() => {
			entry.status = "fired";
			entry.iterationsFired += 1;
		}, durationSeconds * 1000);
		this.schedules.set(scheduleId, entry);
		return entry;
	}

	public createCron(
		prompt: string,
		cronExpression: string,
		maxIterations?: number,
		isDaemon = false,
	): WorkstationScheduleEntry {
		this.counter += 1;
		const scheduleId = `cron-${Date.now()}-${this.counter}`;
		const entry: WorkstationScheduleEntry = {
			scheduleId,
			prompt,
			mode: "cron",
			cronExpression,
			firesAtIso: new Date(Date.now() + 60000).toISOString(),
			status: "active",
			iterationsFired: 0,
			maxIterations,
			isDaemon,
		};
		this.schedules.set(scheduleId, entry);
		return entry;
	}

	public list(): Array<Omit<WorkstationScheduleEntry, "timerHandle">> {
		return Array.from(this.schedules.values()).map((s) => {
			const { timerHandle: _, ...safe } = s;
			return safe;
		});
	}

	public cancel(scheduleId: string): boolean {
		const entry = this.schedules.get(scheduleId);
		if (entry?.status !== "active") return false;
		if (entry.timerHandle) clearTimeout(entry.timerHandle);
		entry.status = "cancelled";
		return true;
	}

	public notifyTaskFinished(taskId: string): string[] {
		const earlyCancelledIds: string[] = [];
		for (const [id, entry] of this.schedules.entries()) {
			if (entry.status === "active") {
				if (entry.timerCondition === "any" || entry.timerCondition === taskId) {
					if (entry.timerHandle) clearTimeout(entry.timerHandle);
					entry.status = "early_cancelled";
					earlyCancelledIds.push(id);
				}
			}
		}
		return earlyCancelledIds;
	}

	public clear(): void {
		for (const entry of this.schedules.values()) {
			if (entry.timerHandle) clearTimeout(entry.timerHandle);
		}
		this.schedules.clear();
		this.counter = 0;
	}
}

export const workstationSchedules = WorkstationScheduleManager.getInstance();

