/**
 * @file processExecutionHelper.ts
 * @description Вспомогательные функции резолвинга диагностических команд и spawn с таймаутом.
 */

import { type ChildProcess, spawn } from "node:child_process";
import type { RunWorkstationCommandInput } from "./processExecutionTools.js";
import { workstationTasks } from "./taskManager.js";

export function resolveDiagnosticCommand(args: RunWorkstationCommandInput): string {
	if (args.diagnosticTarget === "com_ports") {
		return 'powershell -NoProfile -Command "Get-CimInstance Win32_SerialPort | Select-Object DeviceID, Name, Description"';
	}
	if (args.diagnosticTarget === "kkt_service_status") {
		return 'powershell -NoProfile -Command "Get-Service -Name *atol*, *kkt*, *shtrih* -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType"';
	}
	if (args.diagnosticTarget === "xray_device_status") {
		return "powershell -NoProfile -Command \"Get-PnpDevice -Class USB, Camera -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'vatech|sensor|dental|camera' } | Select-Object FriendlyName, Status, InstanceId\"";
	}
	if (args.diagnosticTarget === "twain_devices") {
		return 'powershell -NoProfile -Command "Get-PnpDevice -Class Image -Status OK -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status, InstanceId"';
	}
	if (args.diagnosticTarget === "ping_printer") {
		const host = args.targetHostOrPort || "127.0.0.1";
		return /^[a-zA-Z0-9.-]+$/.test(host) ? `ping -n 2 ${host}` : "";
	}
	return args.commandLine || "";
}

export function executeCommandWithTimeout(
	command: string,
	workingDir: string,
	waitMs: number,
): Promise<any> {
	const startTime = Date.now();
	return new Promise((resolve) => {
		let child: ChildProcess;
		try {
			child = spawn(command, { shell: true, cwd: workingDir });
		} catch (err) {
			return resolve({ success: false, error: `Сбой spawn: ${(err as Error).message}` });
		}
		let stdoutBuf = "";
		let stderrBuf = "";
		let isCompleted = false;

		child.stdout?.on("data", (d) => { stdoutBuf += d.toString("utf8"); });
		child.stderr?.on("data", (d) => { stderrBuf += d.toString("utf8"); });

		const timer = setTimeout(() => {
			if (!isCompleted) {
				const task = workstationTasks.register(command, workingDir, child, false);
				if (stdoutBuf) task.stdout.push(...stdoutBuf.split(/\r?\n/).filter(Boolean));
				if (stderrBuf) task.stderr.push(...stderrBuf.split(/\r?\n/).filter(Boolean));
				resolve({
					success: true,
					status: "background",
					taskId: task.taskId,
					pid: task.pid,
					waitMsElapsed: waitMs,
					message: `Команда выполняется дольше ${waitMs} мс и отправлена в фоновый режим. taskId: '${task.taskId}'.`,
				});
			}
		}, waitMs);

		child.on("close", (exitCode) => {
			isCompleted = true;
			clearTimeout(timer);
			resolve({
				success: exitCode === 0,
				status: "completed",
				exitCode,
				durationMs: Date.now() - startTime,
				stdout: stdoutBuf.trim(),
				stderr: stderrBuf.trim(),
				rawOutput: stdoutBuf.trim() || stderrBuf.trim() || "Команда завершилась без вывода.",
			});
		});

		child.on("error", (err) => {
			isCompleted = true;
			clearTimeout(timer);
			resolve({ success: false, status: "failed", error: `Ошибка процесса: ${err.message}` });
		});
	});
}
