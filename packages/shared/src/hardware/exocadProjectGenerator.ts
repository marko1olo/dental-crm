/**
 * @dental/shared/hardware - Exocad DentalCAD & 3Shape Lab Project Generator.
 *
 * Generates standard Exocad .dentalProject XML and .constructionInfo manifests
 * to export intraoral optical scans directly into dental laboratory CAD/CAM suites.
 *
 * Invariants: Zero Any, Strict Validation, FDI tooth numbering (11-48),
 * Correct XML escaping, Cross-vendor CAD compatibility.
 */

import { z } from "zod";
import { isValidScanFdiToothNumber } from "./intraoralScannerClassifier.js";
import type { Matrix4x4 } from "./intraoralScannerTypes.js";

export const EXOCAD_RESTORATION_TYPES = [
	"anatomic_crown",
	"anatomic_coping",
	"veneer",
	"inlay",
	"onlay",
	"pontic",
	"implant_abutment",
	"bite_splint",
	"healthy",
] as const;

export type ExocadRestorationType = (typeof EXOCAD_RESTORATION_TYPES)[number];

export const EXOCAD_MATERIALS = [
	"zirconia",
	"emax_cad",
	"pmma",
	"titanium",
	"composite",
	"peek",
	"wax",
] as const;

export type ExocadMaterial = (typeof EXOCAD_MATERIALS)[number];

export interface ExocadToothOrder {
	toothFdi: number;
	restorationType: ExocadRestorationType;
	material?: ExocadMaterial | string;
	shade?: string;
	antagonistToothFdi?: number;
	marginLinePoints?: ReadonlyArray<readonly [number, number, number]>;
}

export interface ExocadArticulatorSettings {
	articulatorType?: "bio_art" | "kavo_protar" | "average_anatomical" | string;
	facebow?: boolean;
	guidanceType?: "canine_guidance" | "group_function" | "mutually_protected" | "balanced_articulation" | string;
	sagittalCondylarAngleDeg?: number;
	bennettAngleDeg?: number;
	shiftDeg?: number;
}

export interface ExocadProjectOptions {
	projectId: string;
	patientFullName: string;
	patientExternalId?: string;
	doctorFullName?: string;
	technicianFullName?: string;
	clinicName?: string;
	teeth: ExocadToothOrder[];
	upperMeshFileName?: string;
	lowerMeshFileName?: string;
	biteMeshFileName?: string;
	prepMeshFileName?: string;
	scanbodyMeshFileName?: string;
	occlusionMatrix?: Matrix4x4;
	articulatorSettings?: ExocadArticulatorSettings;
	notes?: string;
}

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function mapRestorationToExocadReconstructionType(type: ExocadRestorationType): string {
	switch (type) {
		case "anatomic_crown": return "anatomic_crown";
		case "anatomic_coping": return "anatomic_coping";
		case "veneer": return "veneer";
		case "inlay": return "inlay";
		case "onlay": return "onlay";
		case "pontic": return "pontic";
		case "implant_abutment": return "implant_abutment";
		case "bite_splint": return "bite_splint";
		case "healthy": return "healthy_tooth";
	}
}

/**
 * Generates an Exocad-compatible DentalProject.xml file.
 */
export function generateExocadDentalProjectXml(options: ExocadProjectOptions): string {
	const now = new Date().toISOString();
	const patientName = escapeXml(options.patientFullName.trim());
	const clinicName = escapeXml(options.clinicName || "DENTE Dental Clinic");
	const doctor = escapeXml(options.doctorFullName || "Врач-ортопед");
	const technician = escapeXml(options.technicianFullName || "Зубной техник");
	const notes = options.notes ? escapeXml(options.notes) : "";

	let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
	xml += `<DentalProject Version="2.0">\n`;
	xml += `  <Header>\n`;
	xml += `    <ProjectId>${escapeXml(options.projectId)}</ProjectId>\n`;
	xml += `    <DateCreated>${now}</DateCreated>\n`;
	xml += `    <Application>DENTE Universal Scanner Hub</Application>\n`;
	xml += `  </Header>\n`;
	xml += `  <Patient Name="${patientName}" ExternalId="${escapeXml(options.patientExternalId || options.projectId)}" />\n`;
	xml += `  <Practice Name="${clinicName}" Doctor="${doctor}" />\n`;
	xml += `  <Laboratory Technician="${technician}" />\n`;

	// Notes
	if (notes) {
		xml += `  <Notes>${notes}</Notes>\n`;
	}

	// Articulator Settings for Virtual CAD/CAM Simulation
	if (options.articulatorSettings) {
		const art = options.articulatorSettings;
		xml += `  <ArticulatorSettings>\n`;
		if (art.articulatorType) {
			xml += `    <ArticulatorType>${escapeXml(art.articulatorType)}</ArticulatorType>\n`;
		}
		if (art.facebow !== undefined) {
			xml += `    <Facebow>${art.facebow ? "true" : "false"}</Facebow>\n`;
		}
		if (art.guidanceType) {
			xml += `    <GuidanceType>${escapeXml(art.guidanceType)}</GuidanceType>\n`;
		}
		if (art.sagittalCondylarAngleDeg != null) {
			xml += `    <SagittalCondylarAngleDeg>${art.sagittalCondylarAngleDeg}</SagittalCondylarAngleDeg>\n`;
		}
		if (art.bennettAngleDeg != null) {
			xml += `    <BennettAngleDeg>${art.bennettAngleDeg}</BennettAngleDeg>\n`;
		}
		if (art.shiftDeg != null) {
			xml += `    <ShiftDeg>${art.shiftDeg}</ShiftDeg>\n`;
		}
		xml += `  </ArticulatorSettings>\n`;
	}

	// Occlusion Matrix if present
	if (options.occlusionMatrix && options.occlusionMatrix.length === 16) {
		xml += `  <OcclusionTransformationMatrix>\n`;
		xml += `    ${options.occlusionMatrix.join(" ")}\n`;
		xml += `  </OcclusionTransformationMatrix>\n`;
	}

	// Scan Meshes
	xml += `  <Scans>\n`;
	if (options.upperMeshFileName) {
		xml += `    <Scan Type="UpperJaw" FileName="${escapeXml(options.upperMeshFileName)}" />\n`;
	}
	if (options.lowerMeshFileName) {
		xml += `    <Scan Type="LowerJaw" FileName="${escapeXml(options.lowerMeshFileName)}" />\n`;
	}
	if (options.biteMeshFileName) {
		xml += `    <Scan Type="VestibularBite" FileName="${escapeXml(options.biteMeshFileName)}" />\n`;
	}
	if (options.prepMeshFileName) {
		xml += `    <Scan Type="PreparationDie" FileName="${escapeXml(options.prepMeshFileName)}" />\n`;
	}
	if (options.scanbodyMeshFileName) {
		xml += `    <Scan Type="ImplantScanbody" FileName="${escapeXml(options.scanbodyMeshFileName)}" />\n`;
	}
	xml += `  </Scans>\n`;

	// Tooth definitions (FDI)
	xml += `  <ToothDefinitions>\n`;
	for (const tooth of options.teeth) {
		if (!isValidScanFdiToothNumber(tooth.toothFdi)) continue;

		const reconType = mapRestorationToExocadReconstructionType(tooth.restorationType);
		const material = escapeXml(tooth.material || "zirconia");
		const shade = escapeXml(tooth.shade || "A2");

		xml += `    <Tooth Number="${tooth.toothFdi}" ReconstructionType="${reconType}" Material="${material}" Shade="${shade}"`;
		if (tooth.antagonistToothFdi) {
			xml += ` AntagonistNumber="${tooth.antagonistToothFdi}"`;
		}
		xml += `>\n`;

		if (tooth.marginLinePoints && tooth.marginLinePoints.length > 0) {
			xml += `      <MarginLine Count="${tooth.marginLinePoints.length}">\n`;
			for (const pt of tooth.marginLinePoints) {
				xml += `        <Point X="${pt[0].toFixed(3)}" Y="${pt[1].toFixed(3)}" Z="${pt[2].toFixed(3)}" />\n`;
			}
			xml += `      </MarginLine>\n`;
		}

		xml += `    </Tooth>\n`;
	}
	xml += `  </ToothDefinitions>\n`;
	xml += `</DentalProject>\n`;

	return xml;
}

/**
 * Generates Exocad constructionInfo JSON structure.
 */
export function generateExocadConstructionInfoJson(options: ExocadProjectOptions): string {
	const info = {
		exocadVersion: "2024.1",
		projectId: options.projectId,
		patientName: options.patientFullName,
		clinicName: options.clinicName || "DENTE Dental Clinic",
		doctorName: options.doctorFullName || "Врач-ортопед",
		createdDate: new Date().toISOString(),
		files: {
			upper: options.upperMeshFileName || null,
			lower: options.lowerMeshFileName || null,
			bite: options.biteMeshFileName || null,
			prep: options.prepMeshFileName || null,
			scanbody: options.scanbodyMeshFileName || null,
		},
		matrix: options.occlusionMatrix || null,
		articulatorSettings: options.articulatorSettings || null,
		teeth: options.teeth.map((t) => ({
			toothNumber: t.toothFdi,
			type: mapRestorationToExocadReconstructionType(t.restorationType),
			material: t.material || "zirconia",
			color: t.shade || "A2",
			marginLineCount: t.marginLinePoints?.length || 0,
		})),
	};

	return JSON.stringify(info, null, 2);
}
