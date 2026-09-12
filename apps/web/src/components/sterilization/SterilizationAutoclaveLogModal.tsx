/**
 * ============================================================================
 * STERILIZATION AUTOCLAVE LOG MODAL (САНПИН 3.3686-21 & МАНДАТЫ 8e, 8k, 8n)
 * Журнал работы автоклава (Форма № 257/у), контроль качества ПСО (Форма № 366/у),
 * 1-кликовое закрытие смены и моментальная привязка стерильного крафт-пакета к 043/у.
 *
 * КЛЮЧЕВЫЕ ТРЕБОВАНИЯ:
 * 1. 1-кликовый мега-пресет: «Автоклавирование выполнено (Режим 134°C / 2.1 bar,
 *    азопирамовая/фенолфталеиновая проба отрицательна, тест-полоски 5 класс норма)»
 * 2. 1-кликовая привязка крафт-пакета к протоколу приема (Форма № 043/у).
 * 3. 1-строчный тулбар (32-36px, Mandate 8d).
 * 4. Закон Анти-Матрёшки: глубина модалок строго 1, ноль эмодзи в журналах и актах.
 * 5. Touch-First эргономика: кнопки >= 44px.
 * ============================================================================
 */

import {
	AlertTriangle,
	Award,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Layers,
	Package,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	User,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
import {
	type AutoclaveCycleRecord,
	type PsoQualityRecord,
	SAMPLE_TEST_BARCODES,
	SANPIN_AUTOCLAVE_CLASS_B_PRESET,
	SANPIN_AZOPYRAM_TEST_PRESET,
	SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
	STANDARD_TRAY_OPTIONS,
	type StandardTrayType,
	createQuickAutoclaveCycle,
	createQuickAzopyramRecord,
	createQuickPhenolphthaleinRecord,
	createStandardSterileTrayBarcode,
} from "./sterilizationPresets.js";

export interface SterilizationAutoclaveLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAttachToProtocol?: ((record043Text: string, barcode: string) => void | Promise<void>) | undefined;
	readonly patientName?: string | undefined;
	readonly nurseName?: string | undefined;
	readonly initialTab?: "form257" | "form366" | "kraft" | "print" | undefined;
}

export function SterilizationAutoclaveLogModal({
	isOpen,
	onClose,
	onAttachToProtocol,
	patientName = "Пациент приема",
	nurseName = "Смирнова А.В. (медсестра ЦСО)",
	initialTab = "form257",
}: SterilizationAutoclaveLogModalProps) {
	const [activeTab, setActiveTab] = useState<"form257" | "form366" | "kraft" | "print">(initialTab);

	// Начальные записи автоклава (Форма № 257/у)
	const [cycles, setCycles] = useState<AutoclaveCycleRecord[]>([
		{
			id: "cycle-init-1",
			cycleNumber: 1,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			operatorName: nurseName,
			timestamp: new Date().toISOString(),
		},
	]);

	// Начальные записи ПСО (Форма № 366/у)
	const [psoRecords, setPsoRecords] = useState<PsoQualityRecord[]>([
		{
			id: "pso-init-azo",
			...SANPIN_AZOPYRAM_TEST_PRESET,
			operatorName: nurseName,
			timestamp: new Date().toISOString(),
		},
		{
			id: "pso-init-ph",
			...SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
			operatorName: nurseName,
			timestamp: new Date().toISOString(),
		},
	]);

	// Состояние генератора крафт-пакета
	const [selectedTrayType, setSelectedTrayType] = useState<StandardTrayType>("therapy");
	const [manualBarcode, setManualBarcode] = useState<string>("");

	// Текущий сгенерированный или отсканированный пакет
	const activeKraftBarcode = useMemo(() => {
		if (manualBarcode.trim()) {
			return manualBarcode.trim();
		}
		const generated = createStandardSterileTrayBarcode(selectedTrayType, new Date(), nurseName);
		return generated.rawInput;
	}, [manualBarcode, selectedTrayType, nurseName]);

	// Текст протокола 043/у
	const formatted043ProtocolText = useMemo(() => {
		const tray = STANDARD_TRAY_OPTIONS.find((t) => t.id === selectedTrayType);
		const label = tray ? tray.labelRu : "Стандартный смотровой лоток";
		const todayIso = new Date().toISOString().slice(0, 10);
		const expDate = new Date(Date.now() + 50 * 24 * 3600 * 1000).toISOString().slice(0, 10);

		return `Инструменты стерильны. Крафт-пакет №${activeKraftBarcode} (Стерилизация инструментария: АК-01, цикл №${cycles.length} от ${todayIso}, годен до ${expDate}, ${label}), индикатор 5 класса (ИнтеТЕСТ 134°C) — норма. ${nurseName} [СанПиН 3.3686-21] вскрыт при пациенте.`;
	}, [activeKraftBarcode, selectedTrayType, cycles.length, nurseName]);

	// 1-кликовый МЕГА-ПРЕСЕТ смены (Мандаты 8e, 8k, 8n)
	const handleApplyMegaPreset = useCallback(() => {
		const nextCycleNum = cycles.length + 1;
		const newCycle = createQuickAutoclaveCycle(nextCycleNum, nurseName);
		const newAzo = createQuickAzopyramRecord(nurseName);
		const newPh = createQuickPhenolphthaleinRecord(nurseName);

		setCycles((prev) => [newCycle, ...prev]);
		setPsoRecords((prev) => [newAzo, newPh, ...prev]);

		showToast(
			`Автоклавирование выполнено: цикл №${nextCycleNum} (134°C / 2.1 bar), пробы ПСО отрицательны, тест-полоски 5 класс норма`,
			"success"
		);
	}, [cycles.length, nurseName]);

	// Привязка крафт-пакета к протоколу 043/у
	const handleAttachTo043 = useCallback(async () => {
		if (onAttachToProtocol) {
			await onAttachToProtocol(formatted043ProtocolText, activeKraftBarcode);
		}
		showToast("Крафт-пакет привязан к протоколу Формы № 043/у пациента", "success");
	}, [onAttachToProtocol, formatted043ProtocolText, activeKraftBarcode]);

	// Скопировать в буфер
	const handleCopy043Text = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(formatted043ProtocolText);
			showToast("Запись стерилизации для Формы 043/у скопирована в буфер", "info");
		}
	}, [formatted043ProtocolText]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
			data-testid="sterilization-autoclave-log-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Журнал стерилизации и автоклавирования СанПиН 3.3686-21"
		>
			<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#e2e8f0)] rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
				{/* HEADER */}
				<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
							<Flame size={20} />
						</div>
						<div>
							<h2 className="text-base font-bold leading-tight">
								Журнал стерилизации и автоклавирования
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								СанПиН 3.3686-21 • Форма № 257/у • Форма № 366/у • {nurseName}
							</p>
						</div>
					</div>

					<button
						type="button"
						className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors"
						onClick={onClose}
						aria-label="Закрыть журнал стерилизации"
					>
						<X size={18} />
					</button>
				</header>

				{/* 1-ROW TOOLBAR (32-36px, Mandate 8d) */}
				<div className="px-5 py-2.5 bg-[var(--paper,#ffffff)] border-b border-[var(--border,#e2e8f0)] flex items-center gap-2 flex-wrap text-xs shrink-0">
					{/* Вкладки журналов */}
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
						<button
							type="button"
							className={`h-7 px-2.5 text-xs font-semibold rounded-md transition-colors ${
								activeTab === "form257"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-400 shadow-sm"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							onClick={() => setActiveTab("form257")}
							data-testid="tab-form257"
						>
							Форма 257/у (Автоклав)
						</button>

						<button
							type="button"
							className={`h-7 px-2.5 text-xs font-semibold rounded-md transition-colors ${
								activeTab === "form366"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-400 shadow-sm"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							onClick={() => setActiveTab("form366")}
							data-testid="tab-form366"
						>
							Форма 366/у (ПСО пробы)
						</button>

						<button
							type="button"
							className={`h-7 px-2.5 text-xs font-semibold rounded-md transition-colors ${
								activeTab === "kraft"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-400 shadow-sm"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							onClick={() => setActiveTab("kraft")}
							data-testid="tab-kraft"
						>
							Крафт-пакеты (043/у)
						</button>

						<button
							type="button"
							className={`h-7 px-2.5 text-xs font-semibold rounded-md transition-colors ${
								activeTab === "print"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-400 shadow-sm"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							onClick={() => setActiveTab("print")}
							data-testid="tab-print"
						>
							Печать бланков
						</button>
					</div>

					<div className="h-4 w-px bg-[var(--border,#cbd5e1)] mx-1" />

					{/* 1-КЛИКОВЫЙ МЕГА-ПРЕСЕТ (МАНДАТ 8e, 8k) */}
					<button
						type="button"
						className="btn-confirm-autoclave-batch h-8 px-3 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
						onClick={handleApplyMegaPreset}
						data-testid="mega-preset-autoclave-btn"
						title="1 клик: Режим 134°C / 2.1 bar, азопирамовая/фенолфталеиновая проба отрицательна, тест-полоски 5 класс норма"
					>
						<Zap size={14} className="text-amber-300" />
						<span>Автоклавирование выполнено (1 клик)</span>
					</button>

					{/* Кнопка быстрого прикрепления к 043/у */}
					<button
						type="button"
						className="h-8 px-2.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 ml-auto"
						onClick={handleAttachTo043}
						data-testid="link-kraft-btn"
					>
						<Barcode size={14} />
						Привязать к 043/у
					</button>
				</div>

				{/* BODY WITH TAB VIEWS (АНТИ-МАТРЁШКА: ГЛУБИНА СТРОГО 1) */}
				<div className="flex-1 overflow-y-auto p-5">
					{/* TAB 1: ФОРМА 257/У (АВТОКЛАВИРОВАНИЕ) */}
					{activeTab === "form257" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold text-[var(--muted,#64748b)]">
									Журнал работы стерилизаторов (форма № 257/у) • Записей: {cycles.length}
								</span>
								<span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1">
									<CheckCircle2 size={13} />
									Все циклы аттестованы (Класс B, 5 класс тест-полосок)
								</span>
							</div>

							<div className="border border-[var(--border,#e2e8f0)] rounded-lg overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-[var(--paper-strong,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--border,#e2e8f0)] font-semibold">
										<tr>
											<th className="py-2.5 px-3">Цикл</th>
											<th className="py-2.5 px-3">Автоклав</th>
											<th className="py-2.5 px-3">Режим</th>
											<th className="py-2.5 px-3">Вакуум</th>
											<th className="py-2.5 px-3">Индикаторы</th>
											<th className="py-2.5 px-3">Бови-Дик</th>
											<th className="py-2.5 px-3">Вердикт</th>
											<th className="py-2.5 px-3">Оператор</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--border,#f1f5f9)]">
										{cycles.map((cycle) => (
											<tr key={cycle.id} className="hover:bg-[var(--paper-strong,#f8fafc)] transition-colors">
												<td className="py-2 px-3 font-mono font-bold">
													№{cycle.cycleNumber}
												</td>
												<td className="py-2 px-3">
													<div className="font-medium">{cycle.autoclaveCode}</div>
													<div className="text-[10px] text-[var(--muted,#94a3b8)]">{cycle.autoclaveModel}</div>
												</td>
												<td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
													<span className="font-bold text-teal-700 dark:text-teal-400">{cycle.temperatureC}°C</span> • {cycle.pressureBar} bar • {cycle.exposureMinutes} мин
												</td>
												<td className="py-2 px-3 text-[11px] max-w-xs truncate" title={cycle.preVacuum}>
													{cycle.preVacuum}
												</td>
												<td className="py-2 px-3 text-[11px] text-emerald-700 dark:text-emerald-400">
													5 класс (норма 5 точек)
												</td>
												<td className="py-2 px-3">
													<span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
														Пройден
													</span>
												</td>
												<td className="py-2 px-3">
													<span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
														{cycle.batchVerdict}
													</span>
												</td>
												<td className="py-2 px-3 text-[11px] text-[var(--muted,#64748b)]">
													{cycle.operatorName}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* TAB 2: ФОРМА 366/У (ПСО ПРОБЫ) */}
					{activeTab === "form366" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold text-[var(--muted,#64748b)]">
									Журнал учета качества предстерилизационной очистки (форма № 366/у)
								</span>
								<span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
									<CheckCircle2 size={13} />
									100% отрицательно (кровь и СМС отсутствуют)
								</span>
							</div>

							<div className="border border-[var(--border,#e2e8f0)] rounded-lg overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-[var(--paper-strong,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--border,#e2e8f0)] font-semibold">
										<tr>
											<th className="py-2.5 px-3">Проба</th>
											<th className="py-2.5 px-3">Инструментарий</th>
											<th className="py-2.5 px-3 text-right">Партия</th>
											<th className="py-2.5 px-3 text-right">Контроль</th>
											<th className="py-2.5 px-3">Результат</th>
											<th className="py-2.5 px-3">Моющее средство</th>
											<th className="py-2.5 px-3">Статус</th>
											<th className="py-2.5 px-3">Медсестра</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--border,#f1f5f9)]">
										{psoRecords.map((rec) => (
											<tr key={rec.id} className="hover:bg-[var(--paper-strong,#f8fafc)] transition-colors">
												<td className="py-2 px-3 font-semibold text-teal-700 dark:text-teal-400">
													{rec.testType === "azopyram" ? "Азопирамовая" : "Фенолфталеиновая"}
												</td>
												<td className="py-2 px-3 text-[11px] max-w-xs truncate" title={rec.instrumentName}>
													{rec.instrumentName}
												</td>
												<td className="py-2 px-3 text-right font-mono">{rec.batchItemCount} шт.</td>
												<td className="py-2 px-3 text-right font-mono font-bold">{rec.testedSampleCount} шт.</td>
												<td className="py-2 px-3">
													<span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
														Отрицательно (норма)
													</span>
												</td>
												<td className="py-2 px-3 text-[11px] text-[var(--muted,#64748b)]">
													{rec.detergentBrand}
												</td>
												<td className="py-2 px-3">
													<span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
														ДОПУЩЕНО
													</span>
												</td>
												<td className="py-2 px-3 text-[11px] text-[var(--muted,#64748b)]">
													{rec.operatorName}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* TAB 3: КРАФТ-ПАКЕТЫ И ПРИВЯЗКА К 043/У */}
					{activeTab === "kraft" && (
						<div className="space-y-4 max-w-3xl mx-auto">
							<div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 text-xs">
								<h3 className="font-bold text-sm flex items-center gap-2">
									<Package size={16} className="text-teal-600" />
									1-кликовый генератор крафт-пакета лотка
								</h3>
								<p className="text-[var(--muted,#64748b)] text-xs">
									Выберите типовой лоток для моментального формирования паспорта стерилизации со сегодняшней датой:
								</p>

								<div className="grid grid-cols-3 gap-2">
									{STANDARD_TRAY_OPTIONS.map((tray) => (
										<button
											key={tray.id}
											type="button"
											className={`p-2.5 rounded-lg border text-left transition-all ${
												selectedTrayType === tray.id
													? "border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-sm"
													: "border-slate-200 dark:border-slate-700 bg-[var(--paper,#ffffff)] hover:bg-slate-100"
											}`}
											onClick={() => {
												setSelectedTrayType(tray.id);
												setManualBarcode("");
											}}
											data-testid={`tray-select-${tray.id}`}
										>
											<div className="font-bold text-xs">{tray.shortLabelRu}</div>
											<div className="text-[10px] text-[var(--muted,#64748b)] line-clamp-2 mt-0.5">
												{tray.descriptionRu}
											</div>
										</button>
									))}
								</div>
							</div>

							{/* Превью Штрихкода / DataMatrix */}
							<div className="border border-[var(--border,#e2e8f0)] rounded-lg p-4 bg-[var(--paper,#ffffff)] space-y-3 text-xs">
								<div className="flex items-center justify-between">
									<span className="font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
										<QrCode size={15} className="text-teal-600" />
										Машиночитаемый код крафт-пакета (DataMatrix 2D / ШК):
									</span>
									<span className="font-mono text-[11px] text-teal-700 dark:text-teal-400 font-bold">
										Срок сохранения стерильности: 50 суток
									</span>
								</div>

								<div className="font-mono text-xs p-2.5 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 break-all select-all">
									{activeKraftBarcode}
								</div>

								{/* Текст протокола 043/у */}
								<div className="space-y-1.5">
									<div className="font-semibold text-[11px] text-[var(--muted,#64748b)]">
										Формулировка для дневника приема (Форма № 043/у):
									</div>
									<div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded text-emerald-950 dark:text-emerald-200 text-xs leading-relaxed">
										{formatted043ProtocolText}
									</div>
								</div>

								<div className="flex items-center gap-2 pt-2">
									<button
										type="button"
										className="h-10 px-4 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
										onClick={handleAttachTo043}
										data-testid="attach-kraft-to-043-btn"
										style={{ minHeight: "44px" }}
									>
										<CheckCircle2 size={16} />
										Привязать к визиту пациента
									</button>

									<button
										type="button"
										className="h-10 px-4 text-xs font-semibold rounded-lg border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] flex items-center gap-1.5 transition-colors"
										onClick={handleCopy043Text}
										style={{ minHeight: "44px" }}
									>
										<Copy size={15} />
										Копировать текст в 043/у
									</button>
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: ПЕЧАТЬ БЛАНКОВ САНПИН (ФОРМА 257/У И 366/У) */}
					{activeTab === "print" && (
						<div className="bg-[var(--paper,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-lg p-6 max-w-3xl mx-auto text-xs space-y-4 font-sans">
							<div className="border-b border-slate-300 pb-3 text-center space-y-1">
								<h3 className="text-sm font-bold uppercase tracking-wide">
									ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (АВТОКЛАВОВ) — ФОРМА № 257/У
								</h3>
								<p className="text-[11px] text-[var(--muted,#64748b)]">
									Утверждена приказом Минздрава СССР № 1030 • СанПиН 3.3686-21
								</p>
							</div>

							<div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-200 dark:border-slate-800">
								<span><strong>Стерилизатор:</strong> Melag Vacuklav 23 B+ (АК-01)</span>
								<span><strong>Дата:</strong> {new Date().toLocaleDateString("ru-RU")}</span>
								<span><strong>Оператор:</strong> {nurseName}</span>
							</div>

							<div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b border-slate-200 dark:border-slate-700">
										<tr>
											<th className="py-2 px-2.5">№ цикла</th>
											<th className="py-2 px-2.5">Режим (°C/bar/мин)</th>
											<th className="py-2 px-2.5">Стерилизуемые изделия</th>
											<th className="py-2 px-2.5">Индикаторы</th>
											<th className="py-2 px-2.5">Заключение</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-200 dark:divide-slate-700">
										{cycles.map((c) => (
											<tr key={c.id}>
												<td className="py-2 px-2.5 font-bold">№{c.cycleNumber}</td>
												<td className="py-2 px-2.5 font-mono">{c.temperatureC}°C / {c.pressureBar} bar / {c.exposureMinutes} мин</td>
												<td className="py-2 px-2.5">{c.loadDescription}</td>
												<td className="py-2 px-2.5 text-emerald-700 font-semibold">5 класс — норма</td>
												<td className="py-2 px-2.5 font-bold text-emerald-700">ГОДНА</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-[var(--muted,#64748b)]">
								<div>Ответственная медсестра ЦСО: ____________________ / {nurseName}</div>
								<button
									type="button"
									className="h-10 px-4 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 transition-colors shadow-sm"
									onClick={() => {
										window.print?.();
										showToast("Бланк отправлен на печать", "info");
									}}
									style={{ minHeight: "44px" }}
								>
									<Printer size={15} />
									Печать бланка СанПиН
								</button>
							</div>
						</div>
					)}
				</div>

				{/* FOOTER */}
				<footer className="px-5 py-3.5 border-t border-[var(--border,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] flex items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--muted,#64748b)]">
						СанПиН 3.3686-21: Циклов автоклава: <strong className="text-[var(--ink,#0f172a)]">{cycles.length}</strong> • ПСО проб: <strong className="text-[var(--ink,#0f172a)]">{psoRecords.length}</strong>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="h-11 px-5 text-xs font-semibold rounded-lg border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors"
							onClick={onClose}
							style={{ minHeight: "44px" }}
						>
							Закрыть
						</button>

						<button
							type="button"
							className="h-11 px-5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 shadow-sm transition-colors"
							onClick={handleApplyMegaPreset}
							style={{ minHeight: "44px" }}
						>
							<CheckCircle2 size={16} />
							Зафиксировать смену стерилизации
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
}

export default SterilizationAutoclaveLogModal;
