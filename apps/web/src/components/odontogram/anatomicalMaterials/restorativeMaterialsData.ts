/**
 * DENTE Dental CRM — Restorative Materials & Surface Labels
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalSurfaceKey, RestorativeMaterialKey } from "../anatomicalGeometriesTypes";

export const RESTORATIVE_MATERIALS: Record<
	RestorativeMaterialKey,
	{
		readonly nameRu: string;
		readonly descriptionRu: string;
		readonly shaderId: string;
		readonly shaderAliasId?: string;
		readonly collarShaderId?: string;
		readonly patternId?: string;
		readonly hexShaderId?: string;
		readonly microgroovePatternId?: string;
		readonly strokeColor: string;
		readonly badgeColor: string;
	}
> = {
	composite: {
		nameRu: "Светоотверждаемый композит",
		descriptionRu: "Высоконаполненный наногибридный реставрационный композит (микрогибридная смола)",
		shaderId: "composite-fill-gradient",
		shaderAliasId: "dente-shader-composite",
		patternId: "composite-resin-pattern",
		strokeColor: "#0f766e",
		badgeColor: "#14b8a6",
	},
	amalgam: {
		nameRu: "Серебряная амальгама",
		descriptionRu: "Металлическая амальгама с высоким содержанием серебра и темным металлическим блеском",
		shaderId: "amalgam-metal-gradient",
		shaderAliasId: "dente-shader-amalgam",
		strokeColor: "#334155",
		badgeColor: "#64748b",
	},
	ceramic_emax: {
		nameRu: "Керамика IPS e.max",
		descriptionRu: "Дисиликат-литиевая стеклокерамика повышенной эстетики и опалесценции",
		shaderId: "ceramic-emax-gradient",
		shaderAliasId: "dente-shader-ceramic-emax",
		strokeColor: "#0284c7",
		badgeColor: "#38bdf8",
	},
	zirconia: {
		nameRu: "Диоксид циркония (3Y-TZP)",
		descriptionRu: "Монолитный диоксид циркония с циркулярным фрезерованным уступом и шелковистым блеском",
		shaderId: "zirconia-crown-gradient",
		shaderAliasId: "dente-shader-zirconia",
		strokeColor: "#1d4ed8",
		badgeColor: "#3b82f6",
	},
	pfm_crown: {
		nameRu: "Металлокерамика (PFM)",
		descriptionRu: "Металлокерамическая коронка с керамическим телом и пришеечным металлическим уступом",
		shaderId: "pfm-crown-gradient",
		shaderAliasId: "dente-shader-pfm",
		collarShaderId: "pfm-metal-collar",
		strokeColor: "#1e3a8a",
		badgeColor: "#2563eb",
	},
	gold: {
		nameRu: "Благородный золотой сплав",
		descriptionRu: "Литая золотая вкладка / коронка высокой точности с 24K металлическим блеском",
		shaderId: "gold-crown-gradient",
		shaderAliasId: "dente-shader-gold",
		strokeColor: "#b45309",
		badgeColor: "#f59e0b",
	},
	titanium_implant: {
		nameRu: "Титановый дентальный имплантат",
		descriptionRu: "Винтовой имплантат Grade 4/5 SLA с самонарезающей резьбой, микробороздками и шестигранным соединением",
		shaderId: "titanium-implant-gradient",
		shaderAliasId: "dente-shader-titanium-implant",
		hexShaderId: "implant-hex-gradient",
		microgroovePatternId: "implant-microgrooves-pattern",
		strokeColor: "#334155",
		badgeColor: "#6366f1",
	},
	titanium: {
		nameRu: "Биосовместимый титан (Grade 4/5)",
		descriptionRu: "Фрезерованный биосовместимый титан для балок, каркасов и индивидуальных абатментов",
		shaderId: "titanium-implant-gradient",
		shaderAliasId: "dente-shader-titanium",
		strokeColor: "#334155",
		badgeColor: "#6366f1",
	},
};

export const ANATOMICAL_SURFACE_LABELS_RU: Record<
	AnatomicalSurfaceKey,
	{ readonly nameRu: string; readonly shortRu: string; readonly descriptionRu: string }
> = {
	O: { nameRu: "Окклюзионная (жевательная) / режущий край", shortRu: "Оккл.", descriptionRu: "Жевательная или режущая поверхность коронки зуба (I класс по Блэку)" },
	V: { nameRu: "Вестибулярная (щечная / губная)", shortRu: "Вестиб.", descriptionRu: "Наружная щечная или губная поверхность коронки" },
	L: { nameRu: "Язычная / нёбная (оральная)", shortRu: "Язычн./Нёбн.", descriptionRu: "Внутренняя язычная или нёбная поверхность коронки" },
	M: { nameRu: "Медиальная (мезиальная / передняя контактная)", shortRu: "Медиал.", descriptionRu: "Передняя апроксимальная контактная поверхность (II, III, IV класс по Блэку)" },
	D: { nameRu: "Дистальная (задняя контактная)", shortRu: "Дистал.", descriptionRu: "Задняя апроксимальная контактная поверхность (II, III, IV класс по Блэку)" },
	C: { nameRu: "Пришеечная (цервикальная / десневая треть)", shortRu: "Пришееч.", descriptionRu: "Пришеечная область коронки зуба у границы эмаль-цемент (V класс по Блэку)" },
};

export const ANATOMICAL_SURFACE_NAMES_RU: Record<AnatomicalSurfaceKey, string> = {
	O: "Окклюзионная / Режущий край (O/I)",
	V: "Вестибулярная / Щечная (V/B)",
	L: "Язычная / Нёбная (L/P)",
	M: "Медиальная (M)",
	D: "Дистальная (D)",
	C: "Пришеечная / V класс (C/G)",
};
