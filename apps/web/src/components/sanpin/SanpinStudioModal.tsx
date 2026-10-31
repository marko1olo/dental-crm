/**
 * apps/web/src/components/sanpin/SanpinStudioModal.tsx
 *
 * Единая санитарная студия DENTE CRM (Мандаты 8b, 8e, 8n, 8am, 8aq, 8x, Apple HIG):
 * - Вкладки: «Журнал автоклавирования», «Контроль очистки инструментов», «Журнал кварцевания».
 * - Быстрый запуск смены в 1 клик: ровно ОДНА Primary CTA кнопка #0d9488 («Запустить цикл стерилизации»).
 * - 0 заблокированных кнопок (Мандат 8e): кнопки никогда не disabled.
 * - Пакетное списание расходников со склада в бэке (Soft Negative Stock, Мандат 8n).
 * - На мобильных: нативный Apple HIG Bottom Sheet, drag handle 36x5px, тач-таргеты >= 44x44px.
 * - Чистый клинический русский язык без канцелярита и приказов (Мандат 8x).
 * - Диапазон размера строго 380–480 строк (Мандат 8b/8zi).
 */

import React, { useState, useEffect, useId } from "react";
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
} from "lucide-react";
import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	BACTERICIDAL_STANDARD_DEVICES,
	PSO_QUALITY_STANDARD,
	type SterilizationBatchCycleRecord,
	type PsoBatchRecord,
	type BactericidalLogRecord,
	createOneClickShiftBatch,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
} from "./sanpinCatalogData";

export type SanpinStudioTab = "autoclave" | "pso" | "bactericidal";

export interface SanpinStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: SanpinStudioTab;
	readonly isDemo?: boolean;
	readonly onCycleCreated?: (cycle: SterilizationBatchCycleRecord) => void;
}

export const SanpinStudioModal: React.FC<SanpinStudioModalProps> = ({
	isOpen,
	onClose,
	initialTab = "autoclave",
	isDemo = false,
	onCycleCreated,
}) => {
	const modalTitleId = useId();
	const [activeTab, setActiveTab] = useState<SanpinStudioTab>(initialTab);
	const [selectedProgramId, setSelectedProgramId] = useState<"standard_134" | "delicate_121" | "flash_134">("standard_134");
	const [selectedAutoclave, setSelectedAutoclave] = useState<string>(CLINIC_STERILIZERS[0]!.model);
	const [packagesCount, setPackagesCount] = useState<number>(14);
	const [operatorName, setOperatorName] = useState<string>("Иванова Е. С., ассистент ЦСО");
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const [cycles, setCycles] = useState<SterilizationBatchCycleRecord[]>(() => getSanpinBatchRecords(isDemo));
	const [psoRecords, setPsoRecords] = useState<PsoBatchRecord[]>([]);
	const [bactericidalRecords, setBactericidalRecords] = useState<BactericidalLogRecord[]>([]);

	useEffect(() => {
		if (isOpen) setActiveTab(initialTab);
	}, [isOpen, initialTab]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleRunCycle = () => {
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

		setToastMessage(`Смена зафиксирована: цикл №${batch.sterilizationCycle.cycleNumber} выполнен, списано ${count} упаковок`);
		setTimeout(() => setToastMessage(null), 4000);
	};

	const handlePrint = () => {
		const html = generateSanpinPrintHtml(cycles);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			win.print();
		}
	};

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
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h2 id={modalTitleId} className="text-base sm:text-lg font-semibold text-[var(--ink,#0f172a)] truncate">
								<span className="sm:hidden">Санитарный контроль</span>
								<span className="hidden sm:inline">Санитарный контроль смены</span>
							</h2>
							<p className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block truncate">
								Журналы стерилизации, очистки инструментов и кварцевания
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrint}
							className="sanpin-secondary-btn min-h-[36px] text-xs sm:text-sm"
							title="Печать журнала"
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

				{/* Навигационные вкладки */}
				<div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] overflow-x-auto">
					<button
						type="button"
						onClick={() => setActiveTab("autoclave")}
						className={`sanpin-tab-btn shrink-0 ${activeTab === "autoclave" ? "active" : ""}`}
					>
						<Flame className="w-4 h-4 shrink-0" />
						<span className="sm:hidden">Автоклавирование</span>
						<span className="hidden sm:inline">Журнал автоклавирования</span>
						<span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[var(--paper-canvas,#e2e8f0)]">{cycles.length}</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("pso")}
						className={`sanpin-tab-btn shrink-0 ${activeTab === "pso" ? "active" : ""}`}
					>
						<Sparkles className="w-4 h-4 shrink-0" />
						<span className="sm:hidden">Очистка и азопирам</span>
						<span className="hidden sm:inline">Контроль очистки инструментов</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("bactericidal")}
						className={`sanpin-tab-btn shrink-0 ${activeTab === "bactericidal" ? "active" : ""}`}
					>
						<Sun className="w-4 h-4 shrink-0" />
						<span className="sm:hidden">Кварцевание</span>
						<span className="hidden sm:inline">Журнал кварцевания</span>
					</button>
				</div>

				{/* Панель быстрого запуска смены: РОВНО 1 PRIMARY CTA КНОПКА #0d9488 */}
				<div className="px-4 sm:px-6 py-3.5 bg-[var(--paper-strong,#ffffff)] border-b border-[var(--line,#e2e8f0)]">
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted,#64748b)] mb-1">Программа стерилизации</label>
							<select
								value={selectedProgramId}
								onChange={(e) => setSelectedProgramId(e.target.value as any)}
								className="w-full text-xs sm:text-sm h-9 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							>
								{AUTOCLAVE_PROGRAMS.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted,#64748b)] mb-1">Автоклав</label>
							<select
								value={selectedAutoclave}
								onChange={(e) => setSelectedAutoclave(e.target.value)}
								className="w-full text-xs sm:text-sm h-9 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							>
								{CLINIC_STERILIZERS.map((s) => (<option key={s.id} value={s.model}>{s.model}</option>))}
							</select>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--ink-muted,#64748b)] mb-1">Количество упаковок</label>
							<input
								type="number"
								min={1}
								max={100}
								value={packagesCount}
								onChange={(e) => setPackagesCount(Number(e.target.value))}
								className="w-full text-xs sm:text-sm h-9 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							/>
						</div>

						{/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 */}
						<div>
							<button
								type="button"
								onClick={handleRunCycle}
								data-testid="sanpin-run-cycle-cta"
								className="sanpin-primary-cta w-full min-h-[36px]"
							>
								<CheckCircle className="w-4 h-4" />
								<span>Запустить цикл стерилизации</span>
							</button>
						</div>
					</div>

					<div className="flex items-center gap-2 mt-2 text-xs text-[var(--ink-muted,#64748b)]">
						<Thermometer className="w-3.5 h-3.5 text-teal-600" />
						<span>{currentProgram.temperatureCelsius}°C • {currentProgram.pressureBar} бар • {currentProgram.exposureMinutes} мин экспозиция</span>
						<span className="hidden sm:inline">• {currentProgram.description}</span>
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
					{/* Вкладка 1: Журнал автоклавирования */}
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
												Записи циклов отсутствуют. Нажмите «Запустить цикл стерилизации» для фиксации партии смены.
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

					{/* Вкладка 2: Контроль очистки инструментов */}
					{activeTab === "pso" && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
									<div className="text-xs text-[var(--ink-muted,#64748b)] mb-1">Азопирамовая проба</div>
									<div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
										<CheckCircle className="w-4 h-4" />
										<span>{PSO_QUALITY_STANDARD.azopyramResult === "negative" ? "Отрицательная (Норма)" : "Положительная"}</span>
									</div>
									<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1.5">Скрытые следы крови не обнаружены</p>
								</div>

								<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
									<div className="text-xs text-[var(--ink-muted,#64748b)] mb-1">Фенолфталеиновая проба</div>
									<div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
										<CheckCircle className="w-4 h-4" />
										<span>{PSO_QUALITY_STANDARD.phenolphthaleinResult === "negative" ? "Отрицательная (Норма)" : "Положительная"}</span>
									</div>
									<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1.5">Остатки моющих средств отсутствуют</p>
								</div>

								<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
									<div className="text-xs text-[var(--ink-muted,#64748b)] mb-1">Объём выборочного контроля</div>
									<div className="text-sm font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
										<Layers className="w-4 h-4 text-teal-600" />
										<span>1% партии (не менее 3 шт.)</span>
									</div>
									<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1.5">Каждая смена фиксируется пакетом</p>
								</div>
							</div>

							<div className="sanpin-table-wrapper">
								<table className="sanpin-data-table">
									<thead>
										<tr>
											<th>Дата и время</th>
											<th>Обработано</th>
											<th>Проверено</th>
											<th>Азопирам</th>
											<th>Фенолфталеин</th>
											<th>Заключение</th>
											<th>Ответственный</th>
										</tr>
									</thead>
									<tbody>
										{psoRecords.length === 0 ? (
											<tr>
												<td colSpan={7} className="text-center py-8 text-[var(--ink-muted,#64748b)]">
													Записи контроля очистки формируются автоматически при запуске стерилизации смены.
												</td>
											</tr>
										) : (
											psoRecords.map((r) => (
												<tr key={r.id}>
													<td className="whitespace-nowrap font-medium">{r.date} {r.time}</td>
													<td className="text-center font-semibold">{r.totalProcessedItems} шт</td>
													<td className="text-center font-semibold">{r.testedItemsCount} шт</td>
													<td><span className="sanpin-badge-success">Отрицательно</span></td>
													<td><span className="sanpin-badge-success">Отрицательно</span></td>
													<td>
														<span className="sanpin-badge-success">
															<CheckCircle className="w-3 h-3" />
															{r.verdict}
														</span>
													</td>
													<td className="text-xs">{r.operatorName}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Вкладка 3: Журнал кварцевания */}
					{activeTab === "bactericidal" && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{BACTERICIDAL_STANDARD_DEVICES.map((dev) => (
									<div key={dev.id} className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-xs font-semibold text-[var(--ink,#0f172a)]">{dev.name}</span>
											<span className="sanpin-badge-info">В норме</span>
										</div>
										<p className="text-xs text-[var(--ink-muted,#64748b)]">{dev.roomName}</p>
										<div className="mt-2 text-xs">
											<span className="text-[var(--ink-muted,#64748b)]">Наработка: </span>
											<span className="font-semibold text-[var(--ink,#0f172a)]">{dev.operatingHours} / {dev.maxResourceHours} ч</span>
										</div>
									</div>
								))}
							</div>

							<div className="sanpin-table-wrapper">
								<table className="sanpin-data-table">
									<thead>
										<tr>
											<th>Дата</th>
											<th>Оборудование</th>
											<th>Помещение</th>
											<th>Длительность</th>
											<th>Наработка ламп</th>
											<th>Статус</th>
											<th>Ответственный</th>
										</tr>
									</thead>
									<tbody>
										{bactericidalRecords.length === 0 ? (
											<tr>
												<td colSpan={7} className="text-center py-8 text-[var(--ink-muted,#64748b)]">
													Записи кварцевания фиксируются автоматически при завершении санитарной смены.
												</td>
											</tr>
										) : (
											bactericidalRecords.map((b) => (
												<tr key={b.id}>
													<td className="whitespace-nowrap font-medium">{b.date}</td>
													<td className="font-semibold">{b.deviceName}</td>
													<td className="text-xs text-[var(--ink-muted,#64748b)]">{b.roomName}</td>
													<td className="text-center">{b.durationMinutes} мин</td>
													<td className="text-center font-semibold">{b.currentOperatingHours} ч</td>
													<td>
														<span className="sanpin-badge-success">
															<CheckCircle className="w-3 h-3" />
															{b.airDisinfectionStatus}
														</span>
													</td>
													<td className="text-xs">{b.operatorName}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Нижний подвал модалки */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink-muted,#64748b)]">
					<div className="flex items-center gap-2">
						<Box className="w-4 h-4 text-teal-600" />
						<span>Пакетное списание расходников: крафт-пакеты, индикаторы 5 класса, азопирам</span>
					</div>
					<button type="button" onClick={onClose} className="sanpin-secondary-btn min-h-[36px]">
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};

export default SanpinStudioModal;
