/**
 * apps/web/src/components/visit/anamnesisTab/useAnamnesisState.ts
 *
 * Layer 3: Управление реактивным состоянием формы анамнеза, автосохранение в LocalStorage,
 * сквозная синхронизация с медицинской картой пациента и формой визита (Форма 043/у).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { parseSafetyProfileFromText } from "../../patients/safetyMath";
import {
	DENTAL_ALLERGENS,
	type PregnancyTrimester,
	type VisitAnamnesisTabProps,
} from "./types";

export function useAnamnesisState(props: VisitAnamnesisTabProps) {
	const { onAppendAnamnesis, onAppendComorbidities } = props;
	const appLogic = useAppLogicContext();
	// biome-ignore lint/suspicious/noExplicitAny: patient identifier
	const activePat = (appLogic as any)?.activePatient;
	const patientId = activePat?.id || "draft";
	const storageKey = `dente_anamnesis_tab_draft_${patientId}`;

	// ─── Состояние формы анамнеза ──────────────────────────────────────
	const [selectedAllergies, setSelectedAllergies] = useState<
		Record<string, string>
	>({});
	const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
	const [anticoagulantName, setAnticoagulantName] = useState("");
	const [bisphosphonateName, setBisphosphonateName] = useState("");
	const [pregnancyTrimester, setPregnancyTrimester] = useState<PregnancyTrimester>("trimester_2");
	const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
	const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
	const [customNotes, setCustomNotes] = useState("");

	// Реф для безопасного сброса буфера при unmount (Edge case #15 Autosave Flush)
	const stateRef = useRef({
		selectedAllergies,
		selectedRisks,
		anticoagulantName,
		bisphosphonateName,
		pregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
	});

	useEffect(() => {
		stateRef.current = {
			selectedAllergies,
			selectedRisks,
			anticoagulantName,
			bisphosphonateName,
			pregnancyTrimester,
			selectedHistory,
			selectedComplaints,
			customNotes,
		};
	}, [
		selectedAllergies,
		selectedRisks,
		anticoagulantName,
		bisphosphonateName,
		pregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
	]);

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

				const cleanSomatic = (
					somaticParts.length > 0
						? somaticParts.join(", ")
						: "Соматически здоров. Норма"
				).trim().replace(/\.+$/, "");
				const formattedSomatic = cleanSomatic ? `${cleanSomatic}.` : "Соматически здоров. Норма.";

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
					const cleanComplaints = complaintsList.join(", ").trim().replace(/\.+$/, "");
					if (cleanComplaints) parts.push(`Жалобы: ${cleanComplaints}.`);
				}
				const cleanAllergies = formattedAllergies.trim().replace(/\.+$/, "");
				parts.push(`Аллергоанамнез: ${cleanAllergies}.`);
				parts.push(`Соматический статус: ${cleanSomatic}.`);
				if (historyList.length > 0) {
					const cleanHistory = historyList.join(", ").trim().replace(/\.+$/, "");
					if (cleanHistory) parts.push(`Стоматологический анамнез: ${cleanHistory}.`);
				}
				if (notesText.trim()) {
					const cleanNotes = notesText.trim().replace(/\.+$/, "");
					if (cleanNotes) parts.push(`Примечания: ${cleanNotes}.`);
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

		return () => {
			clearTimeout(timer);
		};
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

	// Сброс буфера при размонтировании вкладки (Edge Case #15)
	useEffect(() => {
		return () => {
			try {
				const cur = stateRef.current;
				const payload = {
					selectedAllergies: cur.selectedAllergies,
					selectedRisks: cur.selectedRisks,
					anticoagulantName: cur.anticoagulantName,
					bisphosphonateName: cur.bisphosphonateName,
					pregnancyTrimester: cur.pregnancyTrimester,
					selectedHistory: cur.selectedHistory,
					selectedComplaints: cur.selectedComplaints,
					customNotes: cur.customNotes,
					updatedAt: new Date().toISOString(),
				};
				safeLocalStorageSetItem(storageKey, JSON.stringify(payload));
			} catch {
				// ignore
			}
		};
	}, [storageKey]);

	// ─── Тогглы элементов ──────────────────────────────────────────────

	const toggleAllergen = useCallback((name: string) => {
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
	}, []);

	const setAllergyReaction = useCallback((allergenName: string, reaction: string) => {
		setSelectedAllergies((prev) => ({
			...prev,
			[allergenName]: reaction,
		}));
	}, []);

	const toggleRisk = useCallback((label: string) => {
		setSelectedRisks((prev) =>
			prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
		);
	}, []);

	const toggleHistory = useCallback((label: string) => {
		setSelectedHistory((prev) =>
			prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
		);
	}, []);

	const toggleComplaint = useCallback((item: string) => {
		setSelectedComplaints((prev) =>
			prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
		);
	}, []);

	// ─── 1-Клик Норма: Соматически здоров (Мандат 8e, 8k) ──────────────
	const handleApplyPhysiologicalNorm = useCallback(() => {
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
	}, [appLogic, onAppendAnamnesis, onAppendComorbidities, syncWithPatientAndVisitState]);

	// ─── Перенос в дневник приёма вручную ──────────────────────────────
	const applyToDiary = useCallback(() => {
		const effComplaints =
			selectedComplaints.length > 0
				? selectedComplaints
				: ["Плановый осмотр (жалоб на момент приёма не предъявляет)"];
		const effHistory =
			selectedHistory.length > 0
				? selectedHistory
				: ["Опыт анестезии положительный (без осложнений)"];
		const effCustom =
			customNotes.trim().replace(/\.+$/, "") ||
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма";

		const allergyEntries = Object.entries(selectedAllergies).map(
			([allergen, reaction]) => `${allergen} (${reaction})`,
		);
		const formattedAllergies = (
			allergyEntries.length > 0
				? allergyEntries.join(", ")
				: "Аллергии не выявлены"
		).trim().replace(/\.+$/, "");

		const parts: string[] = [];
		const cleanComplaints = effComplaints.join(", ").trim().replace(/\.+$/, "");
		if (cleanComplaints) parts.push(`Жалобы: ${cleanComplaints}.`);
		parts.push(`Аллергологический статус: ${formattedAllergies}.`);
		if (selectedRisks.length > 0) {
			const cleanRisks = selectedRisks.join(", ").trim().replace(/\.+$/, "");
			if (cleanRisks) parts.push(`Соматические факторы риска: ${cleanRisks}.`);
		}
		const cleanHistory = effHistory.join(", ").trim().replace(/\.+$/, "");
		if (cleanHistory) parts.push(`Стоматологический анамнез: ${cleanHistory}.`);
		if (effCustom) {
			const cleanCustom = effCustom.trim().replace(/\.+$/, "");
			if (cleanCustom) parts.push(`${cleanCustom}.`);
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
	}, [
		selectedComplaints,
		selectedHistory,
		customNotes,
		selectedAllergies,
		selectedRisks,
		onAppendAnamnesis,
		onAppendComorbidities,
		appLogic,
		syncWithPatientAndVisitState,
		anticoagulantName,
		bisphosphonateName,
		pregnancyTrimester,
	]);

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

	return {
		activePat,
		selectedAllergies,
		selectedRisks,
		anticoagulantName,
		setAnticoagulantName,
		bisphosphonateName,
		setBisphosphonateName,
		pregnancyTrimester,
		setPregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
		setCustomNotes,
		toggleAllergen,
		setAllergyReaction,
		toggleRisk,
		toggleHistory,
		toggleComplaint,
		handleApplyPhysiologicalNorm,
		applyToDiary,
		hasCriticalAllergies,
		hasCriticalStopRisks,
		totalCriticalAlerts,
		selectedAllergyCount,
	};
}
