import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.dirname(
	path.dirname(path.dirname(fileURLToPath(import.meta.url))),
);

export const defaultViteSearchRoots = [
	repoRoot,
	path.join(repoRoot, "apps", "web"),
];

function readManifest(manifestPath) {
	try {
		return JSON.parse(readFileSync(manifestPath, "utf8"));
	} catch (error) {
		return { error };
	}
}

function binRelativePath(manifest) {
	const bin = manifest?.bin;
	if (typeof bin === "string") return bin;
	if (bin && typeof bin === "object" && typeof bin.vite === "string") {
		return bin.vite;
	}
	return null;
}

function locateManifest(root, attempted) {
	const requireFrom = createRequire(
		pathToFileURL(path.join(root, "package.json")).href,
	);
	try {
		return requireFrom.resolve("vite/package.json");
	} catch (error) {
		attempted.push(
			`require.resolve("vite/package.json") from ${root} -> ${error.code ?? error.message}`,
		);
	}
	const direct = path.join(root, "node_modules", "vite", "package.json");
	if (existsSync(direct)) return direct;
	attempted.push(`${direct} -> not on disk`);
	return null;
}

export function resolveViteBin(searchRoots = defaultViteSearchRoots) {
	const attempted = [];
	for (const root of searchRoots) {
		const manifestPath = locateManifest(root, attempted);
		if (!manifestPath) continue;
		const manifest = readManifest(manifestPath);
		if (manifest.error) {
			attempted.push(`${manifestPath} -> unreadable (${manifest.error.message})`);
			continue;
		}
		const relative = binRelativePath(manifest);
		if (!relative) {
			attempted.push(`${manifestPath} -> no "bin.vite" entry declared`);
			continue;
		}
		const binPath = path.join(path.dirname(manifestPath), relative);
		if (existsSync(binPath)) return binPath;
		attempted.push(`${binPath} -> declared by ${manifestPath} but not on disk`);
	}
	throw new Error(
		`Vite could not be resolved from any workspace root. Attempted:\n  ${attempted.join("\n  ")}`,
	);
}
