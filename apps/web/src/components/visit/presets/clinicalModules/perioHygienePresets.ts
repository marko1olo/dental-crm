import type { DoctorAutopilotPreset } from "../../clinicalSoapTypes";

// ── ПРОФГИГИЕНА / AIR-FLOW (К03.6) ──
export const AUTOPILOT_HYGIENE_AIRFLOW: DoctorAutopilotPreset = {
	id: "autopilot_hygiene_airflow",
	title: "Профгигиена / Air-Flow — УЗ-скейлинг EMS/Piezon, Air-Flow порошок на основе глицина, полировочная паста Cleanic, фторлак",
	shortBadge: "Гигиена",
	category: "hygiene",
	icd10: "K03.6",
	icd10Label: "Отложения (наросты) на зубах / Зубной камень",
	toothState: "Healthy",
	is1ClickAutopilot: true,
	complaint: "Жалобы на пигментированный налет от кофе/чая, зубной камень, кровоточивость десен при чистке. Плановая профессиональная гигиена полости рта.",
	anamnesis: "Последняя профгигиена проводилась более 6 месяцев назад. Аллергии нет, соматически здоров. Информированное согласие (ИДС) оформлено.",
	statusLocalis: "Минерализованный над- и поддесневой зубной камень, пигментированный налет. Десна гиперемирована, отечна, кровоточивость при зондировании (BOP+). Пародонтальных карманов нет.",
	treatmentDescription:
		"1. Индикация зубных отложений раствором фуксина, аппликационное обезболивание десны гелем (Лидокаин 2%).\n" +
		"2. Ультразвуковой скейлинг скейлером EMS Piezon Master с водяным охлаждением (A16.07.051).\n" +
		"3. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком глицина 25 мкм (щадящая для эмали и поддесневых зон).\n" +
		"4. Полировка поверхностей зубов пастой Cleanic с циркулярными щеточками до зеркального блеска, межзубный флосс и штрипсы.\n" +
		"5. Антисептическая обработка десневого края 0.05% хлоргексидином.\n" +
		"6. Реминерализующая терапия: аппликация защитного фторлака (Clinpro White Varnish / Bifluorid 12).\n" +
		"7. Обучение индивидуальной гигиене, подбор зубных щеток, ершиков и ирригатора.",
	service804n: {
		code804n: "A16.07.051",
		title: "Комплексная профессиональная гигиена полости рта (УЗ-скейлинг EMS/Piezon, Air-Flow порошок глицин, полировочная паста Cleanic, фторлак)",
		basePriceRub: 5000,
		category: "hygiene",
	},
	informedConsent: "Информированное добровольное согласие (ИДС) на проведение профессиональной гигиены полости рта подписано.",
	materialsToDeduct: [
		{ name: "Air-Flow порошок на основе глицина EMS Plus", category: "hygiene", unit: "г", quantity: 25, unitCostRub: 18 },
		{ name: "Полировочная паста Cleanic", category: "hygiene", unit: "г", quantity: 3, unitCostRub: 40 },
		{ name: "Защитный фторлак Clinpro White Varnish / Bifluorid 12", category: "hygiene", unit: "мл", quantity: 0.5, unitCostRub: 640 },
		{ name: "Ретрактор мягкий для губ OptraGate", category: "hygiene", unit: "шт.", quantity: 1, unitCostRub: 210 },
		{ name: "Раствор хлоргексидина биглюконата 0.05%", category: "hygiene", unit: "мл", quantity: 15, unitCostRub: 3 },
	],
	recommendations: "«Белая диета» 24 часа (без кофе, чая, ягод, курения). Замена зубной щетки. Плановый осмотр и гигиена через 6 месяцев.",
};

// ── ПРОФГИГИЕНА И ГИНГИВИТ (К05.1) ──
export const AUTOPILOT_HYGIENE_K051: DoctorAutopilotPreset = {
	...AUTOPILOT_HYGIENE_AIRFLOW,
	id: "autopilot_hygiene_k051",
	title: "Профгигиена полости рта (K05.1) — УЗ-скейлинг EMS/Piezon, Air-Flow глицин, полировка Cleanic, глубокое фторирование",
	shortBadge: "Профгигиена",
	category: "hygiene",
	icd10: "K05.1",
	icd10Label: "Хронический катаральный гингивит / Профгигиена",
	service804n: {
		code804n: "A16.07.051",
		title: "Комплексная профессиональная гигиена полости рта (УЗ-скейлинг EMS/Piezon, Air-Flow глицин, паста Cleanic, фторирование)",
		basePriceRub: 5000,
		category: "hygiene",
	},
};
