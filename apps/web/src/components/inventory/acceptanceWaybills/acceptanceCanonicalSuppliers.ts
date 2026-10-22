import type { AcceptanceSupplier } from "../acceptanceWaybillsTypes.js";

export const CANONICAL_DENTAL_SUPPLIERS: readonly AcceptanceSupplier[] = [
	{
		id: "sup_stomtorg",
		name: 'ООО "Стомторг"',
		inn: "7701234567",
		phone: "+7 (495) 789-45-12",
		email: "sales@stomtorg.ru",
		isPreferred: true,
	},
	{
		id: "sup_dental_market",
		name: 'ООО "Дентал Маркет"',
		inn: "7715892341",
		phone: "+7 (495) 640-11-22",
		email: "order@dentalmarket.ru",
		isPreferred: true,
	},
	{
		id: "sup_vladmiva",
		name: 'АО "ВладМиВа"',
		inn: "3123014589",
		phone: "+7 (4722) 20-05-55",
		email: "info@vladmiva.ru",
		isPreferred: true,
	},
	{
		id: "sup_kavo",
		name: 'ООО "КаВо Дентал Руссланд"',
		inn: "7704281920",
		phone: "+7 (495) 232-15-50",
		email: "russia@kavo.com",
		isPreferred: false,
	},
	{
		id: "sup_rokada",
		name: 'ООО "Рокада Мед"',
		inn: "1655049382",
		phone: "+7 (843) 570-68-88",
		email: "kzn@rokada-med.ru",
		isPreferred: false,
	},
];
