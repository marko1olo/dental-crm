import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import type { FastifyRequest, FastifyReply } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { KNOWN_VIEWER_CANDIDATES } from "./pacsKnownCandidates.js";

export { KNOWN_VIEWER_CANDIDATES };

export type ProcessSpawner = typeof spawn;
let processSpawner: ProcessSpawner = spawn;

export function setProcessSpawnerForTesting(spawner: ProcessSpawner | null): void {
	processSpawner = spawner || spawn;
}

function cleanViewerCliArgs(rawArgs: string[]): string[] {
	const invalidFlags = new Set(["/open", "-study", "--study", "/study", "-open", "--open"]);
	return rawArgs.filter((arg) => {
		if (!arg || typeof arg !== "string") return false;
		const trimmed = arg.trim();
		return !invalidFlags.has(trimmed.toLowerCase());
	});
}

export async function handleLaunchExternalViewer(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "launch external viewer"))) return;

	const body = (request.body || {}) as { viewerId?: string; exePath?: string; studyPath?: string; args?: string[] };
	const { viewerId, exePath, studyPath } = body;

	if (viewerId === "dente-cbct-studio" || exePath === "internal://cbct-studio") {
		return reply.send({ success: true, isInternalStudio: true, fallbackUrl: `/cbct-studio?studyId=${encodeURIComponent(studyPath || "")}` });
	}

	if (process.platform !== "win32") {
		return reply.send({ success: false, error: "Запуск внешнего просмотрщика КТ поддерживается на рабочей станции под управлением Windows.", canFallbackToInternalStudio: true });
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

	if (!targetExe || typeof targetExe !== "string" || !fs.existsSync(targetExe)) {
		return reply.send({ success: false, error: "Внешний просмотрщик КТ не найден на локальном диске этой рабочей станции.", canFallbackToInternalStudio: true });
	}

	try {
		const stat = fs.statSync(targetExe);
		if (!stat.isFile()) {
			return reply.code(400).send({ success: false, error: "Указанный путь не является исполняемым файлом.", canFallbackToInternalStudio: true });
		}
	} catch {
		return reply.send({ success: false, error: "Не удалось получить доступ к исполняемому файлу просмотрщика.", canFallbackToInternalStudio: true });
	}

	if (!targetExe.toLowerCase().endsWith(".exe")) {
		return reply.code(400).send({ success: false, error: "Недопустимый исполняемый файл.", canFallbackToInternalStudio: true });
	}

	let dicomDirTarget: string | null = null;
	if (studyPath && typeof studyPath === "string" && fs.existsSync(studyPath)) {
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

	const pathToUse = dicomDirTarget || (studyPath && typeof studyPath === "string" ? studyPath : null);
	const initialArgs: string[] = pathToUse ? [pathToUse] : [];
	const combinedArgs = Array.isArray(body.args) ? [...initialArgs, ...body.args] : initialArgs;
	const args: string[] = cleanViewerCliArgs(combinedArgs);

	try {
		const child = processSpawner(targetExe, args, {
			cwd: path.dirname(targetExe),
			detached: true,
			stdio: "ignore",
			windowsHide: false,
		});

		// ‼️ КРИТИЧЕСКИЙ БАРЬЕР СТАБИЛЬНОСТИ NODE.JS: перехват 'error' ОБЯЗАТЕЛЬНО ДО child.unref()
		// Предотвращает неперехваченный ENOENT в event loop, убивающий весь Fastify-сервер!
		child.on("error", (err) => {
			request.log.warn({ err, targetExe, args }, "External viewer process spawn error trapped safely");
		});

		child.unref();
		return reply.send({ success: true, pid: child.pid, viewerName: path.basename(targetExe) });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		request.log.warn({ err, targetExe }, "Synchronous spawn error for external viewer");
		return reply.send({ success: false, error: `Ошибка запуска процесса: ${message}`, canFallbackToInternalStudio: true });
	}
}
