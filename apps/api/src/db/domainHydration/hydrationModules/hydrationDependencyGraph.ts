/**
 * hydrationDependencyGraph.ts — Граф зависимостей и топологический порядок срезов гидратации (Layer 1/2).
 * Гарантирует отсутствие циклических зависимостей при параллельной и ступенчатой загрузке данных.
 */

export interface SliceDependencyNode {
	key: string;
	tier: number;
	dependencies: string[];
	isCritical: boolean;
	description: string;
}

/**
 * Каноническая матрица зависимостей доменных срезов CRM.
 */
export const HYDRATION_DEPENDENCY_GRAPH: Record<string, SliceDependencyNode> = {
	organizations: {
		key: "organizations",
		tier: 0,
		dependencies: [],
		isCritical: true,
		description: "Организация и юридический профиль клиники (корневой тенант)",
	},
	clinics: {
		key: "clinics",
		tier: 0,
		dependencies: ["organizations"],
		isCritical: false,
		description: "Филиалы и кабинеты клиники",
	},
	users: {
		key: "users",
		tier: 1,
		dependencies: ["organizations"],
		isCritical: false,
		description: "Сотрудники, врачи и администраторы",
	},
	chairs: {
		key: "chairs",
		tier: 1,
		dependencies: ["organizations"],
		isCritical: false,
		description: "Стоматологические установки и оборудование",
	},
	serviceCatalog: {
		key: "serviceCatalog",
		tier: 1,
		dependencies: ["organizations"],
		isCritical: false,
		description: "Номенклатура и прайс-лист клиники",
	},
	payments: {
		key: "payments",
		tier: 2,
		dependencies: ["organizations"],
		isCritical: true,
		description: "Финансовые транзакции и фискальные чеки",
	},
	treatmentItems: {
		key: "treatmentItems",
		tier: 2,
		dependencies: ["organizations"],
		isCritical: true,
		description: "Позиции планов лечения и оказанные услуги",
	},
	patients: {
		key: "patients",
		tier: 2,
		dependencies: ["organizations", "payments", "treatmentItems"],
		isCritical: true,
		description: "Картотека пациентов с вычисленным балансом",
	},
	labOrders: {
		key: "labOrders",
		tier: 3,
		dependencies: ["organizations", "patients"],
		isCritical: false,
		description: "Наряды в зуботехническую лабораторию (ЗТЛ)",
	},
	appointments: {
		key: "appointments",
		tier: 3,
		dependencies: ["organizations", "patients", "chairs", "users", "labOrders"],
		isCritical: false,
		description: "Приёмы и слоты в расписании врачей",
	},
	visits: {
		key: "visits",
		tier: 3,
		dependencies: ["organizations", "patients"],
		isCritical: true,
		description: "Протоколы приёма ЭМК и одонтограмма",
	},
	documents: {
		key: "documents",
		tier: 3,
		dependencies: ["organizations", "patients"],
		isCritical: false,
		description: "Сформированные договоры, ИДС, акты и справки",
	},
	communicationTasks: {
		key: "communicationTasks",
		tier: 3,
		dependencies: ["organizations", "patients"],
		isCritical: false,
		description: "Задачи коммуникации, подтверждения и сервисные звонки",
	},
	communicationEvents: {
		key: "communicationEvents",
		tier: 3,
		dependencies: ["organizations", "patients"],
		isCritical: false,
		description: "События переписки в мессенджерах и SMS",
	},
	imagingStudies: {
		key: "imagingStudies",
		tier: 3,
		dependencies: ["organizations", "patients"],
		isCritical: false,
		description: "Снимки визиографа, ОПТГ и КЛКТ",
	},
	clinicalRules: {
		key: "clinicalRules",
		tier: 3,
		dependencies: ["organizations"],
		isCritical: false,
		description: "Клинические правила онбординга и безопасности",
	},
	protocolTemplates: {
		key: "protocolTemplates",
		tier: 3,
		dependencies: ["organizations"],
		isCritical: false,
		description: "Шаблоны дневников приёма и протоколов 043/у",
	},
};

/**
 * Топологическая сортировка срезов с проверкой отсутствия циклических зависимостей.
 */
export function resolveHydrationOrder(): string[] {
	const visited = new Set<string>();
	const visiting = new Set<string>();
	const order: string[] = [];

	function dfs(key: string): void {
		if (visiting.has(key)) {
			throw new Error(`[HydrationDependencyGraph] Обнаружена циклическая зависимость в срезе "${key}".`);
		}
		if (visited.has(key)) return;

		visiting.add(key);
		const node = HYDRATION_DEPENDENCY_GRAPH[key];
		if (node) {
			for (const dep of node.dependencies) {
				dfs(dep);
			}
		}
		visiting.delete(key);
		visited.add(key);
		order.push(key);
	}

	for (const key of Object.keys(HYDRATION_DEPENDENCY_GRAPH)) {
		if (!visited.has(key)) {
			dfs(key);
		}
	}

	return order;
}

/**
 * Возвращает ярус (Tier) выполнения среза для параллелизации.
 */
export function getSliceTier(sliceKey: string): number {
	return HYDRATION_DEPENDENCY_GRAPH[sliceKey]?.tier ?? 3;
}
