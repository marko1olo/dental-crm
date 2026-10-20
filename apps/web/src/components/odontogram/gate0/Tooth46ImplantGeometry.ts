/**
 * DENTE Dental CRM — Authentic Grade-5 Titanium Implant Geometry for Tooth 46
 * Pure implant with cover screw, healing abutment, custom abutment & screw access hole.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_IMPLANT_GEOMETRY = {
	// 1. Cover Screw (Submerged 2-stage healing at bone crest Y=71..73, gum sutured)
	coverScrew: {
		cap: "M 36,72.5 C 36,71.0 41,70.2 50,70.2 C 59,70.2 64,71.0 64,72.5 L 63.5,73.5 L 36.5,73.5 Z",
		hexSlot:
			"M 47,71.0 L 53,71.0 L 54.5,71.8 L 53,72.6 L 47,72.6 L 45.5,71.8 Z",
		centerSlot: "M 47.5,71.8 L 52.5,71.8",
		chamfer: "M 37,72.8 L 63,72.8",
	},

	// 2. Healing Abutment / Gingival Former (Polished flare from Y=72.5 to Y=56, dome to Y=48)
	healingAbutment: {
		body:
			"M 38,48 L 62,48 C 66,48 68.5,52 68,56 C 67.5,61 66,67 64.5,72.5 " +
			"L 35.5,72.5 C 34,67 32.5,61 32,56 C 31.5,52 34,48 38,48 Z",
		topCap: "M 38,48 L 62,48 L 60.5,50.5 L 39.5,50.5 Z",
		hexSocket:
			"M 46,48.8 L 54,48.8 L 56.5,51.2 L 53,53.6 L 47,53.6 L 43.5,51.2 Z",
		specularHighlight: "M 39,49 C 35,54 36,63 38,71",
		chamferCollar: "M 35.5,70.5 L 64.5,70.5 L 64,72.5 L 36,72.5 Z",
	},

	// 3. Custom Anatomical Abutment for Cemented Crown (Y=38..72.5, chamfer margin Y=62)
	standardAbutment: {
		stump:
			"M 31,62.5 L 38,38 C 38.5,37 40,36.5 42,36.5 L 58,36.5 C 60,36.5 61.5,37 62,38 L 69,62.5 Z",
		shoulder:
			"M 35.5,72.5 C 33,69 29.5,65.5 27,62 L 73,62 C 70.5,65.5 67,69 64.5,72.5 Z",
		finishLine: "M 27,62 L 73,62",
		screwTunnel: "M 46.5,38 L 53.5,38 L 53.5,72.5 L 46.5,72.5 Z",
		screwHead: "M 47,56 L 53,56 L 53,60 L 47,60 Z",
	},

	// 4. Screw Access Hole on Occlusal Fossa (Screw-retained crown with composite plug)
	screwAccessHole: {
		outerRim:
			"M 44.5,22.5 C 44.5,19.2 47.0,17.0 50,17.0 C 53.0,17.0 55.5,19.2 55.5,22.5 C 55.5,25.8 53.0,28.0 50,28.0 C 47.0,28.0 44.5,25.8 44.5,22.5 Z",
		compositePlug:
			"M 45.5,22.5 C 45.5,19.8 47.5,17.8 50,17.8 C 52.5,17.8 54.5,19.8 54.5,22.5 C 54.5,25.2 52.5,27.2 50,27.2 C 47.5,27.2 45.5,25.2 45.5,22.5 Z",
		plugMargin: "M 46.2,20.0 C 48.0,18.8 52.0,18.8 53.8,20.0",
		hexScrewGhost: "M 48,21 L 52,21 L 53.5,22.5 L 52,24 L 48,24 L 46.5,22.5 Z",
		shaftTunnel: "M 46.5,26 L 46.5,72 M 53.5,26 L 53.5,72",
	},

	// 5. Temporary Titanium Abutment for PMMA Provisional Crown (Retention grooves)
	temporaryAbutment: {
		stump:
			"M 31,62.5 L 38,38 C 38.5,37 40,36.5 42,36.5 L 58,36.5 C 60,36.5 61.5,37 62,38 L 69,62.5 Z",
		shoulder:
			"M 35.5,72.5 C 33,69 29.5,65.5 27,62 L 73,62 C 70.5,65.5 67,69 64.5,72.5 Z",
		retentionGrooves: [
			"M 34,56 L 66,56",
			"M 36,48 L 64,48",
			"M 37.5,42 L 62.5,42",
		] as const,
	},

	// 6. Peri-implant Gingival Cuff (Marginal gingiva zenith Y=65..67, papillae Y=60..62)
	gingivalCuff: {
		margin: "M 18,61 C 28,63.5 38,66.5 50,66.5 C 62,66.5 72,63.5 82,61",
		sulcusShadow:
			"M 24,63 C 32,65.5 41,67.5 50,67.5 C 59,67.5 68,65.5 76,63",
		band:
			"M 18,61 C 23,66 29,71 35.5,72.5 L 64.5,72.5 C 71,71 77,66 82,61 " +
			"C 72,63.5 62,66.5 50,66.5 C 38,66.5 28,63.5 18,61 Z",
		suture: "M 44,66.5 L 56,66.5 M 46,65 L 48,68 M 52,65 L 54,68",
	},

	// 7. Specialized Crown Shell on Implant (Authentic Tulip Emergence Profile)
	implantCrownShell:
		"M 35,72.5 C 33.5,72 31,70 27,66 C 22,60 18,54 14,45 C 13,42 12.5,39.5 12,37 " +
		"C 13,27 17,19 22,15 C 25,13 28,10 32,9 C 38,10 44,13 47,13 C 52,12 57,10 62,10 " +
		"C 68,11 73,14 76,16 C 79,18 82,21 83,23 C 85,28 86,32 86,35 C 86.5,38 86.5,42 86,45 " +
		"C 82,54 78,60 73,66 C 69,70 66.5,72 65,72.5 L 35,72.5 Z",

	// Platform Switching & Cervical Micro-Threads (Y=72..84)
	collar: {
		platformSwitch: "M 36,72.5 L 64,72.5 L 65.5,75 L 34.5,75 Z",
		microThreads: [
			"M 34.2,76.5 L 65.8,76.5",
			"M 34.0,78.5 L 66.0,78.5",
			"M 33.8,80.5 L 66.2,80.5",
			"M 33.5,82.5 L 66.5,82.5",
		] as const,
	},

	// Conical Tapered Fixture Body with Progressive Macro-Threads (Y=83..146)
	fixture: {
		coreBody:
			"M 33.5,83 L 66.5,83 L 64.5,108 C 63.5,122 60.5,136 55.5,144 " +
			"C 54,146 52,147 50,147 C 48,147 46,146 44.5,144 C 39.5,136 36.5,122 35.5,108 L 33.5,83 Z",
		macroThreadFlanks: [
			"M 32.5,86.5 L 67.5,86.5 L 66.2,88.5 L 33.8,88.5 Z",
			"M 32.8,93.0 L 67.2,93.0 L 65.8,95.5 L 34.2,95.5 Z",
			"M 33.2,100.5 L 66.8,100.5 L 65.2,103.5 L 34.8,103.5 Z",
			"M 33.8,108.5 L 66.2,108.5 L 64.5,112.0 L 35.5,112.0 Z",
			"M 34.5,117.0 L 65.5,117.0 L 63.6,121.0 L 36.4,121.0 Z",
			"M 35.4,126.0 L 64.6,126.0 L 62.4,130.5 L 37.6,130.5 Z",
			"M 36.8,135.5 L 63.2,135.5 L 60.8,140.0 L 39.2,140.0 Z",
		] as const,
		apicalCuttingFluteLeft:
			"M 39.5,132 C 41,136 41.5,141 42,144.5 L 43.5,144 C 43,140 42,135 40.5,132 Z",
		apicalCuttingFluteRight:
			"M 60.5,132 C 59,136 58.5,141 58,144.5 L 56.5,144 C 57,140 58,135 59.5,132 Z",
		domeApex: "M 44.5,144 C 47,147 53,147 55.5,144 Z",
	},

	// Backward-compatible alias for existing callers
	get abutment() {
		return this.healingAbutment;
	},
} as const;
