/**
 * apps/web/src/components/visit/VisitAnamnesisTab.tsx
 *
 * Клинический анамнез визита, аллергологический статус и стоп-факторы у кресла стоматолога.
 * Соответствует Приказу Минздрава РФ № 834н, Форме 043/у, стандартам СтАР и Высшей Конституции THE HAMMER.
 *
 * Инварианты:
 * 1. Аллергологический статус: выбор конкретных препаратов (Артикаин, Мепивакаин, Лидокаин, Пенициллины, Латекс, Металлы)
 *    с типом реакции (Анафилаксия, Отек Квинке, Крапивница, Местная) и мгновенным обновлением бейджа в шапке визита.
 * 2. Стоп-факторы: Инфаркт/инсульт <6 мес, ЭКС (кардиостимулятор), антикоагулянты (риск кровотечения),
 *    бисфосфонаты (риск остеонекроза MRONJ), сахарный диабет, беременность с триместром.
 * 3. Стоматологический анамнез: опыт анестезии, осложнения при удалении, дентофобия, бруксизм, кровоточивость.
 * 4. Автономия врача: 1-клик «Соматически здоров / Норма» для работы в перчатках.
 * 5. Сквозная связность: данные сохраняются в медкарту пациента в базе и в протокол визита (0 моков в вакууме).
 */

import {
	Activity,
	AlertCircle,
	AlertOctagon,
	Baby,
	Check,
	ChevronDown,
	HeartPulse,
	Pill,
	Plus,
	RotateCcw,
	Save,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { parseSafetyProfileFromText } from "../patients/safetyMath";

export interface VisitAnamnesisTabProps {
	readonly onAppendAnamnesis?: ((text: string) => void) | undefined;
	readonly onAppendComorbidities?: ((text: string) => void) | undefined;
	readonly activeTooth?: number | null | undefined;
	readonly onOpenStomxTemplates?: (() => void) | undefined;
}

// ─── 1. АЛЛЕРГОЛОГИЧЕСКИЙ КАТАЛОГ СТОМАТОЛОГА ─────────────────────────────

export interface AllergenItem {
	readonly id: string;
	readonly name: string;
	readonly category: "anesthetics" | "antibiotics" | "materials";
	readonly isCritical: boolean;
	readonly tradeNamesHint?: string;
}

export const DENTAL_ALLERGENS: readonly AllergenItem[] = [
	{
		id: "articaine",
		name: "Артикаин",
		category: "anesthetics",
		isCritical: true,
		tradeNamesHint: "Ультракаин, Убистезин, Септанест",
	},
	{
		id: "mepivacaine",
		name: "Мепивакаин",
		category: "anesthetics",
		isCritical: false,
		tradeNamesHint: "Скандонест, Мепивастезин",
	},
	{
		id: "lidocaine",
		name: "Лидокаин",
		category: "anesthetics",
		isCritical: true,
		tradeNamesHint: "Ксилокаин, спреи, инфильтрация",
	},
	{
		id: "novocaine",
		name: "Новокаин / Прокаин",
		category: "anesthetics",
		isCritical: false,
		tradeNamesHint: "Эфирные анестетики",
	},
	{
		id: "penicillin",
		name: "Пенициллиновый ряд",
		category: "antibiotics",
		isCritical: true,
		tradeNamesHint: "Амоксиклав, Аугментин, Флемоксин",
	},
	{
		id: "macrolides",
		name: "Макролиды",
		category: "antibiotics",
		isCritical: false,
		tradeNamesHint: "Кларитромицин, Азитромицин",
	},
	{
		id: "lincosamides",
		name: "Линкозамиды",
		category: "antibiotics",
		isCritical: false,
		tradeNamesHint: "Клиндамицин, Линкомицин",
	},
	{
		id: "latex",
		name: "Латекс",
		category: "materials",
		isCritical: false,
		tradeNamesHint: "Коффердам, перчатки — нитриловый протокол",
	},
	{
		id: "metals",
		name: "Металлы / Никель",
		category: "materials",
		isCritical: false,
		tradeNamesHint: "КХС, НХС, коронки, брекеты",
	},
	{
		id: "iodine",
		name: "Йод / Йодоформ",
		category: "materials",
		isCritical: false,
		tradeNamesHint: "Альвожил, Метапекс, Бетадин",
	},
	{
		id: "nsaid",
		name: "НПВП / Аспирин",
		category: "materials",
		isCritical: true,
		tradeNamesHint: "Аспириновая триада, Кеторол, Ибупрофен",
	},
] as const;

export const ALLERGY_REACTIONS = [
	"Крапивница / кожный зуд",
	"Отёк Квинке",
	"Анафилактический шок",
	"Бронхоспазм / удушье",
	"Местная гиперемия",
] as const;

// ─── 2. КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ И СОМАТИКА ─────────────────────────────

export interface SomaticStopFactorItem {
	readonly id: string;
	readonly label: string;
	readonly isCritical: boolean;
	readonly hint: string;
}

export const SOMATIC_STOP_FACTORS: readonly SomaticStopFactorItem[] = [
	{
		id: "infarction_recent",
		label: "Инфаркт / Инсульт (< 6 мес)",
		isCritical: true,
		hint: "Противопоказание к плановым стоматологическим вмешательствам!",
	},
	{
		id: "pacemaker",
		label: "Кардиостимулятор (ЭКС / ИКД)",
		isCritical: true,
		hint: "Абсолютный запрет УЗ-скейлеров и монополярной электрокоагуляции!",
	},
	{
		id: "anticoagulants",
		label: "Приём антикоагулянтов",
		isCritical: true,
		hint: "Варфарин, Ксарелто, Эликвис — высокий риск кровотечения при удалении",
	},
	{
		id: "bisphosphonates",
		label: "Приём бисфосфонатов",
		isCritical: true,
		hint: "Акласта, Зомета, Пролиа — критический риск остеонекроза челюсти (MRONJ)",
	},
	{
		id: "hypertension",
		label: "Гипертоническая болезнь / ИБС",
		isCritical: false,
		hint: "Лимит адреналина <= 1:200 000, запрет 1:100 000",
	},
	{
		id: "diabetes",
		label: "Сахарный диабет",
		isCritical: false,
		hint: "Риск гипогликемии, контроль гликемии перед операцией",
	},
	{
		id: "pregnancy",
		label: "Беременность / Лактация",
		isCritical: false,
		hint: "Безопасные анестетики без вазоконстриктора, рентген-защита",
	},
	{
		id: "asthma",
		label: "Бронхиальная астма",
		isCritical: false,
		hint: "Запрет сульфитов (E223 консервант эпинефрина), ингалятор у кресла",
	},
	{
		id: "epilepsy",
		label: "Эпилепсия",
		isCritical: false,
		hint: "Риск судорожного приступа на стресс/свет",
	},
	{
		id: "infections",
		label: "Инфекции (Гепатит B/C, ВИЧ) со слов",
		isCritical: false,
		hint: "Повышенный инфекционный контроль",
	},
] as const;

// ─── 3. СТОМАТОЛОГИЧЕСКИЙ АНАМНЕЗ ────────────────────────────────────────

export interface DentalHistoryItem {
	readonly id: string;
	readonly label: string;
	readonly isAlert?: boolean;
}

export const DENTAL_HISTORY_ITEMS: readonly DentalHistoryItem[] = [
	{ id: "anes_good", label: "Опыт анестезии положительный (без осложнений)" },
	{
		id: "anes_bad",
		label: "Осложнения при анестезии (коллапс / реакция)",
		isAlert: true,
	},
	{ id: "anes_weak", label: "Анестезия действует слабо / не наступает" },
	{ id: "sedation", label: "Ранее лечился под седацией / наркозом" },
	{
		id: "bleed_past",
		label: "Длительное кровотечение после удалений",
		isAlert: true,
	},
	{ id: "alveolitis", label: "Альвеолит в анамнезе (воспаление лунки)" },
	{
		id: "dentophobia",
		label: "Дентофобия (страх лечения, панические атаки)",
		isAlert: true,
	},
	{
		id: "bruxism",
		label: "Бруксизм / гипертонус мышц / стираемость",
	},
	{ id: "bleeding_gums", label: "Кровоточивость десен при чистке" },
	{ id: "implants_present", label: "Наличие дентальных имплантатов" },
	{ id: "crowns_present", label: "Наличие коронок / мостовидных протезов" },
	{ id: "ortho_braces", label: "Ортодонтическое лечение (брекеты / элайнеры)" },
	{ id: "removable_denture", label: "Съемные протезы (бюгель / пластинка)" },
] as const;

// ─── 4. ОСНОВНЫЕ ЖАЛОБЫ ПАЦИЕНТА ─────────────────────────────────────────

export const PATIENT_COMPLAINTS_LIST = [
	"Острая самопроизвольная боль",
	"Реакция на холодное и горячее",
	"Выпала пломба",
	"Скол коронки / стенки зуба",
	"Боль при накусывании на зуб",
	"Кровоточивость десен",
	"Застревание пищи в межзубном промежутке",
	"Подвижность зуба",
	"Боли от сладкого и кислого",
	"Эстетический дефект зубного ряда",
	"Неприятный запах изо рта",
	"Плановый осмотр (жалоб нет)",
] as const;

export const VisitAnamnesisTab: React.FC<VisitAnamnesisTabProps> = ({
	onAppendAnamnesis,
	onAppendComorbidities,
	activeTooth = null,
	onOpenStomxTemplates,
}) => {
	const appLogic = useAppLogicContext();
	// biome-ignore lint/suspicious/noExplicitAny: patient identifier
	const activePat = (appLogic as any)?.activePatient;
	const patientId = activePat?.id || "draft";
	const storageKey = `dente_anamnesis_tab_draft_${patientId}`;

	const customNotesId = useId();
	const anticoagulantInputId = useId();
	const bisphosphonateInputId = useId();

	// ─── Состояние формы анамнеза ──────────────────────────────────────
	// Аллергены хранятся как словарь: { [allergenName]: reactionType }
	const [selectedAllergies, setSelectedAllergies] = useState<
		Record<string, string>
	>({});
	const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
	const [anticoagulantName, setAnticoagulantName] = useState("");
	const [bisphosphonateName, setBisphosphonateName] = useState("");
	const [pregnancyTrimester, setPregnancyTrimester] = useState<
		"trimester_1" | "trimester_2" | "trimester_3" | "lactation"
	>("trimester_2");
	const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
	const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
	const [customNotes, setCustomNotes] = useState("");

	// ─── Восстановление из черновика или карты пациента ────────────────
	useEffect(() => {
		try {
			const saved = safeLocalStorageGetItem(storageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.selectedAllergies && typeof parsed.selectedAllergies === "object") {
					setSelectedAllergies(parsed.selectedAllergies);
				}
				if (Array.isArray(parsed.selectedRisks)) setSelectedRisks(parsed.selectedRisks);
				if (typeof parsed.anticoagulantName === "string") setAnticoagulantName(parsed.anticoagulantName);
				if (typeof parsed.bisphosphonateName === "string") setBisphosphonateName(parsed.bisphosphonateName);
				if (parsed.pregnancyTrimester) setPregnancyTrimester(parsed.pregnancyTrimester);
				if (Array.isArray(parsed.selectedHistory)) setSelectedHistory(parsed.selectedHistory);
				if (Array.isArray(parsed.selectedComplaints)) setSelectedComplaints(parsed.selectedComplaints);
				if (typeof parsed.customNotes === "string") setCustomNotes(parsed.customNotes);
				return;
			}
		} catch {
			// ignore storage errors
		}

		// Автоподтягивание данных из медкарты пациента (Приказ 834н / Мандаты 8e, 8k)
		if (activePat) {
			const rawAllergies = activePat.allergies || "";
			const allergyStr = Array.isArray(rawAllergies)
				? rawAllergies.join(", ")
				: String(rawAllergies);
			const fullText = `${allergyStr} ${activePat.somaticNotes || ""} ${activePat.concomitantDiseases || ""}`.trim();

			if (fullText) {
				const safety = parseSafetyProfileFromText(fullText);
				const autoAllergies: Record<string, string> = {};
				if (safety.hasArticaineAllergy) autoAllergies["Артикаин"] = "Крапивница / кожный зуд";
				if (safety.hasLidocaineAllergy) autoAllergies["Лидокаин"] = "Крапивница / кожный зуд";
				if (safety.hasMepivacaineAllergy) autoAllergies["Мепивакаин"] = "Местная гиперемия";
				if (safety.hasPenicillinAllergy) autoAllergies["Пенициллиновый ряд"] = "Крапивница / кожный зуд";
				if (safety.hasLatexAllergy) autoAllergies["Латекс"] = "Местная гиперемия";
				if (safety.hasIodineAllergy) autoAllergies["Йод / Йодоформ"] = "Местная гиперемия";
				if (safety.hasNsaidAllergy) autoAllergies["НПВП / Аспирин"] = "Бронхоспазм / удушье";

				if (Object.keys(autoAllergies).length > 0) {
					setSelectedAllergies(autoAllergies);
				}

				const autoRisks: string[] = [];
				if (safety.hasPacemakerExs) autoRisks.push("Кардиостимулятор (ЭКС / ИКД)");
				if (safety.hasHypertension) autoRisks.push("Гипертоническая болезнь / ИБС");
				if (safety.hasDiabetesMellitus) autoRisks.push("Сахарный диабет");
				if (safety.takesAnticoagulants) autoRisks.push("Приём антикоагулянтов");
				if (safety.takesBisphosphonates) autoRisks.push("Приём бисфосфонатов");
				if (safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") {
					autoRisks.push("Беременность / Лактация");
					if (safety.pregnancyTrimester !== "none") {
						setPregnancyTrimester(
							safety.pregnancyTrimester === "lactation"
								? "lactation"
								: safety.pregnancyTrimester,
						);
					}
				}
				if (autoRisks.length > 0) {
					setSelectedRisks(autoRisks);
				}
			}
		}
	}, [storageKey, activePat]);

	// ─── Сквозная синхронизация с активным пациентом в памяти (Мандат 8e, 8k) ─
	const syncWithPatientAndVisitState = useCallback(
		(
			allergiesMap: Record<string, string>,
			risksList: string[],
			antiName: string,
			bisName: string,
			pregTrim: string,
			historyList: string[],
			complaintsList: string[],
			notesText: string,
		) => {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: appLogic context
				const ctx = appLogic as any;
				const curPat = ctx?.activePatient;

				// Формируем структурированную строку аллергий
				const allergyEntries = Object.entries(allergiesMap).map(
					([allergen, reaction]) => `${allergen} (${reaction})`,
				);
				const formattedAllergies =
					allergyEntries.length > 0
						? allergyEntries.join(", ")
						: "Аллергии не выявлены";

				// Формируем строку соматических факторов
				const somaticParts = [...risksList];
				if (risksList.includes("Приём антикоагулянтов") && antiName.trim()) {
					somaticParts.push(`Препарат: ${antiName.trim()}`);
				}
				if (risksList.includes("Приём бисфосфонатов") && bisName.trim()) {
					somaticParts.push(`Препарат: ${bisName.trim()}`);
				}
				if (risksList.includes("Беременность / Лактация")) {
					const trimLabels: Record<string, string> = {
						trimester_1: "1-й триместр",
						trimester_2: "2-й триместр",
						trimester_3: "3-й триместр",
						lactation: "Период лактации",
					};
					somaticParts.push(trimLabels[pregTrim] || "2-й триместр");
				}

				const formattedSomatic =
					somaticParts.length > 0
						? somaticParts.join(", ")
						: "Соматически здоров. Норма.";

				// 1. Прямое обновление в активном пациенте
				if (curPat) {
					curPat.allergies = formattedAllergies;
					curPat.somaticNotes = formattedSomatic;

					// Обновляем в общем списке dashboard.patients для реактивности
					const allPatients = ctx?.dashboard?.patients;
					if (Array.isArray(allPatients)) {
						const match = allPatients.find((p: any) => p.id === curPat.id);
						if (match) {
							match.allergies = formattedAllergies;
							match.somaticNotes = formattedSomatic;
						}
					}
				}

				// 2. Формируем клинический текст анамнеза для Формы 043/у
				const parts: string[] = [];
				if (complaintsList.length > 0) {
					parts.push(`Жалобы: ${complaintsList.join(", ")}.`);
				}
				parts.push(`Аллергоанамнез: ${formattedAllergies}.`);
				parts.push(`Соматический статус: ${formattedSomatic}.`);
				if (historyList.length > 0) {
					parts.push(`Стоматологический анамнез: ${historyList.join(", ")}.`);
				}
				if (notesText.trim()) {
					parts.push(`Примечания: ${notesText.trim()}`);
				}
				const fullAnamnesisText = parts.join(" ");

				// 3. Обновляем форму визита visitNoteForm.anamnesis
				if (ctx?.updateVisitNoteField) {
					ctx.updateVisitNoteField("anamnesis", fullAnamnesisText);
					if (complaintsList.length > 0) {
						ctx.updateVisitNoteField("complaint", complaintsList.join(", "));
					}
				}
			} catch {
				// silent safety
			}
		},
		[appLogic],
	);

	// ─── Debounced Autosave (300ms) в localStorage и синхронизация ──────
	useEffect(() => {
		const timer = setTimeout(() => {
			try {
				const payload = {
					selectedAllergies,
					selectedRisks,
					anticoagulantName,
					bisphosphonateName,
					pregnancyTrimester,
					selectedHistory,
					selectedComplaints,
					customNotes,
					updatedAt: new Date().toISOString(),
				};
				safeLocalStorageSetItem(storageKey, JSON.stringify(payload));

				// Сквозная реактивная синхронизация с пациентом и визитом
				syncWithPatientAndVisitState(
					selectedAllergies,
					selectedRisks,
					anticoagulantName,
					bisphosphonateName,
					pregnancyTrimester,
					selectedHistory,
					selectedComplaints,
					customNotes,
				);
			} catch {
				// ignore storage errors
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [
		storageKey,
		selectedAllergies,
		selectedRisks,
		anticoagulantName,
		bisphosphonateName,
		pregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
		syncWithPatientAndVisitState,
	]);

	// ─── Тогглы элементов ──────────────────────────────────────────────

	const toggleAllergen = (name: string) => {
		setSelectedAllergies((prev) => {
			const next = { ...prev };
			if (next[name]) {
				delete next[name];
			} else {
				// Дефолтная реакция: Крапивница / кожный зуд
				next[name] = "Крапивница / кожный зуд";
			}
			return next;
		});
	};

	const setAllergyReaction = (allergenName: string, reaction: string) => {
		setSelectedAllergies((prev) => ({
			...prev,
			[allergenName]: reaction,
		}));
	};

	const toggleRisk = (label: string) => {
		setSelectedRisks((prev) =>
			prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
		);
	};

	const toggleHistory = (label: string) => {
		setSelectedHistory((prev) =>
			prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
		);
	};

	const toggleComplaint = (item: string) => {
		setSelectedComplaints((prev) =>
			prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
		);
	};

	// ─── 1-Клик Норма: Соматически здоров (Мандат 8e, 8k) ──────────────
	const handleApplyPhysiologicalNorm = () => {
		setSelectedAllergies({});
		setSelectedRisks([]);
		setAnticoagulantName("");
		setBisphosphonateName("");
		setSelectedComplaints(["Плановый осмотр (жалоб нет)"]);
		setSelectedHistory(["Опыт анестезии положительный (без осложнений)"]);
		const normNotes =
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";
		setCustomNotes(normNotes);

		const normComplaints =
			"Жалоб на момент осмотра не предъявляет (профилактический осмотр).";
		const normAnamnesis =
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Стоматологический анамнез: регулярная санация полости рта, опыт местной анестезии без осложнений. Физиологическая норма.";
		const normObjective =
			"Конфигурация лица не изменена, симметрично. Открывание рта свободное, безболезненное, в полном объеме. ВНЧС без патологии. Регионарные лимфоузлы не пальпируются. Слизистая оболочка полости рта физиологической окраски, влажная, без патологических элементов. Десна бледно-розовая, плотная, прикреплена, не кровоточит. Прикус физиологический (ортогнатический). Зубные ряды непрерывные, твердые ткани зубов без видимых кариозных поражений. Гигиеническое состояние полости рта удовлетворительное.";
		const normDiagnosis =
			"Z01.2 Стоматологическое обследование и исследование зубных рядов (патологий твердых тканей, пародонта и СОПР не выявлено / норма)";
		const normTreatment =
			"В специальном стоматологическом лечении на момент осмотра не нуждается. Полость рта санирована.";
		const normRecommendations =
			"Индивидуальная контролируемая гигиена полости рта 2 раза в день (зубная щетка средней жесткости, паста с фторидами 1450 ppm, зубная нить / флосс). Профилактический осмотр и профессиональная гигиена полости рта через 6 месяцев.";

		if (onAppendAnamnesis) {
			onAppendAnamnesis(normAnamnesis);
		}
		if (onAppendComorbidities) {
			onAppendComorbidities(
				"Сопутствующие патологии: отсутствуют (соматически здоров, норма).",
			);
		}

		// Сквозная синхронизация с пациентом и формой визита
		syncWithPatientAndVisitState(
			{},
			[],
			"",
			"",
			"trimester_2",
			["Опыт анестезии положительный (без осложнений)"],
			["Плановый осмотр (жалоб нет)"],
			normNotes,
		);

		// biome-ignore lint/suspicious/noExplicitAny: integration context
		const ctx = appLogic as any;
		if (ctx?.updateVisitNoteField) {
			ctx.updateVisitNoteField("complaint", normComplaints);
			ctx.updateVisitNoteField("complaints", normComplaints);
			ctx.updateVisitNoteField("anamnesis", normAnamnesis);
			ctx.updateVisitNoteField("objectiveStatus", normObjective);
			ctx.updateVisitNoteField("objectiveInspection", normObjective);
			ctx.updateVisitNoteField("diagnosis", normDiagnosis);
			ctx.updateVisitNoteField("treatmentPlan", normTreatment);
			ctx.updateVisitNoteField("treatment", normTreatment);
			ctx.updateVisitNoteField("recommendations", normRecommendations);
		}

		showToast("Применена норма: соматически здоров", "success", 3000);
	};

	// ─── Перенос в дневник приёма вручную ──────────────────────────────
	const applyToDiary = () => {
		const effComplaints =
			selectedComplaints.length > 0
				? selectedComplaints
				: ["Плановый осмотр (жалоб на момент приёма не предъявляет)"];
		const effHistory =
			selectedHistory.length > 0
				? selectedHistory
				: ["Опыт анестезии положительный (без осложнений)"];
		const effCustom =
			customNotes.trim() ||
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.";

		const allergyEntries = Object.entries(selectedAllergies).map(
			([allergen, reaction]) => `${allergen} (${reaction})`,
		);
		const formattedAllergies =
			allergyEntries.length > 0
				? allergyEntries.join(", ")
				: "Аллергии не выявлены";

		const parts: string[] = [];
		parts.push(`Жалобы: ${effComplaints.join(", ")}.`);
		parts.push(`Аллергологический статус: ${formattedAllergies}.`);
		if (selectedRisks.length > 0) {
			parts.push(`Соматические факторы риска: ${selectedRisks.join(", ")}.`);
		}
		parts.push(`Стоматологический анамнез: ${effHistory.join(", ")}.`);
		if (effCustom) {
			parts.push(effCustom);
		}

		const fullAnamnesis = parts.join(" ");

		if (fullAnamnesis && onAppendAnamnesis) {
			onAppendAnamnesis(fullAnamnesis);
		}

		if (selectedRisks.length > 0 && onAppendComorbidities) {
			onAppendComorbidities(
				`Сопутствующие и аллергологический статус: ${selectedRisks.join(", ")}; Аллергии: ${formattedAllergies}.`,
			);
		} else if (onAppendComorbidities) {
			onAppendComorbidities("Сопутствующие патологии: отсутствуют (норма).");
		}

		// Синхронизация с формой визита
		// biome-ignore lint/suspicious/noExplicitAny: integration context
		const ctx = appLogic as any;
		if (ctx?.updateVisitNoteField) {
			const current = ctx.visitNoteForm?.anamnesis || "";
			ctx.updateVisitNoteField(
				"anamnesis",
				current ? `${current}\n${fullAnamnesis}` : fullAnamnesis,
			);
		}

		syncWithPatientAndVisitState(
			selectedAllergies,
			selectedRisks,
			anticoagulantName,
			bisphosphonateName,
			pregnancyTrimester,
			selectedHistory,
			selectedComplaints,
			customNotes,
		);

		showToast("Клинический анамнез перенесён в дневник приёма и ЭМК", "success", 4000);
	};

	// ─── Расчет критических флагов ──────────────────────────────────────
	const hasCriticalAllergies = useMemo(() => {
		const keys = Object.keys(selectedAllergies);
		return keys.some((k) =>
			DENTAL_ALLERGENS.some(
				(item) => item.name === k && item.isCritical,
			),
		);
	}, [selectedAllergies]);

	const hasCriticalStopRisks = useMemo(() => {
		return selectedRisks.some(
			(r) =>
				r.includes("Инфаркт") ||
				r.includes("ЭКС") ||
				r.includes("антикоагулянтов") ||
				r.includes("бисфосфонатов"),
		);
	}, [selectedRisks]);

	const totalCriticalAlerts = hasCriticalAllergies || hasCriticalStopRisks;
	const selectedAllergyCount = Object.keys(selectedAllergies).length;

	return (
		<div
			className="visit-anamnesis-tab"
			data-testid="visit-anamnesis-tab"
		>
			{/* Top Bar: Заголовок и главные CTA кнопки */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div
						className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shrink-0 transition-colors ${
							totalCriticalAlerts
								? "bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] border-2 border-[#ef4444]"
								: selectedRisks.length > 0 || selectedAllergyCount > 0
									? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
									: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
						}`}
					>
						{selectedRisks.length === 0 && selectedAllergyCount === 0 ? (
							<ShieldCheck className="w-5 h-5" />
						) : totalCriticalAlerts ? (
							<ShieldAlert className="w-5 h-5" />
						) : (
							<Stethoscope className="w-5 h-5" />
						)}
					</div>
					<div className="min-w-0">
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
							Клинический анамнез и безопасность пациента
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							{activePat?.fullName ? `${activePat.fullName} • ` : ""}
							Форма 043/у (Приказ 834н): аллергены, соматические стоп-факторы, опыт анестезии
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap shrink-0">
					<button
						type="button"
						onClick={
							onOpenStomxTemplates ??
							(() =>
								window.dispatchEvent(
									new CustomEvent("dente-open-stomx-templates"),
								))
						}
						className="anamnesis-top-btn anamnesis-top-btn--teal"
						data-testid="btn-open-stomt-templates-anamnesis"
						title="Открыть каталог 448 клинических шаблонов (Терапия, Ортопедия, Хирургия, Имплантология, Пародонтология)"
						data-catalog-source="Клинические шаблоны StomX (448)"
					>
						<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>Клинические шаблоны (448)</span>
					</button>

					{/* 1-Click Кнопка соматической нормы (Мандат 8e, 8k) */}
					<button
						type="button"
						onClick={handleApplyPhysiologicalNorm}
						className="anamnesis-top-btn anamnesis-top-btn--norm"
						data-testid="btn-somatic-norm-one-click"
						title="Зафиксировать физиологическую норму: соматически здоров, аллергоанамнез не отягощен"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>Соматически здоров / Норма</span>
					</button>

					<button
						type="button"
						onClick={applyToDiary}
						className="anamnesis-top-btn anamnesis-top-btn--secondary"
						data-testid="btn-apply-anamnesis-to-diary"
						title="Перенести данные в дневник приёма и синхронизировать с ЭМК"
					>
						<Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
						<span>В дневник приёма</span>
					</button>
				</div>
			</div>

			{/* Статусный баннер: Анатомический красный (#ef4444) или Спокойный Изумрудный */}
			{totalCriticalAlerts ? (
				<div
					className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-100 text-xs shadow-xs"
					data-testid="visit-anamnesis-critical-alert"
					role="alert"
				>
					<AlertOctagon className="w-5 h-5 text-[#ef4444] shrink-0" />
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="font-bold text-[#ef4444]">
							Клинические стоп-факторы безопасности у кресла:
						</span>
						<span className="text-[11.5px] text-rose-900 dark:text-rose-200">
							{selectedAllergyCount > 0
								? `Аллергии: ${Object.entries(selectedAllergies).map(([a, r]) => `${a} (${r})`).join(", ")}. `
								: ""}
							{selectedRisks.length > 0
								? `Соматические риски: ${selectedRisks.join(", ")}. `
								: ""}
							Обязательна коррекция местного анестетика, профилактика анафилаксии, оценка риска кровотечения и остеонекроза (MRONJ).
						</span>
					</div>
				</div>
			) : selectedRisks.length > 0 || selectedAllergyCount > 0 ? (
				<div
					className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs font-semibold"
					data-testid="visit-anamnesis-alert-banner"
				>
					<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						Отмечены соматические особенности:{" "}
						{selectedRisks.join(", ")}
						{selectedAllergyCount > 0
							? `; Аллергии: ${Object.keys(selectedAllergies).join(", ")}`
							: ""}
						. Учитывать при премедикации и выборе концентрации вазоконстриктора.
					</span>
				</div>
			) : null}

			{/* ═══ БЛОК 1: АЛЛЕРГОЛОГИЧЕСКИЙ СТАТУС ВРАЧА-СТОМАТОЛОГА ═══ */}
			<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
						<Pill className="w-4 h-4 text-rose-500" />
						<span>1. Аллергологический статус (Стоматологические препараты)</span>
					</label>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						{selectedAllergyCount > 0 ? (
							<span className="font-bold text-[#ef4444]">
								Выбрано аллергенов: {selectedAllergyCount}
							</span>
						) : (
							"Аллергии не выявлены"
						)}
					</span>
				</div>

				{/* Группированные чипы аллергенов */}
				<div className="space-y-2.5">
					{/* Подкатегория: Местные анестетики */}
					<div>
						<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1.5">
							Местные анестетики (риск анафилаксии):
						</span>
						<div className="flex flex-wrap gap-2">
							{DENTAL_ALLERGENS.filter((a) => a.category === "anesthetics").map(
								(item) => {
									const isSelected = Boolean(selectedAllergies[item.name]);
									const currentReaction = selectedAllergies[item.name] || "";
									if (!isSelected) {
										return (
											<button
												key={item.id}
												type="button"
												onClick={() => toggleAllergen(item.name)}
												className="anamnesis-chip"
												title={item.tradeNamesHint}
												data-testid={`toggle-allergy-${item.id}`}
											>
												<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
												<span>{item.name}</span>
											</button>
										);
									}
									return (
										<div key={item.id} className="anamnesis-allergen-item">
											<button
												type="button"
												onClick={() => toggleAllergen(item.name)}
												className="anamnesis-chip anamnesis-chip--active-danger"
												title={item.tradeNamesHint}
												data-testid={`toggle-allergy-${item.id}`}
											>
												<Check className="w-3.5 h-3.5 text-[#ef4444]" />
												<span>{item.name}</span>
											</button>
											<div className="anamnesis-reaction-selector" title="Тип аллергической реакции">
												<span>{currentReaction}</span>
												<ChevronDown className="anamnesis-reaction-arrow" />
												<select
													value={currentReaction}
													onChange={(e) =>
														setAllergyReaction(item.name, e.target.value)
													}
													className="anamnesis-reaction-select"
													title="Тип аллергической реакции"
													aria-label={`Тип реакции на ${item.name}`}
												>
													{ALLERGY_REACTIONS.map((reaction) => (
														<option
															key={reaction}
															value={reaction}
															className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
														>
															{reaction}
														</option>
													))}
												</select>
											</div>
										</div>
									);
								},
							)}
						</div>
					</div>

					{/* Подкатегория: Антибиотики и материалы */}
					<div>
						<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1.5">
							Антибиотики и контактные материалы:
						</span>
						<div className="flex flex-wrap gap-2">
							{DENTAL_ALLERGENS.filter((a) => a.category !== "anesthetics").map(
								(item) => {
									const isSelected = Boolean(selectedAllergies[item.name]);
									const currentReaction = selectedAllergies[item.name] || "";
									if (!isSelected) {
										return (
											<button
												key={item.id}
												type="button"
												onClick={() => toggleAllergen(item.name)}
												className="anamnesis-chip"
												title={item.tradeNamesHint}
												data-testid={`toggle-allergy-${item.id}`}
											>
												<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
												<span>{item.name}</span>
											</button>
										);
									}
									return (
										<div key={item.id} className="anamnesis-allergen-item">
											<button
												type="button"
												onClick={() => toggleAllergen(item.name)}
												className="anamnesis-chip anamnesis-chip--active-danger"
												title={item.tradeNamesHint}
												data-testid={`toggle-allergy-${item.id}`}
											>
												<Check className="w-3.5 h-3.5 text-[#ef4444]" />
												<span>{item.name}</span>
											</button>
											<div className="anamnesis-reaction-selector" title="Тип аллергической реакции">
												<span>{currentReaction}</span>
												<ChevronDown className="anamnesis-reaction-arrow" />
												<select
													value={currentReaction}
													onChange={(e) =>
														setAllergyReaction(item.name, e.target.value)
													}
													className="anamnesis-reaction-select"
													title="Тип аллергической реакции"
													aria-label={`Тип реакции на ${item.name}`}
												>
													{ALLERGY_REACTIONS.map((reaction) => (
														<option
															key={reaction}
															value={reaction}
															className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
														>
															{reaction}
														</option>
													))}
												</select>
											</div>
										</div>
									);
								},
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ═══ БЛОК 2: КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ И СОМАТИКА ═══ */}
			<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
						<HeartPulse className="w-4 h-4 text-amber-500" />
						<span>2. Клинические стоп-факторы и соматический статус</span>
					</label>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Инфаркт, ЭКС, антикоагулянты, бисфосфонаты, диабет
					</span>
				</div>

				<div className="flex flex-wrap gap-2">
					{SOMATIC_STOP_FACTORS.map((item) => {
						const isSelected = selectedRisks.includes(item.label);
						const activeClass = item.isCritical
							? "anamnesis-chip--active-danger"
							: "anamnesis-chip--active-warning";
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => toggleRisk(item.label)}
								data-testid={`toggle-stop-${item.id}`}
								title={item.hint}
								className={`anamnesis-chip ${isSelected ? activeClass : ""}`}
							>
								{isSelected ? (
									<Check
										className={`w-3.5 h-3.5 ${
											item.isCritical ? "text-[#ef4444]" : "text-amber-600 dark:text-amber-400"
										}`}
									/>
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>

				{/* Уточняющие инпуты для антикоагулянтов, бисфосфонатов и триместра беременности */}
				{(selectedRisks.includes("Приём антикоагулянтов") ||
					selectedRisks.includes("Приём бисфосфонатов") ||
					selectedRisks.includes("Беременность / Лактация")) && (
					<div className="anamnesis-clarify-card">
						{selectedRisks.includes("Приём антикоагулянтов") && (
							<div className="flex flex-col gap-1">
								<label
									htmlFor={anticoagulantInputId}
									className="text-[11px] font-bold text-rose-800 dark:text-rose-300"
								>
									Препарат антикоагулянта и МНО:
								</label>
								<input
									id={anticoagulantInputId}
									type="text"
									value={anticoagulantName}
									onChange={(e) => setAnticoagulantName(e.target.value)}
									placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
									className="anamnesis-input"
								/>
							</div>
						)}

						{selectedRisks.includes("Приём бисфосфонатов") && (
							<div className="flex flex-col gap-1">
								<label
									htmlFor={bisphosphonateInputId}
									className="text-[11px] font-bold text-rose-800 dark:text-rose-300"
								>
									Препарат бисфосфонатов (MRONJ):
								</label>
								<input
									id={bisphosphonateInputId}
									type="text"
									value={bisphosphonateName}
									onChange={(e) => setBisphosphonateName(e.target.value)}
									placeholder="Акласта 5 мг/год, Пролиа, Зомета..."
									className="anamnesis-input"
								/>
							</div>
						)}

						{selectedRisks.includes("Беременность / Лактация") && (
							<div className="flex flex-col gap-1">
								<span className="text-[11px] font-bold text-pink-800 dark:text-pink-300">
									Срок / Период лактации:
								</span>
								<select
									value={pregnancyTrimester}
									onChange={(e) =>
										setPregnancyTrimester(
											e.target.value as "trimester_1" | "trimester_2" | "trimester_3" | "lactation",
										)
									}
									className="anamnesis-input"
									aria-label="Срок беременности или период лактации"
								>
									<option value="trimester_1">1-й триместр (неотложка, без адреналина)</option>
									<option value="trimester_2">2-й триместр (безопасное окно)</option>
									<option value="trimester_3">3-й триместр</option>
									<option value="lactation">Период лактации / ГВ</option>
								</select>
							</div>
						)}
					</div>
				)}
			</div>

			{/* ═══ БЛОК 3: СТОМАТОЛОГИЧЕСКИЙ АНАМНЕЗ И ОПЫТ АНЕСТЕЗИИ ═══ */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
					<Activity className="w-4 h-4 text-purple-500" />
					<span>3. Стоматологический анамнез (Опыт анестезии, дентофобия, кровоточивость)</span>
				</label>
				<div className="flex flex-wrap gap-2">
					{DENTAL_HISTORY_ITEMS.map((item) => {
						const isSelected = selectedHistory.includes(item.label);
						const activeClass = item.isAlert
							? "anamnesis-chip--active-purple-alert"
							: "anamnesis-chip--active-purple";
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => toggleHistory(item.label)}
								data-testid={`toggle-history-${item.id}`}
								className={`anamnesis-chip ${isSelected ? activeClass : ""}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═══ БЛОК 4: ОСНОВНЫЕ ЖАЛОБЫ ПАЦИЕНТА ═══ */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
					<Stethoscope className="w-4 h-4 text-teal-500" />
					<span>4. Основные жалобы пациента у кресла</span>
				</label>
				<div className="flex flex-wrap gap-2">
					{PATIENT_COMPLAINTS_LIST.map((item) => {
						const isSelected = selectedComplaints.includes(item);
						return (
							<button
								key={item}
								type="button"
								onClick={() => toggleComplaint(item)}
								className={`anamnesis-chip ${isSelected ? "anamnesis-chip--active-teal" : ""}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═══ БЛОК 5: ДОПОЛНИТЕЛЬНЫЕ ПРИМЕЧАНИЯ С ГОЛОСОМ ═══ */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor={customNotesId}
						className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider"
					>
						Дополнительные примечания врача и постоянная терапия:
					</label>
					<div className="flex items-center">
						<SmartMicrophoneButton
							context="visit"
							sterileMode={false}
							className="p-1"
							onResult={(text) =>
								setCustomNotes((prev) => (prev ? `${prev} ${text}` : text))
							}
						/>
					</div>
				</div>
				<textarea
					id={customNotesId}
					rows={3}
					value={customNotes}
					onChange={(e) => setCustomNotes(e.target.value)}
					placeholder="Индивидуальные особенности, перенесенные операции, реакция на анестезию, принимаемые препараты..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[var(--teal,#0d9488)] outline-none resize-y transition-all placeholder:text-[var(--muted,#64748b)]"
					data-testid="anamnesis-custom-notes"
				/>
			</div>

			{/* ═══ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ (0 DISABLED КНОПОК) ═══ */}
			<div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex-wrap">
				<button
					type="button"
					onClick={handleApplyPhysiologicalNorm}
					className="anamnesis-top-btn anamnesis-top-btn--secondary"
					title="Сбросить все риски до физиологической нормы"
				>
					<RotateCcw className="w-3.5 h-3.5 text-slate-500" />
					<span>Сброс в норму</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={applyToDiary}
						className="anamnesis-top-btn anamnesis-top-btn--secondary"
						data-testid="sync-anamnesis-btn"
						title="Перенести текущие данные анамнеза в дневник приёма"
					>
						<Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>В дневник приёма</span>
					</button>

					<button
						type="button"
						onClick={applyToDiary}
						className="anamnesis-top-btn anamnesis-top-btn--primary"
						data-testid="btn-save-anamnesis-to-patient"
						title="Сохранить анамнез и аллергии в медицинскую карту пациента"
					>
						<Save className="w-3.5 h-3.5" />
						<span>Сохранить в медкарту</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default VisitAnamnesisTab;
