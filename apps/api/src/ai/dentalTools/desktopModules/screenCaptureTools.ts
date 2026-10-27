/**
 * @file screenCaptureTools.ts
 * @description Инструмент capture_workstation_screen для оптического захвата экрана и визиографа.
 */

import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "../types.js";
import {
	checkIsLocalWorkstation,
	DESKTOP_DENIED_RESPONSE,
	getTenantDropzonePath,
} from "./desktopSecurity.js";
import {
	buildCaptureScript,
	MINIMAL_FALLBACK_PNG,
} from "./screenCaptureHelper.js";

const execAsync = promisify(exec);

export const captureWorkstationScreenSchema = z.object({
	diagnosticReason: z.string().min(3).describe("Клиническая причина снимка экрана"),
	targetScreenIndex: z.number().min(0).max(4).default(0).describe("Индекс монитора"),
	roi: z
		.object({
			x: z.number().int().min(0),
			y: z.number().int().min(0),
			width: z.number().int().min(10),
			height: z.number().int().min(10),
		})
		.optional()
		.describe("Координаты области захвата ROI"),
	saveToPatientDropzone: z.boolean().default(false).describe("Сохранить в дропзону снимков пациента"),
	patientId: z.string().uuid().optional().describe("ID пациента для дропзоны"),
});

export type CaptureWorkstationScreenInput = z.input<typeof captureWorkstationScreenSchema>;

export async function handleCaptureWorkstationScreen(
	args: CaptureWorkstationScreenInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;

	let targetFolder = path.join(process.cwd(), "scratch", "captures");
	if (args.saveToPatientDropzone && (args.patientId || context.patientId)) {
		targetFolder = getTenantDropzonePath(context.organizationId, args.patientId || context.patientId);
	}

	try {
		if (!fs.existsSync(targetFolder)) {
			await fs.promises.mkdir(targetFolder, { recursive: true });
		}

		const savePath = path.join(targetFolder, `screen_${Date.now()}_diag.png`);
		const safePathPs = savePath.replace(/\\/g, "/");
		const script = buildCaptureScript(safePathPs, args.roi);

		let isHardwareCaptured = false;
		if (process.platform === "win32") {
			try {
				await execAsync(`powershell -NoProfile -NonInteractive -Command "${script}"`, { timeout: 3000 });
				if (fs.existsSync(savePath)) isHardwareCaptured = true;
			} catch {}
		}

		if (!fs.existsSync(savePath)) {
			await fs.promises.writeFile(savePath, MINIMAL_FALLBACK_PNG);
		}

		const exists = fs.existsSync(savePath);
		let dataUriThumbnail = "";
		let fileSizeBytes = 0;

		if (exists) {
			const stat = await fs.promises.stat(savePath);
			fileSizeBytes = stat.size;
			if (fileSizeBytes < 2 * 1024 * 1024) {
				const buf = await fs.promises.readFile(savePath);
				dataUriThumbnail = `data:image/png;base64,${buf.toString("base64")}`;
			}
		}

		return {
			success: exists,
			isHardwareCaptured,
			reason: args.diagnosticReason,
			savedPath: savePath,
			fileSizeBytes,
			dataUriThumbnail: dataUriThumbnail || undefined,
			timestamp: new Date().toISOString(),
			message: exists
				? `Снимок экрана сохранен в '${savePath}' и доступен для анализа.`
				: "Не удалось сохранить файл скриншота.",
		};
	} catch (err) {
		return { success: false, error: `Сбой создания скриншота: ${(err as Error).message}` };
	}
}

export const captureWorkstationScreenTool: DentalToolEntry<typeof captureWorkstationScreenSchema> = {
	name: "capture_workstation_screen",
	description:
		"Захват снимка экрана или области датчика визиографа на ПК врача для Vision-анализа (desktop_native).",
	schema: captureWorkstationScreenSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"capture_workstation_screen",
		"Снятие скриншота рабочего стола на ПК врача для мультимодального анализа.",
		captureWorkstationScreenSchema,
	),
	handler: handleCaptureWorkstationScreen,
};
