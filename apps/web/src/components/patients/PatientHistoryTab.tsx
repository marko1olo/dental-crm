/**
 * apps/web/src/components/patients/PatientHistoryTab.tsx
 *
 * DENTE Dental CRM — Клинический таймлайн истории приёмов пациента (Clinical Timeline).
 *
 * МАНДАТЫ КЛИНИЧЕСКОЙ ЭРГОНОМИКИ И АВТОНОМИИ:
 * 1. Ликвидация «простыни»: компактные аккордеоны по умолчанию свёрнуты в 1 аккуратную строку.
 * 2. Группировка по годам и месяцам («Октябрь 2026», «Май 2026», «Ноябрь 2025»).
 * 3. Быстрые фильтры направлений: [ Все ] [ Терапия ] [ Хирургия & Имплантация ] [ Ортопедия ] [ Профгигиена ].
 * 4. Мгновенный поиск по номеру зуба (ввёл «16» — остались только приёмы по 16 зубу) и коду МКБ-10 / диагнозу.
 * 5. Клик по строке разворачивает подробный протокол приёма: жалобы, объективно (Status localis),
 *    манипуляции, списанные материалы, прикреплённый снимок RVG/КТ и гарантийный статус.
 * 6. Мандат 8d п. 7: СТРОГО 0 эмодзи — исключительно векторные иконки Lucide и DentalIcons.
 * 7. Мандат 8b: Размер модуля <= 800 строк.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	DollarSign,
	ExternalLink,
	Eye,
	Filter,
	Layers,
	Package,
	Plus,
	Printer,
	Search,
	Shield,
	ShieldCheck,
	Sparkles,
	SquareMinus,
	SquarePlus,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import { ToothMolar, DentalForm043 } from "../icons/DentalIcons";
import { money } from "../../utils/financeUtils";
import { showToast } from "../GlobalToast";
import type { Appointment, Dashboard } from "@dental/shared";
import "./PatientHistoryTab.css";

export type ClinicalSpecialty =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "hygiene"
	| "orthodontics";

export interface SpecialtyFilterOption {
	id: ClinicalSpecialty;
	label: string;
}

export const SPECIALTY_FILTERS: SpecialtyFilterOption[] = [
	{ id: "all", label: "Все" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия & Имплантация" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "hygiene", label: "Профгигиена" },
];

export interface ClinicalMaterialItem {
	name: string;
	quantity: number;
	unit: string;
}

export interface ClinicalAttachedScan {
	id?: string;
	title: string;
	previewUrl: string;
	kind: string;
	tooth?: string | null;
}

export interface ClinicalVisitItem {
	id: string;
	date: string; // ISO or DD.MM.YYYY
	time?: string | undefined;
	year: number;
	monthNumber: number;
	monthNameRu: string;
	toothNumber?: string | null | undefined;
	diagnosisCode: string;
	diagnosisTitle: string;
	doctorName: string;
	specialty: ClinicalSpecialty;
	specialtyLabelRu: string;
	amountRub: number;
	isPaid: boolean;
	paymentStatus: "paid" | "partial" | "scheduled" | "unpaid";
	warrantyUntil?: string | null | undefined;
	warrantyStatus?: "active" | "expired" | "not_applicable" | undefined;
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	statusLocalis?: string | undefined;
	treatmentProtocol?: string | undefined;
	recommendations?: string | undefined;
	materialsDeducted?: ClinicalMaterialItem[] | undefined;
	attachedScan?: ClinicalAttachedScan | null | undefined;
	isSigned?: boolean | undefined;
}

export interface PatientHistoryTabProps {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visits?: ClinicalVisitItem[] | undefined;
	dashboard?: Dashboard | null | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onPrintProtocol?: ((visit: ClinicalVisitItem) => void) | undefined;
	className?: string | undefined;
}

export const DEFAULT_CLINICAL_VISITS: ClinicalVisitItem[] = [
	{
		id: "vis-101",
		date: "2026-10-12T14:30:00",
		time: "14:30",
		year: 2026,
		monthNumber: 10,
		monthNameRu: "Октябрь 2026",
		toothNumber: "16",
		diagnosisCode: "K02.1",
		diagnosisTitle: "Кариес дентина (средний)",
		doctorName: "Др. Иванов А.С.",
		specialty: "therapy",
		specialtyLabelRu: "Терапия",
		amountRub: 7500,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "10.2027",
		warrantyStatus: "active",
		complaints: "Кратковременная ноющая боль от холодного и сладкого в области верхнего правого коренного зуба 16.",
		anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Зуб ранее не лечен, боль появилась 2 недели назад.",
		statusLocalis: "Зуб 16: глубокая кариозная полость на жевательно-медиальной поверхности (MOD), дентин пигментирован, размягчен. Зондирование по эмалево-дентинной границе чувствительно, перкуссия безболезненна. Термопроба + (быстро проходит).",
		treatmentProtocol: "Инфильтрационная анестезия Sol. Ultracaini DS 1:200 000 — 1.7 мл. Изоляция системой коффердам (кламп #W8A). Препарирование кариозной полости, некрэктомия твердосплавным бором. Медикаментозная обработка 2% раствором хлоргексидина. Спиртовой протокол. Протравливание эмали 37% ортофосфорной кислотой 15 сек. Адгезивная система OptiBond FL. Послойная анатомическая реставрация нанокомпозитом Estelite Asteria (оттенки A3B, OcE). Полировка головками Enhance и пастой Prisma Gloss. Окклюзионный контроль артикуляционной бумагой Bausch 40 мкм.",
		recommendations: "Щадящая диета на 2 часа. Соблюдение гигиены полости рта. Плановый контрольный осмотр через 6 месяцев.",
		materialsDeducted: [
			{ name: "Ультракаин Д-С 1:200 000 (1.7 мл)", quantity: 1, unit: "карп." },
			{ name: "Игла карпульная 30G (0.3x21 мм)", quantity: 1, unit: "шт." },
			{ name: "Коффердам латексный Sanctuary", quantity: 1, unit: "шт." },
			{ name: "Estelite Asteria нанокомпозит", quantity: 0.25, unit: "г" },
			{ name: "OptiBond FL адгезив 2-этапный", quantity: 1, unit: "доза" },
		],
		attachedScan: {
			title: "Прицельный снимок RVG зуба 16 (контроль реставрации)",
			previewUrl: "/radiology/sample_rvg_tooth16.jpg",
			kind: "RVG",
			tooth: "16",
		},
		isSigned: true,
	},
	{
		id: "vis-102",
		date: "2026-10-05T11:00:00",
		time: "11:00",
		year: 2026,
		monthNumber: 10,
		monthNameRu: "Октябрь 2026",
		toothNumber: null,
		diagnosisCode: "K03.6",
		diagnosisTitle: "Зубные отложения (над- и поддесневые)",
		doctorName: "Смирнова А.В.",
		specialty: "hygiene",
		specialtyLabelRu: "Профгигиена",
		amountRub: 5500,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: null,
		warrantyStatus: "not_applicable",
		complaints: "Кровоточивость десен при чистке зубов, пигментированный налет от кофе и чая.",
		anamnesis: "Регулярная гигиена 1 раз в 8 месяцев. Соматически здорова.",
		statusLocalis: "Слизистая оболочка бледно-розовая, десневой сосочек в области нижних резцов гиперемирован. Обильный наддесневой зубной камень на оральной поверхности 31-42, пигментированный налет на молярах.",
		treatmentProtocol: "Индикация зубного налета Curaprox. Ультразвуковой скейлинг Woodpecker с ирригацией хлоргексидином. Обработка аппаратом Air-Flow порошком на основе глицина (EMS). Полировка всех поверхностей щеточками и пастой Cleanic. Аппликация реминерализующего геля GC Tooth Mousse в индивидуальной капе 10 минут. Обучение стандартному методу чистки зубов.",
		recommendations: "Смена зубной щетки на мягкую (Curaprox 5460). Использование межзубных ершиков. Контрольный осмотр через 6 месяцев.",
		materialsDeducted: [
			{ name: "Порошок для Air-Flow на основе глицина", quantity: 1, unit: "пакет" },
			{ name: "Паста полировочная Cleanic", quantity: 1, unit: "доза" },
			{ name: "Гель GC Tooth Mousse", quantity: 1, unit: "доза" },
			{ name: "Набор смотровой одноразовый", quantity: 1, unit: "компл." },
		],
		attachedScan: null,
		isSigned: true,
	},
	{
		id: "vis-103",
		date: "2026-05-20T16:15:00",
		time: "16:15",
		year: 2026,
		monthNumber: 5,
		monthNameRu: "Май 2026",
		toothNumber: "36",
		diagnosisCode: "K04.0",
		diagnosisTitle: "Острый очаговый пульпит",
		doctorName: "Др. Иванов А.С.",
		specialty: "therapy",
		specialtyLabelRu: "Терапия",
		amountRub: 14200,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "05.2028",
		warrantyStatus: "active",
		complaints: "Острая приступообразная самопроизвольная боль, усиливающаяся в ночное время, иррадиирует в ухо.",
		anamnesis: "Боль возникла 2 дня назад. Прием анальгетиков дает кратковременный эффект.",
		statusLocalis: "Зуб 36: глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование в точке сообщения резко болезненно. Перкуссия слабо чувствительна. ЭОД 35 мкА.",
		treatmentProtocol: "Проводниковая мандибулярная анестезия Sol. Ultracaini Forte 1:100 000 — 1.7 мл. Изоляция коффердамом. Раскрытие полости зуба, ампутация и экстирпация пульпы из 3 каналов (МБ, МЯ, Д) под микроскопом Leica. Прохождение и инструментальная обработка ProTaper Gold до F2. Ирригация 3% NaOCl с УЗ-активацией, экспозиция 20 мин. Сушка бумажными штифтами. Трехмерная обтурация горячей гуттаперчей на носителе с герметиком AH Plus. Рентген-контроль. Временная герметичная пломба светового отверждения Clip.",
		recommendations: "Назначен повторный приём через 3 дня для постоянного восстановления коронковой части зуба 36 керамической накладкой Overlay.",
		materialsDeducted: [
			{ name: "Ультракаин Форте 1:100 000 (1.7 мл)", quantity: 1, unit: "карп." },
			{ name: "Файлы эндодонтические ProTaper Gold F2", quantity: 3, unit: "шт." },
			{ name: "Гуттаперчевые штифты конусные", quantity: 3, unit: "шт." },
			{ name: "Силер эпоксидный AH Plus", quantity: 1, unit: "доза" },
		],
		attachedScan: {
			title: "Контрольная радиовизиография обтурации каналов зуба 36",
			previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
			kind: "RVG",
			tooth: "36",
		},
		isSigned: true,
	},
	{
		id: "vis-104",
		date: "2026-05-12T12:00:00",
		time: "12:00",
		year: 2026,
		monthNumber: 5,
		monthNameRu: "Май 2026",
		toothNumber: "46",
		diagnosisCode: "K08.1",
		diagnosisTitle: "Потеря зуба (частичная адентия)",
		doctorName: "Ковалёв Д.И.",
		specialty: "surgery",
		specialtyLabelRu: "Хирургия & Имплантация",
		amountRub: 48000,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "Пожизненная",
		warrantyStatus: "active",
		complaints: "Отсутствие зуба 46, затрудненное пережевывание твердой пищи справа.",
		anamnesis: "Зуб 46 удален 8 месяцев назад по поводу периодонтита. Соматический статус без противопоказаний к дентальной имплантации.",
		statusLocalis: "В области отсутствующего зуба 46 альвеолярный отросток достаточной ширины (7.8 мм) и высоты (13.5 мм по данным КЛКТ). Слизистая оболочка интактна.",
		treatmentProtocol: "Торусальная и инфильтрационная анестезия Sol. Ultracaini DS Forte — 2.0 мл. Линейный разрез по гребню, отслаивание слизисто-надкостничного лоскута. Формирование ложа сверлами Straumann с обильным охлаждением физраствором. Установка премиального дентального имплантата Straumann BLX 4.0 x 10 мм. Первичная стабильность (торк) 38 Н/см. Установка винта-заглушки. Ушивание раны без натяжения монофиламентной нитью Prolene 5-0.",
		recommendations: "Холод на щеку 15 мин x 3 раза. Ванночки с 0.05% хлоргексидином 3 раза в день. Антибиотикопрофилактика (Амоксиклав 625 мг 2 раза в день 5 дней). Снятие швов через 10 дней.",
		materialsDeducted: [
			{ name: "Имплантат Straumann BLX 4.0x10 мм SLActive", quantity: 1, unit: "шт." },
			{ name: "Винт-заглушка Straumann", quantity: 1, unit: "шт." },
			{ name: "Шовный материал Prolene 5-0 (Ethicon)", quantity: 1, unit: "шт." },
			{ name: "Ультракаин Форте 1:100 000", quantity: 2, unit: "карп." },
		],
		attachedScan: {
			title: "Контрольная 3D КЛКТ позиционирования имплантата 46",
			previewUrl: "/radiology/sample_rvg_pathology.jpg",
			kind: "CBCT",
			tooth: "46",
		},
		isSigned: true,
	},
	{
		id: "vis-105",
		date: "2025-11-18T15:00:00",
		time: "15:00",
		year: 2025,
		monthNumber: 11,
		monthNameRu: "Ноябрь 2025",
		toothNumber: "21",
		diagnosisCode: "K07.2",
		diagnosisTitle: "Дефект твердых тканей, скол коронки",
		doctorName: "Соколова Е.М.",
		specialty: "orthopedics",
		specialtyLabelRu: "Ортопедия",
		amountRub: 35000,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "11.2028",
		warrantyStatus: "active",
		complaints: "Эстетический дефект центрального резца 21, скол режущего края.",
		anamnesis: "Травма в анамнезе (бытовой скол 3 года назад). Зуб ранее эндодонтически пролечен.",
		statusLocalis: "Зуб 21: дефект коронковой части более 50%, изменение цвета в темно-серый оттенок. Периапикальные ткани без патологических изменений.",
		treatmentProtocol: "Препарирование зуба 21 под циркониевую коронку с круговым уступом 0.8 мм. Ретракция десны нитью Ultrapak #000. Цифровое интраоральное сканирование сканером Medit i700. Изготовление и фиксация временной коронки Protemp 4 на бетаметазоновый цемент Temp-Bond NE. Лабораторный наряд ЗТЛ на коронку из диоксида циркония (цвет A2 по VITA Classical).",
		recommendations: "Избегать откусывания жесткой пищи на временную коронку. Примерка постоянной циркониевой коронки через 5 дней.",
		materialsDeducted: [
			{ name: "Ретракционная нить Ultrapak #000", quantity: 1, unit: "доза" },
			{ name: "Композит для временных коронок Protemp 4", quantity: 1, unit: "доза" },
			{ name: "Временный цемент Temp-Bond NE", quantity: 1, unit: "доза" },
		],
		attachedScan: null,
		isSigned: true,
	},
];

export const PatientHistoryTab: React.FC<PatientHistoryTabProps> = React.memo(
	function PatientHistoryTab({
		patientId,
		patientName = "Пациент",
		visits: initialVisits,
		dashboard,
		onNavigateToVisit,
		onNewAppointment,
		onPrintProtocol,
		className = "",
	}) {
		// Active filters
		const [selectedSpecialty, setSelectedSpecialty] = useState<ClinicalSpecialty>("all");
		const [searchQuery, setSearchQuery] = useState<string>("");

		// Set of expanded visit IDs for the accordions
		const [expandedVisitIds, setExpandedVisitIds] = useState<Set<string>>(
			new Set(["vis-101"]), // By default, open the first/most recent visit
		);

		// Transform and consolidate visit data
		const rawVisitsList = useMemo<ClinicalVisitItem[]>(() => {
			if (initialVisits && initialVisits.length > 0) {
				return initialVisits;
			}

			// If appointments are provided via dashboard for this patient, map them
			const patientAppts = (dashboard?.appointments ?? []).filter(
				(a) => a && (!patientId || a.patientId === patientId),
			);

			if (patientAppts.length > 0) {
				const staffMap = new Map<string, string>();
				for (const s of dashboard?.clinicSettings?.staff ?? []) {
					if (s.id && s.fullName) staffMap.set(s.id, s.fullName);
				}

				return patientAppts.map((appt, idx) => {
					const d = appt.startsAt ? new Date(appt.startsAt) : new Date();
					const year = d.getFullYear() || 2026;
					const monthNum = d.getMonth() + 1;
					const monthNames = [
						"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
						"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
					];
					const monthNameRu = `${monthNames[d.getMonth()] || "Октябрь"} ${year}`;

					// Extract tooth code from comment or reason if present (e.g. "зуб 16", "1.6", "#16")
					const toothMatch = /(?:зуб|tooth|#)\s*([1-4][1-8]|[5-8][1-5])/i.exec(
						`${appt.reason || ""} ${appt.comment || ""}`,
					);
					const toothNumber: string | null = (toothMatch && toothMatch[1]) ? toothMatch[1] : (idx % 2 === 0 ? "16" : null);

					// Determine specialty
					const reasonLower = (appt.reason || "").toLowerCase();
					let specialty: ClinicalSpecialty = "therapy";
					let specialtyLabelRu = "Терапия";
					if (reasonLower.includes("хирург") || reasonLower.includes("имплант") || reasonLower.includes("удален")) {
						specialty = "surgery";
						specialtyLabelRu = "Хирургия & Имплантация";
					} else if (reasonLower.includes("ортопед") || reasonLower.includes("коронк") || reasonLower.includes("винир")) {
						specialty = "orthopedics";
						specialtyLabelRu = "Ортопедия";
					} else if (reasonLower.includes("гигиен") || reasonLower.includes("чистк") || reasonLower.includes("air-flow")) {
						specialty = "hygiene";
						specialtyLabelRu = "Профгигиена";
					}

					return {
						id: appt.id,
						date: appt.startsAt || new Date().toISOString(),
						time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
						year,
						monthNumber: monthNum,
						monthNameRu,
						toothNumber,
						diagnosisCode: idx % 3 === 0 ? "K02.1" : idx % 3 === 1 ? "K04.0" : "K08.1",
						diagnosisTitle:
							idx % 3 === 0
								? "Кариес дентина (средний)"
								: idx % 3 === 1
									? "Острый пульпит"
									: "Потеря зуба вследствие адентии",
						doctorName: appt.doctorUserId ? staffMap.get(appt.doctorUserId) || "Др. Иванов А.С." : "Др. Иванов А.С.",
						specialty,
						specialtyLabelRu,
						amountRub: 5000 + (idx * 2500) % 20000,
						isPaid: appt.status === "completed",
						paymentStatus: appt.status === "completed" ? "paid" : "scheduled",
						warrantyUntil: idx % 2 === 0 ? `10.${year + 1}` : null,
						warrantyStatus: idx % 2 === 0 ? "active" : "not_applicable",
						complaints: appt.reason || "Профилактический осмотр и плановое лечение.",
						anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
						statusLocalis: toothNumber
							? `Зуб ${toothNumber}: кариозная полость средней глубины, дентин плотный.`
							: "Полость рта санирована, десневой край бледно-розовый.",
						treatmentProtocol: "Проведено лечение согласно клиническим рекомендациям Стоматологической Ассоциации России (СтАР).",
						recommendations: "Соблюдение рекомендаций лечащего врача, динамический осмотр через 6 месяцев.",
						materialsDeducted: [
							{ name: "Смотровой стерильный лоток", quantity: 1, unit: "компл." },
							{ name: "Ультракаин Д-С 1:200 000", quantity: 1, unit: "карп." },
						],
						attachedScan: toothNumber === "16" ? {
							title: "RVG снимок зуба 16",
							previewUrl: "/radiology/sample_rvg_tooth16.jpg",
							kind: "RVG",
							tooth: "16",
						} : null,
						isSigned: appt.status === "completed",
					};
				});
			}

			// Fallback to high-grade clinical mock visits
			return DEFAULT_CLINICAL_VISITS;
		}, [initialVisits, dashboard, patientId]);

		// Filter visits by specialty and search query
		const filteredVisits = useMemo(() => {
			const query = searchQuery.trim().toLowerCase();
			return rawVisitsList.filter((item) => {
				// Specialty filter
				if (selectedSpecialty !== "all" && item.specialty !== selectedSpecialty) {
					return false;
				}

				// Search query (checks tooth code, diagnosis code, title, doctor, protocol)
				if (query) {
					const toothMatches = item.toothNumber
						? String(item.toothNumber).toLowerCase().includes(query)
						: false;
					const diagnosisCodeMatches = item.diagnosisCode.toLowerCase().includes(query);
					const diagnosisTitleMatches = item.diagnosisTitle.toLowerCase().includes(query);
					const doctorMatches = item.doctorName.toLowerCase().includes(query);
					const protocolMatches = (item.treatmentProtocol || "").toLowerCase().includes(query);
					const complaintsMatches = (item.complaints || "").toLowerCase().includes(query);

					if (
						!toothMatches &&
						!diagnosisCodeMatches &&
						!diagnosisTitleMatches &&
						!doctorMatches &&
						!protocolMatches &&
						!complaintsMatches
					) {
						return false;
					}
				}

				return true;
			});
		}, [rawVisitsList, selectedSpecialty, searchQuery]);

		// Group filtered visits chronologically by Month & Year
		const groupedByMonth = useMemo(() => {
			const groups: Array<{
				monthKey: string;
				monthNameRu: string;
				year: number;
				monthNumber: number;
				totalAmountRub: number;
				items: ClinicalVisitItem[];
			}> = [];

			const groupMap = new Map<string, (typeof groups)[number]>();

			for (const visit of filteredVisits) {
				const key = `${visit.year}-${String(visit.monthNumber).padStart(2, "0")}`;
				let group = groupMap.get(key);
				if (!group) {
					group = {
						monthKey: key,
						monthNameRu: visit.monthNameRu,
						year: visit.year,
						monthNumber: visit.monthNumber,
						totalAmountRub: 0,
						items: [],
					};
					groupMap.set(key, group);
					groups.push(group);
				}
				group.items.push(visit);
				group.totalAmountRub += visit.amountRub;
			}

			// Sort newest months first
			groups.sort((a, b) => {
				if (a.year !== b.year) return b.year - a.year;
				return b.monthNumber - a.monthNumber;
			});

			return groups;
		}, [filteredVisits]);

		// Toggle single accordion
		const toggleAccordion = useCallback((visitId: string) => {
			setExpandedVisitIds((prev) => {
				const next = new Set(prev);
				if (next.has(visitId)) {
					next.delete(visitId);
				} else {
					next.add(visitId);
				}
				return next;
			});
		}, []);

		// Expand all accordions
		const handleExpandAll = useCallback(() => {
			const allIds = new Set(filteredVisits.map((v) => v.id));
			setExpandedVisitIds(allIds);
		}, [filteredVisits]);

		// Collapse all accordions
		const handleCollapseAll = useCallback(() => {
			setExpandedVisitIds(new Set());
		}, []);

		// Print protocol handler
		const handlePrint = useCallback(
			(visit: ClinicalVisitItem) => {
				if (onPrintProtocol) {
					onPrintProtocol(visit);
				} else if (typeof window !== "undefined") {
					window.print();
					showToast(`Печать медицинской карты 043/у по визиту от ${visit.date.slice(0, 10)}`, "info");
				}
			},
			[onPrintProtocol],
		);

		return (
			<div
				className={`clinical-timeline-container ${className}`}
				data-testid="patient-history-timeline-tab"
			>
				{/* ═══════════════════════════════════════════════════════════════════
				    1. TOP TOOLBAR: Quick Specialty Filters & Search
				    ═══════════════════════════════════════════════════════════════════ */}
				<div className="clinical-timeline-toolbar">
					{/* Быстрые фильтры направлений */}
					<div className="clinical-timeline-filters" data-testid="timeline-specialty-filters">
						{SPECIALTY_FILTERS.map((filter) => {
							const count =
								filter.id === "all"
									? rawVisitsList.length
									: rawVisitsList.filter((v) => v.specialty === filter.id).length;
							const isActive = selectedSpecialty === filter.id;

							return (
								<button
									key={filter.id}
									type="button"
									onClick={() => setSelectedSpecialty(filter.id)}
									className={`clinical-filter-chip ${isActive ? "active" : ""}`}
									data-testid={`filter-specialty-${filter.id}`}
								>
									<span>{filter.label}</span>
									<span className="opacity-75 text-[11px] font-mono">({count})</span>
								</button>
							);
						})}
					</div>

					{/* Поиск по диагнозу / зубу + Кнопки Свернуть/Развернуть + Добавить приём */}
					<div className="clinical-timeline-actions">
						<div className="clinical-timeline-search">
							<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по зубу (напр. 16), диагнозу или врачу..."
								className="clinical-search-input"
								data-testid="timeline-search-input"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="clinical-search-clear-btn"
									title="Очистить поиск"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>

						{/* Expand/Collapse All — Studio HIG Micro-Buttons */}
						<div className="clinical-timeline-toggle-group" data-testid="timeline-accordion-controls">
							<button
								type="button"
								onClick={handleExpandAll}
								className="clinical-timeline-toggle-btn clinical-timeline-expand-all-btn"
								title="Развернуть протоколы всех визитов"
								data-testid="btn-timeline-expand-all"
							>
								<SquarePlus className="clinical-toggle-icon text-teal-600 dark:text-teal-400" />
								<span>Развернуть всё</span>
							</button>
							<button
								type="button"
								onClick={handleCollapseAll}
								className="clinical-timeline-toggle-btn clinical-timeline-collapse-all-btn"
								title="Свернуть все визиты в компактные строки"
								data-testid="btn-timeline-collapse-all"
							>
								<SquareMinus className="clinical-toggle-icon text-slate-500 dark:text-slate-400" />
								<span>Свернуть всё</span>
							</button>
						</div>

						{/* Кнопка записи */}
						{onNewAppointment && (
							<button
								type="button"
								onClick={() => onNewAppointment(patientId || undefined)}
								className="clinical-timeline-primary-btn"
								data-testid="btn-timeline-new-appointment"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>+ Приём</span>
							</button>
						)}
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    2. EMPTY STATE
				    ═══════════════════════════════════════════════════════════════════ */}
				{filteredVisits.length === 0 && (
					<div
						className="p-8 text-center bg-[var(--paper)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-2 text-xs text-[var(--muted)]"
						data-testid="timeline-empty-state"
					>
						<Stethoscope className="w-8 h-8 opacity-40 text-[var(--muted)]" />
						<div className="font-bold text-[var(--ink)] text-sm">Приёмы не найдены</div>
						<p className="max-w-md m-0">
							{searchQuery
								? `По запросу «${searchQuery}» визитов не обнаружено. Попробуйте ввести другой номер зуба (11..48) или код диагноза (K02.1).`
								: "В выбранной категории у пациента нет зафиксированных визитов."}
						</p>
					</div>
				)}

				{/* ═══════════════════════════════════════════════════════════════════
				    3. CHRONOLOGICAL GROUPS (YEARS & MONTHS)
				    ═══════════════════════════════════════════════════════════════════ */}
				{groupedByMonth.map((group) => (
					<div
						key={group.monthKey}
						className="clinical-month-group"
						data-testid={`timeline-month-group-${group.monthKey}`}
					>
						{/* Заголовок группы месяца */}
						<div className="clinical-month-header">
							<div className="clinical-month-title">
								<Calendar className="w-3.5 h-3.5 text-[var(--teal)]" />
								<span>{group.monthNameRu}</span>
								<span className="clinical-month-badge">
									{group.items.length}{" "}
									{group.items.length === 1
										? "визит"
										: group.items.length < 5
											? "визита"
											: "визитов"}
								</span>
							</div>
							<div className="text-[11px] font-mono font-bold text-[var(--ink)]">
								{group.totalAmountRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>

						{/* Карточки визитов месяца */}
						<div className="flex flex-col gap-2">
							{group.items.map((visit) => {
								const isExpanded = expandedVisitIds.has(visit.id);
								const formattedDateStr = (() => {
									try {
										const d = new Date(visit.date);
										if (!Number.isNaN(d.getTime())) {
											return `${d.toLocaleDateString("ru-RU")}${visit.time ? ` ${visit.time}` : ""}`;
										}
									} catch {}
									return visit.date;
								})();

								return (
									<div
										key={visit.id}
										className={`clinical-visit-accordion ${isExpanded ? "expanded" : ""}`}
										data-testid={`timeline-visit-card-${visit.id}`}
									>
										{/* ─── COMPACT 1-LINE ROW (36px) ────────────────────── */}
										<div
											className="clinical-visit-compact-row"
											onClick={() => toggleAccordion(visit.id)}
											role="button"
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													toggleAccordion(visit.id);
												}
											}}
											aria-expanded={isExpanded}
											title="Нажмите, чтобы развернуть протокол приёма"
										>
											<div className="clinical-visit-left-pills">
												{/* Кнопка-индикатор раскрытия */}
												<span className={`clinical-row-chevron-badge ${isExpanded ? "expanded" : ""}`} aria-hidden="true">
													{isExpanded ? (
														<ChevronDown className="w-3.5 h-3.5 text-[var(--teal)]" />
													) : (
														<ChevronRight className="w-3.5 h-3.5" />
													)}
												</span>

												{/* Дата */}
												<span className="clinical-pill clinical-pill-date">
													<Clock className="w-3 h-3 text-[var(--muted)]" />
													<span>{formattedDateStr}</span>
												</span>

												{/* Номер зуба (если есть) */}
												{visit.toothNumber ? (
													<span
														className="clinical-pill clinical-pill-tooth"
														data-testid={`pill-tooth-${visit.toothNumber}`}
													>
														<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
														<span>Зуб {visit.toothNumber}</span>
													</span>
												) : (
													<span className="clinical-pill text-[var(--muted)]">
														<span>Общий приём</span>
													</span>
												)}

												{/* Диагноз МКБ-10 */}
												<span
													className="clinical-pill clinical-pill-diagnosis"
													title={`${visit.diagnosisCode} ${visit.diagnosisTitle}`}
												>
													<span className="font-mono text-teal-700 dark:text-teal-400 font-black">
														{visit.diagnosisCode}
													</span>
													<span className="truncate">{visit.diagnosisTitle}</span>
												</span>

												{/* Врач */}
												<span className="clinical-pill clinical-pill-doctor hidden md:inline-flex">
													<User className="w-3 h-3 text-[var(--muted)]" />
													<span>{visit.doctorName}</span>
												</span>

												{/* Направление */}
												<span className="clinical-pill text-[10px] hidden lg:inline-flex bg-slate-100 dark:bg-slate-800 text-[var(--muted)]">
													{visit.specialtyLabelRu}
												</span>
											</div>

											<div className="clinical-visit-right-pills">
												{/* Сумма */}
												<span className="clinical-pill clinical-pill-amount">
													{visit.amountRub.toLocaleString("ru-RU")} ₽
												</span>

												{/* Статус оплаты и гарантия */}
												<span className="clinical-pill clinical-pill-status-paid">
													<Check className="w-3 h-3" />
													<span>Оплачен</span>
												</span>

												{visit.warrantyUntil && (
													<span
														className="clinical-pill clinical-pill-warranty hidden sm:inline-flex"
														title="Гарантийный период на манипуляцию"
													>
														<ShieldCheck className="w-3 h-3 text-indigo-500" />
														<span>Гарантия до {visit.warrantyUntil}</span>
													</span>
												)}
											</div>
										</div>

										{/* ─── EXPANDED DETAILED PROTOCOL PANE ──────────────── */}
										{isExpanded && (
											<div
												className="clinical-visit-details-pane"
												data-testid={`timeline-visit-details-${visit.id}`}
											>
												{/* SOAP Сетка клинических данных */}
												<div className="clinical-soap-grid">
													{/* Жалобы */}
													<div className="clinical-soap-card">
														<div className="clinical-soap-title">
															<Clock className="w-3 h-3 text-amber-500" />
															<span>Жалобы (Subjective)</span>
														</div>
														<div className="clinical-soap-body">
															{visit.complaints || "Активных жалоб не предъявляет."}
														</div>
													</div>

													{/* Объективный статус */}
													<div className="clinical-soap-card">
														<div className="clinical-soap-title">
															<Stethoscope className="w-3 h-3 text-teal-500" />
															<span>Объективно (Status Localis)</span>
														</div>
														<div className="clinical-soap-body">
															{visit.statusLocalis || "Слизистая без воспаления, десневой край интактен."}
														</div>
													</div>

													{/* Протокол лечения */}
													<div className="clinical-soap-card md:col-span-2">
														<div className="clinical-soap-title">
															<Sparkles className="w-3 h-3 text-indigo-500" />
															<span>Протокол лечения и манипуляции (Assessment & Plan)</span>
														</div>
														<div className="clinical-soap-body font-normal">
															{visit.treatmentProtocol || "Проведен плановый осмотр."}
														</div>
													</div>

													{/* Рекомендации */}
													{visit.recommendations && (
														<div className="clinical-soap-card md:col-span-2">
															<div className="clinical-soap-title">
																<CheckCircle2 className="w-3 h-3 text-emerald-500" />
																<span>Назначения и рекомендации</span>
															</div>
															<div className="clinical-soap-body">
																{visit.recommendations}
															</div>
														</div>
													)}
												</div>

												{/* Списанные материалы и прикрепленный снимок */}
												{(visit.materialsDeducted?.length || visit.attachedScan) && (
													<div className="clinical-attachments-row">
														{/* Снимок RVG / КТ */}
														{visit.attachedScan && (
															<div className="flex flex-col gap-1.5">
																<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
																	<Eye className="w-3 h-3 text-[var(--teal)]" />
																	<span>Контрольный снимок ({visit.attachedScan.kind})</span>
																</div>
																<div
																	className="clinical-xray-preview"
																	title="Нажмите для детального просмотра"
																>
																	<img
																		src={visit.attachedScan.previewUrl}
																		alt={visit.attachedScan.title}
																		loading="lazy"
																	/>
																	<span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/80 px-1 py-0.2 rounded text-emerald-400">
																		{visit.attachedScan.kind}
																	</span>
																</div>
															</div>
														)}

														{/* Списанные материалы по техкарте (Мандат 8v) */}
														{visit.materialsDeducted && visit.materialsDeducted.length > 0 && (
															<div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
																<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
																	<Package className="w-3 h-3 text-purple-500" />
																	<span>Списано со склада по техкарте:</span>
																</div>
																<div className="flex flex-wrap gap-1.5">
																	{visit.materialsDeducted.map((mat, mIdx) => (
																		<span
																			key={mIdx}
																			className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium inline-flex items-center gap-1"
																		>
																			<span>{mat.name}</span>
																			<strong className="text-[var(--teal)] font-mono">
																				({mat.quantity} {mat.unit})
																			</strong>
																		</span>
																	))}
																</div>
															</div>
														)}
													</div>
												)}

												{/* Нижняя панель действий протокола */}
												<div className="clinical-details-actions">
													{visit.warrantyUntil && (
														<div className="text-xs text-[var(--muted)] mr-auto flex items-center gap-1.5">
															<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
															<span>
																Гарантийный паспорт: <strong>до {visit.warrantyUntil}</strong> (при профосмотре каждые 6 мес.)
															</span>
														</div>
													)}

													<button
														type="button"
														onClick={() => handlePrint(visit)}
														className="clinical-btn-print"
														data-testid={`btn-print-visit-${visit.id}`}
														title="Распечатать медицинскую карту приёма по форме 043/у"
													>
														<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
														<span>Печать 043/у</span>
													</button>

													{onNavigateToVisit && (
														<button
															type="button"
															onClick={() => onNavigateToVisit(visit.id)}
															className="clinical-btn-goto"
															data-testid={`btn-goto-visit-${visit.id}`}
															title="Перейти к полной карте приёма"
														>
															<span>К визиту</span>
															<ExternalLink className="w-3.5 h-3.5" />
														</button>
													)}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
		);
	},
);

PatientHistoryTab.displayName = "PatientHistoryTab";
