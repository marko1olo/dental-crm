import type { InjectionTechniqueId } from "./types";

export interface TechniqueOption {
	readonly id: InjectionTechniqueId;
	readonly labelRu: string;
	readonly titleRu: string;
}

export const PRIMARY_TECHNIQUES: readonly TechniqueOption[] = [
	{
		id: "infiltration",
		labelRu: "Инфильтрационная",
		titleRu: "Инфильтрационная наднадкостничная анестезия",
	},
	{
		id: "mandibular_torus",
		labelRu: "Проводниковая",
		titleRu: "Проводниковая (мандибулярная/торусальная) анестезия",
	},
	{
		id: "intraligamentary_sta",
		labelRu: "Интралигаментарная",
		titleRu: "Интралигаментарная анестезия в периодонтальную связку",
	},
	{
		id: "application_topical",
		labelRu: "Аппликационная",
		titleRu: "Аппликационная поверхностная анестезия",
	},
];
