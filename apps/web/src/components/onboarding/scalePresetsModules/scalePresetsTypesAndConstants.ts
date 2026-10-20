import React from "react";
import {
	Building2,
	Network,
	Stethoscope,
} from "lucide-react";

export type SovereignPresetId = "solo_doctor" | "standard_clinic" | "network_center";

export interface SovereignPresetDefinition {
	id: SovereignPresetId;
	title: string;
	subtitle: string;
	badge: string;
	badgeClass: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	chairsCountText: string;
	recommendationText: string;
	features: string[];
	excludedFeatures?: string[];
}

export const SOVEREIGN_PRESETS: readonly SovereignPresetDefinition[] = [
	{
		id: "solo_doctor",
		title: "Частный кабинет / Соло-врач",
		subtitle: "1 кресло • Субаренда • Индивидуальный приём",
		badge: "Быстрый старт (30 сек)",
		badgeClass: "badge-solo",
		icon: Stethoscope,
		chairsCountText: "1 кресло (Терапия/Хирургия)",
		recommendationText: "Врач на субаренде, частный кабинет, приём без ассистента и ресепшена",
		features: [
			"Приём и зубная формула FDI 11..48",
			"Автозаполнение протокола «✓ Соматически здоров»",
			"Экспресс-касса (Наличные + СБП по QR без ИНН физлиц)",
			"Минималистичный склад без блокировок приёма",
			"Скрыт сетевой административный шум",
		],
		excludedFeatures: [
			"Без жесткого партионного учета МДЛП",
			"Прямое ведение документации",
			"Без очередей колл-центра",
		],
	},
	{
		id: "standard_clinic",
		title: "Стандартная клиника",
		subtitle: "Клиника 1-3 кресла • Команда врачей",
		badge: "Оптимум для клиники",
		badgeClass: "badge-standard",
		icon: Building2,
		chairsCountText: "3 кресла (Терапия, Хирургия, Ортопедия)",
		recommendationText: "Семейная стоматология, разделение ролей: администратор, врачи и ассистенты",
		features: [
			"Расписание по креслам и докторам с гибким шагом",
			"Раздельные права доступа (Администратор / Врач / Ассистент)",
			"Кассовый блок 54-ФЗ с фискализацией и терминалом эквайринга",
			"Электронные журналы SanPiN 3.3686-21 (Автоклав, тест 5 класса)",
			"Интеграция со снимками визиографа и 2D-рентгена",
		],
		excludedFeatures: [
			"Без сложной многофилиальной маршрутизации",
		],
	},
	{
		id: "network_center",
		title: "Многопрофильный центр / Сеть",
		subtitle: "Сеть филиалов • ЗТЛ • КТ 3D",
		badge: "Максимальный масштаб",
		badgeClass: "badge-network",
		icon: Network,
		chairsCountText: "5+ кресел (Все специализации + Детство)",
		recommendationText: "Крупные медицинские центры, сеть филиалов, собственная зуботехническая лаборатория",
		features: [
			"Филиальная изоляция и единый контакт-центр",
			"Склад FEFO по номенклатуре Минздрава 804н",
			"Зуботехническая лаборатория (ЗТЛ и наряды VITA)",
			"Интеграция с 3D КТ / КЛКТ томографом и PACS",
			"ЕГИСЗ РЭМД и страховые компании (ДМС)",
		],
	},
];
