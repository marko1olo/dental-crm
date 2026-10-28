import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import type { FastifyRequest, FastifyReply } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { KNOWN_VIEWER_CANDIDATES } from "./pacsKnownCandidates.js";

export { KNOWN_VIEWER_CANDIDATES };

export async function handleLaunchExternalViewer(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "launch external viewer"))) return;

	const body = (request.body || {}) as { viewerId?: string; exePath?: string; studyPath?: string };
	const { viewerId, exePath, studyPath } = body;

	if (viewerId === "dente-cbct-studio" || exePath === "internal://cbct-studio") {
		return reply.send({ success: true, isInternalStudio: true, fallbackUrl: `/cbct-studio?studyId=${encodeURIComponent(studyPath || "")}` });
	}

	if (process.platform !== "win32") {
		return reply.send({ success: false, error: "Запуск нативного ПО томографа поддерживается на рабочей станции под управлением Windows.", canFallbackToInternalStudio: true });
	}

	let targetExe = exePath;
	if (!targetExe && viewerId) {
		const candidate = KNOWN_VIEWER_CANDIDATES.find((c) => c.id === viewerId || c.id.includes(viewerId) || viewerId.includes(c.id));
		if (candidate) {
			for (const p of candidate.paths) {
				if (fs.existsSync(p)) { targetExe = p; break; }
			}
		}
	}

	if (!targetExe || !fs.existsSync(targetExe)) {
		return reply.send({ success: false, error: "Просмотрщик томографа не найден на локальном диске этой рабочей станции.", canFallbackToInternalStudio: true });
	}

	if (!targetExe.toLowerCase().endsWith(".exe")) {
		return reply.code(400).send({ success: false, error: "Недопустимый исполняемый файл.", canFallbackToInternalStudio: true });
	}

	let dicomDirTarget: string | null = null;
	if (studyPath && fs.existsSync(studyPath)) {
		try {
			if (fs.statSync(studyPath).isDirectory()) {
				const files = fs.readdirSync(studyPath);
				const dName = files.find((f) => /^dicomdir(\.dir)?$/i.test(f));
				if (dName) dicomDirTarget = path.join(studyPath, dName);
			}
		} catch (err) {
			request.log.warn({ err, studyPath }, "Failed to inspect study directory for DICOMDIR target");
		}
	}

	const pathToUse = dicomDirTarget || studyPath;
	let args: string[] = [];
	if (pathToUse) {
		const lowerId = (viewerId || "").toLowerCase();
		const baseExe = path.basename(targetExe).toLowerCase();
		if (lowerId === "explorer" || baseExe === "explorer.exe") {
			args = [pathToUse];
		} else if (lowerId.includes("romexis") || baseExe.includes("romexis") || lowerId.includes("newtom") || baseExe.includes("nnt")) {
			args = ["-study", pathToUse];
		} else if (lowerId.includes("ez3d-i") || lowerId.includes("vatech") || baseExe.includes("ez3d-i") || lowerId.includes("sidexis") || baseExe.includes("sidexis") || lowerId.includes("carestream") || baseExe.includes("cs 3d imaging")) {
			args = ["/open", pathToUse];
		} else if (lowerId.includes("ondemand3d") || baseExe.includes("ondemand3d")) {
			args = dicomDirTarget ? ["-dicomdir", dicomDirTarget] : ["-f", studyPath!];
		} else {
			args = [pathToUse];
		}
	}

	try {
		const child = spawn(targetExe, args, { cwd: path.dirname(targetExe), detached: true, stdio: "ignore", windowsHide: false });
		child.unref();
		return reply.send({ success: true, pid: child.pid, viewerName: path.basename(targetExe) });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return reply.send({ success: false, error: `Ошибка запуска процесса: ${message}`, canFallbackToInternalStudio: true });
	}
}
