import type { WarehouseInventoryCommissionMember } from "./warehouseAuditTypes.js";

export const SOLO_DOCTOR_COMMISSION_MEMBERS: readonly WarehouseInventoryCommissionMember[] = [
	{
		fullName: "Кузнецов Михаил Сергеевич",
		position: "Врач-стоматолог (МОЛ)",
		role: "chairman",
		roleRu: "Председатель комиссии (МОЛ / Единолично)",
	},
];

export const DEFAULT_COMMISSION_MEMBERS: readonly WarehouseInventoryCommissionMember[] = [
	{
		fullName: "Захаров Игорь Валентинович",
		position: "Главный врач клиники",
		role: "chairman",
		roleRu: "Председатель комиссии",
	},
	{
		fullName: "Васильев Олег Петрович",
		position: "Заведующий складом",
		role: "mol",
		roleRu: "МОЛ (Материально ответственное лицо)",
	},
	{
		fullName: "Смирнова Анна Викторовна",
		position: "Главная медицинская сестра",
		role: "member",
		roleRu: "Член комиссии",
	},
	{
		fullName: "Лебедева Елена Николаевна",
		position: "Ведущий бухгалтер",
		role: "accountant",
		roleRu: "Бухгалтер-ревизор",
	},
];
