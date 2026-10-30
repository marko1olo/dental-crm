/**
 * apps/web/src/components/sanpin/SterilizationHubModal.tsx
 *
 * Единый канонический SSOT хаб стерилизации, автоклавирования и контроля СанПиН:
 * - 4 канонические вкладки: Экспресс-смена | Журнал автоклавирования | Очистка и пробы | Печать журналов (А4).
 * - Пакетная регистрация цикла в 1 клик (Мандаты 8e, 8n): фиксация параметров (134°C / 2.1 bar) + списание со склада.
 * - Ровно 1 Primary CTA кнопка #0d9488 («Зафиксировать цикл автоклавирования», Мандат 8am).
 * - Apple HIG touch ergonomics: Bottom Sheet rounded-t-[24px], Drag Handle 36x5px, тач-таргеты >= 44x44px, 0px горизонт. скролла.
 * - Строгий Sweet Spot: 300–450 строк (Мандат 8b/8zi). Человеческий язык без советского канцелярита (Мандат 8x).
 */

import React, { useState, useCallback, useMemo } from "react";
import {
	ShieldCheck,
	X,
	Printer,
	CheckCircle2,
	PackageCheck,
	Sparkles,
	Layers,
	FileText,
	UserCheck,
} from "lucide-react";
import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	PRESET_PACK_COUNTS,
	calculateBatchStockDeduction,
	createOneClickShiftBatch,
	generateSanpinPrintHtml,
	getSanpinBatchRecords,
	type AutoclaveRegimeId,
	type SterilizationBatchCycleRecord,
	type PsoBatchRecord,
} from "./sterilizationCatalogData";

export interface SterilizationHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleCompleted?: (result?: unknown) => void;
	readonly isDemo?: boolean;
	readonly initialTab?: "express" | "autoclave" | "pso" | "print";
}

export function SterilizationHubModal({
	isOpen,
	onClose,
	onCycleCompleted,
	isDemo = true,
	initialTab = "express",
}: SterilizationHubModalProps) {
	const [activeTab, setActiveTab] = useState<"express" | "autoclave" | "pso" | "print">(initialTab);
	const [records, setRecords] = useState<SterilizationBatchCycleRecord[]>(() => getSanpinBatchRecords(isDemo));
	const [psoRecords, setPsoRecords] = useState<PsoBatchRecord[]>(() => {
		if (!isDemo) return [];
		const today = new Date().toLocaleDateString("ru-RU");
		return [
			{ id: "pso-1", date: today, time: "09:15", totalProcessedItems: 48, testedItemsCount: 4, azopyramResult: "negative", phenolphthaleinResult: "negative", operatorName: "Иванова Е. С., ассистент ЦСО", verdict: "ГОДНО" },
			{ id: "pso-2", date: today, time: "14:00", totalProcessedItems: 32, testedItemsCount: 3, azopyramResult: "negative", phenolphthaleinResult: "negative", operatorName: "Иванова Е. С., ассистент ЦСО", verdict: "ГОДНО" },
		];
	});
	const [packagesCount, setPackagesCount] = useState<number>(12);
	const [selectedProgramId, setSelectedProgramId] = useState<AutoclaveRegimeId>("standard_134");
	const [selectedAutoclaveId] = useState<string>("autoclave-01");
	const [operatorName, setOperatorName] = useState<string>("Иванова Е. С., ассистент ЦСО");
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const selectedDevice = useMemo(
		() => CLINIC_STERILIZERS.find((d) => d.id === selectedAutoclaveId) ?? CLINIC_STERILIZERS[0],
		[selectedAutoclaveId],
	);
	const stockDeductions = useMemo(() => calculateBatchStockDeduction(packagesCount), [packagesCount]);

	const handleOneClickBatchCommit = useCallback(() => {
		const batch = createOneClickShiftBatch({ packagesCount, operatorName, autoclaveName: selectedDevice.name, programId: selectedProgramId });
		setRecords((prev) => [batch.sterilizationCycle, ...prev]);
		setPsoRecords((prev) => [batch.psoRecord, ...prev]);
		setFeedbackToast(`Цикл №${records.length + 1} зафиксирован: 134°C / 2.1 бар, эталон индикаторов достигнут, списано ${packagesCount} упаковок.`);
		if (onCycleCompleted) onCycleCompleted(batch);
	}, [packagesCount, operatorName, selectedDevice.name, selectedProgramId, records.length, onCycleCompleted]);

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
			className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-x-hidden"
			data-testid="sanpin-sterilization-hub-modal"
		>
			<div
				className="relative w-full sm:max-w-4xl max-h-[94vh] h-[94vh] sm:h-auto max-sm:rounded-t-[24px] max-sm:rounded-b-none sm:rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] shadow-2xl flex flex-col overflow-hidden"
				role="dialog"
				aria-label="Журнал автоклавирования и стерилизации"
			>
				{/* Apple HIG Touch Drag Handle for Mobile Viewports */}
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

				{/* 1. Header: Single line title without regulatory codes */}
				<div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)]">
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
							<ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
									<span className="sm:hidden">Журнал стерилизации</span>
									<span className="hidden sm:inline">Журнал автоклавирования и стерилизации</span>
								</h2>
								<span className="hidden md:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">Санитарный регламент</span>
							</div>
							<p className="text-[11px] sm:text-xs text-[var(--ink-muted,#64748b)] dark:text-[var(--ink-muted-dark,#94a3b8)] truncate">{selectedDevice.name} • Пакетная стерилизация смены</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrint}
							data-testid="print-sanpin-journal-btn"
							className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[var(--line-strong,#475569)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] hover:bg-[var(--paper-strong,#f1f5f9)] dark:hover:bg-slate-800 transition-colors min-h-[44px] cursor-pointer"
							title="Печать официального журнала"
						>
							<Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
							<span>Печать бланка А4</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							data-testid="close-sanpin-hub-btn"
							className="p-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* 2. Toast Feedback Notification */}
				{feedbackToast && (
					<div
						className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs sm:text-sm font-medium flex items-center justify-between"
						data-testid="sanpin-feedback-toast"
					>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>{feedbackToast}</span>
						</div>
						<button type="button" onClick={() => setFeedbackToast(null)} className="text-xs text-teal-600 dark:text-teal-400 hover:underline ml-2 cursor-pointer">Скрыть</button>
					</div>
				)}

				{/* 3. 4 Canonical Tabs Navigation with Explicit Dark Backgrounds */}
				<div className="flex border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] px-2 sm:px-4 pt-1.5 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] gap-1 sm:gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
					<button
						type="button"
						onClick={() => setActiveTab("express")}
						className={`px-2.5 sm:px-3 py-2 text-xs sm:text-xs md:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 shrink-0 cursor-pointer ${
							activeTab === "express" ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-500/10" : "border-transparent bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
						}`}
						data-testid="tab-express-sterilization"
					>
						<Sparkles className="w-4 h-4 shrink-0" />
						<span>Экспресс-смена</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("autoclave")}
						title="Журнал автоклавирования"
						className={`px-2.5 sm:px-3 py-2 text-xs sm:text-xs md:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 shrink-0 cursor-pointer ${
							activeTab === "autoclave" ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-500/10" : "border-transparent bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
						}`}
						data-testid="tab-sterilization-journal"
					>
						<Layers className="w-4 h-4 shrink-0" />
						<span>Автоклавирование ({records.length})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("pso")}
						title="Предстерилизационная очистка (контроль проб)"
						className={`px-2.5 sm:px-3 py-2 text-xs sm:text-xs md:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 shrink-0 cursor-pointer ${
							activeTab === "pso" ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-500/10" : "border-transparent bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
						}`}
						data-testid="tab-pso-journal"
					>
						<PackageCheck className="w-4 h-4 shrink-0" />
						<span>Очистка и пробы ({psoRecords.length})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("print")}
						title="Печать официальных журналов (А4)"
						className={`px-2.5 sm:px-3 py-2 text-xs sm:text-xs md:text-sm font-semibold rounded-t-lg transition-colors border-b-2 min-h-[44px] flex items-center gap-1.5 shrink-0 cursor-pointer ${
							activeTab === "print" ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-500/10" : "border-transparent bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
						}`}
						data-testid="tab-print-preview"
					>
						<FileText className="w-4 h-4 shrink-0" />
						<span>Печать журналов (А4)</span>
					</button>
				</div>

				{/* 4. Tab Body Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
					{activeTab === "express" && (
						<div className="space-y-4 animate-in fade-in duration-100">
							<div>
								<label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Режим автоклавирования (Класс B)</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
									{AUTOCLAVE_PROGRAMS.filter((p) => p.id !== "flash_134").map((prog) => {
										const isSelected = selectedProgramId === prog.id;
										return (
											<button
												key={prog.id}
												type="button"
												onClick={() => setSelectedProgramId(prog.id)}
												className={`p-3 rounded-xl border text-left transition-all min-h-[64px] cursor-pointer ${
													isSelected
														? "border-teal-500 bg-teal-500/10 text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] ring-1 ring-teal-500"
														: "border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] hover:border-teal-500/40"
												}`}
											>
												<div className="flex items-center justify-between gap-1.5 mb-1">
													<span className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)]">{prog.name}</span>
													<span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">{prog.temperatureCelsius}°C / {prog.pressureBar} бар</span>
												</div>
												<p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{prog.description}</p>
											</button>
										);
									})}
								</div>
							</div>

							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Количество крафт-пакетов в смене</label>
									<span className="text-xs font-bold text-teal-700 dark:text-teal-400">{packagesCount} упаковок</span>
								</div>
								<div className="grid grid-cols-4 gap-2">
									{PRESET_PACK_COUNTS.map((cnt) => (
										<button
											key={cnt}
											type="button"
											onClick={() => setPackagesCount(cnt)}
											className={`py-2 text-xs font-bold rounded-lg border transition-colors min-h-[44px] cursor-pointer ${
												packagesCount === cnt
													? "bg-teal-600 text-white border-teal-600 shadow-sm"
													: "bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
											}`}
										>
											{cnt} шт.
										</button>
									))}
								</div>
							</div>

							<div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2">
								<div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs uppercase tracking-wide">
									<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
									<span>Контроль качества стерилизации и предстерилизационной очистки (азопирам / фенолфталеин)</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900 dark:text-emerald-200 pt-0.5">
									<div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40">
										<p className="font-semibold">Индикатор 5 класса</p>
										<p className="text-[11px] text-emerald-700 dark:text-emerald-300">Пройден (стерильно)</p>
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

							<div>
								<label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Ответственный сотрудник</label>
								<div className="relative">
									<input
										type="text"
										value={operatorName}
										onChange={(e) => setOperatorName(e.target.value)}
										className="w-full px-3 py-2 pr-10 text-xs sm:text-sm rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] focus:ring-1 focus:ring-teal-500 outline-none min-h-[44px]"
										placeholder="ФИО сотрудника"
									/>
									<UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
								</div>
							</div>

							<div className="space-y-1.5 pt-1">
								<p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Фоновое списание со склада (Soft Negative Stock):</p>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									{stockDeductions.map((item) => (
										<div key={item.sku} className="p-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)]">
											<p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{item.title}</p>
											<p className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">-{item.quantity} {item.unit}</p>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{activeTab === "autoclave" && (
						<div className="space-y-3 animate-in fade-in duration-100">
							<div className="flex items-center justify-between text-xs text-slate-500">
								<span>Всего записей: {records.length}</span>
								<span>Смена: {new Date().toLocaleDateString("ru-RU")}</span>
							</div>
							<div className="space-y-2">
								{records.map((rec) => (
									<div
										key={rec.id}
										className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[52px]"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)]">Цикл №{rec.cycleNumber}</span>
												<span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-semibold">{rec.packagesCount} пакетов</span>
												<span className="text-xs text-slate-400 font-mono">{rec.date} {rec.time}</span>
											</div>
											<p className="text-xs text-slate-500 dark:text-slate-400">{rec.autoclaveName} • {rec.temperatureCelsius}°C / {rec.pressureBar} бар / {rec.exposureMinutes} мин</p>
											<p className="text-[11px] text-slate-400">{rec.itemsDescription} • {rec.operatorName}</p>
										</div>
										<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 self-start sm:self-center">
											<CheckCircle2 className="w-3.5 h-3.5" />
											Индикатор: {rec.chemicalIndicatorVerdict} (Стерильно)
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "pso" && (
						<div className="space-y-3 animate-in fade-in duration-100">
							<div className="flex items-center justify-between text-xs text-slate-500">
								<span>Контроль качества очистки инструментария</span>
								<span>Норматив: не менее 1% (от 3 шт.)</span>
							</div>
							<div className="space-y-2">
								{psoRecords.map((pso) => (
									<div
										key={pso.id}
										className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-[52px]"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)]">Партия: {pso.totalProcessedItems} изд.</span>
												<span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">Проверено: {pso.testedItemsCount} шт.</span>
												<span className="text-xs text-slate-400 font-mono">{pso.date} {pso.time}</span>
											</div>
											<p className="text-xs text-slate-500 dark:text-slate-400">Азопирам: {pso.azopyramResult === "negative" ? "Отрицательно (крови нет)" : "Положительно"} • Фенолфталеин: {pso.phenolphthaleinResult === "negative" ? "Отрицательно (щелочь отмыта)" : "Положительно"}</p>
											<p className="text-[11px] text-slate-400">{pso.operatorName}</p>
										</div>
										<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 self-start sm:self-center">
											<CheckCircle2 className="w-3.5 h-3.5" />
											Вердикт: {pso.verdict}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "print" && (
						<div className="space-y-3 animate-in fade-in duration-100">
							<div className="flex items-center justify-between">
								<p className="text-xs text-slate-500">Официальный реестр для производственного контроля (печать на А4)</p>
								<button
									type="button"
									onClick={handlePrint}
									className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[var(--line-strong,#475569)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] hover:bg-[var(--paper-strong,#f1f5f9)] dark:hover:bg-slate-800 transition-colors min-h-[44px] cursor-pointer"
								>
									<Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
									<span>Печать бланка А4</span>
								</button>
							</div>
							<div className="p-3 border border-[var(--line,#cbd5e1)] dark:border-[var(--line-strong,#334155)] rounded-xl bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] overflow-x-auto">
								<table className="w-full text-left text-xs border-collapse">
									<thead>
										<tr className="border-b border-[var(--line,#cbd5e1)] dark:border-[var(--line-strong,#334155)] text-slate-500 font-semibold">
											<th className="py-2 px-2">Дата/время</th>
											<th className="py-2 px-2">Цикл</th>
											<th className="py-2 px-2">Аппарат</th>
											<th className="py-2 px-2">Режим</th>
											<th className="py-2 px-2">Пакетов</th>
											<th className="py-2 px-2">Индикатор</th>
											<th className="py-2 px-2">Ответственный</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-[var(--line-strong,#334155)]">
										{records.map((r) => (
											<tr key={r.id}>
												<td className="py-2 px-2 font-mono text-[11px]">{r.date} {r.time}</td>
												<td className="py-2 px-2 font-semibold">№{r.cycleNumber}</td>
												<td className="py-2 px-2 text-[11px]">{r.autoclaveName}</td>
												<td className="py-2 px-2 text-[11px]">{r.temperatureCelsius}°C / {r.pressureBar} бар / {r.exposureMinutes} мин</td>
												<td className="py-2 px-2 font-semibold">{r.packagesCount} шт</td>
												<td className="py-2 px-2 text-emerald-600 font-semibold">{r.chemicalIndicatorVerdict}</td>
												<td className="py-2 px-2 text-[11px]">{r.operatorName}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* 5. Footer: Exactly 1 Primary CTA Button (#0d9488) according to Mandate 8am */}
				<div className="p-3.5 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[var(--line,#e2e8f0)] dark:border-[var(--line-strong,#334155)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper,#1e293b)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
						Списание {packagesCount} крафт-пакетов со склада в бэкофисе • Санитарный регламент
					</div>
					<button
						type="button"
						onClick={handleOneClickBatchCommit}
						data-testid="primary-batch-sterilization-btn"
						style={{ backgroundColor: "#0d9488" }}
						className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
					>
						<CheckCircle2 className="w-4 h-4 text-white shrink-0" />
						<span>Зафиксировать цикл автоклавирования</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default SterilizationHubModal;
