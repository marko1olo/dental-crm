import {
	Activity,
	AlertCircle,
	Check,
	HeartPulse,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
	type OutpatientProtocolTemplate,
	type OutpatientSpecialty,
	populateOutpatientTemplateText,
	searchOutpatientProtocols,
	STOMX_SPECIALTIES,
} from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";

export interface VisitAnamnesisTabProps {
	onAppendAnamnesis?: (text: string) => void;
	onAppendComorbidities?: (text: string) => void;
	activeTooth?: number | null;
	onOpenStomxTemplates?: () => void;
}

const COMMON_COMPLAINTS = [
	"Острая самопроизвольная боль",
	"Реакция на холодное и горячее",
	"Выпала пломба",
	"Скол коронки / стенки зуба",
	"Кровоточивость десен",
	"Плановый осмотр",
	"Боль при накусывании на зуб",
	"Застревание пищи в межзубном промежутке",
	"Подвижность зуба",
	"Боли от сладкого и кислого",
	"Эстетический дефект зубного ряда",
	"Неприятный запах изо рта",
	"Жалоб нет (профилактический осмотр)",
] as const;

const SOMATIC_RISK_FACTORS = [
	"Аллергия на местные анестетики",
	"Аллергия на антибиотики (пенициллин)",
	"Аллергия на НПВП (аспириновая триада)",
	"Аллергия на латекс",
	"Имплантированный кардиостимулятор (ЭКС / ИКД)",
	"Гипертоническая болезнь",
	"Ишемическая болезнь сердца / аритмия",
	"Сахарный диабет",
	"Прием антикоагулянтов / дезагрегантов",
	"Беременность / период лактации",
	"Прием бисфосфонатов",
] as const;

const DENTAL_HISTORY_FACTORS = [
	"Ранее лечен по поводу кариеса",
	"Ранее проводилось эндодонтическое лечение",
	"Ранее удалялись зубы",
	"Наличие ортопедических коронок / мостовидных протезов",
	"Наличие дентальных имплантатов",
	"Опыт анестезии положительный (без осложнений)",
	"Дентофобия (страх стоматологического лечения)",
] as const;

export const VisitAnamnesisTab: React.FC<VisitAnamnesisTabProps> = ({
	onAppendAnamnesis,
	onAppendComorbidities,
	activeTooth = null,
	onOpenStomxTemplates,
}) => {
	const appLogic = useAppLogicContext();
	// biome-ignore lint/suspicious/noExplicitAny: patient identification
	const patientId = (appLogic as any)?.activePatient?.id || "draft";
	const storageKey = `dente_anamnesis_tab_draft_${patientId}`;

	const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
	const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
	const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
	const [customNotes, setCustomNotes] = useState("");

	const [isStomxModalOpen, setIsStomxModalOpen] = useState<boolean>(false);
	const [stomxSearch, setStomxSearch] = useState<string>("");
	const [stomxSpecialty, setStomxSpecialty] = useState<OutpatientSpecialty | "all">("all");

	const filteredStomxProtocols = useMemo(() => {
		const spec = stomxSpecialty === "all" ? undefined : stomxSpecialty;
		return searchOutpatientProtocols(stomxSearch, spec);
	}, [stomxSearch, stomxSpecialty]);

	const handleApplyStomxProtocol = (protocol: OutpatientProtocolTemplate) => {
		const targetTooth = activeTooth ?? 16;
		const params = { toothNumber: targetTooth };
		const popComplaint = populateOutpatientTemplateText(protocol.complaint, params);
		const popAnamnesis = populateOutpatientTemplateText(protocol.anamnesis, params);
		const popObjective = populateOutpatientTemplateText(protocol.objectiveStatus, params);
		const popDiagnosis = populateOutpatientTemplateText(protocol.diagnosis, params);
		const popTreatment = populateOutpatientTemplateText(protocol.treatmentProtocol, params);
		const popRecs = populateOutpatientTemplateText(protocol.recommendations, params);

		// biome-ignore lint/suspicious/noExplicitAny: integration context
		const ctx = appLogic as any;
		if (ctx?.updateVisitNoteField) {
			ctx.updateVisitNoteField("complaint", popComplaint);
			ctx.updateVisitNoteField("anamnesis", popAnamnesis);
			ctx.updateVisitNoteField("objectiveStatus", popObjective);
			ctx.updateVisitNoteField("diagnosis", `${protocol.mkbCode} ${popDiagnosis}`.trim());
			ctx.updateVisitNoteField("treatmentPlan", popTreatment);
			ctx.updateVisitNoteField("recommendations", popRecs);
		}
		if (onAppendAnamnesis) {
			onAppendAnamnesis(popAnamnesis);
		}
		showToast(`Применен протокол StomX: ${protocol.name} (зуб ${targetTooth})`, "success", 4000);
		setIsStomxModalOpen(false);
	};

	// Restore draft on mount or patient switch
	useEffect(() => {
		try {
			const saved = safeLocalStorageGetItem(storageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed.selectedComplaints)) setSelectedComplaints(parsed.selectedComplaints);
				if (Array.isArray(parsed.selectedRisks)) setSelectedRisks(parsed.selectedRisks);
				if (Array.isArray(parsed.selectedHistory)) setSelectedHistory(parsed.selectedHistory);
				if (typeof parsed.customNotes === "string") setCustomNotes(parsed.customNotes);
			}
		} catch {
			// ignore storage errors
		}
	}, [storageKey]);

	// Debounced autosave draft on modification (300ms debounce per Mandate 8e & safeLocalStorage)
	useEffect(() => {
		const timer = setTimeout(() => {
			try {
				const payload = {
					selectedComplaints,
					selectedRisks,
					selectedHistory,
					customNotes,
					updatedAt: new Date().toISOString(),
				};
				safeLocalStorageSetItem(storageKey, JSON.stringify(payload));
			} catch {
				// ignore storage errors
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [storageKey, selectedComplaints, selectedRisks, selectedHistory, customNotes]);

	const toggleComplaint = (item: string) => {
		setSelectedComplaints((prev) =>
			prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
		);
	};

	const toggleRisk = (item: string) => {
		setSelectedRisks((prev) =>
			prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
		);
	};

	const toggleHistory = (item: string) => {
		setSelectedHistory((prev) =>
			prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
		);
	};

	const handleApplyPhysiologicalNorm = () => {
		setSelectedComplaints(["Плановый осмотр (жалоб нет)"]);
		setSelectedRisks([]);
		setSelectedHistory(["Опыт анестезии положительный (без осложнений)"]);
		const normNotes =
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";
		setCustomNotes(normNotes);

		const normComplaints =
			"Жалоб на момент осмотра не предъявляет (профилактический осмотр).";
		const normAnamnesis =
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Стоматологический анамнез: регулярная санация полости рта, опыт местной анестезии без осложнений. Физиологическая норма.";
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

		// Also update Emk visitNoteForm if available
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

		showToast(
			"Применена норма Формы 043/у (Z01.2): соматически здоров",
			"success",
			3000,
		);
	};

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
			"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";

		const parts: string[] = [];
		parts.push(`Жалобы: ${effComplaints.join(", ")}.`);
		parts.push(
			`Анамнез жизни и стоматологический анамнез: ${effHistory.join(", ")}.`,
		);
		if (effCustom) {
			parts.push(effCustom);
		}

		const fullAnamnesis = parts.join(" ");

		if (fullAnamnesis && onAppendAnamnesis) {
			onAppendAnamnesis(fullAnamnesis);
		}

		if (selectedRisks.length > 0 && onAppendComorbidities) {
			onAppendComorbidities(
				`Сопутствующие и аллергологический статус: ${selectedRisks.join(", ")}.`,
			);
		} else if (onAppendComorbidities) {
			onAppendComorbidities("Сопутствующие патологии: отсутствуют (норма).");
		}

		// Also update Emk visitNoteForm if available
		// biome-ignore lint/suspicious/noExplicitAny: integration context
		const ctx = appLogic as any;
		if (ctx?.updateVisitNoteField) {
			if (fullAnamnesis) {
				const current = ctx.visitNoteForm?.anamnesis || "";
				ctx.updateVisitNoteField(
					"anamnesis",
					current ? `${current}\n${fullAnamnesis}` : fullAnamnesis,
				);
			}
		}

		showToast(
			"Клинический анамнез перенесён в дневник приёма и ЭМК",
			"success",
			4000,
		);
	};

	const hasCriticalRisks = useMemo(() => {
		return selectedRisks.some(
			(r) =>
				r.includes("анестетики") ||
				r.includes("антикоагулянтов") ||
				r.includes("бисфосфонатов"),
		);
	}, [selectedRisks]);

	return (
		<div
			className="visit-anamnesis-tab flex flex-col gap-4 w-full max-w-full p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs"
			data-testid="visit-anamnesis-tab"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div
						className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
							hasCriticalRisks
								? "bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] border-2 border-[#ef4444]"
								: selectedRisks.length > 0
									? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200"
									: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200"
						}`}
					>
						{selectedRisks.length === 0 ? (
							<ShieldCheck className="w-5 h-5" />
						) : (
							<Stethoscope className="w-5 h-5" />
						)}
					</div>
					<div>
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
							Клинический опросник и анамнез приёма
						</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Быстрые теги жалоб, соматических факторов риска и аллергоанамнеза
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={onOpenStomxTemplates || (() => setIsStomxModalOpen(true))}
						className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
						data-testid="btn-open-stomt-templates-anamnesis"
						title="Открыть каталог 448 клинических шаблонов 043/у из StomX (Терапия, Ортопедия, Хирургия, Имплантология, Пародонтология)"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>Клинические шаблоны StomX (448)</span>
					</button>
					<button
						type="button"
						onClick={handleApplyPhysiologicalNorm}
						className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
						data-testid="btn-somatic-norm-one-click"
						title="1 клик: заполнить осмотр физиологической нормой Формы 043/у (Z01.2: соматически здоров)"
					>
						<ShieldCheck className="w-4 h-4" />
						<span>Соматически здоров / Норма Z01.2 (1-клик)</span>
					</button>
					<button
						type="button"
						onClick={applyToDiary}
						className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-xs sm:text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors shadow-xs cursor-pointer active:scale-98"
						data-testid="btn-apply-anamnesis-to-diary"
						title="Перенести текущие данные анамнеза в дневник Формы 043/у"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Перенести в дневник 043/у</span>
					</button>
				</div>
			</div>

			{/* Status Banner: Anatomical Red (#ef4444) for Critical Stop Factors, or Calm Emerald Norm */}
			{hasCriticalRisks ? (
				<div
					className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-[#ef4444] text-rose-950 dark:text-rose-200 text-xs shadow-xs"
					data-testid="visit-anamnesis-critical-alert"
				>
					<AlertCircle className="w-5 h-5 text-[#ef4444] shrink-0" />
					<div className="flex flex-col gap-0.5">
						<span className="font-bold text-[#ef4444]">
							ВНИМАНИЕ: Обнаружены клинические стоп-факторы ({selectedRisks.filter((r) => r.includes("анестетики") || r.includes("антикоагулянтов") || r.includes("бисфосфонатов")).join(", ")})
						</span>
						<span className="text-[11px] text-rose-900 dark:text-rose-300">
							Обязательна коррекция выбора местного анестетика, оценка риска профузного кровотечения и остеонекроза челюсти (MRONJ).
						</span>
					</div>
				</div>
			) : selectedRisks.length > 0 ? (
				<div
					className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 text-xs"
					data-testid="visit-anamnesis-alert-banner"
				>
					<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						Отмечены соматические факторы риска: {selectedRisks.join(", ")}. Учитывать при подборе анестетика и премедикации.
					</span>
				</div>
			) : null}

			{/* Section 1: Top Dental Complaints */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
					<Activity className="w-3.5 h-3.5 text-blue-500" />
					Основные жалобы пациента (1-Click выбор)
				</label>
				<div className="flex flex-wrap gap-2">
					{COMMON_COMPLAINTS.map((item) => {
						const isSelected = selectedComplaints.includes(item);
						return (
							<button
								key={item}
								type="button"
								onClick={() => toggleComplaint(item)}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-xl text-xs font-medium border transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal-dark)] font-semibold shadow-xs"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-[var(--teal)]" />
								) : (
									<Plus className="w-3 h-3 text-[var(--muted)]" />
								)}
								{item}
							</button>
						);
					})}
				</div>
			</div>

			{/* Section 2: Somatic Status & Allergies */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
					<AlertCircle className="w-3.5 h-3.5 text-amber-500" />
					Факторы риска, соматический статус и аллергии
				</label>
				<div className="flex flex-wrap gap-2">
					{SOMATIC_RISK_FACTORS.map((item) => {
						const isSelected = selectedRisks.includes(item);
						const isCritical =
							item.includes("анестетики") ||
							item.includes("антикоагулянтов") ||
							item.includes("бисфосфонатов");
						return (
							<button
								key={item}
								type="button"
								onClick={() => toggleRisk(item)}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-xl text-xs font-medium border transition-all cursor-pointer ${
									isSelected
										? isCritical
											? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 font-bold shadow-xs"
											: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								{isSelected ? (
									<Check
										className={`w-3.5 h-3.5 ${
											isCritical ? "text-[#ef4444]" : "text-amber-600 dark:text-amber-400"
										}`}
									/>
								) : (
									<Plus className="w-3 h-3 text-[var(--muted)]" />
								)}
								{item}
							</button>
						);
					})}
				</div>
			</div>

			{/* Section 3: Dental History */}
			<div className="space-y-2.5">
				<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
					<HeartPulse className="w-3.5 h-3.5 text-purple-500" />
					Стоматологический анамнез
				</label>
				<div className="flex flex-wrap gap-2">
					{DENTAL_HISTORY_FACTORS.map((item) => {
						const isSelected = selectedHistory.includes(item);
						return (
							<button
								key={item}
								type="button"
								onClick={() => toggleHistory(item)}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-xl text-xs font-medium border transition-all cursor-pointer ${
									isSelected
										? "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300 font-semibold"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								) : (
									<Plus className="w-3 h-3 text-[var(--muted)]" />
								)}
								{item}
							</button>
						);
					})}
				</div>
			</div>

			{/* Section 4: Free-form Anamnesis Notes with Voice */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor="anamnesis-custom-notes"
						className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider"
					>
						Дополнительные примечания врача
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
					id="anamnesis-custom-notes"
					rows={3}
					value={customNotes}
					onChange={(e) => setCustomNotes(e.target.value)}
					placeholder="Свободные примечания по анамнезу, перенесенным операциям или индивидуальным особенностям..."
					className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm focus:ring-2 focus:ring-[var(--teal-glow)] focus:border-[var(--teal)] outline-none resize-y"
				/>
			</div>

			{/* Модальное окно выбора протоколов StomX (448 шаблонов) */}
			{isStomxModalOpen && (
				<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="bg-[var(--paper,white)] text-[var(--ink)] rounded-2xl max-w-2xl w-full p-4 border border-[var(--line)] shadow-2xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-3">
							<div className="flex items-center gap-2">
								<Sparkles className="w-5 h-5 text-teal-600" />
								<div>
									<h4 className="font-bold text-sm m-0">Клинические шаблоны StomX (448 протоколов 043/у)</h4>
									<p className="text-[11px] text-[var(--muted)] m-0">Целевой зуб: {activeTooth ?? 16} (автозамена плейсхолдеров)</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsStomxModalOpen(false)}
								className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Фильтр специальностей */}
						<div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none shrink-0">
							<button
								type="button"
								onClick={() => setStomxSpecialty("all")}
								className={`h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0 ${stomxSpecialty === "all" ? "bg-teal-600 text-white" : "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"}`}
							>
								Все ({searchOutpatientProtocols("").length})
							</button>
							{STOMX_SPECIALTIES.map((spec) => (
								<button
									key={spec.id}
									type="button"
									onClick={() => setStomxSpecialty(spec.id)}
									className={`h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0 ${stomxSpecialty === spec.id ? "bg-teal-600 text-white" : "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"}`}
								>
									{spec.shortLabel}
								</button>
							))}
						</div>

						{/* Поиск */}
						<div className="relative my-2 shrink-0">
							<Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--muted)]" />
							<input
								type="text"
								value={stomxSearch}
								onChange={(e) => setStomxSearch(e.target.value)}
								placeholder="Поиск по диагнозу, коду МКБ-10, протоколу лечения..."
								className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							/>
						</div>

						{/* Список протоколов */}
						<div className="overflow-y-auto max-h-[50vh] space-y-2 pr-1 flex-1">
							{filteredStomxProtocols.slice(0, 50).map((protocol) => (
								<div
									key={protocol.id}
									className="p-2.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl flex items-center justify-between gap-3 hover:border-teal-500 transition-colors"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5 mb-1">
											<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
												{protocol.mkbCode}
											</span>
											<span className="text-xs font-bold text-[var(--ink)] truncate">
												{protocol.name}
											</span>
										</div>
										<p className="text-[11px] text-[var(--muted)] line-clamp-1 m-0">
											{protocol.complaint}
										</p>
									</div>
									<button
										type="button"
										onClick={() => handleApplyStomxProtocol(protocol)}
										className="shrink-0 h-8 px-3 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs"
									>
										Применить (1 клик)
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
