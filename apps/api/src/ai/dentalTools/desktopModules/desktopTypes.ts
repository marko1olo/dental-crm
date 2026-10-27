/**
 * @file desktopTypes.ts
 * @description Типы данных, интерфейсы фоновых задач, таймеров и MCP-моста десктопного харнесса.
 */

import type { ChildProcess } from "node:child_process";

export interface WorkstationTask {
	taskId: string;
	pid: number;
	commandLine: string;
	cwd: string;
	status: "running" | "completed" | "killed" | "failed";
	startedAt: string;
	finishedAt?: string | undefined;
	exitCode?: number | null | undefined;
	stdout: string[];
	stderr: string[];
	isDaemon: boolean;
	childProcess?: ChildProcess | undefined;
}

export interface WorkstationScheduleEntry {
	scheduleId: string;
	prompt: string;
	mode: "one_shot" | "cron";
	durationSeconds?: number | undefined;
	cronExpression?: string | undefined;
	timerCondition?: string | undefined;
	firesAtIso: string;
	status: "active" | "fired" | "cancelled" | "early_cancelled";
	iterationsFired: number;
	maxIterations?: number | undefined;
	isDaemon: boolean;
	timerHandle?: NodeJS.Timeout | undefined;
}

export interface LocalMcpToolInfo {
	serverName: string;
	toolName: string;
	description: string;
	parameters: Record<string, unknown>;
}

export interface FoundWorkstationFile {
	filePath: string;
	fileName: string;
	sizeBytes: number;
	modifiedAtIso: string;
	extension: string;
	detectedModality: string;
	category: string;
}
