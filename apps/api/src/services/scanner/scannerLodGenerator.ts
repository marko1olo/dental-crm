/**
 * apps/api/src/services/scanner/scannerLodGenerator.ts
 *
 * Mesh LOD Generator (MeshSimplify.exe Bridge with Graceful Fallback).
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MESH_SIMPLIFY_CANDIDATES = [
	process.env.MESH_SIMPLIFY_BIN,
	path.join(process.cwd(), "tools", "MeshSimplify.exe"),
	"C:\\Program Files\\3dscanner\\MeshSimplify.exe",
	"MeshSimplify.exe",
].filter((p): p is string => Boolean(p));

async function findMeshSimplifyBin(): Promise<string | null> {
	for (const candidate of MESH_SIMPLIFY_CANDIDATES) {
		try {
			await fs.access(candidate);
			return candidate;
		} catch {
			// Not accessible
		}
	}
	return null;
}

/**
 * Attempts to generate a reduced-polygon LOD1 preview mesh (e.g. 50,000 faces / ~3MB).
 * Returns true if LOD1 file was created successfully, false if tool unavailable or failed.
 */
export async function generateLod1Mesh(
	inputPath: string,
	outputPath: string,
	targetFaces = 50000,
): Promise<boolean> {
	try {
		const bin = await findMeshSimplifyBin();
		if (!bin) {
			return false;
		}

		await execFileAsync(bin, ["-i", inputPath, "-o", outputPath, "-f", String(targetFaces)], {
			timeout: 15000,
		});

		const stats = await fs.stat(outputPath);
		return stats.size > 0;
	} catch {
		return false;
	}
}
