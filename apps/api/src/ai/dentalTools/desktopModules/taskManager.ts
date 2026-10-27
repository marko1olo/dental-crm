/**
 * @file taskManager.ts
 * @description Системный менеджер фоновых процессов и задач рабочей станции.
 */

import type { ChildProcess } from "node:child_process";
import type { WorkstationTask } from "./desktopTypes.js";
import { workstationSchedules } from "./scheduleManager.js";
import {
	attachTaskStreamListeners,
	executeTaskKill,
	executeTaskSendInput,
} from "./taskProcessActions.js";

export class WorkstationTaskManager {
	private static instance: WorkstationTaskManager;
	private tasks = new Map<string, WorkstationTask>();
	private counter = 0;

	private constructor() {}

	public static getInstance(): WorkstationTaskManager {
		if (!WorkstationTaskManager.instance) {
			WorkstationTaskManager.instance = new WorkstationTaskManager();
		}
		return WorkstationTaskManager.instance;
	}

	public register(
		commandLine: string,
		cwd: string,
		child: ChildProcess,
		isDaemon = false,
	): WorkstationTask {
		this.counter += 1;
		const taskId = `task-dent-${Date.now()}-${this.counter}`;
		const task: WorkstationTask = {
			taskId,
			pid: child.pid ?? 0,
			commandLine,
			cwd,
			status: "running",
			startedAt: new Date().toISOString(),
			stdout: [],
			stderr: [],
			isDaemon,
			childProcess: child,
		};

		attachTaskStreamListeners(task, child, (code, err) => {
			if (task.status !== "killed") {
				task.status = err || code !== 0 ? "failed" : "completed";
			}
			if (err) task.stderr.push(`Process error: ${err.message}`);
			task.exitCode = code;
			task.finishedAt = new Date().toISOString();
			task.childProcess = undefined;
			try {
				workstationSchedules.notifyTaskFinished(taskId);
			} catch {}
		});

		this.tasks.set(taskId, task);
		return task;
	}

	public list(): Array<Omit<WorkstationTask, "childProcess">> {
		return Array.from(this.tasks.values()).map((t) => {
			const { childProcess: _, ...safe } = t;
			return safe;
		});
	}

	public get(
		taskId: string,
	): Omit<WorkstationTask, "childProcess"> | undefined {
		const task = this.tasks.get(taskId);
		if (!task) return undefined;
		const { childProcess: _, ...safe } = task;
		return safe;
	}

	public kill(taskId: string): { success: boolean; message: string } {
		const task = this.tasks.get(taskId);
		if (!task) return { success: false, message: `Задача с ID '${taskId}' не найдена.` };
		if (task.status !== "running" || !task.childProcess) {
			return { success: true, message: `Задача '${taskId}' уже завершена (статус: ${task.status}).` };
		}
		const res = executeTaskKill(task);
		try {
			workstationSchedules.notifyTaskFinished(taskId);
		} catch {}
		return res;
	}

	public sendInput(taskId: string, input: string): { success: boolean; message: string } {
		const task = this.tasks.get(taskId);
		if (!task) return { success: false, message: `Задача с ID '${taskId}' не найдена.` };
		if (task.status !== "running" || !task.childProcess?.stdin) {
			return { success: false, message: `Невозможно отправить ввод: задача '${taskId}' не запущена.` };
		}
		return executeTaskSendInput(task, input);
	}

	public clear(): void {
		this.tasks.clear();
		this.counter = 0;
	}
}

export const workstationTasks = WorkstationTaskManager.getInstance();
