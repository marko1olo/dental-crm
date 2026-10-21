import type { CabinetDefinition } from "./types";

/**
 * Cabinets catalog in a multi-specialty dental clinic
 */
export const CLINIC_CABINETS_CATALOG: CabinetDefinition[] = [
	{
		id: "cab-1",
		number: 1,
		name: "Кабинет 1 (Терапия и эндодонтия)",
		specialty: "Терапия",
		chairs: [
			{ id: "chair-1a", name: "Кресло 1А (A-dec 500)", equipment: "Микроскоп Leica M320, Эндомотор" },
			{ id: "chair-1b", name: "Кресло 1Б (Stern Weber)", equipment: "УЗ-скейлер, Бинокуляры" },
		],
	},
	{
		id: "cab-2",
		number: 2,
		name: "Кабинет 2 (Хирургия и имплантация)",
		specialty: "Хирургия",
		chairs: [
			{ id: "chair-2", name: "Кресло 2 (KaVo ESTETICA E80)", equipment: "Физиодиспенсер NSK, Пьезотом" },
		],
	},
	{
		id: "cab-3",
		number: 3,
		name: "Кабинет 3 (Ортопедия и гнатология)",
		specialty: "Ортопедия",
		chairs: [
			{ id: "chair-3", name: "Кресло 3 (Planmeca Compact i5)", equipment: "Интраоральный сканер 3Shape TRIOS" },
		],
	},
	{
		id: "cab-4",
		number: 4,
		name: "Кабинет 4 (Детский и ортодонтия)",
		specialty: "Детство и ортодонтия",
		chairs: [
			{ id: "chair-4", name: "Кресло 4 (Dentsply Sirona Intego)", equipment: "Закись азота седация, Экран" },
		],
	},
];
