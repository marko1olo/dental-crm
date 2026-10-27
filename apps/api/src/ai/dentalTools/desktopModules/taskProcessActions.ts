/**
 * @file taskProcessActions.ts
 * @description Вспомогательные действия над системными процессами задач (kill, input, stream listeners).
 */

import { type ChildProcess, exec } from "node:child_process";
import type { WorkstationTask } from "./desktopTypes.js";

export function attachTaskStreamListeners(
	task: WorkstationTask,
	child: ChildProcess,
	onDone: (code: number | null, err?: Error) => void,
): void {
	child.stdout?.on("data", (data: Buffer | string) => {
		const lines = data.toString("utf8").split(/\r?\n/).filter(Boolean);
		task.stdout.push(...lines);
		if (task.stdout.length > 500) {
			task.stdout.splice(0, task.stdout.length - 500);
		}
	});

	child.stderr?.on("data", (data: Buffer | string) => {
		const lines = data.toString("utf8").split(/\r?\n/).filter(Boolean);
		task.stderr.push(...lines);
		if (task.stderr.length > 500) {
			task.stderr.splice(0, task.stderr.length - 500);
		}
	});

	child.on("close", (code) => onDone(code));
	child.on("error", (err) => onDone(null, err));
}

export function executeTaskKill(
	task: WorkstationTask,
): { success: boolean; message: string } {
	try {
		if (process.platform === "win32") {
			exec(`taskkill /pid ${task.pid} /t /f`);
		} else {
			task.childProcess?.kill("SIGTERM");
		}
		task.status = "killed";
		task.finishedAt = new Date().toISOString();
		task.childProcess = undefined;
		return {
			success: true,
			message: `Процесс задачи '${task.taskId}' (PID ${task.pid}) принудительно завершен.`,
		};
	} catch (err) {
		return {
			success: false,
			message: `Ошибка завершения процесса: ${(err as Error).message}`,
		};
	}
}

export function executeTaskSendInput(
	task: WorkstationTask,
	input: string,
): { success: boolean; message: string } {
	try {
		task.childProcess?.stdin?.write(
			input.endsWith("\n") ? input : `${input}\n`,
		);
		return {
			success: true,
			message: `Ввод успешно отправлен в процесс '${task.taskId}'.`,
		};
	} catch (err) {
		return {
			success: false,
			message: `Ошибка отправки ввода: ${(err as Error).message}`,
		};
	}
}
