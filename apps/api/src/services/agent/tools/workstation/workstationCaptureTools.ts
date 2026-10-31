/**
 * workstationCaptureTools.ts — High-fidelity Screen Capture Tool for Visiograph & Workstation Diagnostics.
 *
 * Sweet Spot: ~100 lines.
 */

import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";
import { CLOUD_GUARD_DENIAL, isCloudEnvironment } from "./workstationAppTools.js";

const execAsync = promisify(exec);

export const captureWorkstationScreenSchema = z.object({
	diagnosticReason: z
		.string()
		.min(3)
		.describe(
			"Клиническая причина снимка экрана (например, 'Фиксация ошибки визиографа', 'Снимок КЛКТ')",
		),
	targetScreenIndex: z
		.number()
		.min(0)
		.max(4)
		.default(0)
		.optional()
		.describe("Индекс монитора (0 - основной)"),
});

export type CaptureWorkstationScreenInput = z.infer<
	typeof captureWorkstationScreenSchema
>;

export const captureWorkstationScreenTool: ToolDefinition<
	typeof captureWorkstationScreenSchema,
	Record<string, unknown>
> = {
	name: "capture_workstation_screen",
	description:
		"Захват снимка экрана рабочего места врача на Windows для визуального анализа снимков визиографа или ошибок софта (desktop_native).",
	parameters: captureWorkstationScreenSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (
		_ctx: AgentContext,
		args: CaptureWorkstationScreenInput,
	): Promise<Record<string, unknown>> => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		const capturesDir = path.join(process.cwd(), "scratch", "captures");
		try {
			if (!fs.existsSync(capturesDir)) {
				await fs.promises.mkdir(capturesDir, { recursive: true });
			}

			const filename = `screen_${Date.now()}_diag.png`;
			const savePath = path.join(capturesDir, filename);

			const psScript = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('${savePath.replace(/\\/g, "\\\\")}')
$graphics.Dispose()
$bmp.Dispose()
`;
			await execAsync(
				`powershell -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
				{
					timeout: 7000,
				},
			);

			const exists = fs.existsSync(savePath);

			return {
				success: exists,
				reason: args.diagnosticReason,
				savedPath: savePath,
				timestamp: new Date().toISOString(),
				message: exists
					? `Снимок экрана сохранен в '${savePath}' и готов к визуальному анализу.`
					: "Не удалось сохранить файл скриншота.",
			};
		} catch (err) {
			return {
				success: false,
				error: `Сбой создания скриншота экрана: ${(err as Error).message}`,
			};
		}
	},
};
