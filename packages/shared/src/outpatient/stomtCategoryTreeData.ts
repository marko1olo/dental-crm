import type { StomxCategoryTreeItem } from "./stomtOutpatientCatalog.js";

/**
 * Иерархическое дерево рубрик StomX 043/у (33 рубрики)
 */
export const STOMX_OUTPATIENT_CATEGORY_TREE: readonly StomxCategoryTreeItem[] =
	[
		{
			name: "Общее",
			id: 1,
			children: [
				{
					name: "Объективное обследование",
					id: 2,
					children: [],
				},
			],
		},
		{
			name: "Терапия",
			id: 3,
			children: [
				{
					name: "Жалобы",
					id: 4,
					children: [],
				},
				{
					name: "Развитие заболевания",
					id: 9,
					children: [],
				},
			],
		},
		{
			name: "Ортопедия",
			id: 5,
			children: [
				{
					name: "Жалобы",
					id: 6,
					children: [],
				},
				{
					name: "Развитие заболевания",
					id: 10,
					children: [],
				},
			],
		},
		{
			name: "Хирургия",
			id: 7,
			children: [
				{
					name: "Жалобы",
					id: 8,
					children: [],
				},
				{
					name: "Развитие заболевания",
					id: 11,
					children: [],
				},
			],
		},
		{
			name: "Рентген",
			id: 12,
			children: [
				{
					name: "Описание",
					id: 13,
					children: [],
				},
				{
					name: "Заключение",
					id: 14,
					children: [],
				},
			],
		},
		{
			name: "Быстрое заполнение",
			id: 15,
			children: [
				{
					name: "Терапия",
					id: 16,
					children: [],
				},
				{
					name: "Хирургия",
					id: 17,
					children: [],
				},
			],
		},
		{
			name: "ТЕРАПИЯ (новые) ",
			id: 57,
			children: [
				{
					name: "Восстановление зубов с диагнозом пульпит и периодонтит после эндодонтического лечения",
					id: 58,
					children: [],
				},
				{
					name: "Кариес",
					id: 60,
					children: [],
				},
				{
					name: "Некариозные поражения",
					id: 61,
					children: [],
				},
				{
					name: "Отбеливание",
					id: 62,
					children: [],
				},
				{
					name: "Периодонтит",
					id: 63,
					children: [],
				},
				{
					name: "Пульпит",
					id: 64,
					children: [],
				},
				{
					name: "Травмы зубов",
					id: 65,
					children: [],
				},
			],
		},
		{
			name: "Ортопедия (новые)",
			id: 66,
			children: [
				{
					name: "Виниры",
					id: 67,
					children: [],
				},
				{
					name: "Вкладки",
					id: 68,
					children: [],
				},
				{
					name: "Коронки",
					id: 69,
					children: [],
				},
				{
					name: "Несъемные мостовидные протезы на зубах",
					id: 70,
					children: [],
				},
				{
					name: "Несъемные протезы на имплантатах",
					id: 71,
					children: [],
				},
				{
					name: "Съемные протезы на зубах",
					id: 72,
					children: [],
				},
				{
					name: "Съемные протезы на имплантатах",
					id: 73,
					children: [],
				},
			],
		},
		{
			name: "Хирургия (новые)",
			id: 74,
			children: [
				{
					name: "Имплантация",
					id: 75,
					children: [],
				},
				{
					name: "Лечение корневых кист",
					id: 76,
					children: [],
				},
				{
					name: "Пародонтология",
					id: 77,
					children: [],
				},
				{
					name: "Перикоронит",
					id: 78,
					children: [],
				},
				{
					name: "Периостит",
					id: 79,
					children: [],
				},
				{
					name: "Синус-лифтинг",
					id: 80,
					children: [],
				},
				{
					name: "Удаление зубов",
					id: 81,
					children: [],
				},
				{
					name: "Формирователь десны",
					id: 82,
					children: [],
				},
			],
		},
	];
