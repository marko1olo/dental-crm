/**
 * apps/api/src/services/scanner/scannerMetadataParsers.ts
 *
 * Multi-vendor Metadata Parser: 3Shape XML (.xml, .3ox, .3px),
 * Medit Link JSON, Runyes, Shining 3D, and generic DentalProject manifests.
 */

import path from "node:path";
import {
	isValidScanFdiToothNumber,
	matrix4x4Schema,
	type Matrix4x4,
} from "@dental/shared";

export interface ExtractedMetadata {
	patientName?: string | undefined;
	fdiTeeth: number[];
	implantTeeth: number[];
	materialsPlanned: Record<string, string>;
	vitaShade?: string | undefined;
	matrix?: Matrix4x4 | undefined;
	scannerModel?: string | undefined;
}

export function parseMetadataContent(fileName: string, content: Buffer): ExtractedMetadata {
	const text = content.toString("utf8");
	const ext = path.extname(fileName).toLowerCase();

	const metadata: ExtractedMetadata = {
		fdiTeeth: [],
		implantTeeth: [],
		materialsPlanned: {},
	};

	if (ext === ".json") {
		try {
			const parsed = JSON.parse(text) as Record<string, unknown>;

			// Patient Name
			if (typeof parsed.patientName === "string") {
				metadata.patientName = parsed.patientName.trim();
			} else if (typeof parsed.PatientName === "string") {
				metadata.patientName = parsed.PatientName.trim();
			} else if (typeof parsed.patient_name === "string") {
				metadata.patientName = parsed.patient_name.trim();
			}

			// Model / Vendor
			if (typeof parsed.scannerModel === "string") {
				metadata.scannerModel = parsed.scannerModel;
			} else if (typeof parsed.deviceModel === "string") {
				metadata.scannerModel = parsed.deviceModel;
			}

			// Teeth
			const rawTeeth = parsed.teeth || parsed.preparationTeeth || parsed.toothNumbers;
			if (Array.isArray(rawTeeth)) {
				for (const t of rawTeeth) {
					const num = typeof t === "number" ? t : Number.parseInt(String(t), 10);
					if (isValidScanFdiToothNumber(num) && !metadata.fdiTeeth.includes(num)) {
						metadata.fdiTeeth.push(num);
					}
				}
			}

			// Implants
			const rawImplants = parsed.implants || parsed.implantTeeth;
			if (Array.isArray(rawImplants)) {
				for (const t of rawImplants) {
					const num = typeof t === "number" ? t : Number.parseInt(String(t), 10);
					if (isValidScanFdiToothNumber(num) && !metadata.implantTeeth.includes(num)) {
						metadata.implantTeeth.push(num);
					}
				}
			}

			// Materials
			if (parsed.materials && typeof parsed.materials === "object" && !Array.isArray(parsed.materials)) {
				for (const [k, v] of Object.entries(parsed.materials as Record<string, unknown>)) {
					if (typeof v === "string") {
						metadata.materialsPlanned[k] = v;
					}
				}
			}

			// Vita Shade
			if (typeof parsed.vitaShade === "string") {
				metadata.vitaShade = parsed.vitaShade;
			} else if (typeof parsed.shade === "string") {
				metadata.vitaShade = parsed.shade;
			}

			// Occlusion Matrix (4x4)
			const rawMatrix = parsed.occlusionMatrix || parsed.transformationMatrix || parsed.matrix;
			const matrixResult = matrix4x4Schema.safeParse(rawMatrix);
			if (matrixResult.success) {
				metadata.matrix = matrixResult.data;
			}
		} catch {
			// Malformed JSON — ignored safely
		}
	} else if (ext === ".xml" || ext === ".3ox" || ext === ".3px") {
		// 3Shape XML parsing
		const nameMatch = text.match(/<PatientName>([^<]+)<\/PatientName>/i) ||
			text.match(/<Patient[^>]*Name="([^"]+)"/i) ||
			text.match(/<Name>([^<]+)<\/Name>/i);
		if (nameMatch?.[1]) {
			metadata.patientName = nameMatch[1].trim();
		}

		// FDI Teeth in XML
		const toothMatches = text.matchAll(/<(?:Tooth|FDI|ToothNumber)[^>]*>(\d{2})<\/(?:Tooth|FDI|ToothNumber)>/gi);
		for (const m of toothMatches) {
			const candidate = Number.parseInt(m[1] ?? "", 10);
			if (isValidScanFdiToothNumber(candidate) && !metadata.fdiTeeth.includes(candidate)) {
				metadata.fdiTeeth.push(candidate);
			}
		}

		// Vita Shade
		const shadeMatch = text.match(/<(?:Shade|VitaShade|Color)[^>]*>([^<]+)<\/(?:Shade|VitaShade|Color)>/i);
		if (shadeMatch?.[1]) {
			metadata.vitaShade = shadeMatch[1].trim();
		}

		// Matrix 4x4
		const matrixMatch = text.match(/<Matrix>([^<]+)<\/Matrix>/i);
		if (matrixMatch?.[1]) {
			const nums = matrixMatch[1].trim().split(/[\s,]+/).map(Number);
			const matrixResult = matrix4x4Schema.safeParse(nums);
			if (matrixResult.success) {
				metadata.matrix = matrixResult.data;
			}
		}
	}

	return metadata;
}
