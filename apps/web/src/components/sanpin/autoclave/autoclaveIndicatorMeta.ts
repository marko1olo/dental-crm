export type IndicatorClassType =
	| "class4_multivariable"
	| "class5_integrating"
	| "class6_emulating"
	| "bowie_dick"
	| "helix_test";

export interface IndicatorMeta {
	labelRu: string;
	classBadge: string;
	standardRu: string;
	colorBefore: string;
	colorAfter: string;
}

export function getIndicatorMeta(type?: string): IndicatorMeta {
	switch (type) {
		case "class6_emulating":
			return {
				labelRu: "Класс 6 (Эмулирующий)",
				classBadge: "Класс VI",
				standardRu: "ГОСТ ISO 11140-1 (134°C / 5 мин)",
				colorBefore: "#fef08a",
				colorAfter: "#1e1b4b",
			};
		case "bowie_dick":
			return {
				labelRu: "Тест Бови-Дика (Вакуум)",
				classBadge: "Bowie-Dick",
				standardRu: "Проверка удаления воздуха и проникновения пара",
				colorBefore: "#e2e8f0",
				colorAfter: "#0f172a",
			};
		case "helix_test":
			return {
				labelRu: "Helix-тест (Полые каналы)",
				classBadge: "Helix PCD",
				standardRu: "Контроль стерилизации наконечников и трубок",
				colorBefore: "#fef3c7",
				colorAfter: "#1e293b",
			};
		case "class4_multivariable":
			return {
				labelRu: "Класс 4 (Многопеременный)",
				classBadge: "Класс IV",
				standardRu: "Контроль T° и времени выдержки",
				colorBefore: "#fed7aa",
				colorAfter: "#3b0764",
			};
		case "class5_integrating":
		default:
			return {
				labelRu: "Класс 5 (Интегрирующий)",
				classBadge: "Класс V",
				standardRu: "ГОСТ ISO 11140-1 (T°, пар, время)",
				colorBefore: "#fef08a",
				colorAfter: "#1c1917",
			};
	}
}
