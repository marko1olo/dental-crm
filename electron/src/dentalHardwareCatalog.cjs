/**
 * DENTE Dental CRM — Hardware Vendor Catalog, Photo Protocol & Hot-Folder Metadata Parsers
 */

const fs = require("node:fs");
const { DENTAL_HARDWARE_PRESETS } = require("./dentalHardwarePresets.cjs");

const DENTAL_PHOTO_PROTOCOL_12 = [
	{
		index: 1,
		id: "extraoral_portrait_rest",
		titleRu: "Портрет в покое (анфас)",
		descriptionRu: "Лицо пациента в покое, губы сомкнуты, взгляд прямо перед собой",
		category: "extraoral",
		matchPatterns: ["portrait_rest", "face_rest", "анфас_покой", "портрет_покой", "slot1", "slot_1", "01_"],
	},
	{
		index: 2,
		id: "extraoral_portrait_smile",
		titleRu: "Портрет с улыбкой (анфас)",
		descriptionRu: "Естественная широкая улыбка, обнажение резцов и десневого края",
		category: "extraoral",
		matchPatterns: ["portrait_smile", "face_smile", "smile", "анфас_улыбка", "портрет_улыбка", "slot2", "slot_2", "02_"],
	},
	{
		index: 3,
		id: "extraoral_profile_right",
		titleRu: "Профиль справа (90°)",
		descriptionRu: "Боковой профиль под прямым углом, франкфуртская горизонталь",
		category: "extraoral",
		matchPatterns: ["profile_right", "profile_90", "profile", "профиль_справа", "профиль", "slot3", "slot_3", "03_"],
	},
	{
		index: 4,
		id: "extraoral_profile_45",
		titleRu: "Полупрофиль 45°",
		descriptionRu: "Ракурс три четверти с естественной улыбкой",
		category: "extraoral",
		matchPatterns: ["profile_45", "semi_profile", "three_quarter", "полупрофиль", "45deg", "slot4", "slot_4", "04_"],
	},
	{
		index: 5,
		id: "intraoral_anterior_occlusion",
		titleRu: "Фронт в окклюзии",
		descriptionRu: "Внутриротовой снимок передних зубов в привычном прикусе с ретракторами",
		category: "intraoral",
		matchPatterns: ["anterior_occlusion", "front_occlusion", "front_bite", "фронт_окклюзия", "фронт_прикус", "slot5", "slot_5", "05_"],
	},
	{
		index: 6,
		id: "intraoral_anterior_open",
		titleRu: "Фронт с разомкнутыми зубами",
		descriptionRu: "Разомкнутые резцовые края для оценки истираемости и анатомии",
		category: "intraoral",
		matchPatterns: ["anterior_open", "front_open", "open_bite", "фронт_разомкнут", "разомкнутый_фронт", "slot6", "slot_6", "06_"],
	},
	{
		index: 7,
		id: "intraoral_buccal_right",
		titleRu: "Боковой вид справа (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров справа по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: ["buccal_right", "lateral_right", "right_bite", "боковой_справа", "бок_справа", "slot7", "slot_7", "07_"],
	},
	{
		index: 8,
		id: "intraoral_buccal_left",
		titleRu: "Боковой вид слева (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров слева по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: ["buccal_left", "lateral_left", "left_bite", "боковой_слева", "бок_слева", "slot8", "slot_8", "08_"],
	},
	{
		index: 9,
		id: "intraoral_occlusal_maxillary",
		titleRu: "Окклюзия верхней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда верхней челюсти от 17 до 27",
		category: "intraoral",
		matchPatterns: ["occlusal_maxillary", "occlusal_upper", "upper_arch", "окклюзия_верх", "вч_зеркало", "slot9", "slot_9", "09_"],
	},
	{
		index: 10,
		id: "intraoral_occlusal_mandibular",
		titleRu: "Окклюзия нижней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда нижней челюсти от 37 до 47",
		category: "intraoral",
		matchPatterns: ["occlusal_mandibular", "occlusal_lower", "lower_arch", "окклюзия_низ", "нч_зеркало", "slot10", "slot_10", "10_"],
	},
	{
		index: 11,
		id: "intraoral_anterior_overjet",
		titleRu: "Резцовое перекрытие (Overjet / Overbite)",
		descriptionRu: "Крупный план сагиттальной щели и вертикального резцового перекрытия",
		category: "intraoral",
		matchPatterns: ["anterior_overjet", "overbite", "overjet", "сагиттальная_щель", "оверджет", "перекрытие", "slot11", "slot_11", "11_"],
	},
	{
		index: 12,
		id: "intraoral_smile_aesthetic",
		titleRu: "Эстетика улыбки (макро без ретракторов)",
		descriptionRu: "Губной коридор, линия улыбки, резцовый край и десневые зениты",
		category: "intraoral",
		matchPatterns: ["smile_aesthetic", "macro_smile", "aesthetic_smile", "эстетика_улыбки", "макро_улыбка", "slot12", "slot_12", "12_"],
	},
];

const VENDOR_PATH_SIGNATURES = [
	{ vendor: "vatech", patterns: ["ezdent", "easydent", "ezsensor", "vatech", "ez3d", "green16", "pax-i", ".vth", ".ezd"] },
	{ vendor: "sirona", patterns: ["sidexis", "sirona", "pdata", "slida", "orthophos", "galileos", "xios"] },
	{ vendor: "planmeca", patterns: ["romexis", "planmeca", "prosensor", "promax", "dimaxis"] },
	{ vendor: "carestream", patterns: ["trophy", "carestream", "csimaging", "kodak", "rvg", "cs8100", "cs9600", "cs3600", "cs3700", "cs3800"] },
	{ vendor: "kavo", patterns: ["vixwin", "gendex", "cliniview", "digora", "instrumentarium", "soredex", "op300", "op3d", "kavo", "ondemand3d"] },
	{ vendor: "woodpecker", patterns: ["woodpecker", "isensor", "i-sensor"] },
	{ vendor: "eighteeth", patterns: ["eighteeth", "nanopix"] },
	{ vendor: "owandy", patterns: ["owandy", "quickvision"] },
	{ vendor: "xpect_vision", patterns: ["xvsensor", "xpect", "mammo", "zraw"] },
	{ vendor: "handy", patterns: ["handydentist", "hdr-500", "hdr-600", "handy"] },
	{ vendor: "trident", patterns: ["trident", "iview", "i-view", "deepview"] },
	{ vendor: "newtom", patterns: ["newtom", "myray", "nnt", "irys", "giano"] },
	{ vendor: "morita", patterns: ["morita", "idixel", "i-dixel", "veraview", "x800"] },
	{ vendor: "pointnix", patterns: ["pointnix", "point3d", "realscan"] },
	{ vendor: "genoray", patterns: ["genoray", "papaya", "triana", "smiledesigner"] },
	{ vendor: "medit", patterns: ["meditlink", "medit"] },
	{ vendor: "threeshape", patterns: ["3shape", "threeshape", "trios", "dentaldesktop"] },
	{ vendor: "shining3d", patterns: ["shining3d", "shining", "aoralscan"] },
	{ vendor: "panda", patterns: ["pandascan", "panda", "bamboo"] },
	{ vendor: "alliedstar", patterns: ["alliedstar", "as100", "as200"] },
	{ vendor: "runyes", patterns: ["runyes", "quickscan"] },
	{ vendor: "kyocera", patterns: ["kyocera", "taskalfa", "ecosys"] },
	{ vendor: "hp", patterns: ["scanjet", "hp_scan", "laserjet"] },
	{ vendor: "canon_scanner", patterns: ["canoscan", "imagerunner", "imageformula"] },
	{ vendor: "xerox", patterns: ["xerox", "workcentre", "versalink", "altalink"] },
	{ vendor: "brother", patterns: ["brother", "dcp-", "mfc-"] },
	{ vendor: "pantum", patterns: ["pantum", "ptm"] },
	{ vendor: "fujitsu_avision", patterns: ["fujitsu", "scansnap", "avision", "fi-7160", "fi-"] },
	{ vendor: "canon_photo", patterns: ["canon_eos", "eos_utility", "100canon"] },
	{ vendor: "nikon_photo", patterns: ["nikon", "100nikon", "camera_control"] },
	{ vendor: "sony_photo", patterns: ["sony", "imaging_edge", "100msdcf"] },
];

function detectHardwareVendorFromPath(targetPath) {
	if (!targetPath || typeof targetPath !== "string") {
		return "generic";
	}
	const normalized = targetPath.toLowerCase().replace(/\\/g, "/");
	for (const entry of VENDOR_PATH_SIGNATURES) {
		if (entry.patterns.some((pat) => normalized.includes(pat))) {
			return entry.vendor;
		}
	}
	return "generic";
}

function matchPhotoProtocolSlot(fileName) {
	if (!fileName || typeof fileName !== "string") return undefined;
	const normalized = fileName.toLowerCase().replace(/\\/g, "/");
	const baseName = normalized.split("/").pop() || normalized;

	const slotNumMatch = baseName.match(/(?:^|[_\W])(?:slot|слот)[_-]?(0?[1-9]|1[0-2])(?=[_\W]|$)/i);
	if (slotNumMatch) {
		const idx = Number.parseInt(slotNumMatch[1], 10);
		const found = DENTAL_PHOTO_PROTOCOL_12.find((s) => s.index === idx);
		if (found) return found;
	}

	const delimitedNumMatch = baseName.match(/(?:^|[_\W])(0[1-9]|1[0-2])[_\W]/);
	if (delimitedNumMatch) {
		const idx = Number.parseInt(delimitedNumMatch[1], 10);
		const found = DENTAL_PHOTO_PROTOCOL_12.find((s) => s.index === idx);
		if (found) return found;
	}

	for (const slot of DENTAL_PHOTO_PROTOCOL_12) {
		for (const pattern of slot.matchPatterns) {
			if (pattern.startsWith("slot") || pattern.startsWith("0") || pattern.startsWith("1")) {
				continue;
			}
			if (baseName.includes(pattern)) {
				return slot;
			}
		}
	}
	return undefined;
}

function parseHotFolderFilenameMetadata(fileName, targetPath) {
	const safeName = fileName || "";
	const combinedPath = targetPath ? `${targetPath}/${safeName}` : safeName;
	const vendor = detectHardwareVendorFromPath(combinedPath);

	const matchTooth = safeName.match(
		/(?:tooth[_-]?|зуб[_-]?|_|-)([1-4][1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])(?:\b|_|-|\.|$)/i,
	);
	const toothCode = matchTooth ? matchTooth[1] : undefined;

	const matchPatient = safeName.match(
		/(?:^|[_\W])(?:patient[_-]?|пациент[_-]?|pat[_-]?|pid[_-]?|p[_-]|id[_-]|chart[_-]?)([A-Za-z0-9]+)(?=[_\W]|$)/i,
	);
	const patientId = matchPatient ? matchPatient[1] : undefined;

	const ext = safeName.includes(".") ? `.${safeName.split(".").pop().toLowerCase()}` : "";
	const isDicom = [".dcm", ".dicom", ".ima"].includes(ext);
	const isMesh = [".stl", ".ply", ".obj"].includes(ext);
	const isDoc = [".pdf", ".tif", ".tiff"].includes(ext);
	const isImage = [".jpg", ".jpeg", ".png", ".bmp", ".webp"].includes(ext);

	const photoProtocolSlot = matchPhotoProtocolSlot(safeName);

	let fileCategory = "standard_image";
	let modality = "IO";

	const lowerName = safeName.toLowerCase();
	const isCbct = lowerName.includes("cbct") || lowerName.includes("ct") || lowerName.includes("3d") || lowerName.includes("tomography");
	const isPan = lowerName.includes("pan") || lowerName.includes("opg") || lowerName.includes("pax") || lowerName.includes("orthophos");

	if (isDicom) {
		fileCategory = "dicom";
		modality = isCbct ? "CT" : isPan ? "PX" : "IO";
	} else if (isMesh) {
		fileCategory = "mesh";
		modality = "3D_SCAN";
	} else if (isDoc) {
		fileCategory = "document";
		modality = "DOC";
	} else if (
		photoProtocolSlot ||
		lowerName.includes("dcim") ||
		lowerName.includes("photo") ||
		lowerName.includes("портрет") ||
		lowerName.includes("улыбка")
	) {
		fileCategory = "photo";
		modality = "PHOTO";
	} else if (isImage) {
		fileCategory = "standard_image";
		modality = toothCode ? "IO" : isCbct ? "CT" : isPan ? "PX" : "DX";
	}

	return {
		fileName: safeName,
		fullPath: targetPath || undefined,
		toothCode,
		patientId,
		vendor,
		modality,
		fileCategory,
		photoProtocolSlot,
	};
}

function parseDicomFilenameMetadata(fileName) {
	const res = parseHotFolderFilenameMetadata(fileName);
	return { toothCode: res.toothCode, patientId: res.patientId };
}

function detectInstalledDentalHardware(presets = DENTAL_HARDWARE_PRESETS) {
	const detected = [];
	for (const preset of presets) {
		for (const candidatePath of preset.defaultPaths) {
			if (fs.existsSync(candidatePath)) {
				detected.push({
					presetId: preset.id,
					vendor: preset.vendor,
					family: preset.family,
					name: preset.name,
					detectedPath: candidatePath,
					protocol: preset.protocol,
					exchangeFileName: preset.exchangeFileName,
					defaultModality: preset.defaultModality,
				});
				break;
			}
		}
	}
	return detected;
}

function getAnatomicalDentalPreviewDataUri(toothCode = "16") {
	const safeTooth = String(toothCode || "16").replace(/[^0-9A-Za-z-]/g, "");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <defs>
    <radialGradient id="xrayGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1c2430" />
      <stop offset="70%" stop-color="#0a0e14" />
      <stop offset="100%" stop-color="#020408" />
    </radialGradient>
    <linearGradient id="boneTexture" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2a3545" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#1e2633" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#141a24" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="enamelRadiopacity" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e8edf5" />
      <stop offset="40%" stop-color="#c5d1e0" />
      <stop offset="100%" stop-color="#8ba1b8" />
    </linearGradient>
    <linearGradient id="dentinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <linearGradient id="pulpRadiolucency" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#xrayGlow)" rx="8" />
  <path d="M 10 220 Q 80 200 150 215 T 290 225 L 290 390 L 10 390 Z" fill="url(#boneTexture)" />
  <path d="M 68 180 Q 75 270 95 345 Q 115 350 125 310 Q 150 250 155 240 Q 160 250 185 310 Q 195 350 215 345 Q 235 270 242 180 Z" fill="#090d14" opacity="0.6" />
  <path d="M 72 180 Q 78 265 98 340 Q 112 344 122 305 Q 148 245 155 235 Q 162 245 188 305 Q 198 344 212 340 Q 232 265 238 180 Z" fill="url(#dentinGradient)" />
  <path d="M 130 140 Q 150 135 170 140 Q 165 175 160 210 Q 170 260 178 300 Q 175 305 170 300 Q 155 250 155 210 Q 155 250 140 300 Q 135 305 132 300 Q 140 260 150 210 Q 145 175 130 140 Z" fill="url(#pulpRadiolucency)" />
  <path d="M 65 180 Q 60 110 100 80 Q 150 70 200 80 Q 240 110 245 180 Q 200 175 155 178 Q 110 175 65 180 Z" fill="url(#enamelRadiopacity)" />
  <path d="M 90 85 Q 105 105 125 90 Q 150 85 175 90 Q 195 105 210 85" stroke="#f8fafc" stroke-width="2" fill="none" opacity="0.8" />
  <text x="15" y="25" fill="#94a3b8" font-family="monospace" font-size="11" font-weight="bold">RVG INTRAORAL [IO]</text>
  <text x="15" y="42" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">FDI #${safeTooth}</text>
  <text x="15" y="380" fill="#64748b" font-family="monospace" font-size="10">DENTE DENTAL PACS • 35µm</text>
  <text x="210" y="380" fill="#64748b" font-family="monospace" font-size="10">70kV 7mA</text>
</svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

module.exports = {
	DENTAL_HARDWARE_PRESETS,
	DENTAL_PHOTO_PROTOCOL_12,
	detectHardwareVendorFromPath,
	matchPhotoProtocolSlot,
	parseHotFolderFilenameMetadata,
	parseDicomFilenameMetadata,
	detectInstalledDentalHardware,
	getAnatomicalDentalPreviewDataUri,
};
