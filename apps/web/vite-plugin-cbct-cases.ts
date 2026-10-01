import type { Plugin } from "vite";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseDicomSliceHeader } from "./src/components/radiology/dicomSliceHeaderParser";
import { buildVolumeFromMultiFrameDicom } from "./src/components/radiology/realDicomVolumeLoader";

export interface TunerPatientMeta {
	readonly id: string;
	readonly name: string;
	readonly badge: string;
	readonly type: "demo" | "multiframe" | "series";
	readonly description: string;
	readonly available: boolean;
	readonly sliceCount?: number;
	readonly dims?: { width: number; height: number; depth: number };
}

const PATIENTS_CONFIG = [
	{
		id: "zakharov",
		name: "Захаров Иван Дмитриевич",
		badge: "312 срезов (демо)",
		type: "demo" as const,
		description: "312 срезов 600x600, концевой дефект 26/27, пневматизация пазухи",
		path: "public/radiology/demo_cbct",
	},
	{
		id: "bulyakov",
		name: "Буляков Н.З.",
		badge: "мультифрейм 560x560x311",
		type: "multiframe" as const,
		description: "Мультифрейм КЛКТ 560x560x311, интактный прикус, плотная кортикальная кость",
		path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
	},
	{
		id: "barabash",
		name: "Барабаш С.В.",
		badge: "800x800 (400 срезов)",
		type: "series" as const,
		description: "400 срезов 640x640, широкая брахицефалическая челюсть, моляры 17/18",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
	},
	{
		id: "sumarokova",
		name: "Сумарокова И.О.",
		badge: "сектор 24-26 (344 среза)",
		type: "series" as const,
		description: "344 среза 277x333, FOV 41.5x49.9 мм, сектор 24-26",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34",
	},
	{
		id: "amirova",
		name: "Амирова Н.Н.",
		badge: "ультра-HD (547 срезов)",
		type: "series" as const,
		description: "547 срезов 512x512, металлокерамика, артефакты в 1 сегменте",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT",
	},
];

interface CachedVolumeBinary {
	readonly meta: {
		id: string;
		name: string;
		dimX: number;
		dimY: number;
		dimZ: number;
		spX: number;
		spY: number;
		spZ: number;
		minHU: number;
		maxHU: number;
	};
	readonly buffer: Buffer;
}

const volumeCache = new Map<string, CachedVolumeBinary>();

function resolveDataPath(rawPath: string): string {
	if (path.isAbsolute(rawPath)) return rawPath;
	const candidate1 = path.resolve(process.cwd(), rawPath);
	if (existsSync(candidate1)) return candidate1;
	const candidate2 = path.resolve(process.cwd(), "apps/web", rawPath);
	if (existsSync(candidate2)) return candidate2;
	const candidate3 = path.resolve(__dirname, rawPath);
	if (existsSync(candidate3)) return candidate3;
	return candidate2;
}

function loadSeriesVolumeSync(seriesPath: string, patientName: string, id: string): CachedVolumeBinary {
	const resolvedPath = resolveDataPath(seriesPath);
	if (!existsSync(resolvedPath)) {
		throw new Error(`Directory not found: ${resolvedPath}`);
	}
	let files = readdirSync(resolvedPath).filter((f) => f.toLowerCase().endsWith(".dcm")).sort();
	if (files.length === 0) {
		throw new Error(`No .dcm files in: ${resolvedPath}`);
	}

	const sliceCount = files.length;
	const firstBuf = readFileSync(path.join(resolvedPath, files[0]!));
	const firstHdr = parseDicomSliceHeader(firstBuf.buffer.slice(firstBuf.byteOffset, firstBuf.byteOffset + firstBuf.byteLength));
	const lastBuf = readFileSync(path.join(resolvedPath, files[files.length - 1]!));
	const lastHdr = parseDicomSliceHeader(lastBuf.buffer.slice(lastBuf.byteOffset, lastBuf.byteOffset + lastBuf.byteLength));

	const z0 = firstHdr.imagePositionPatient?.[2] ?? 0;
	const zLast = lastHdr.imagePositionPatient?.[2] ?? 0;
	if (z0 > zLast) {
		files.reverse(); // Inferior -> Superior
	}

	const w = firstHdr.cols;
	const h = firstHdr.rows;
	const d = sliceCount;
	const spX = firstHdr.pixelSpacing?.x || 0.25;
	const spY = firstHdr.pixelSpacing?.y || 0.25;
	const spZ = Math.abs(zLast - z0) / Math.max(1, d - 1) || firstHdr.sliceThickness || 0.25;

	const totalVoxels = w * h * d;
	const data = new Int16Array(totalVoxels);
	const sliceVoxelCount = w * h;
	const slope = firstHdr.rescaleSlope || 1.0;
	const intercept = firstHdr.rescaleIntercept || 0.0;
	const isSigned = firstHdr.pixelRepresentation === 1;
	const bitsStored = firstHdr.bitsStored || 16;
	const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
	const intIntercept = intercept | 0;
	const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
	const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
	const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

	let globalMinHU = 32767;
	let globalMaxHU = -32768;

	for (let z = 0; z < d; z++) {
		const buf = readFileSync(path.join(resolvedPath, files[z]!));
		const hdr = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
		const offset = hdr.pixelDataByteOffset;
		const baseIdx = z * sliceVoxelCount;
		const sliceArrayBuf = buf.buffer.slice(buf.byteOffset + offset, buf.byteOffset + offset + sliceVoxelCount * 2);
		const rawSlice = isSigned ? new Int16Array(sliceArrayBuf) : new Uint16Array(sliceArrayBuf);

		if (isLinearInteger) {
			for (let i = 0; i < sliceVoxelCount; i++) {
				let val = bitsStored < 16 ? rawSlice[i]! & mask : rawSlice[i]!;
				if (isSigned && bitsStored < 16 && (val & signBit) !== 0) val -= signExt;
				const hu = (val + intIntercept) | 0;
				data[baseIdx + i] = hu;
				if (hu < globalMinHU) globalMinHU = hu;
				if (hu > globalMaxHU) globalMaxHU = hu;
			}
		} else {
			for (let i = 0; i < sliceVoxelCount; i++) {
				let val = bitsStored < 16 ? rawSlice[i]! & mask : rawSlice[i]!;
				if (isSigned && bitsStored < 16 && (val & signBit) !== 0) val -= signExt;
				const hu = Math.round(val * slope + intercept);
				data[baseIdx + i] = hu;
				if (hu < globalMinHU) globalMinHU = hu;
				if (hu > globalMaxHU) globalMaxHU = hu;
			}
		}
	}

	const nodeBuf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
	return {
		meta: {
			id,
			name: patientName,
			dimX: w,
			dimY: h,
			dimZ: d,
			spX,
			spY,
			spZ,
			minHU: globalMinHU,
			maxHU: globalMaxHU,
		},
		buffer: nodeBuf,
	};
}

async function loadMultiframeVolume(filePath: string, patientName: string, id: string): Promise<CachedVolumeBinary> {
	const buf = readFileSync(filePath);
	const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(ab);
	if (!vol.data) {
		throw new Error(`Multiframe DICOM has no voxel data: ${filePath}`);
	}
	const nodeBuf = Buffer.from(vol.data.buffer, vol.data.byteOffset, vol.data.byteLength);
	return {
		meta: {
			id,
			name: patientName,
			dimX: vol.dimensions.width,
			dimY: vol.dimensions.height,
			dimZ: vol.dimensions.depth,
			spX: vol.spacingMm.x,
			spY: vol.spacingMm.y,
			spZ: vol.spacingMm.z,
			minHU: vol.minHU,
			maxHU: vol.maxHU,
		},
		buffer: nodeBuf,
	};
}

export function cbctCasesPlugin(): Plugin {
	return {
		name: "vite-plugin-cbct-cases",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const urlStr = req.url || "";
				if (!urlStr.startsWith("/api/cbct-tuner/")) {
					return next();
				}

				const parsedUrl = new URL(urlStr, "http://localhost");
				const pathname = parsedUrl.pathname;

				// 1. Patient List Endpoint
				if (pathname === "/api/cbct-tuner/patients") {
					const patientsList: TunerPatientMeta[] = PATIENTS_CONFIG.map((p) => {
						const resolved = resolveDataPath(p.path);
						const isAvail = existsSync(resolved);
						return {
							id: p.id,
							name: p.name,
							badge: p.badge,
							type: p.type,
							description: p.description,
							available: isAvail,
						};
					});
					res.setHeader("Content-Type", "application/json; charset=utf-8");
					res.end(JSON.stringify({ ok: true, patients: patientsList }));
					return;
				}

				// 2. Binary Volume Stream Endpoint (zero-copy Int16Array)
				if (pathname === "/api/cbct-tuner/volume-binary") {
					const patientId = parsedUrl.searchParams.get("id") || "zakharov";
					const cfg = PATIENTS_CONFIG.find((p) => p.id === patientId) || PATIENTS_CONFIG[0]!;

					try {
						let cached = volumeCache.get(cfg.id);
						if (!cached) {
							if (cfg.type === "multiframe") {
								cached = await loadMultiframeVolume(cfg.path, cfg.name, cfg.id);
							} else {
								cached = loadSeriesVolumeSync(cfg.path, cfg.name, cfg.id);
							}
							volumeCache.set(cfg.id, cached);
						}

						res.setHeader("Content-Type", "application/octet-stream");
						res.setHeader("x-cbct-id", cached.meta.id);
						res.setHeader("x-cbct-name", encodeURIComponent(cached.meta.name));
						res.setHeader("x-cbct-dim-x", String(cached.meta.dimX));
						res.setHeader("x-cbct-dim-y", String(cached.meta.dimY));
						res.setHeader("x-cbct-dim-z", String(cached.meta.dimZ));
						res.setHeader("x-cbct-sp-x", String(cached.meta.spX));
						res.setHeader("x-cbct-sp-y", String(cached.meta.spY));
						res.setHeader("x-cbct-sp-z", String(cached.meta.spZ));
						res.setHeader("x-cbct-min-hu", String(cached.meta.minHU));
						res.setHeader("x-cbct-max-hu", String(cached.meta.maxHU));
						res.setHeader("Content-Length", String(cached.buffer.length));
						res.end(cached.buffer);
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						res.statusCode = 500;
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ ok: false, error: msg }));
					}
					return;
				}

				// 3. Single Raw DICOM File Stream
				if (pathname === "/api/cbct-tuner/file") {
					const patientId = parsedUrl.searchParams.get("id") || "";
					const cfg = PATIENTS_CONFIG.find((p) => p.id === patientId);
					if (!cfg || !existsSync(cfg.path)) {
						res.statusCode = 404;
						res.end("Patient file not found");
						return;
					}
					const st = statSync(cfg.path);
					if (st.isDirectory()) {
						res.statusCode = 400;
						res.end("Requested path is directory");
						return;
					}
					res.setHeader("Content-Type", "application/dicom");
					res.setHeader("Content-Length", String(st.size));
					const buf = readFileSync(cfg.path);
					res.end(buf);
					return;
				}

				next();
			});
		},
	};
}
