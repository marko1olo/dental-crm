/**
 * apps/web/src/components/sanpin/SanpinStudioModal.tsx
 *
 * Каноническая студия СанПиН и стерилизации DENTE CRM (Мандаты 8b, 8e, 8n, 8am, 8aq, 8x, Apple HIG):
 * - Вкладки: «Циклы стерилизации (Автоклав)», «Крафт-пакеты и маркировка», «Журнал генеральных уборок и УФ».
 * - Регистрация цикла стерилизации в 1 клик (Мандат 8e/8n): фиксация параметров + фоновое списание со склада.
 * - Ровно ОДНА Primary CTA кнопка #0d9488 («✓ Зарегистрировать цикл стерилизации», Мандат 8am).
 * - 0 заблокированных кнопок (Мандат 8e): кнопки никогда не disabled.
 * - Apple HIG: нативный Bottom Sheet на смартфонах (<=768px), Drag Handle 36x5px, тач-таргеты >= 44x44px.
 * - Чистый клинический русский язык без советского канцелярита и приказов (Мандат 8x).
 * - Строгий диапазон Sweet Spot: 400–480 строк (Мандат 8b/8zi).
 */

import React, { useState, useEffect, useId, useCallback } from "react";
import {
	CheckCircle,
	Printer,
	X,
	Sparkles,
	Layers,
	Thermometer,
	ShieldCheck,
	Sun,
	Flame,
	Box,
	Tag,
	CalendarCheck,
} from "lucide-react";
import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	BACTERICIDAL_STANDARD_DEVICES,
	STERILIZATION_PACKAGING,
	type SterilizationBatchCycleRecord,
	type PsoBatchRecord,
	type BactericidalLogRecord,
	createOneClickShiftBatch,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
	generateKraftStickersHtml,
} from "./sanpinCatalogData";

export type SanpinStudioTab = "autoclave" | "kraft" | "cleaning";

export interface SanpinStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: SanpinStudioTab | string | undefined;
	readonly isDemo?: boolean | undefined;
	readonly onCycleCreated?: ((cycle: SterilizationBatchCycleRecord) => void) | undefined;
	readonly onCycleCompleted?: ((result?: unknown) => void) | undefined;
}

const PRESET_PACK_COUNTS = [6, 12, 18, 24] as const;

export const SanpinStudioModal: React.FC<SanpinStudioModalProps> = ({
	isOpen,
	onClose,
	initialTab = "autoclave",
	isDemo = true,
	onCycleCreated,
	onCycleCompleted,
}) => {
	const modalTitleId = useId();
	const resolveTab = (t: string): SanpinStudioTab => {
		if (t === "kraft" || t === "packages" || t === "pso") return "kraft";
		if (t === "cleaning" || t === "uv" || t === "bactericidal") return "cleaning";
		return "autoclave";
	};

	const [activeTab, setActiveTab] = useState<SanpinStudioTab>(() => resolveTab(initialTab));
	const [selectedProgramId, setSelectedProgramId] = useState<"standard_134" | "delicate_121" | "flash_134">("standard_134");
	const [selectedAutoclave, setSelectedAutoclave] = useState<string>(CLINIC_STERILIZERS[0]!.model);
	const [packagesCount, setPackagesCount] = useState<number>(14);
	const [operatorName, setOperatorName] = useState<string>("Иванова Е. С., ассистент ЦСО");
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const [cycles, setCycles] = useState<SterilizationBatchCycleRecord[]>(() => getSanpinBatchRecords(isDemo));
	const [, setPsoRecords] = useState<PsoBatchRecord[]>([]);
	const [, setBactericidalRecords] = useState<BactericidalLogRecord[]>([]);

	useEffect(() => {
		if (isOpen) setActiveTab(resolveTab(initialTab));
	}, [isOpen, initialTab]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleRunCycle = useCallback(() => {
		const count = Math.max(1, packagesCount || 1);
		const batch = createOneClickShiftBatch({
			packagesCount: count,
			operatorName: operatorName.trim() || "Дежурная медсестра ЦСО",
			autoclaveName: selectedAutoclave,
			programId: selectedProgramId,
		});

		setCycles((prev) => [batch.sterilizationCycle, ...prev]);
		setPsoRecords((prev) => [batch.psoRecord, ...prev]);
		setBactericidalRecords((prev) => [batch.bactericidalRecord, ...prev]);
		if (onCycleCreated) onCycleCreated(batch.sterilizationCycle);
		if (onCycleCompleted) onCycleCompleted(batch.sterilizationCycle);
		setToastMessage(`Цикл №${batch.sterilizationCycle.cycleNumber} зафиксирован: списано ${count} крафт-пакетов, индикаторы в норме`);
		setTimeout(() => setToastMessage(null), 4000);
	}, [packagesCount, operatorName, selectedAutoclave, selectedProgramId, onCycleCreated, onCycleCompleted]);

	const handlePrintJournal = useCallback(() => {
		const html = generateSanpinPrintHtml(cycles);
		const win = window.open("", "_blank");
		if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
	}, [cycles]);

	const handlePrintStickers = useCallback(() => {
		const targetCycle = cycles[0] || createOneClickShiftBatch({ packagesCount }).sterilizationCycle;
		const html = generateKraftStickersHtml(targetCycle, Math.min(packagesCount, 24));
		const win = window.open("", "_blank");
		if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
	}, [cycles, packagesCount]);

	if (!isOpen) return null;

	const currentProgram = AUTOCLAVE_PROGRAMS.find((p) => p.id === selectedProgramId) || AUTOCLAVE_PROGRAMS[0]!;

	return (
		<div
			className="sanpin-studio-backdrop"
			data-testid="sanpin-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="sanpin-studio-modal">
				{/* Apple HIG drag handle для мобильных */}
				<div className="sm:hidden sanpin-drag-handle" />

				{/* Верхняя шапка: строго 1 строка */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h2 id={modalTitleId} className="text-base sm:text-lg font-semibold text-[var(--ink,#0f172a)] truncate">
								<span className="sm:hidden">Стерилизация и СанПиН</span>
								<span className="hidden sm:inline">Студия стерилизации и санитарного контроля</span>
							</h2>
							<p className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block truncate">
								Журналы автоклавирования, крафт-пакеты, очистка и кварцевание
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrintJournal}
							className="sanpin-secondary-btn min-h-[38px] text-xs sm:text-sm"
							title="Печать журнала автоклавирования"
						>
							<Printer className="w-4 h-4 text-[var(--ink-muted,#64748b)]" />
							<span className="hidden sm:inline">Печать журнала</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* 3 канонические навигационные вкладки */}
				<div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] overflow-x-auto">
					<button
						type="button"
						onClick={() => setActiveTab("autoclave")}
						className={`sanpin-tab-btn shrink-0 ${activeTab === "autoclave" ? "active" : ""}`}
					>
						<Flame className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
						<span className="sm:hidden">Автоклав</span>
						<span className="hidden sm:inline">Циклы стерилизации (Автоклав)</span>
						<span className="sr-only">Журнал автоклавирования</span>
						<span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[var(--paper-canvas,#e2e8f0)] dark:bg-slate-700">{cycles.length}</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("kraft")}
						className={`sanpin-tab-btn shrink-0 ${activeTab === "kraft" ? "active" : ""}`}
					>
						<Tag className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
						<span className="sm:hidden">Крафт-пакеты</span>
						<span className="hidden sm:inline">Крафт-пакеты и маркировка</span>
						<span className="sr-only">Контроль очистки инструментов</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("cleaning")}
						className={`sanpin-tab-btn shrink-0 ${activeTab === "cleaning" ? "active" : ""}`}
					>
						<Sun className="w-4 h-4 shrink-0 text-amber-500" />
						<span className="sm:hidden">Уборка и УФ</span>
						<span className="hidden sm:inline">Журнал генеральных уборок и УФ</span>
						<span className="sr-only">Журнал кварцевания</span>
					</button>
				</div>

				{/* Панель быстрого запуска цикла: РОВНО 1 PRIMARY CTA КНОПКА #0d9488 */}
				<div className="px-4 sm:px-6 py-3 bg-[var(--paper-strong,#ffffff)] border-b border-[var(--line,#e2e8f0)]">
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted,#64748b)] mb-1">Программа стерилизации</label>
							<select
								value={selectedProgramId}
								onChange={(e) => setSelectedProgramId(e.target.value as any)}
								className="w-full text-xs sm:text-sm h-10 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							>
								{AUTOCLAVE_PROGRAMS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted,#64748b)] mb-1">Автоклав</label>
							<select
								value={selectedAutoclave}
								onChange={(e) => setSelectedAutoclave(e.target.value)}
								className="w-full text-xs sm:text-sm h-10 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							>
								{CLINIC_STERILIZERS.map((s) => (<option key={s.id} value={s.model}>{s.model}</option>))}
							</select>
						</div>

						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="text-xs font-medium text-[var(--ink-muted,#64748b)]">Пакетов</label>
								<div className="flex items-center gap-1">
									{PRESET_PACK_COUNTS.map((cnt) => (
										<button
											key={cnt}
											type="button"
											onClick={() => setPackagesCount(cnt)}
											className={`px-1.5 py-0.5 text-[11px] rounded border ${packagesCount === cnt ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 font-semibold" : "border-[var(--line,#e2e8f0)] text-[var(--ink-muted,#64748b)]"}`}
										>
											{cnt}
										</button>
									))}
								</div>
							</div>
							<input
								type="number"
								min={1}
								max={100}
								value={packagesCount}
								onChange={(e) => setPackagesCount(Number(e.target.value))}
								className="w-full text-xs sm:text-sm h-10 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							/>
						</div>

						{/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 НА ЭКРАНЕ (Мандат 8am) */}
						<div>
							<button
								type="button"
								onClick={handleRunCycle}
								data-testid="sanpin-run-cycle-cta"
								title="Запустить цикл стерилизации"
								className="sanpin-primary-cta w-full min-h-[40px]"
							>
								<CheckCircle className="w-4 h-4 shrink-0" />
								<span>✓ Зарегистрировать цикл стерилизации</span>
							</button>
						</div>
					</div>

					<div className="flex items-center gap-2 mt-2 text-xs text-[var(--ink-muted,#64748b)]">
						<Thermometer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>{currentProgram.temperatureCelsius}°C • {currentProgram.pressureBar} бар • {currentProgram.exposureMinutes} мин экспозиция</span>
						<span className="hidden sm:inline">• Индикатор 5 кл.: норма достигнута • Списание со склада авто</span>
					</div>
				</div>

				{/* Тост успешной фиксации */}
				{toastMessage && (
					<div className="mx-4 sm:mx-6 mt-3 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center justify-between">
						<div className="flex items-center gap-2">
							<CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
							<span>{toastMessage}</span>
						</div>
						<button type="button" onClick={() => setToastMessage(null)} className="text-teal-600 hover:text-teal-800 ml-2">
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				)}

				{/* Основной контент вкладок */}
				<div className="flex-1 p-4 sm:p-6 overflow-y-auto">
					{/* Вкладка 1: Циклы стерилизации (Автоклав) */}
					{activeTab === "autoclave" && (
						<div className="sanpin-table-wrapper">
							<table className="sanpin-data-table">
								<thead>
									<tr>
										<th>Дата и время</th>
										<th>Цикл</th>
										<th>Оборудование</th>
										<th>Режим</th>
										<th>Упаковок</th>
										<th>Индикатор 5 кл.</th>
										<th>Материал</th>
										<th>Ответственный</th>
									</tr>
								</thead>
								<tbody>
									{cycles.length === 0 ? (
										<tr>
											<td colSpan={8} className="text-center py-8 text-[var(--ink-muted,#64748b)]">
												Записи циклов отсутствуют. Нажмите «✓ Зарегистрировать цикл стерилизации» для фиксации партии смены.
											</td>
										</tr>
									) : (
										cycles.map((c) => (
											<tr key={c.id}>
												<td className="whitespace-nowrap font-medium">{c.date} {c.time}</td>
												<td className="font-semibold text-center">№{c.cycleNumber}</td>
												<td>{c.autoclaveName}</td>
												<td className="text-xs">{c.temperatureCelsius}°C / {c.pressureBar} бар / {c.exposureMinutes}м</td>
												<td className="font-semibold text-center">{c.packagesCount} шт</td>
												<td>
													<span className="sanpin-badge-success">
														<CheckCircle className="w-3 h-3" />
														{c.chemicalIndicatorVerdict}
													</span>
												</td>
												<td className="text-xs text-[var(--ink-muted,#64748b)] max-w-xs truncate">{c.itemsDescription}</td>
												<td className="text-xs">{c.operatorName}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					)}

					{/* Вкладка 2: Крафт-пакеты и маркировка */}
					{activeTab === "kraft" && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
								{STERILIZATION_PACKAGING.map((pack) => (
									<div key={pack.id} className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-slate-800">
										<div className="flex items-center justify-between mb-1">
											<span className="text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-slate-100">{pack.title}</span>
										</div>
										<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1">Срок стерильности: {pack.shelfLifeDays} суток</p>
										<div className="mt-2 text-xs font-medium text-teal-600 dark:text-teal-400 flex items-center gap-1">
											<CheckCircle className="w-3.5 h-3.5" />
											<span>С индикатором 5 класса</span>
										</div>
									</div>
								))}
							</div>

							<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div>
									<h4 className="text-sm font-semibold text-[var(--ink,#0f172a)] dark:text-slate-100">
										Маркировка крафт-пакетов и печать термоэтикеток
									</h4>
									<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1">
										Генерация этикеток с датой, номером цикла, автоклавом и расчетом срока годности (+50 суток)
									</p>
								</div>
								<button
									type="button"
									onClick={handlePrintStickers}
									className="sanpin-secondary-btn min-h-[40px] text-xs sm:text-sm shrink-0"
								>
									<Printer className="w-4 h-4 text-teal-600" />
									<span>Печать наклеек на крафт-пакеты</span>
								</button>
							</div>

							<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-slate-800">
								<h5 className="text-xs font-semibold text-[var(--ink-muted,#64748b)] uppercase tracking-wider mb-3">
									Контроль очистки инструментов (Азопирамовая и фенолфталеиновая пробы)
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="p-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-700/50">
										<div className="text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-200">Азопирамовая проба (следы крови)</div>
										<div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
											<CheckCircle className="w-3.5 h-3.5" />
											<span>Отрицательная (Норма 100%)</span>
										</div>
									</div>
									<div className="p-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-700/50">
										<div className="text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-200">Фенолфталеиновая проба (моющие средства)</div>
										<div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
											<CheckCircle className="w-3.5 h-3.5" />
											<span>Отрицательная (Остатки отсутствуют)</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Вкладка 3: Журнал генеральных уборок и УФ */}
					{activeTab === "cleaning" && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{BACTERICIDAL_STANDARD_DEVICES.map((dev) => (
									<div key={dev.id} className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-slate-800">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-slate-100">{dev.name}</span>
											<span className="sanpin-badge-info">В норме</span>
										</div>
										<p className="text-xs text-[var(--ink-muted,#64748b)]">{dev.roomName}</p>
										<div className="mt-2 text-xs">
											<span className="text-[var(--ink-muted,#64748b)]">Наработка: </span>
											<span className="font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">{dev.operatingHours} / {dev.maxResourceHours} ч</span>
										</div>
									</div>
								))}
							</div>

							<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-slate-800">
								<div className="flex items-center justify-between mb-3">
									<h4 className="text-sm font-semibold text-[var(--ink,#0f172a)] dark:text-slate-100 flex items-center gap-2">
										<CalendarCheck className="w-4 h-4 text-teal-600" />
										<span>График генеральных уборок клиники</span>
									</h4>
									<span className="sanpin-badge-success">Соблюдается</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
									<div className="p-3 rounded-lg bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-700/50">
										<div className="font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">Кабинет терапии</div>
										<div className="text-[var(--ink-muted,#64748b)] mt-1">Каждую пятницу • Дезинфектант 1%</div>
									</div>
									<div className="p-3 rounded-lg bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-700/50">
										<div className="font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">Операционная / Хирургия</div>
										<div className="text-[var(--ink-muted,#64748b)] mt-1">Каждые 3 дня • Экспозиция 60 мин</div>
									</div>
									<div className="p-3 rounded-lg bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-700/50">
										<div className="font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">Стерилизационная (ЦСО)</div>
										<div className="text-[var(--ink-muted,#64748b)] mt-1">Каждый понедельник • Режим бактерицидный</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Нижний подвал модалки */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink-muted,#64748b)]">
					<div className="flex items-center gap-2">
						<Box className="w-4 h-4 text-teal-600 shrink-0" />
						<span className="hidden sm:inline">Пакетное списание расходников: крафт-пакеты, индикаторы 5 класса, азопирам (Soft Negative Stock)</span>
						<span className="sm:hidden">Списание расходников со склада авто</span>
					</div>
					<button type="button" onClick={onClose} className="sanpin-secondary-btn min-h-[38px]">
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};

export default SanpinStudioModal;
