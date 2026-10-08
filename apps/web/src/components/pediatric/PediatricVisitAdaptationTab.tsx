/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC VISIT ADAPTATION TAB (ВКЛАДКА АДАПТАЦИОННОГО ПРИЁМА ДЕТЕЙ)
 * Dedicated Pediatric Chairside Workflow & Non-Traumatic Adaptation
 * FDI Deciduous (51–85) / Mixed Dentition | Frankl Scale Express Selector
 * 1-Click Bravery Diploma | Zero Cartoon Emojis | Strict Lucide Vector Icons
 * Mandates 8c, 8d, 8e, 8k, 8n | Anti-Matryoshka Depth = 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import {
	Award,
	Check,
	ChevronRight,
	Heart,
	Info,
	Printer,
	ShieldCheck,
	Smile,
	Sparkles,
	Star,
	Zap,
} from "lucide-react";
import { ToothDeciduous } from "../icons/DentalIcons";
import {
	PediatricTeethChart,
	type PediatricDentitionMode,
	type ToothClinicalFinding,
} from "./PediatricTeethChart";
import {
	FRANKL_EXPRESS_ITEMS,
	type FranklExpressItem,
} from "./VisitPediatricProtocolWidget";
import type { FranklRating } from "../odontogram/pediatricDentitionEngine";
import { PediatricBraveryDiplomaModal } from "./PediatricBraveryDiplomaModal";
import { showToast } from "../GlobalToast";

export interface PediatricVisitAdaptationTabProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialFranklRating?: FranklRating | undefined;
	readonly onFranklChange?: ((rating: FranklRating) => void) | undefined;
	readonly onApplyNorm?: (() => void) | undefined;
	readonly onCompleteAdaptation?: ((summaryText: string) => void) | undefined;
	readonly className?: string | undefined;
}

export interface AdaptationStageItem {
	readonly id: string;
	readonly stepNumber: number;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly icon: React.ComponentType<{ className?: string }>;
}

export const ADAPTATION_STAGES: readonly AdaptationStageItem[] = [
	{
		id: "intro_game",
		stepNumber: 1,
		titleRu: "Знакомство и игра",
		shortLabelRu: "1. Знакомство",
		descriptionRu: "Катание на волшебном кресле, зеркальце «солнечный зайчик», установление доверия",
		icon: Smile,
	},
	{
		id: "breeze_water",
		stepNumber: 2,
		titleRu: "«Ветерок» и водичка",
		shortLabelRu: "2. Ветерок",
		descriptionRu: "Демонстрация пустера на ручке ребенка («ветерок»), слюноотсос «слоник»",
		icon: Sparkles,
	},
	{
		id: "count_teeth",
		stepNumber: 3,
		titleRu: "Считаем зубки",
		shortLabelRu: "3. Осмотр",
		descriptionRu: "Осмотр молочных зубчиков зеркалом, подсчет и похвала за красивую улыбку",
		icon: ToothDeciduous,
	},
	{
		id: "gentle_brush",
		stepNumber: 4,
		titleRu: "Мягкая полировка",
		shortLabelRu: "4. Чистка",
		descriptionRu: "Циркулярная щеточка со сладкой пастой, нанесение защитного геля",
		icon: ShieldCheck,
	},
	{
		id: "award_hero",
		stepNumber: 5,
		titleRu: "Награда и грамота",
		shortLabelRu: "5. Грамота",
		descriptionRu: "Торжественное вручение грамоты за смелость и подарка маленькому герою",
		icon: Award,
	},
];

export const PediatricVisitAdaptationTab: React.FC<PediatricVisitAdaptationTabProps> = ({
	patientName = "Юный пациент",
	patientAgeYears = 6,
	doctorName,
	clinicName,
	initialFranklRating = 3,
	onFranklChange,
	onApplyNorm,
	onCompleteAdaptation,
	className = "",
}) => {
	const [dentitionMode, setDentitionMode] = useState<PediatricDentitionMode>(
		patientAgeYears >= 6 && patientAgeYears <= 11 ? "mixed" : "primary",
	);
	const [activeTooth, setActiveTooth] = useState<number>(54);
	const [toothFindings, setToothFindings] = useState<Record<number, ToothClinicalFinding>>({});
	const [currentFrankl, setCurrentFrankl] = useState<FranklRating>(initialFranklRating);
	const [activeStageId, setActiveStageId] = useState<string>("intro_game");
	const [completedStages, setCompletedStages] = useState<Set<string>>(
		new Set(["intro_game", "breeze_water"]),
	);
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);
	const [doctorNotes, setDoctorNotes] = useState<string>(
		"Ребёнок контактен, охотно сел в кресло, с интересом познакомился с инструментами. Осмотр проведён в игровой форме, страх отсутствует.",
	);

	const activeFranklItem = useMemo<FranklExpressItem>(() => {
		return (
			FRANKL_EXPRESS_ITEMS.find((item) => item.rating === currentFrankl) ??
			FRANKL_EXPRESS_ITEMS[2]!
		);
	}, [currentFrankl]);

	const handleSelectFrankl = useCallback(
		(rating: FranklRating) => {
			setCurrentFrankl(rating);
			onFranklChange?.(rating);
			showToast(`Поведение ребёнка: ${rating}/4`, "info", 1500);
		},
		[onFranklChange],
	);

	const toggleStageCompleted = useCallback((stageId: string) => {
		setCompletedStages((prev) => {
			const next = new Set(prev);
			if (next.has(stageId)) {
				next.delete(stageId);
			} else {
				next.add(stageId);
			}
			return next;
		});
	}, []);

	const handle1ClickNorm = useCallback(() => {
		// 1-Click Deciduous Dentition Norm (Mandate 8e)
		const healthyAll: Record<number, ToothClinicalFinding> = {};
		for (let q = 5; q <= 8; q++) {
			for (let p = 1; p <= 5; p++) {
				healthyAll[q * 10 + p] = "Healthy";
			}
		}
		if (dentitionMode === "mixed") {
			healthyAll[16] = "Healthy";
			healthyAll[26] = "Healthy";
			healthyAll[36] = "Healthy";
			healthyAll[46] = "Healthy";
		}
		setToothFindings(healthyAll);
		onApplyNorm?.();
		showToast("Молочный прикус: физиологическая норма установлена в 1 клик", "success", 2000);
	}, [dentitionMode, onApplyNorm]);

	const handleSaveAdaptationProtocol = useCallback(() => {
		const summary = [
			`Адаптационный приём маленького пациента: ${patientName} (${patientAgeYears} лет)`,
			`Поведение по шкале Франкла: ${activeFranklItem.shortLabelRu}`,
			`Пройденные этапы адаптации: ${Array.from(completedStages).length} из 5`,
			`Заметки врача: ${doctorNotes}`,
			"Вручена грамота за смелость маленькому пациенту.",
		].join("\n");

		onCompleteAdaptation?.(summary);
		showToast("Протокол адаптационного приёма успешно сохранён в медкарту", "success", 2500);
	}, [activeFranklItem.shortLabelRu, completedStages, doctorNotes, onCompleteAdaptation, patientAgeYears, patientName]);

	return (
		<div
			className={`flex flex-col gap-4 p-3 sm:p-5 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl border border-[var(--line,#e2e8f0)] shadow-xs ${className}`}
			data-testid="pediatric-visit-adaptation-tab"
		>
			{/* ВЕРХНИЙ ТУЛБАР АДАПТАЦИОННОГО ПРИЁМА (СТРОГО 1 СТРОКА: 32-36px) */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
						<Heart className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm font-extrabold tracking-tight text-[var(--ink,#0f172a)] truncate">
							Адаптационный приём и привыкание к лечению
						</h2>
						<p className="text-[11px] text-[var(--muted,#64748b)] truncate">
							{patientName} ({patientAgeYears} лет) · Бесконфликтный игровой осмотр
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
					{/* 1-Клик Норма прикуса (Мандат 8e) */}
					<button
						type="button"
						onClick={handle1ClickNorm}
						className="secondary-button h-8 px-3 rounded-lg text-emerald-800 dark:text-emerald-200 border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
						title="1-клик: Физиологическая норма прикуса (Мандат 8e)"
						data-testid="btn-adaptation-1click-norm"
					>
						<Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Норма прикуса</span>
					</button>

					{/* 1-Клик Грамота за смелость (Мандат 8e) */}
					<button
						type="button"
						onClick={() => setIsDiplomaModalOpen(true)}
						className="secondary-button h-8 px-3 rounded-lg text-amber-900 dark:text-amber-200 border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
						title="1-клик: Печать грамоты за смелость маленькому пациенту"
						data-testid="btn-adaptation-open-diploma"
					>
						<Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
						<span>Грамота за смелость</span>
					</button>

					{/* Переключатель прикуса (Молочный / Сменный) */}
					<div className="inline-flex p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] gap-1">
						<button
							type="button"
							onClick={() => setDentitionMode("primary")}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
								dentitionMode === "primary"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="btn-mode-primary"
						>
							Молочный (51–85)
						</button>
						<button
							type="button"
							onClick={() => setDentitionMode("mixed")}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
								dentitionMode === "mixed"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="btn-mode-mixed"
						>
							Сменный (24 зуба)
						</button>
					</div>
				</div>
			</div>

			{/* ЭКСПРЕСС-ШКАЛА ПОВЕДЕНИЯ ФРАНКЛА (ZERO EMOJIS — LUCIDE ICONS) */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						Поведение ребёнка по шкале Франкла (1-клик выбор):
					</span>
					<span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${activeFranklItem.badgeClass}`}>
						{activeFranklItem.shortLabelRu}
					</span>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{FRANKL_EXPRESS_ITEMS.map((item) => {
						const isSelected = item.rating === currentFrankl;
						const IconComp = item.icon;
						return (
							<button
								key={item.rating}
								type="button"
								onClick={() => handleSelectFrankl(item.rating)}
								className={`min-h-[44px] p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95 ${
									isSelected
										? item.activeClass
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid={`btn-frankl-${item.rating}`}
							>
								<IconComp className="w-5 h-5 shrink-0" />
								<div className="min-w-0">
									<div className="text-xs font-extrabold leading-tight truncate">
										{item.titleRu}
									</div>
									<div className="text-[10px] text-[var(--muted,#64748b)] truncate">
										{item.clinicalTacticRu.split(",")[0]}
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* МОЛОЧНАЯ ЗУБНАЯ ФОРМУЛА FDI (КНОПКИ >= 44x44px, 0 ГОРИЗОНТАЛЬНОГО СКРОЛЛА) */}
			<div className="p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<ToothDeciduous className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Зубная формула ({dentitionMode === "mixed" ? "Сменный прикус" : "Временный прикус"}):
						</span>
					</div>
					<span className="text-xs text-[var(--muted,#64748b)]">
						Выбран зуб: <strong className="font-mono text-[var(--ink,#0f172a)]">{activeTooth}</strong>
					</span>
				</div>

				<PediatricTeethChart
					mode={dentitionMode}
					activeTooth={activeTooth}
					onSelectTooth={setActiveTooth}
					toothFindings={toothFindings}
					onToothFindingChange={(t, f) => {
						setToothFindings((prev) => ({ ...prev, [t]: f }));
					}}
					onSetAllHealthy={handle1ClickNorm}
				/>
			</div>

			{/* ПОШАГОВЫЙ МЕТОД АДАПТАЦИИ TELL-SHOW-DO */}
			<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Sparkles className="w-4 h-4 text-amber-500" />
						<span className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink,#0f172a)]">
							Этапы адаптации («Расскажи-Покажи-Сделай»):
						</span>
					</div>
					<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Выполнено {completedStages.size} из {ADAPTATION_STAGES.length}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
					{ADAPTATION_STAGES.map((stage) => {
						const isDone = completedStages.has(stage.id);
						const isActive = activeStageId === stage.id;
						const StageIcon = stage.icon;
						return (
							<div
								key={stage.id}
								onClick={() => {
									setActiveStageId(stage.id);
									toggleStageCompleted(stage.id);
								}}
								className={`p-2.5 rounded-xl border text-left cursor-pointer transition select-none flex flex-col justify-between min-h-[72px] active:scale-95 ${
									isDone
										? "bg-teal-500/10 border-teal-500/40 text-teal-900 dark:text-teal-100"
										: isActive
											? "bg-[var(--paper,#ffffff)] border-amber-400 ring-2 ring-amber-400/30 text-[var(--ink,#0f172a)]"
											: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] hover:border-teal-300"
								}`}
								data-testid={`stage-item-${stage.id}`}
							>
								<div className="flex items-center justify-between gap-1 mb-1">
									<StageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
									<span
										className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
											isDone
												? "bg-teal-600 text-white"
												: "bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)]"
										}`}
									>
										{isDone ? <Check className="w-2.5 h-2.5" /> : stage.stepNumber}
									</span>
								</div>
								<div className="text-xs font-bold leading-tight line-clamp-1">
									{stage.titleRu}
								</div>
								<div className="text-[10px] text-[var(--muted,#64748b)] leading-snug line-clamp-2 mt-0.5">
									{stage.descriptionRu}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* ЗАМЕТКИ ВРАЧА И ФИНАЛЬНОЕ ДЕЙСТВИЕ */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
				<div className="flex-1 min-w-0">
					<input
						type="text"
						value={doctorNotes}
						onChange={(e) => setDoctorNotes(e.target.value)}
						placeholder="Клинические заметки о поведении ребенка..."
						className="w-full h-9 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-hidden"
						data-testid="input-adaptation-notes"
					/>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={handleSaveAdaptationProtocol}
						className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95"
						data-testid="btn-save-adaptation-protocol"
					>
						<Check className="w-4 h-4" />
						<span>Завершить адаптацию</span>
					</button>
				</div>
			</div>

			{/* МОДАЛКА ДИПЛОМА ЗА ХРАБРОСТЬ */}
			{isDiplomaModalOpen && (
				<PediatricBraveryDiplomaModal
					isOpen={isDiplomaModalOpen}
					onClose={() => setIsDiplomaModalOpen(false)}
					patientName={patientName}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
		</div>
	);
};

export default PediatricVisitAdaptationTab;
