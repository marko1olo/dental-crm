import {
	folderHintScore
} from "./localFolderDiscovery.js";
import { createHash } from "node:crypto";
import path from "node:path";
import type {
	DentalModelFileCandidate,
	DentalModelFileFormat,
	DentalModelFileRole,
	DentalModelWorkbenchLoadTarget,
	DentalModelWorkbenchPairingHint,
	CtSurfaceModelManifest,
	LocalImagingOrganizerRecommendedAction,
} from "@dental/shared";
import { dentalModelFileExtensions } from "./imagingConstants.js";

export function normalizeOrganizerText(value: string) {
	return value.toLowerCase().replace(/[._()[\]{}-]+/g, " ");
}

export function detectDentalModelFormat(fileName: string): DentalModelFileFormat {
	const extension = path.extname(fileName).toLowerCase();
	if (extension === ".stl") return "stl";
	if (extension === ".obj") return "obj";
	if (extension === ".ply") return "ply";
	if (extension === ".glb") return "glb";
	if (extension === ".gltf") return "gltf";
	if (extension === ".3mf") return "3mf";
	if (extension === ".zip") return "zip_archive";
	return "unknown";
}

export function detectDentalSurfaceModelRole(
	text: string,
): DentalModelFileRole | null {
	const surfaceHint =
		/surface|bone|skull|cranium|cranial|segmentation|segmented|mesh|volumetric|ct\s*model|cbct|klkt|череп|кость|костн|сегментац/.test(
			text,
		);
	if (/skull|cranium|cranial|череп/.test(text)) return "skull_surface";
	if (
		surfaceHint &&
		/maxilla|maxillary|upper jaw|u[ _-]?jaw|верхн|верхняя/.test(text)
	)
		return "maxilla_surface";
	if (
		surfaceHint &&
		/mandible|mandibular|lower jaw|l[ _-]?jaw|нижн|нижняя/.test(text)
	)
		return "mandible_surface";
	if (
		/ct\s*bone|cbct\s*bone|klkt\s*bone|bone\s*surface|surface\s*bone|segmented\s*bone|bone\s*segmentation|костн|кость/.test(
			text,
		)
	) {
		return "ct_bone_surface";
	}
	return null;
}

export function detectDentalModelRole(
	fileName: string,
	folderPath: string,
): DentalModelFileRole {
	const fromText = (text: string): DentalModelFileRole | null => {
		const surfaceRole = detectDentalSurfaceModelRole(text);
		if (surfaceRole) return surfaceRole;
		if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text))
			return "scan_body";
		if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text))
			return "upper_arch";
		if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text))
			return "lower_arch";
		if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
		if (/bridge|pontic|most/.test(text)) return "bridge";
		if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
		if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
		if (
			/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(
				text,
			)
		)
			return "implant_guide";
		if (/guide|sleeve|template|sablon|shablon|surgical/.test(text))
			return "surgical_guide";
		return null;
	};
	const fileRole = fromText(normalizeOrganizerText(fileName));
	if (fileRole) return fileRole;
	const text = normalizeOrganizerText(folderPath);
	if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text))
		return "scan_body";
	if (
		/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(
			text,
		)
	)
		return "implant_guide";
	if (/guide|sleeve|template|sablon|shablon|surgical/.test(text))
		return "surgical_guide";
	if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
	if (/bridge|pontic|most/.test(text)) return "bridge";
	if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
	if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
	if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text))
		return "upper_arch";
	if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text))
		return "lower_arch";
	return "unknown";
}

export function hasDentalModelArchiveHint(fileName: string, folderPath: string) {
	const _text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	return hasDentalModelFileHint(fileName, folderPath);
}

export function hasDentalModelFileHint(fileName: string, folderPath: string) {
	const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	return /skull|cranium|cranial|surface|bone|segmentation|segmented|upper|lower|maxilla|maxillary|mandible|mandibular|u[ _-]?jaw|l[ _-]?jaw|bite|occlusion|occlusal|crown|bridge|veneer|inlay|onlay|implant|guide|sleeve|aligner|tray|scanbody|scan body|abutment|intraoral|ios|exocad|3shape|medit|cerec|dental|tooth|teeth|orthodont|surgical|череп|кость|костн|сегментац/.test(
		text,
	);
}

export function scoreDentalModelFile(fileName: string, folderPath: string) {
	const format = detectDentalModelFormat(fileName);
	if (format === "unknown") return 0;
	const role = detectDentalModelRole(fileName, folderPath);
	const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	let score = format === "zip_archive" ? 0.32 : 0.5;
	if (role !== "unknown") score += 0.22;
	if (
		/intraoral|ios|scan|cad|cam|exocad|3shape|medit|cerec|mesh|model|stl|implant|guide|surface|segmentation/.test(
			text,
		)
	)
		score += 0.18;
	if (
		/upper|lower|maxilla|mandible|skull|bone|crown|bridge|aligner|bite|scanbody|scan body/.test(
			text,
		)
	)
		score += 0.1;
	return Math.min(1, Number(score.toFixed(2)));
}

export function organizerFolderHintScore(folderPath: string) {
	const normalized = normalizeOrganizerText(folderPath);
	let score = folderHintScore(folderPath);
	if (
		/intraoral|ios|exocad|3shape|medit|cerec|implant|guide|aligner|scanbody|crown|bridge|maxilla|mandible|skull|bone|surface|segmentation|dental|tooth|teeth|orthodont|surgical/.test(
			normalized,
		)
	)
		score += 0.2;
	if (/patient|case|study|export|clinic|lab|laboratory/.test(normalized))
		score += 0.05;
	return Math.min(0.35, Number(score.toFixed(2)));
}

export function isLikelySoftwareResourceFolder(folderPath: string) {
	const normalized = normalizeOrganizerText(folderPath);
	return /portable tools|portable_tools|program files|node modules|packagecache|resources|resource|viewer|cdviewer|examples?|samples?|demo|assets|library|sdk|toolkit|game|gamedev|kenney|template/.test(
		normalized,
	);
}

export function buildOrganizerCaseId(folderPath: string) {
	return `local-imaging-${createHash("sha256").update(folderPath).digest("hex").slice(0, 14)}`;
}

export function latestIso(left: string | null, right: string | null) {
	if (!left) return right;
	if (!right) return left;
	return left > right ? left : right;
}

export function recommendLocalImagingAction(caseCandidate: {
	dicomLikeFiles: number;
	modelFiles: number;
	archiveFiles: number;
	combinedConfidence: number;
}): LocalImagingOrganizerRecommendedAction {
	if (caseCandidate.dicomLikeFiles > 0 && caseCandidate.modelFiles > 0)
		return "mixed_case_workup";
	if (
		caseCandidate.dicomLikeFiles > 0 ||
		(caseCandidate.archiveFiles > 0 && caseCandidate.combinedConfidence >= 0.45)
	)
		return "open_ct_workup";
	if (caseCandidate.modelFiles > 0) return "review_3d_models";
	return "manual_review";
}

export function isCtSurfaceModelRole(role: DentalModelFileRole) {
	return (
		role === "skull_surface" ||
		role === "maxilla_surface" ||
		role === "mandible_surface" ||
		role === "ct_bone_surface"
	);
}

export function buildCtSurfaceModelManifest(input: {
	model: DentalModelFileCandidate;
	folderFingerprint: string;
	pairingHint: DentalModelWorkbenchPairingHint;
	loadTarget: DentalModelWorkbenchLoadTarget;
	sizeMb: number;
}): CtSurfaceModelManifest | null {
	if (!isCtSurfaceModelRole(input.model.role)) return null;
	const archiveOrUnknown =
		input.model.format === "zip_archive" || input.model.format === "unknown";
	const readiness: CtSurfaceModelManifest["readiness"] = archiveOrUnknown
		? "metadata_only"
		: input.loadTarget === "local_bridge"
			? "pending_local_bridge"
			: input.loadTarget === "external_model_viewer"
				? "ready_external"
				: "blocked";
	const warnings = [...input.model.warnings];
	warnings.push(
		"CRM хранит только связь КТ-поверхности и статус проверки; геометрия сетки остается в локальном 3D-мосте или внешнем просмотрщике моделей.",
	);
	if (archiveOrUnknown) {
		warnings.push(
			"Архив или неизвестный формат поверхности хранится только как метаданные, пока локальный мост не проверит сетку.",
		);
	}
	return {
		role: input.model.role,
		format: input.model.format,
		sourceKind: archiveOrUnknown ? "unknown" : "imported_surface_file",
		sourceSeriesRef: {
			folderFingerprint: input.folderFingerprint,
			pairingHint: input.pairingHint,
			studyInstanceUid: null,
			seriesInstanceUid: null,
		},
		frameOfReferenceUid: null,
		registrationStatus:
			input.pairingHint === "same_folder_ct_series"
				? "same_folder_inferred"
				: "unknown",
		readiness,
		loadTarget: input.loadTarget,
		sizeMb: input.sizeMb,
		checksum: null,
		meshStats: null,
		containsMeshGeometry: false,
		warnings,
		nextAction:
			readiness === "pending_local_bridge"
				? "Передайте эту КТ-поверхность в локальный 3D-мост для регистрации, статистики сетки и клинической проверки; CRM не хранит payload сетки."
				: readiness === "ready_external"
					? "Откройте эту поверхность во внешнем просмотрщике моделей; CRM оставит слой пациента, связи с КТ и заметок."
					: "Оставьте эту поверхность как метаданные, пока локальный мост не проверит архив, формат и регистрацию с КТ.",
	};
}

export function chooseDentalModelWorkbenchTarget(
	model: DentalModelFileCandidate,
): DentalModelWorkbenchLoadTarget {
	if (model.format === "unknown" || model.format === "zip_archive")
		return "metadata_only";
	if (isCtSurfaceModelRole(model.role)) return "local_bridge";
	if (model.sizeBytes >= 80 * 1024 * 1024) return "local_bridge";
	return "external_model_viewer";
}

export function buildDentalModelWorkbenchManifest(input: {
	folderFingerprint: string;
	dicomLikeFiles: number;
	modelCandidates: DentalModelFileCandidate[];
}) {
	const warnings = new Set<string>();
	const items = input.modelCandidates.map((model) => {
		const loadTarget = chooseDentalModelWorkbenchTarget(model);
		const sizeMb = Math.ceil(model.sizeBytes / 1024 / 1024);
		const itemWarnings = [...model.warnings];
		if (isCtSurfaceModelRole(model.role)) {
			itemWarnings.push(
				"КТ-поверхность требует локальный 3D-модуль или внешний просмотр; CRM не загружает сетку в карточку приема.",
			);
		}
		if (loadTarget === "metadata_only") {
			itemWarnings.push(
				"Файл остается записью органайзера до разбора формата во внешнем или локальном модуле.",
			);
		}
		if (sizeMb >= 80) {
			itemWarnings.push(
				"Крупная сетка должна открываться локально; браузерная карточка хранит только маршрут и метаданные.",
			);
		}
		itemWarnings.forEach((warning) => {
			warnings.add(warning);
		});
		const pairingHint: DentalModelWorkbenchPairingHint =
			input.dicomLikeFiles > 0 ? "same_folder_ct_series" : "model_only_folder";
		const ctSurfaceManifest = buildCtSurfaceModelManifest({
			model: { ...model, warnings: itemWarnings },
			folderFingerprint: input.folderFingerprint,
			pairingHint,
			loadTarget,
			sizeMb,
		});
		const nextAction =
			loadTarget === "local_bridge"
				? "Передайте модель локальному 3D-модулю рядом с КТ-серией; CRM хранит роль, размер и связь с папкой."
				: loadTarget === "external_model_viewer"
					? "Откройте модель во внешнем 3D-просмотре и держите CRM как слой пациента, заметок и маршрута."
					: "Сохраните модель как метаданные органайзера, пока внешний модуль не подтвердит формат.";
		return {
			fileName: model.fileName,
			format: model.format,
			role: model.role,
			sizeBytes: model.sizeBytes,
			sizeMb,
			loadTarget,
			pairingHint,
			ctSurfaceManifest,
			warnings: itemWarnings,
			nextAction,
		};
	});
	const targetRank: Record<DentalModelWorkbenchLoadTarget, number> = {
		metadata_only: 0,
		external_model_viewer: 1,
		local_bridge: 2,
	};
	const recommendedTarget = items.reduce<DentalModelWorkbenchLoadTarget>(
		(target, item) =>
			targetRank[item.loadTarget] > targetRank[target]
				? item.loadTarget
				: target,
		"metadata_only",
	);
	const ctSurfaceModels = items.filter((item) =>
		isCtSurfaceModelRole(item.role),
	).length;
	const largestModelMb = items.reduce(
		(largest, item) => Math.max(largest, item.sizeMb),
		0,
	);
	const nextAction =
		items.length === 0
			? "3D-модели не найдены; оставайтесь в маршруте снимков."
			: recommendedTarget === "local_bridge"
				? "Для КТ-поверхностей и крупных сеток используйте локальный 3D-модуль; CRM хранит no-mesh маршрут."
				: recommendedTarget === "external_model_viewer"
					? "Используйте внешний 3D-просмотр и связывайте модель с КТ-кейсом по метке папки."
					: "Держите модели как метаданные, пока формат или архив не разобран внешним модулем.";
	return {
		version: "dental-crm-model-workbench-v1" as const,
		folderFingerprint: input.folderFingerprint,
		totalModels: items.length,
		ctSurfaceModels,
		largestModelMb,
		recommendedTarget,
		items,
		warnings: Array.from(warnings),
		nextAction,
	};
}
