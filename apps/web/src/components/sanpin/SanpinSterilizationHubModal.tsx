/**
 * apps/web/src/components/sanpin/SanpinSterilizationHubModal.tsx
 *
 * Единый канонический SSOT хаб производственного контроля, стерилизации и предстерилизационной очистки:
 * - Пакетное проведение смены ЦСО в 1 клик (Мандат 8e, 8n).
 * - Реестр циклов автоклавирования и журнал контроля качества очистки.
 * - Ровно 1 Primary CTA кнопка #0d9488 («Зафиксировать цикл автоклавирования и ПСО», Мандат 8am).
 * - Автоматическое фоновое списание крафт-пакетов и индикаторов со склада (Soft Negative Stock).
 * - Печать официального бланка журнала на А4 (кнопка печати).
 * - Размер строго 300–450 строк (Мандат 8b Sweet Spot). Apple HIG touch-таргеты >= 44x44px.
 */

import React, { useState, useCallback } from "react";
import {
	ShieldCheck,
	X,
	Printer,
	CheckCircle2,
	PackageCheck,
	Sparkles,
	Layers,
	Thermometer,
	Clock,
	Calendar,
	UserCheck,
} from "lucide-react";
import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	calculateBatchStockDeduction,
	createOneClickShiftBatch,
	generateSanpinPrintHtml,
	getSanpinBatchRecords,
	type SterilizationBatchCycleRecord,
} from "./sanpinCatalogData";

export interface SanpinSterilizationHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleCompleted?: (result?: unknown) => void;
	readonly isDemo?: boolean;
}

const PRESET_PACK_COUNTS = [6, 12, 18, 24] as const;

export function SanpinSterilizationHubModal({
	isOpen,
	onClose,
	onCycleCompleted,
	isDemo = true,
}: SanpinSterilizationHubModalProps) {
	const [activeTab, setActiveTab] = useState<"cycles" | "express" | "stock">("express");
	const [records, setRecords] = useState<SterilizationBatchCycleRecord[]>(() => getSanpinBatchRecords(isDemo));
	const [packagesCount, setPackagesCount] = useState<number>(12);
	const [selectedProgramId, setSelectedProgramId] = useState<"standard_134" | "delicate_121">("standard_134");
	const [operatorName, setOperatorName] = useState<string>("Иванова Е. С., ассистент ЦСО");
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const selectedProgram = AUTOCLAVE_PROGRAMS.find((p) => p.id === selectedProgramId) || AUTOCLAVE_PROGRAMS[0];
	const stockDeductions = calculateBatchStockDeduction(packagesCount);

	const handleOneClickBatchCommit = useCallback(() => {
		const batch = createOneClickShiftBatch({
			packagesCount,
			operatorName,
			programId: selectedProgramId,
		});

		setRecords((prev) => [batch.sterilizationCycle, ...prev]);
		setFeedbackToast(
			`Цикл стерилизации №${records.length + 1} зафиксирован, пробы очистки учтены, со склада списано ${packagesCount} крафт-пакетов!`,
		);

		if (onCycleCompleted) {
			onCycleCompleted(batch);
		}
	}, [packagesCount, operatorName, selectedProgramId, records.length, onCycleCompleted]);

	const handlePrint = useCallback(() => {
		const html = generateSanpinPrintHtml(records);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	}, [records]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
			data-testid="sanpin-sterilization-hub-modal"
		>
			<div
				className="relative w-full max-w-4xl max-h-[92vh] max-sm:max-h-[96vh] max-sm:h-[96vh] max-sm:rounded-b-none max-sm:rounded-t-3xl max-sm:mt-auto flex flex-col rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] shadow-2xl overflow-hidden"
				role="dialog"
				aria-label="Хаб производственного контроля и стерилизации"
			>
				{/* Touch Drag Handle for Mobile Apple HIG */}
				<div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

				{/* 1. Header */}
				<div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)]">
					<div className="flex items-center gap-2.5 sm:gap-3">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
							<ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-sm sm:text-lg font-bold tracking-tight">
									Производственный контроль и стерилизация
								</h2>
								<span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">
									СанПиН 3.3686-21
								</span>
							</div>
							<p className="text-[11px] sm:text-xs text-[var(--ink-muted,#64748b)] dark:text-[var(--ink-muted-dark,#94a3b8)]">
								{CLINIC_STERILIZERS[0].name} <span className="hidden sm:inline">• Журнал циклов и контроль очистки инструментов</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2">
						<button
							type="button"
							onClick={handlePrint}
							data-testid="print-sanpin-journal-btn"
							className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[var(--line-strong,#475569)] hover:bg-[var(--paper-strong,#f1f5f9)] dark:hover:bg-[var(--paper,#334155)] transition-colors min-h-[44px]"
							title="Печать официального журнала на бланке А4"
						>
							<Printer className="w-4 h-4 text-slate-500" />
							<span className="hidden sm:inline">Печать журнала</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							data-testid="close-sanpin-hub-btn"
							className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* 2. Feedback Toast Notification */}
				{feedbackToast && (
					<div
						className="mx-4 mt-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs sm:text-sm font-medium flex items-center justify-between"
						data-testid="sanpin-feedback-toast"
					>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>{feedbackToast}</span>
						</div>
						<button
							type="button"
							onClick={() => setFeedbackToast(null)}
							className="text-xs text-teal-600 dark:text-teal-400 hover:underline ml-2"
						>
							Скрыть
						</button>
					</div>
				)}

				{/* 3. Navigation Tabs */}
				<div className="flex border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] px-3 sm:px-6 pt-2 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap">
					<button
						type="button"
						onClick={() => setActiveTab("express")}
						className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 sm:gap-2 shrink-0 ${
							activeTab === "express"
								? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20"
								: "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
						}`}
						data-testid="tab-express-sterilization"
					>
						<Sparkles className="w-4 h-4 shrink-0" />
						<span><span className="sm:hidden">Экспресс</span><span className="hidden sm:inline">Экспресс-фиксация смены</span></span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("cycles")}
						className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 sm:gap-2 shrink-0 ${
							activeTab === "cycles"
								? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20"
								: "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
						}`}
						data-testid="tab-sterilization-journal"
					>
						<Layers className="w-4 h-4 shrink-0" />
						<span><span className="sm:hidden">Журнал ({records.length})</span><span className="hidden sm:inline">Журнал стерилизации ({records.length})</span></span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("stock")}
						className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 sm:gap-2 shrink-0 ${
							activeTab === "stock"
								? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20"
								: "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
						}`}
						data-testid="tab-stock-deductions"
					>
						<PackageCheck className="w-4 h-4 shrink-0" />
						<span><span className="sm:hidden">Склад</span><span className="hidden sm:inline">Списание со склада</span></span>
					</button>
				</div>

				{/* 4. Tab Body Content */}
				<div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
					{activeTab === "express" && (
						<div className="space-y-4 sm:space-y-5 animate-in fade-in duration-100">
							{/* Program selector cards */}
							<div>
								<label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
									Режим автоклавирования (Класс B)
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
									{AUTOCLAVE_PROGRAMS.filter((p) => p.id !== "flash_134").map((prog) => {
										const isSelected = selectedProgramId === prog.id;
										return (
											<button
												key={prog.id}
												type="button"
												onClick={() => setSelectedProgramId(prog.id as "standard_134" | "delicate_121")}
												className={`p-3 rounded-xl border text-left transition-all min-h-[72px] ${
													isSelected
														? "border-teal-500 bg-teal-50/60 dark:bg-teal-950/30 ring-1 ring-teal-500"
														: "border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] hover:border-slate-300 dark:hover:border-slate-600"
												}`}
											>
												<div className="flex flex-col gap-1">
													<div className="flex items-center justify-between gap-1.5">
														<span className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)]">
															{prog.name}
														</span>
														<span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
															{prog.temperatureCelsius}°C / {prog.pressureBar} бар
														</span>
													</div>
													<p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
														{prog.description}
													</p>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Packages presets */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
										Количество крафт-пакетов в цикле
									</label>
									<span className="text-xs font-bold text-teal-700 dark:text-teal-400">
										{packagesCount} упаковок инструментов
									</span>
								</div>
								<div className="grid grid-cols-4 gap-2">
									{PRESET_PACK_COUNTS.map((cnt) => (
										<button
											key={cnt}
											type="button"
											onClick={() => setPackagesCount(cnt)}
											className={`py-2 text-xs font-bold rounded-lg border transition-colors min-h-[44px] ${
												packagesCount === cnt
													? "bg-teal-600 text-white border-teal-600 shadow-sm"
													: "border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
											}`}
										>
											{cnt} шт.
										</button>
									))}
								</div>
							</div>

							{/* Clinical Quality Control Invariants */}
							<div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
								<div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs uppercase tracking-wide">
									<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
									<span>Контроль качества стерилизации и очистки (100% норма)</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900 dark:text-emerald-200 pt-1">
									<div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40">
										<p className="font-semibold">Индикатор 5 класса</p>
										<p className="text-[11px] text-emerald-700 dark:text-emerald-300">Пройден во всех точках</p>
									</div>
									<div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40">
										<p className="font-semibold">Азопирамовая проба</p>
										<p className="text-[11px] text-emerald-700 dark:text-emerald-300">Отрицательно (крови нет)</p>
									</div>
									<div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40">
										<p className="font-semibold">Фенолфталеин</p>
										<p className="text-[11px] text-emerald-700 dark:text-emerald-300">Отрицательно (моющее смыто)</p>
									</div>
								</div>
							</div>

							{/* Responsible operator field */}
							<div>
								<label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
									Ответственный за проведение цикла
								</label>
								<div className="relative">
									<input
										type="text"
										value={operatorName}
										onChange={(e) => setOperatorName(e.target.value)}
										className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-subtle,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] focus:ring-1 focus:ring-teal-500 outline-none min-h-[44px]"
										placeholder="ФИО и должность ассистента"
									/>
									<UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
								</div>
							</div>
						</div>
					)}

					{activeTab === "cycles" && (
						<div className="space-y-3 animate-in fade-in duration-100">
							<div className="flex items-center justify-between text-xs text-slate-500">
								<span>Всего записей: {records.length}</span>
								<span>Смена: {new Date().toLocaleDateString("ru-RU")}</span>
							</div>

							{/* Desktop and Mobile Responsive Registry */}
							<div className="space-y-2">
								{records.map((rec) => (
									<div
										key={rec.id}
										className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[52px]"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)]">
													Цикл №{rec.cycleNumber}
												</span>
												<span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-semibold">
													{rec.packagesCount} пакетов
												</span>
												<span className="text-xs text-slate-400 font-mono">
													{rec.time}
												</span>
											</div>
											<p className="text-xs text-slate-500 dark:text-slate-400">
												{rec.autoclaveName} • {rec.temperatureCelsius}°C / {rec.pressureBar} бар / {rec.exposureMinutes} мин
											</p>
											<p className="text-[11px] text-slate-400">
												{rec.operatorName}
											</p>
										</div>

										<div className="flex items-center gap-2 self-start sm:self-center">
											<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
												<CheckCircle2 className="w-3.5 h-3.5" />
												Индикатор: {rec.chemicalIndicatorVerdict}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "stock" && (
						<div className="space-y-3 animate-in fade-in duration-100">
							<p className="text-xs text-slate-500">
								Автоматический расчет фонового списания материалов со склада при фиксации цикла на {packagesCount} упаковок (Мандат 8n: Soft Negative Stock).
							</p>
							<div className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-[var(--line-strong,#334155)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] rounded-xl overflow-hidden">
								{stockDeductions.map((item) => (
									<div
										key={item.sku}
										className="p-3 flex items-center justify-between bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] min-h-[48px]"
									>
										<div>
											<p className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)]">
												{item.title}
											</p>
											<p className="text-[11px] text-slate-400">{item.purpose}</p>
										</div>
										<span className="text-xs font-bold font-mono text-teal-600 dark:text-teal-400 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/40">
											-{item.quantity} {item.unit}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* 5. Footer: Exactly 1 Primary CTA Button (#0d9488) according to Mandate 8am */}
				<div className="p-3.5 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] flex flex-col sm:flex-row items-center justify-between gap-3">
					<div className="text-xs text-slate-500 text-center sm:text-left">
						Будет списано {packagesCount} крафт-пакетов и зафиксирован протокол предстерилизационной очистки.
					</div>

					<button
						type="button"
						onClick={handleOneClickBatchCommit}
						data-testid="primary-batch-sterilization-btn"
						style={{ backgroundColor: "#0d9488" }}
						className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
					>
						<CheckCircle2 className="w-4 h-4 text-white" />
						<span>Зафиксировать цикл автоклавирования и ПСО</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default SanpinSterilizationHubModal;
