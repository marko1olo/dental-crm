/**
 * DENTE Dental CRM — Black's Class x Depth Status Badge Matrix
 * Fine-grained clinical badges for all Class I..V x Superficial..Destructive states.
 * Mandate 8b <= 120 lines.
 */

import type { ToothStatusBadgeInfo } from "./ToothStatusBadgeMatrix";

const RAW_CARIES_MATRIX: Record<string, ToothStatusBadgeInfo> = {
	// Class I (Fissure & Caecum)
	caries_c1_superficial: { code: "C1s", title: "Кариес I класса начальный (Cs)", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c1_media: { code: "C1m", title: "Кариес I класса средний (Cm)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c1_profunda: { code: "C1p", title: "Кариес I класса глубокий (Cp)", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c1_destructive: { code: "C1ds", title: "Кариес I класса с разрушением скатов бугров", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class II M (Mesial Contact)
	caries_c2_m_superficial: { code: "Ms", title: "Кариес II класса M начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c2_m_media: { code: "Mm", title: "Кариес II класса M средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c2_m_profunda: { code: "Mp", title: "Кариес II класса M глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c2_m_destructive: { code: "Mds", title: "Кариес II класса M со сколом валика", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class II D (Distal Contact)
	caries_c2_d_superficial: { code: "Ds", title: "Кариес II класса D начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c2_d_media: { code: "Dm", title: "Кариес II класса D средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c2_d_profunda: { code: "Dp", title: "Кариес II класса D глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c2_d_destructive: { code: "Dds", title: "Кариес II класса D со сколом валика", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class II MO (Mesio-Occlusal)
	caries_c2_mo_superficial: { code: "MOs", title: "Кариес II класса MO начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c2_mo_media: { code: "MOm", title: "Кариес II класса MO средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c2_mo_profunda: { code: "MOp", title: "Кариес II класса MO глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c2_mo_destructive: { code: "MOds", title: "Кариес II класса MO с разрушением коронки", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class II DO (Disto-Occlusal)
	caries_c2_do_superficial: { code: "DOs", title: "Кариес II класса DO начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c2_do_media: { code: "DOm", title: "Кариес II класса DO средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c2_do_profunda: { code: "DOp", title: "Кариес II класса DO глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c2_do_destructive: { code: "DOds", title: "Кариес II класса DO с разрушением коронки", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class II MOD (Mesio-Occlusal-Distal)
	caries_c2_mod_superficial: { code: "MODs", title: "Кариес II класса MOD начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c2_mod_media: { code: "MODm", title: "Кариес II класса MOD средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c2_mod_profunda: { code: "MODp", title: "Кариес II класса MOD глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c2_mod_destructive: { code: "MODds", title: "Кариес II класса MOD тотальный разлом", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class III (Anterior Proximal without Incisal Angle)
	caries_c3_superficial: { code: "C3s", title: "Кариес III класса начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c3_media: { code: "C3m", title: "Кариес III класса средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c3_profunda: { code: "C3p", title: "Кариес III класса глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c3_destructive: { code: "C3ds", title: "Кариес III класса обширный", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class IV (Anterior Proximal with Incisal Angle Fracture)
	caries_c4_superficial: { code: "C4s", title: "Кариес IV класса (микроскол угла)", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c4_media: { code: "C4m", title: "Кариес IV класса (скол угла дентина)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c4_profunda: { code: "C4p", title: "Кариес IV класса (глубокий скол угла у пульпы)", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c4_destructive: { code: "C4ds", title: "Кариес IV класса (субтотальный перелом коронки)", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },

	// Class V (Cervical / Smooth Surface)
	caries_c5_superficial: { code: "C5s", title: "Кариес V класса пришеечный начальный", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_c5_media: { code: "C5m", title: "Кариес V класса пришеечный средний", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_c5_profunda: { code: "C5p", title: "Кариес V класса пришеечный глубокий", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_c5_destructive: { code: "C5ds", title: "Кариес V класса циркулярное разрушение шейки", bg: "#991b1b", border: "#7f1d1d", text: "#ffffff" },
};

export const TOOTH_CARIES_STATUS_MATRIX: Record<string, ToothStatusBadgeInfo> = {
	...RAW_CARIES_MATRIX,
};

for (const [key, val] of Object.entries(RAW_CARIES_MATRIX)) {
	const raw = key.startsWith("caries_") ? key.slice(7) : key;
	TOOTH_CARIES_STATUS_MATRIX[raw] = val;
	TOOTH_CARIES_STATUS_MATRIX[`caries_${raw}`] = val;

	// Support class2 / class1 / class3 / class4 / class5 expansion
	const expanded = raw.replace(/^c(\d)/, "class$1");
	if (expanded !== raw) {
		TOOTH_CARIES_STATUS_MATRIX[expanded] = val;
		TOOTH_CARIES_STATUS_MATRIX[`caries_${expanded}`] = val;
	}
}
