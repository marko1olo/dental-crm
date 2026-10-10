/**
 * DENTE CRM — Odontogram & Dental Formula Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - 2-Click pathology markup (caries, pulpitis, crown, missing, restoration)
 * - 1-Click Autonorm (Shift+N) for intact teeth
 * - FDI numbering (11–48 permanent, 51–85 primary)
 * - Hotkeys, FAQs, and interactive training tour button
 */

import React, { useState } from "react";
import { Check, CheckCircle2, Gamepad2, HelpCircle, MousePointer, RotateCcw, Sparkles, Zap } from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

interface MockTooth {
	readonly fdi: number;
	readonly name: string;
	readonly status: "normal" | "caries" | "pulpitis" | "crown" | "missing" | "filling";
	readonly surface?: string | undefined;
}

const INITIAL_ADULT_TEETH: readonly MockTooth[] = [
	{ fdi: 18, name: "3-й моляр", status: "missing" },
	{ fdi: 17, name: "2-й моляр", status: "normal" },
	{ fdi: 16, name: "1-й моляр", status: "caries", surface: "O, M" },
	{ fdi: 15, name: "2-й премоляр", status: "normal" },
	{ fdi: 14, name: "1-й премоляр", status: "filling", surface: "O" },
	{ fdi: 13, name: "Клык", status: "normal" },
	{ fdi: 12, name: "Боковой резец", status: "normal" },
	{ fdi: 11, name: "Центральный резец", status: "normal" },
	{ fdi: 21, name: "Центральный резец", status: "normal" },
	{ fdi: 22, name: "Боковой резец", status: "normal" },
	{ fdi: 23, name: "Клык", status: "normal" },
	{ fdi: 24, name: "1-й премоляр", status: "normal" },
	{ fdi: 25, name: "2-й премоляр", status: "normal" },
	{ fdi: 26, name: "1-й моляр", status: "pulpitis", surface: "Каналы" },
	{ fdi: 27, name: "2-й моляр", status: "normal" },
	{ fdi: 28, name: "3-й моляр", status: "normal" },
	{ fdi: 48, name: "3-й моляр", status: "missing" },
	{ fdi: 47, name: "2-й моляр", status: "normal" },
	{ fdi: 46, name: "1-й моляр", status: "crown" },
	{ fdi: 45, name: "2-й премоляр", status: "normal" },
	{ fdi: 44, name: "1-й премоляр", status: "normal" },
	{ fdi: 43, name: "Клык", status: "normal" },
	{ fdi: 42, name: "Боковой резец", status: "normal" },
	{ fdi: 41, name: "Центральный резец", status: "normal" },
	{ fdi: 31, name: "Центральный резец", status: "normal" },
	{ fdi: 32, name: "Боковой резец", status: "normal" },
	{ fdi: 33, name: "Клык", status: "normal" },
	{ fdi: 34, name: "1-й премоляр", status: "normal" },
	{ fdi: 35, name: "2-й премоляр", status: "filling", surface: "D" },
	{ fdi: 36, name: "1-й моляр", status: "caries", surface: "O" },
	{ fdi: 37, name: "2-й моляр", status: "normal" },
	{ fdi: 38, name: "3-й моляр", status: "normal" },
];

const INITIAL_CHILD_TEETH: readonly MockTooth[] = [
	{ fdi: 55, name: "2-й моляр молочный", status: "caries", surface: "O" },
	{ fdi: 54, name: "1-й моляр молочный", status: "normal" },
	{ fdi: 53, name: "Клык молочный", status: "normal" },
	{ fdi: 52, name: "Боковой резец", status: "normal" },
	{ fdi: 51, name: "Центральный резец", status: "normal" },
	{ fdi: 61, name: "Центральный резец", status: "normal" },
	{ fdi: 62, name: "Боковой резец", status: "normal" },
	{ fdi: 63, name: "Клык молочный", status: "normal" },
	{ fdi: 64, name: "1-й моляр молочный", status: "filling", surface: "O" },
	{ fdi: 65, name: "2-й моляр молочный", status: "normal" },
	{ fdi: 85, name: "2-й моляр молочный", status: "normal" },
	{ fdi: 84, name: "1-й моляр молочный", status: "normal" },
	{ fdi: 83, name: "Клык молочный", status: "normal" },
	{ fdi: 82, name: "Боковой резец", status: "normal" },
	{ fdi: 81, name: "Центральный резец", status: "normal" },
	{ fdi: 71, name: "Центральный резец", status: "normal" },
	{ fdi: 72, name: "Боковой резец", status: "normal" },
	{ fdi: 73, name: "Клык молочный", status: "normal" },
	{ fdi: 74, name: "1-й моляр молочный", status: "caries", surface: "M" },
	{ fdi: 75, name: "2-й моляр молочный", status: "normal" },
];

export const OdontogramGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [dentitionType, setDentitionType] = useState<"adult" | "child">("adult");
	const [teeth, setTeeth] = useState<readonly MockTooth[]>(INITIAL_ADULT_TEETH);
	const [selectedFdi, setSelectedFdi] = useState<number | null>(16);

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
	};

	const handleToggleDentition = (type: "adult" | "child") => {
		setDentitionType(type);
		if (type === "adult") {
			setTeeth(INITIAL_ADULT_TEETH);
			setSelectedFdi(16);
		} else {
			setTeeth(INITIAL_CHILD_TEETH);
			setSelectedFdi(55);
		}
	};

	const handleApplyAutonorm = () => {
		setTeeth((prev) =>
			prev.map((t) => ({
				...t,
				status: "normal",
				surface: undefined,
			})),
		);
	};

	const handleUpdateStatus = (fdi: number, newStatus: MockTooth["status"]) => {
		setTeeth((prev) =>
			prev.map((t) => (t.fdi === fdi ? { ...t, status: newStatus } : t)),
		);
	};

	const selectedTooth = teeth.find((t) => t.fdi === selectedFdi);

	const getToothStatusColor = (status: MockTooth["status"]) => {
		switch (status) {
			case "caries":
				return "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300";
			case "pulpitis":
				return "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300";
			case "crown":
				return "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300";
			case "missing":
				return "bg-neutral-500/20 border-neutral-500/50 text-[var(--muted)] line-through";
			case "filling":
				return "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300";
			default:
				return "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]";
		}
	};

	const getStatusBadge = (status: MockTooth["status"]) => {
		switch (status) {
			case "caries":
				return "Кариес (C)";
			case "pulpitis":
				return "Пульпит (P)";
			case "crown":
				return "Коронка (K)";
			case "missing":
				return "Удален (X)";
			case "filling":
				return "Пломба (F)";
			default:
				return "Норма (N)";
		}
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
					<Sparkles size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Зубная формула и одонтограмма</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300">
							Норма в 1 клик (Shift+N)
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Интерактивная зубная дуга по международной номенклатуре FDI (11–48 постоянные, 51–85 молочные).
						Позволяет врачу мгновенно зафиксировать состояние полости рта без рутинного прокликивания каждого здорового зуба.
					</div>
				</div>
			</div>

			{/* НАГЛЯДНАЯ СХЕМА ОДОНТОГРАММЫ (Visual Dental Formula Proof) */}
			<div className="p-3.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<MousePointer size={14} className="text-teal-500" />
						<span>Интерактивная зубная дуга (FDI Международный стандарт)</span>
					</div>
					<div className="flex items-center gap-2">
						{/* Dentition selector */}
						<div className="flex items-center bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] text-[10px]">
							<button
								type="button"
								onClick={() => handleToggleDentition("adult")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									dentitionType === "adult"
										? "bg-teal-500 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Взрослый (11–48)
							</button>
							<button
								type="button"
								onClick={() => handleToggleDentition("child")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									dentitionType === "child"
										? "bg-teal-500 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Детский (51–85)
							</button>
						</div>

						{/* 1-Click Autonorm CTA */}
						<button
							type="button"
							onClick={handleApplyAutonorm}
							className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-500/25 transition-all cursor-pointer"
							title="Заполнить все зубы физиологической нормой (Shift+N)"
						>
							<Check size={12} />
							<span>✓ Норма (Shift+N)</span>
						</button>
					</div>
				</div>

				{/* Visual Tooth Grid */}
				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-3 overflow-x-auto">
					{/* Upper Arch (Верхняя челюсть) */}
					<div className="space-y-1">
						<div className="text-[10px] font-semibold text-[var(--muted)] text-center tracking-wide uppercase">
							Верхняя челюсть (Правая 18..11 · Левая 21..28)
						</div>
						<div className="flex items-center justify-center gap-1 flex-wrap">
							{teeth
								.filter((t) => (dentitionType === "adult" ? t.fdi <= 28 : t.fdi <= 65))
								.map((t) => (
									<button
										key={t.fdi}
										type="button"
										onClick={() => setSelectedFdi(t.fdi)}
										className={`w-9 h-11 rounded border flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative ${getToothStatusColor(
											t.status,
										)} ${selectedFdi === t.fdi ? "ring-2 ring-teal-500 scale-105 z-10" : "hover:border-teal-500/50"}`}
										title={`${t.fdi} · ${t.name}: ${getStatusBadge(t.status)}`}
									>
										<span className="text-[9px] font-mono font-bold leading-none">{t.fdi}</span>
										{/* Anatomical Mini-Crown Graphic */}
										<div className="w-5 h-4 rounded-xs border border-current/40 flex items-center justify-center text-[7px] font-bold">
											{t.status === "missing" ? "✕" : t.status === "caries" ? "C" : t.status === "pulpitis" ? "P" : t.status === "crown" ? "K" : t.status === "filling" ? "F" : "N"}
										</div>
										<span className="text-[8px] font-medium leading-none truncate max-w-full">
											{t.surface || ""}
										</span>
									</button>
								))}
						</div>
					</div>

					{/* Midline separator */}
					<div className="border-t border-dashed border-[var(--line)]" />

					{/* Lower Arch (Нижняя челюсть) */}
					<div className="space-y-1">
						<div className="flex items-center justify-center gap-1 flex-wrap">
							{teeth
								.filter((t) => (dentitionType === "adult" ? t.fdi >= 31 : t.fdi >= 71))
								.map((t) => (
									<button
										key={t.fdi}
										type="button"
										onClick={() => setSelectedFdi(t.fdi)}
										className={`w-9 h-11 rounded border flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative ${getToothStatusColor(
											t.status,
										)} ${selectedFdi === t.fdi ? "ring-2 ring-teal-500 scale-105 z-10" : "hover:border-teal-500/50"}`}
										title={`${t.fdi} · ${t.name}: ${getStatusBadge(t.status)}`}
									>
										<span className="text-[8px] font-medium leading-none truncate max-w-full">
											{t.surface || ""}
										</span>
										<div className="w-5 h-4 rounded-xs border border-current/40 flex items-center justify-center text-[7px] font-bold">
											{t.status === "missing" ? "✕" : t.status === "caries" ? "C" : t.status === "pulpitis" ? "P" : t.status === "crown" ? "K" : t.status === "filling" ? "F" : "N"}
										</div>
										<span className="text-[9px] font-mono font-bold leading-none">{t.fdi}</span>
									</button>
								))}
						</div>
						<div className="text-[10px] font-semibold text-[var(--muted)] text-center tracking-wide uppercase">
							Нижняя челюсть (Правая 48..41 · Левая 31..38)
						</div>
					</div>

					{/* Selected Tooth Quick Context Inspector */}
					{selectedTooth && (
						<div className="p-2.5 bg-[var(--paper)] rounded-md border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
							<div className="flex items-center gap-2">
								<span className="w-6 h-6 rounded bg-teal-500 text-white font-mono font-bold flex items-center justify-center text-xs">
									{selectedTooth.fdi}
								</span>
								<div>
									<span className="font-bold text-[var(--ink)]">{selectedTooth.name}</span>
									<span className="text-[var(--muted)] ml-1.5">
										Текущий статус: <strong>{getStatusBadge(selectedTooth.status)}</strong>
									</span>
								</div>
							</div>

							{/* Quick Status Action Buttons */}
							<div className="flex items-center gap-1 flex-wrap">
								<span className="text-[10px] text-[var(--muted)] mr-1">Назначить:</span>
								<button
									type="button"
									onClick={() => handleUpdateStatus(selectedTooth.fdi, "caries")}
									className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-[10px] hover:bg-amber-500/25 cursor-pointer"
								>
									Кариес (C)
								</button>
								<button
									type="button"
									onClick={() => handleUpdateStatus(selectedTooth.fdi, "pulpitis")}
									className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold text-[10px] hover:bg-rose-500/25 cursor-pointer"
								>
									Пульпит (P)
								</button>
								<button
									type="button"
									onClick={() => handleUpdateStatus(selectedTooth.fdi, "crown")}
									className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-[10px] hover:bg-blue-500/25 cursor-pointer"
								>
									Коронка (K)
								</button>
								<button
									type="button"
									onClick={() => handleUpdateStatus(selectedTooth.fdi, "filling")}
									className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] hover:bg-emerald-500/25 cursor-pointer"
								>
									Пломба (F)
								</button>
								<button
									type="button"
									onClick={() => handleUpdateStatus(selectedTooth.fdi, "normal")}
									className="px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[10px] hover:bg-[var(--line)]/50 cursor-pointer"
								>
									Норма (N)
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Zap size={14} className="text-teal-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел служит визуальной основой всего клинического приёма: на основе формулы автоматически формируются план лечения, сметы и дневник визита.
					Врач отмечает только реальную патологию, а физиологическая норма выставляется одним нажатием клавиши.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
						<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[11px] font-bold shrink-0">
							1
						</span>
						<span>Клик 1: Выбор зуба или поверхности</span>
					</div>
					<p className="text-[var(--muted)] text-[11px] leading-relaxed">
						Кликните по номеру зуба (FDI 11–48) или конкретной анатомической поверхности:
						Окклюзионная (O), Вестибулярная (V), Медиальная (M), Дистальная (D), Язычная (L).
					</p>
					<div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
						<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono text-teal-600 dark:text-teal-400 font-bold">
							1..8
						</kbd>
						<span>— быстрый выбор квадранта (1–4 взрослые, 5–8 молочные)</span>
					</div>
				</div>

				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
						<span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[11px] font-bold shrink-0">
							2
						</span>
						<span>Клик 2: Назначение патологии</span>
					</div>
					<p className="text-[var(--muted)] text-[11px] leading-relaxed">
						В появившейся шторке зуба или нажатием клавиши выберите статус.
						Цвет поверхности мгновенно меняется, диагноз добавляется в дневник приёма.
					</p>
					<div className="flex flex-wrap gap-1.5 pt-0.5">
						<span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
							Кариес (C)
						</span>
						<span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
							Пульпит (P)
						</span>
						<span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium text-[11px]">
							Коронка (K)
						</span>
						<span className="px-1.5 py-0.5 rounded bg-neutral-500/15 text-[var(--muted)] font-medium text-[11px]">
							Удален (X)
						</span>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши и статусы */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Справочник горячих клавиш и статусов зуба</span>
					<span className="text-[10px] text-[var(--muted)]">Номенклатура FDI / МКБ</span>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-[11px] text-left">
						<thead>
							<tr className="border-b border-[var(--line)] text-[var(--muted)]">
								<th className="pb-1.5 font-medium">Статус / Патология</th>
								<th className="pb-1.5 font-medium">Клавиша</th>
								<th className="pb-1.5 font-medium">Цвет</th>
								<th className="pb-1.5 font-medium">Клиническое действие</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]/50">
							<tr>
								<td className="py-1.5 font-medium text-emerald-600 dark:text-emerald-400">Норма здоровья (Все интактны)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold text-teal-600 dark:text-teal-400">
										Shift + N
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Белый / Нейтральный</td>
								<td className="py-1.5 text-[var(--muted)]">Заполняет всю формулу физиологической нормой</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-amber-600 dark:text-amber-400">Кариес эмали / дентина</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										C
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Янтарный</td>
								<td className="py-1.5 text-[var(--muted)]">Поражение твердых тканей зуба</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-rose-600 dark:text-rose-400">Пульпит / Эндодонтия</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										P
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Красный</td>
								<td className="py-1.5 text-[var(--muted)]">Воспаление пульпы, обработка и пломбировка каналов</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-blue-600 dark:text-blue-400">Искусственная коронка</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										K
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Синий</td>
								<td className="py-1.5 text-[var(--muted)]">Одиночная коронка или опора мостовидного протеза</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-[var(--muted)]">Отсутствует (Удален)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										X
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Серый крест</td>
								<td className="py-1.5 text-[var(--muted)]">Адентия, экстракция ранее или плановое удаление</td>
							</tr>
							<tr>
								<td className="py-1.5 font-medium text-emerald-600 dark:text-emerald-400">Пломба (Реставрация)</td>
								<td className="py-1.5">
									<kbd className="px-1.5 py-0.5 bg-[var(--paper-soft)] rounded border border-[var(--line)] font-mono font-bold">
										F
									</kbd>
								</td>
								<td className="py-1.5 text-[var(--muted)]">Изумрудный</td>
								<td className="py-1.5 text-[var(--muted)]">Ранее установленная состоятельная пломба</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* 4. Частые вопросы и ошибки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle size={14} className="text-amber-500" />
					<span>Частые вопросы и как избежать затыков</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1.5">
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что делать, если все зубы здоровы?</strong>
						<span>Нажмите клавиши <strong>Shift + N</strong> — вся формула заполнится нормой в один миг, отмечайте только больные зубы.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как включить детские молочные зубы?</strong>
						<span>Используйте переключатель «Детский прикус» над формулой или нажмите цифры 5..8 на клавиатуре.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Сохраняются ли данные формулы?</strong>
						<span>Да, изменения фиксируются на лету при каждом клике и автоматически попадают в электронную карту пациента.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-teal-600 dark:text-teal-400" />
						<span>Интерактивный тренажёр: Зубная формула за 2 клика</span>
					</div>
					<p className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
						Запустите интерактивный квест для отработки навыка быстрой маркировки патологий и автонормы.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
