/**
 * DENTE Dental CRM — Organic Caries Geometry for Upper Molars 16 / 26
 * Sites: Central fossa pit, Distopalatal groove, Carabelli pit.
 * Mandate 8b <= 120 lines.
 */

export const TOOTH16_CARIES_GEOMETRY = {
	// Central pit organic dendritic destruction (chalky demineralization perimeter)
	centralPitHalo:
		"M 38,122 C 37,120 40,118 43,118 C 47,118 49,121 48,124 " +
		"C 48,126 45,128 42,128 C 39,127 38,124 38,122 Z",

	// Softened amber dentin core
	centralPitDentin:
		"M 39,123 C 39,121 41,120 43,120 C 45,120 46,122 46,124 " +
		"C 45,126 43,127 42,126 C 40,126 39,124 39,123 Z",

	// Deep necrotic base pit with micro-fissure branches
	centralPitNecrotic:
		"M 41,123 C 41,122 42,122 43,122 C 44,122 44,123 44,124 " +
		"C 44,125 43,125 42,125 C 41,125 41,124 41,123 Z",

	// Distopalatal groove fissure caries tracking along the oblique ridge edge
	distalGrooveCaries:
		"M 50,123 C 54,127 60,131 66,138 " + "C 65,139 59,133 49,125 Z",

	// Deep fissure necrosis in distal groove
	distalNecroticFissure: "M 52,124 C 56,128 62,133 65,137",

	// Carabelli pit caries (sulcus Carabelli anatomical defect)
	carabelliPitHalo:
		"M 16,135 C 15,133 17,131 19,132 C 21,133 21,136 19,138 C 17,138 16,137 16,135 Z",
	carabelliNecroticCore:
		"M 17,135 C 17,134 18,133 19,134 C 20,134 20,136 19,136 C 18,136 17,135 17,135 Z",
} as const;
