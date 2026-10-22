export type WarehouseBranchId = "central_hub" | "branch_center" | "branch_north" | "branch_south";

export interface WarehouseBranchDefinition {
	readonly id: WarehouseBranchId;
	readonly code: string;
	readonly okpoCode: string;
	readonly nameRu: string;
	readonly addressRu: string;
	readonly responsiblePersonRu: string;
	readonly responsiblePositionRu: string;
	readonly isCentralHub: boolean;
}

export const WAREHOUSE_BRANCHES: readonly WarehouseBranchDefinition[] = [
	{
		id: "central_hub",
		code: "ЦС-01",
		okpoCode: "49201948",
		nameRu: "Центральный распределительный склад (ЦС)",
		addressRu: "г. Москва, ул. Складская, д. 12, стр. 3",
		responsiblePersonRu: "Васильев Олег Петрович",
		responsiblePositionRu: "Заведующий центральным складом",
		isCentralHub: true,
	},
	{
		id: "branch_center",
		code: "ФИЛ-01",
		okpoCode: "49201954",
		nameRu: "Филиал «Центральный» (Тверская)",
		addressRu: "г. Москва, ул. Тверская, д. 24",
		responsiblePersonRu: "Смирнова Анна Викторовна",
		responsiblePositionRu: "Главная медицинская сестра",
		isCentralHub: false,
	},
	{
		id: "branch_north",
		code: "ФИЛ-02",
		okpoCode: "49201960",
		nameRu: "Филиал «Северный» (Сокол)",
		addressRu: "г. Москва, Ленинградский пр-т, д. 74",
		responsiblePersonRu: "Кузнецова Ирина Сергеевна",
		responsiblePositionRu: "Старшая медицинская сестра",
		isCentralHub: false,
	},
	{
		id: "branch_south",
		code: "ФИЛ-03",
		okpoCode: "49201977",
		nameRu: "Филиал «Южный» (Профсоюзная)",
		addressRu: "г. Москва, ул. Профсоюзная, д. 56",
		responsiblePersonRu: "Морозова Елена Павловна",
		responsiblePositionRu: "Старшая медицинская сестра",
		isCentralHub: false,
	},
];

export function getWarehouseBranch(id: WarehouseBranchId): WarehouseBranchDefinition {
	const found = WAREHOUSE_BRANCHES.find((b) => b.id === id);
	return found || WAREHOUSE_BRANCHES[0]!;
}
