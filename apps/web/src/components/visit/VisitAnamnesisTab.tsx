import {
	Activity,
	AlertCircle,
	Check,
	HeartPulse,
	Plus,
	ShieldCheck,
	Stethoscope,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

export interface VisitAnamnesisTabProps {
	onAppendAnamnesis?: (text: string) => void;
	onAppendComorbidities?: (text: string) => void;
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
}) => {
	const appLogic = useAppLogicContext();
	const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
	const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
	const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
	const [customNotes, setCustomNotes] = useState("");

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
		setCustomNotes(
			"Соматически здоров. Хронические соматические патологии, сердечно-сосудистые риски и аллергологический статус со слов пациента не отягощены.",
		);
		showToast("Применена норма: соматически здоров", "success", 3000);
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
			"Соматически здоров. Хронические заболевания и аллергии со слов отрицает.";

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

	return (
		<div
			className="visit-anamnesis-tab flex flex-col gap-6 w-full max-w-full p-4 sm:p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-sm"
			data-testid="visit-anamnesis-tab"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--line)]">
						<Stethoscope className="w-5 h-5" />
					</div>
					<div>
						<h3 className="text-base font-bold text-[var(--ink)] m-0">
							Клинический опросник и анамнез приёма
						</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Быстрые теги жалоб, соматических факторов риска и аллергоанамнеза
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						type="button"
						onClick={handleApplyPhysiologicalNorm}
						className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer active:scale-98"
						data-testid="btn-somatic-norm-one-click"
						title="1 клик: заполнить осмотр физиологической нормой (соматически здоров)"
					>
						<ShieldCheck className="w-4 h-4" />
						<span>Соматически здоров / норма (1-клик)</span>
					</button>
					<button
						type="button"
						onClick={applyToDiary}
						className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors shadow-sm cursor-pointer active:scale-98"
						data-testid="btn-apply-anamnesis-to-diary"
						title="Перенести текущие данные анамнеза в дневник Формы 043/у"
					>
						<Plus className="w-4 h-4" />
						<span>Перенести в дневник 043/у</span>
					</button>
				</div>
			</div>

			{/* Section 1: Top Dental Complaints */}
			<div className="space-y-3">
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
								className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium border transition-all ${
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
			<div className="space-y-3">
				<label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
					<AlertCircle className="w-3.5 h-3.5 text-amber-500" />
					Факторы риска, соматический статус и аллергии
				</label>
				<div className="flex flex-wrap gap-2">
					{SOMATIC_RISK_FACTORS.map((item) => {
						const isSelected = selectedRisks.includes(item);
						return (
							<button
								key={item}
								type="button"
								onClick={() => toggleRisk(item)}
								className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium border transition-all ${
									isSelected
										? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								{isSelected ? (
									<Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
			<div className="space-y-3">
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
								className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium border transition-all ${
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
		</div>
	);
};
