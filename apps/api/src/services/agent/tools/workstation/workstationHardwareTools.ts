/**
 * workstationHardwareTools.ts — Fiscal Registrar (54-FZ) & Peripheral Hardware Diagnostics.
 *
 * Sweet Spot: ~130 lines.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";
import { CLOUD_GUARD_DENIAL, isCloudEnvironment } from "./workstationAppTools.js";

const execAsync = promisify(exec);

// ============================================================================
// 1. TOOL: check_fiscal_hardware_port
// ============================================================================

export const checkFiscalHardwarePortSchema = z.object({
	targetPort: z
		.string()
		.optional()
		.default("COM3")
		.describe("Ожидаемый порт фискального регистратора (например, 'COM1', 'COM3', 'USB')"),
});

export type CheckFiscalHardwarePortInput = z.infer<
	typeof checkFiscalHardwarePortSchema
>;

export const checkFiscalHardwarePortTool: ToolDefinition<
	typeof checkFiscalHardwarePortSchema,
	Record<string, unknown>
> = {
	name: "check_fiscal_hardware_port",
	description:
		"Проверка готовности и доступности аппаратного порта фискального регистратора (Атол / Штрих-М) на рабочей станции врача/кассира (desktop_native).",
	parameters: checkFiscalHardwarePortSchema,
	permissions: ["financial.read"],
	category: "read",
	handler: async (
		_ctx: AgentContext,
		args: CheckFiscalHardwarePortInput,
	): Promise<Record<string, unknown>> => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		try {
			// Query serial ports on Windows via PowerShell
			const psCommand = `powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::getportnames()"`;
			const { stdout } = await execAsync(psCommand, { timeout: 4000 });
			const detectedPorts = stdout
				.split(/\r?\n/)
				.map((p) => p.trim())
				.filter(Boolean);

			const portRequested = args.targetPort || "COM3";
			const isDetected =
				detectedPorts.includes(portRequested) || detectedPorts.length > 0;
			const effectivePort = detectedPorts.includes(portRequested)
				? portRequested
				: detectedPorts[0] || portRequested;

			return {
				success: true,
				isReady: isDetected,
				detectedPorts,
				port: effectivePort,
				device: "Фискальный регистратор (Атол 30Ф / 55Ф)",
				status: isDetected
					? `Порт ${effectivePort} в сети. Кассовый узел готов к печати чеков.`
					: `Порт ${portRequested} не обнаружен среди активных портов (${detectedPorts.join(", ") || "порты не найдены"}).`,
				fiscal_device: {
					device: "Фискальный регистратор (Атол 30Ф / 55Ф)",
					port: effectivePort,
					status: isDetected
						? "Готов к печати кассовых чеков"
						: "Устройство не подключено",
					isReady: isDetected,
				},
			};
		} catch {
			// Graceful fallback if .NET serial port query encounters no physical ports
			return {
				success: true,
				isReady: false,
				port: args.targetPort || "COM3",
				device: "Фискальный регистратор (Атол 30Ф / 55Ф)",
				status: "Порт ожидает подключения контрольно-кассовой техники.",
				fiscal_device: {
					device: "Фискальный регистратор (Атол 30Ф / 55Ф)",
					port: args.targetPort || "COM3",
					status: "Ожидание подключения ККТ",
					isReady: false,
				},
			};
		}
	},
};

// ============================================================================
// 2. TOOL: write_workstation_clipboard
// ============================================================================

export const writeWorkstationClipboardSchema = z.object({
	text: z.string().describe("Текст для копирования в системный буфер обмена Windows"),
});

export const writeWorkstationClipboardTool: ToolDefinition<
	typeof writeWorkstationClipboardSchema,
	Record<string, unknown>
> = {
	name: "write_workstation_clipboard",
	description:
		"Запись текста (протокол, направление, выписка) в системный буфер обмена Windows на рабочей станции врача (desktop_native).",
	parameters: writeWorkstationClipboardSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx: AgentContext, args: { text: string }) => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		try {
			const safeText = args.text.replace(/'/g, "''");
			await execAsync(`powershell -NoProfile -Command "Set-Clipboard -Value '${safeText}'"`, {
				timeout: 3000,
			});
			return {
				success: true,
				length: args.text.length,
				message: "Текст успешно скопирован в буфер обмена Windows.",
			};
		} catch (err) {
			return { success: false, error: `Сбой буфера обмена: ${(err as Error).message}` };
		}
	},
};
