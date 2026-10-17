/**
 * DENTE Dental CRM — Anatomical Tooth Geometry Contracts
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type {
	AnatomicalSurfaceKey,
	CanalDefinition,
	ToothArch,
	ToothMorphologyGroup,
	ToothSide,
} from "./toothMorphologyTypes";
import type { PeriodontalMarkers } from "./periodontalResorptionTypes";

export interface AnatomicalTemplateData {
	readonly crown: string;
	readonly root: string;
	readonly cej: string;
	readonly fissures: string;
	readonly surfaces: Record<AnatomicalSurfaceKey, string>;
	readonly canals: readonly CanalDefinition[];
	readonly pulpChamber?: string;
	readonly apexHalos: readonly { readonly x: number; readonly y: number }[];
	readonly periodontal: PeriodontalMarkers;
	readonly viewBox: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly standardWidthPx: number;
	readonly standardHeightPx: number;
}

export interface AnatomicalToothGeometry {
	readonly fdiNumber: number;
	readonly group: ToothMorphologyGroup;
	readonly arch: ToothArch;
	readonly side: ToothSide;
	readonly isPediatric: boolean;
	readonly rootsCount: number;
	readonly rootNamesRu: readonly string[];
	readonly crownPath: string;
	readonly rootPath: string;
	readonly cejPath: string;
	readonly fissurePath: string;
	readonly surfaces: Record<AnatomicalSurfaceKey, string>;
	readonly canals: readonly CanalDefinition[];
	readonly pulpChamberPath?: string | undefined;
	readonly apexHalos: readonly { readonly x: number; readonly y: number }[];
	readonly periodontal: PeriodontalMarkers;
	readonly viewBox: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly standardWidthPx: number;
	readonly standardHeightPx: number;
	readonly touchTargetMinPx: number;
}
