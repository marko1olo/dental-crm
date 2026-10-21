export interface FdiGroup {
	label: string;
	options: { value: string; label: string }[];
}

export const FDI_TOOTH_GROUPS: FdiGroup[] = [
	{
		label: "Q1 Верхний правый (11-18)",
		options: [
			{ value: "18", label: "18 - Третий моляр" },
			{ value: "17", label: "17 - Второй моляр" },
			{ value: "16", label: "16 - Первый моляр" },
			{ value: "15", label: "15 - Второй премоляр" },
			{ value: "14", label: "14 - Первый премоляр" },
			{ value: "13", label: "13 - Клык" },
			{ value: "12", label: "12 - Боковой резец" },
			{ value: "11", label: "11 - Центральный резец" },
		],
	},
	{
		label: "Q2 Верхний левый (21-28)",
		options: [
			{ value: "21", label: "21 - Центральный резец" },
			{ value: "22", label: "22 - Боковой резец" },
			{ value: "23", label: "23 - Клык" },
			{ value: "24", label: "24 - Первый премоляр" },
			{ value: "25", label: "25 - Второй премоляр" },
			{ value: "26", label: "26 - Первый моляр" },
			{ value: "27", label: "27 - Второй моляр" },
			{ value: "28", label: "28 - Третий моляр" },
		],
	},
	{
		label: "Q3 Нижний левый (31-38)",
		options: [
			{ value: "31", label: "31 - Центральный резец" },
			{ value: "32", label: "32 - Боковой резец" },
			{ value: "33", label: "33 - Клык" },
			{ value: "34", label: "34 - Первый премоляр" },
			{ value: "35", label: "35 - Второй премоляр" },
			{ value: "36", label: "36 - Первый моляр" },
			{ value: "37", label: "37 - Второй моляр" },
			{ value: "38", label: "38 - Третий моляр" },
		],
	},
	{
		label: "Q4 Нижний правый (41-48)",
		options: [
			{ value: "48", label: "48 - Третий моляр" },
			{ value: "47", label: "47 - Второй моляр" },
			{ value: "46", label: "46 - Первый моляр" },
			{ value: "45", label: "45 - Второй премоляр" },
			{ value: "44", label: "44 - Первый премоляр" },
			{ value: "43", label: "43 - Клык" },
			{ value: "42", label: "42 - Боковой резец" },
			{ value: "41", label: "41 - Центральный резец" },
		],
	},
	{
		label: "Молочные зубы (51-85)",
		options: [
			{ value: "51", label: "51" },
			{ value: "52", label: "52" },
			{ value: "53", label: "53" },
			{ value: "54", label: "54" },
			{ value: "55", label: "55" },
			{ value: "61", label: "61" },
			{ value: "62", label: "62" },
			{ value: "63", label: "63" },
			{ value: "64", label: "64" },
			{ value: "65", label: "65" },
			{ value: "71", label: "71" },
			{ value: "72", label: "72" },
			{ value: "73", label: "73" },
			{ value: "74", label: "74" },
			{ value: "75", label: "75" },
			{ value: "81", label: "81" },
			{ value: "82", label: "82" },
			{ value: "83", label: "83" },
			{ value: "84", label: "84" },
			{ value: "85", label: "85" },
		],
	},
];
