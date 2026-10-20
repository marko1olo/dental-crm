/**
 * DENTE Dental CRM — Anatomical Geometry Types for Maxillary Incisors
 * Wheeler's Dental Anatomy (11th Ed., Ch. 8).
 * Mandate 8b <= 120 lines.
 */

export interface IncisorLobeDef {
	id: "mesial" | "middle" | "distal";
	nameRu: string;
	ridgePath: string;
	highlightPath: string;
}

export interface IncisorCrownGeometry {
	crownMonolithPath: string;
	cejCurve: string;
	cingulumPath: string;
	lingualFossaPath: string;
	mesialMarginalRidge: string;
	distalMarginalRidge: string;
	foramenCaecum: { x: number; y: number };
	palatoradicularGroove?: string | undefined;
	incisalEdgeCurve: string;
	mesioIncisalAngle: { x: number; y: number; isSharp: boolean };
	distoIncisalAngle: { x: number; y: number; isSharp: boolean };
	lobes: readonly IncisorLobeDef[];
}

export interface IncisorRootGeometry {
	rootMonolithPath: string;
	apex: { x: number; y: number };
	longitudinalGroove?: string | undefined;
	curvature: "straight" | "distal_curved";
}

export interface IncisorCanalGeometry {
	canalPath: string;
	guttaPerchaPath: string;
	pulpChamberPath: string;
	horns: readonly { id: string; x: number; y: number }[];
	orifice: { x: number; y: number };
	apexPoint: { x: number; y: number };
}

export interface IncisorOverlaysGeometry {
	veneerFacingPath: string;
	veneerChamferMargin: string;
	veneerIncisalHalo: string;
	traumaEllis2Mesial: string;
	traumaEllis2Distal: string;
	traumaEllis4Line: string;
	wearDegree1Path: string;
	wearDegree2Path: string;
	wearDegree3Path: string;
	abfractionWedge: string;
	fiberPostShaft: string;
	compositeCoreStump: string;
}
