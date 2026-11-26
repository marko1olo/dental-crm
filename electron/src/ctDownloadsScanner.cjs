/**
 * DENTE Dental CRM — Known CT Viewers Catalog & Downloads / HotFolder CT Scanner
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("CtDownloadsScanner");

const KNOWN_CT_VIEWER_CANDIDATES = [
	{
		id: "picasso-ez3d2009",
		name: "Picasso / Ez3D2009 (Пикассо)",
		vendor: "vatech_picasso",
		iconKey: "picasso",
		paths: [
			"C:\\Ez3D2009\\Picasso\\PicassoViewer.exe",
			"C:\\Ez3D2009\\Ez3D2009.exe",
			"C:\\Program Files\\Picasso\\PicassoViewer.exe",
			"C:\\Program Files (x86)\\Picasso\\PicassoViewer.exe",
			"C:\\Program Files (x86)\\Picasso\\Picasso.exe",
			"C:\\Picasso\\PicassoViewer.exe",
		],
	},
	{
		id: "vatech-ez3d-i",
		name: "Vatech Ez3D-i (3D КТ)",
		vendor: "vatech",
		iconKey: "vatech",
		paths: [
			"C:\\Ez3D-i\\bin\\Ez3D-i.exe",
			"C:\\Ez3D-i\\Ez3D-i.exe",
			"C:\\Program Files\\Vatech\\Ez3D-i\\Ez3D-i.exe",
			"C:\\Program Files (x86)\\Vatech\\Ez3D-i\\Ez3D-i.exe",
		],
	},
	{
		id: "planmeca-romexis-3d",
		name: "Planmeca Romexis 3D",
		vendor: "planmeca",
		iconKey: "planmeca",
		paths: [
			"C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe",
			"C:\\Planmeca\\Romexis\\Romexis.exe",
			"C:\\Program Files (x86)\\Planmeca\\Romexis\\Romexis.exe",
		],
	},
	{
		id: "ondemand3d",
		name: "CyberMed OnDemand3D App",
		vendor: "cybermed",
		iconKey: "ondemand3d",
		paths: [
			"C:\\Program Files\\CyberMed\\OnDemand3D\\OnDemand3DApp.exe",
			"C:\\Program Files\\OnDemand3D\\OnDemand3D.exe",
			"C:\\OnDemand3DApp\\OnDemand3DApp.exe",
			"C:\\Program Files (x86)\\CyberMed\\OnDemand3D\\OnDemand3DApp.exe",
			"C:\\OnDemand3D\\OnDemand3DApp.exe",
		],
	},
	{
		id: "sirona-galileos-sidexis",
		name: "Dentsply Sirona Sidexis 4 / Galileos",
		vendor: "sirona",
		iconKey: "sirona",
		paths: [
			"C:\\Program Files\\Sirona\\Sidexis4\\Sidexis.exe",
			"C:\\Program Files (x86)\\Sirona Dental Systems\\Sidexis\\Sidexis.exe",
			"C:\\Sidexis\\Sidexis.exe",
			"C:\\Sidexis\\Galileos\\Galileos.exe",
		],
	},
	{
		id: "newtom-nnt",
		name: "NewTom NNT (КЛКТ)",
		vendor: "newtom",
		iconKey: "newtom",
		paths: ["C:\\Program Files\\NNT\\NNT.exe", "C:\\NNT\\NNT.exe", "C:\\Program Files (x86)\\NNT\\NNT.exe"],
	},
	{
		id: "carestream-cs3d",
		name: "Carestream CS 3D Imaging",
		vendor: "carestream",
		iconKey: "carestream",
		paths: [
			"C:\\Program Files (x86)\\Carestream\\CS 3D Imaging\\CS 3D Imaging.exe",
			"C:\\Carestream\\CSImaging\\3D\\CS 3D Imaging.exe",
			"C:\\Program Files\\Carestream\\CS 3D Imaging\\CS 3D Imaging.exe",
		],
	},
	{
		id: "morita-idixel",
		name: "J. Morita i-Dixel 3D",
		vendor: "morita",
		iconKey: "morita",
		paths: [
			"C:\\Program Files\\Morita\\iDixel\\iDixel.exe",
			"C:\\i-Dixel\\iDixel.exe",
			"C:\\Program Files (x86)\\Morita\\iDixel\\iDixel.exe",
		],
	},
	{
		id: "icat-vision",
		name: "i-CATVision (Imaging Sciences)",
		vendor: "icat",
		iconKey: "icat",
		paths: [
			"C:\\Program Files\\i-CAT\\i-CATVision.exe",
			"C:\\Program Files (x86)\\i-CAT\\i-CATVision.exe",
			"C:\\i-CAT\\i-CATVision.exe",
			"C:\\i-CATVision\\i-CATVision.exe",
		],
	},
];

function extractPatientHint(name) {
	if (!name || typeof name !== "string") return undefined;
	let cleaned = name.replace(/\.(zip|7z|rar|dcm|dicom|ima)$/i, "");
	cleaned = cleaned.replace(/^(?:(?:ct|cbct|dicom|picasso|кт|пикассо|study)[_\-\s]+)+/i, "");
	cleaned = cleaned.replace(/[_\-\s]+(ct|cbct|dicom|picasso|кт|пикассо|study|3d|volume|\d{4}-\d{2}-\d{2}|\d{8})$/i, "");

	const rusFioMatch = cleaned.match(/([А-ЯЁ][а-яё]+(?:(?:[_\s]+[А-ЯЁ][а-яё]+){1,2}|(?:[_\s]+[А-ЯЁ]\.?){1,2})?)/);
	if (rusFioMatch) return rusFioMatch[1].replace(/_/g, " ").trim();

	const latFioMatch = cleaned.match(/([A-Z][a-z]+(?:(?:[_\s]+[A-Z][a-z]+){1,2}|(?:[_\s]+[A-Z]\.?){1,2})?)/);
	if (latFioMatch) return latFioMatch[1].replace(/_/g, " ").trim();

	return undefined;
}

function detectCtModality(name, isDirectory) {
	const lower = (name || "").toLowerCase();
	if (lower.includes("cbct") || lower.includes("клкт")) return "CBCT";
	if (lower.includes("ct") || lower.includes("кт") || lower.includes("picasso") || lower.includes("пикассо") || lower.includes("tomography")) return "CT";
	if (isDirectory) return "DICOM_FOLDER";
	if (lower.endsWith(".zip") || lower.endsWith(".7z") || lower.endsWith(".rar")) return "DICOM_ARCHIVE";
	return "CT";
}

async function scanDownloadsForCt({ hotFolderPath, maxDays = 7, maxDepth = 2 } = {}) {
	const cutoffTime = Date.now() - maxDays * 24 * 60 * 60 * 1000;
	const candidateRoots = [];
	if (hotFolderPath && fs.existsSync(hotFolderPath)) candidateRoots.push(hotFolderPath);
	const userDownloads = path.join(os.homedir(), "Downloads");
	if (fs.existsSync(userDownloads) && userDownloads !== hotFolderPath) candidateRoots.push(userDownloads);

	const results = [];
	const visitedDirs = new Set();
	const startTime = Date.now();
	const scanTimeoutMs = 2500;

	async function walkDir(currentDir, depth) {
		if (depth > maxDepth || Date.now() - startTime > scanTimeoutMs || visitedDirs.has(currentDir)) return;
		visitedDirs.add(currentDir);

		let entries = [];
		try {
			entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
		} catch (err) {
			logger.debug("Skipping unreadable directory during CT scan", {
				currentDir,
				error: err instanceof Error ? err.message : String(err),
			});
			return;
		}

		for (const entry of entries) {
			if (Date.now() - startTime > scanTimeoutMs) break;
			const fullPath = path.join(currentDir, entry.name);
			try {
				const stats = await fs.promises.stat(fullPath);
				const createdAtTime = Math.max(stats.birthtimeMs || 0, stats.mtimeMs || 0);

				if (entry.isDirectory()) {
					const isCtDirPattern = /кт|ct|cbct|picasso|пикассо|study|dicom|barabash|барабаш|tomography|3d/i.test(entry.name);
					if (createdAtTime >= cutoffTime && isCtDirPattern) {
						let subEntries = [];
						try {
							subEntries = await fs.promises.readdir(fullPath);
						} catch (subErr) {
							logger.debug("Failed to list CT candidate subfolder", { fullPath, error: subErr instanceof Error ? subErr.message : String(subErr) });
						}
						const hasDcm = subEntries.some((f) => /\.(dcm|dicom|ima)$/i.test(f));
						if (hasDcm || subEntries.length > 5) {
							results.push({
								path: fullPath,
								fileName: entry.name,
								sizeBytes: stats.size,
								createdAt: new Date(createdAtTime).toISOString(),
								detectedModality: detectCtModality(entry.name, true),
								patientHint: extractPatientHint(entry.name),
							});
						}
					}
					if (depth < maxDepth) await walkDir(fullPath, depth + 1);
				} else if (entry.isFile() && createdAtTime >= cutoffTime) {
					const isArchive = /\.(zip|7z|rar)$/i.test(entry.name);
					const isDcm = /\.(dcm|dicom|ima)$/i.test(entry.name);
					const isCtName = /кт|ct|cbct|picasso|пикассо|study|dicom|barabash|барабаш|tomography|volume|3d/i.test(entry.name);
					if ((isArchive && (isCtName || stats.size > 5 * 1024 * 1024)) || (isDcm && isCtName)) {
						results.push({
							path: fullPath,
							fileName: entry.name,
							sizeBytes: stats.size,
							createdAt: new Date(createdAtTime).toISOString(),
							detectedModality: detectCtModality(entry.name, false),
							patientHint: extractPatientHint(entry.name),
						});
					}
				}
			} catch (statErr) {
				logger.debug("Skipping inaccessible CT entry", {
					fullPath,
					error: statErr instanceof Error ? statErr.message : String(statErr),
				});
			}
		}
	}

	for (const root of candidateRoots) {
		await walkDir(root, 1);
	}
	results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	return results;
}

module.exports = {
	KNOWN_CT_VIEWER_CANDIDATES,
	extractPatientHint,
	detectCtModality,
	scanDownloadsForCt,
};
