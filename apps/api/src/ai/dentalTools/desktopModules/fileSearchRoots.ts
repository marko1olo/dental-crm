/**
 * @file fileSearchRoots.ts
 * @description Подготовка стандартных корней поиска файлов рабочей станции и регулярных выражений.
 */

import fs from "node:fs";
import path from "node:path";
import { getTenantDropzonePath, isPathSafe } from "./desktopSecurity.js";
import { isDirectorySearchable } from "./fileSearchHelper.js";

export function resolveSearchRoots(orgId: string, customRoots?: string[]): string[] {
	const roots: string[] = [];
	if (customRoots && customRoots.length > 0) {
		for (const root of customRoots) {
			const resolved = path.resolve(root);
			if (isPathSafe(resolved) && isDirectorySearchable(resolved) && fs.existsSync(resolved)) {
				roots.push(resolved);
			}
		}
		return roots.length > 0 ? roots : [process.cwd()];
	}

	const tenantDropzone = getTenantDropzonePath(orgId);
	if (fs.existsSync(tenantDropzone)) roots.push(tenantDropzone);
	const scratchDir = path.join(process.cwd(), "scratch");
	if (fs.existsSync(scratchDir)) roots.push(scratchDir);

	const userHome = process.env.USERPROFILE || process.env.HOME;
	if (userHome) {
		for (const folder of [path.join(userHome, "Downloads"), path.join(userHome, "Documents"), path.join(userHome, "Desktop")]) {
			if (fs.existsSync(folder) && isPathSafe(folder)) roots.push(folder);
		}
	}

	const medicalExportDirs = [
		"C:\\Planmeca\\Romexis\\Export",
		"C:\\VATECH\\EzDent-i\\Capture",
		"C:\\EasyDent4\\Capture",
		"C:\\SIDEXIS4\\PDATA",
		"C:\\DentalClinic\\XRayDropzone",
		"D:\\DentalClinic\\XRayDropzone",
	];
	for (const medDir of medicalExportDirs) {
		if (fs.existsSync(medDir) && isPathSafe(medDir)) roots.push(medDir);
	}
	return roots.length > 0 ? roots : [process.cwd()];
}

export function buildQueryRegex(query?: string): RegExp | undefined {
	if (!query || !query.trim()) return undefined;
	const q = query.trim();
	if (q.includes("*") || q.includes("?")) {
		const escaped = q.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
		return new RegExp(`^${escaped}$`, "i");
	}
	return new RegExp(q.replace(/[.+^${}()|[\]\\]/g, "\\$&"), "i");
}
