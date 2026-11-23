import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import {
	validateAndResolvePacsLocalFilePath,
	PathTraversalError,
	TenantIsolationError,
} from "../../../services/imaging/localPacsSanitizer.js";
import { KNOWN_VIEWER_CANDIDATES } from "./pacsKnownCandidates.js";

export { KNOWN_VIEWER_CANDIDATES };

export const launchExternalViewerSchema = z.object({
	viewerId: z.string().trim().min(1).max(128).optional(),
	exePath: z.string().trim().min(1).max(512).optional(),
	studyPath: z.string().trim().min(1).max(1024).optional(),
	patientId: z.string().trim().min(1).max(128).optional(),
	studyInstanceUid: z.string().trim().min(1).max(128).optional(),
	args: z.array(z.string()).max(10).optional(),
});

export type ProcessSpawner = typeof spawn;
let processSpawner: ProcessSpawner = spawn;

export function setProcessSpawnerForTesting(spawner: ProcessSpawner | null): void {
	processSpawner = spawner || spawn;
}

const BLOCKED_SYSTEM_EXECUTABLES = new Set([
	"cmd.exe",
	"powershell.exe",
	"pwsh.exe",
	"wscript.exe",
	"cscript.exe",
	"rundll32.exe",
	"mshta.exe",
	"bash.exe",
	"sh.exe",
	"wt.exe",
	"conhost.exe",
	"reg.exe",
	"regedit.exe",
	"certutil.exe",
	"bitsadmin.exe",
	"vssadmin.exe",
	"schtasks.exe",
	"taskkill.exe",
	"curl.exe",
	"tar.exe",
	"calc.exe",
]);

const WHITELISTED_PATHS = new Set(
	KNOWN_VIEWER_CANDIDATES.flatMap((c) =>
		c.paths.map((p) => path.normalize(p).toLowerCase()),
	),
);

function isWhitelistedViewer(exePathToCheck: string, viewerIdToCheck?: string): boolean {
	const normalized = path.normalize(exePathToCheck).toLowerCase();
	const bName = path.basename(normalized);

	if (BLOCKED_SYSTEM_EXECUTABLES.has(bName)) {
		return false;
	}

	if (!WHITELISTED_PATHS.has(normalized)) {
		return false;
	}

	if (viewerIdToCheck) {
		const candidate = KNOWN_VIEWER_CANDIDATES.find(
			(c) => c.id === viewerIdToCheck || c.id.includes(viewerIdToCheck) || viewerIdToCheck.includes(c.id),
		);
		if (candidate) {
			const candidatePaths = new Set(candidate.paths.map((p) => path.normalize(p).toLowerCase()));
			return candidatePaths.has(normalized);
		}
	}

	return true;
}

export async function handleLaunchExternalViewer(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "launch external viewer"))) return;

	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const parsed = launchExternalViewerSchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			success: false,
			error: "Недопустимые параметры запроса на запуск просмотрщика: " + parsed.error.issues.map((i) => i.message).join(", "),
			canFallbackToInternalStudio: true,
		});
	}

	const { viewerId, exePath, studyPath } = parsed.data;

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

	const baseName = path.basename(targetExe).toLowerCase();
	if (BLOCKED_SYSTEM_EXECUTABLES.has(baseName)) {
		return reply.code(400).send({
			success: false,
			error: "Запуск системных командных процессоров и утилит ОС запрещён в целях безопасности.",
			canFallbackToInternalStudio: true,
		});
	}

	if (!isWhitelistedViewer(targetExe, viewerId)) {
		return reply.code(403).send({
			success: false,
			error: "Исполняемый файл не входит в список разрешенных медицинских просмотрщиков.",
			canFallbackToInternalStudio: true,
		});
	}

	let sanitizedStudyPath: string | null = null;
	if (studyPath && typeof studyPath === "string" && studyPath.trim()) {
		try {
			sanitizedStudyPath = validateAndResolvePacsLocalFilePath(orgId, studyPath.trim());
		} catch (err) {
			if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
				request.log.warn({ orgId, studyPath, err }, "External viewer study path traversal attempt blocked");
				return reply.code(403).send({
					success: false,
					error: "Путь к исследованию находится за пределами изолированного хранилища организации.",
					canFallbackToInternalStudio: true,
				});
			}
			return reply.code(400).send({
				success: false,
				error: "Недопустимый путь к исследованию.",
				canFallbackToInternalStudio: true,
			});
		}
	}

	let dicomDirTarget: string | null = null;
	if (sanitizedStudyPath && fs.existsSync(sanitizedStudyPath)) {
		try {
			if (fs.statSync(sanitizedStudyPath).isDirectory()) {
				const files = fs.readdirSync(sanitizedStudyPath);
				const dName = files.find((f) => /^dicomdir(\.dir)?$/i.test(f));
				if (dName) dicomDirTarget = path.join(sanitizedStudyPath, dName);
			}
		} catch (err) {
			request.log.warn({ err, sanitizedStudyPath }, "Failed to inspect study directory for DICOMDIR target");
		}
	}

	const pathToUse = dicomDirTarget || sanitizedStudyPath;
	// Аргументы формируются строго на сервере: передается только путь к исследованию, отбрасывая любые клиентские флаги
	const args: string[] = pathToUse ? [pathToUse] : [];

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
