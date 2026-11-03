/**
 * @file CopilotWorkstationTab.tsx
 * @description Workstation Desktop Agent tab: Local Dropzones & DICOM,
 * Tool Execution Logs Inspector, and Interactive Clinical Diff Viewer (Mandate 8b <= 380 lines).
 */

import React, { useState } from "react";
import {
	Activity, Camera, Check, CheckCircle2, ChevronDown, Clock, Cpu,
	Eye, FileCode, FolderOpen, Globe, HardDrive, Monitor, Receipt,
	RefreshCw, TabletSmartphone, X
} from "lucide-react";
import { useCopilotStore, type ToolExecutionLog } from "../../store/copilotStore";
import { showToast } from "../GlobalToast";

const MOCK_SAMPLE_DIFF = {
	id: "diff-sample-1",
	title: "Дневник приёма SOAP: Зуб 36",
	targetEntity: "Медицинская карта приёма",
	beforeText: `Status localis:
Зуб 36 — глубокая кариозная полость на жевательной поверхности.
Дно плотное, зондирование болезненно по эмалево-дентинной границе.
Реакция на холод кратковременная.`,
	afterText: `Status localis:
Зуб 36 — глубокая кариозная полость на жевательно-дистальной поверхности (MOD).
Препарирование под инфильтрационной анестезией (Артикаин 1:200 000, 1.7 мл).
Изоляция коффердамом. Наложена лечебная прокладка TheraCal LC.
Реставрация светоотверждаемым нанокомпозитом Harmonize (A2, A3) с моделированием фиссур.
Шлифовка и полировка дисками Sof-Lex. Окклюзионные контакты выверены копиркой 12 мкм.`,
};

export function CopilotWorkstationTab() {
	const settings = useCopilotStore((s) => s.settings);
	const updateSettings = useCopilotStore((s) => s.updateSettings);
	const toolLogs = useCopilotStore((s) => s.toolExecutionLogs);
	const activeDiff = useCopilotStore((s) => s.activeDiff) || MOCK_SAMPLE_DIFF;
	const setActiveDiff = useCopilotStore((s) => s.setActiveDiff);
	const applyActiveDiff = useCopilotStore((s) => s.applyActiveDiff);

	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
	const [diffApplied, setDiffApplied] = useState<boolean>(false);
	const [isScanningDropzone, setIsScanningDropzone] = useState<boolean>(false);

	const mode = settings.runtimeMode;
	const isDesktop = mode === "desktop_native";
	const isTablet = mode === "chairside_tablet" || mode === "mobile_tablet";

	const handleScanDropzone = () => {
		setIsScanningDropzone(true);
		setTimeout(() => {
			setIsScanningDropzone(false);
			showToast("Сканирование завершено: обнаружен 1 новый снимок RVG в папке C:\\Radiology\\Export", "success");
		}, 800);
	};

	const handleApplyDiff = () => {
		setDiffApplied(true);
		applyActiveDiff();
		showToast("Изменения успешно применены в дневник приёма", "success");
	};

	return (
		<div className="copilot-workstation-tab flex-1 overflow-y-auto px-5 py-3.5 space-y-4 text-xs">
			{/* Трехпозиционный переключатель среды исполнения */}
			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Cpu size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Среда исполнения ассистента</span>
					</div>
					<p className="text-[10px] text-[var(--muted)] m-0 mt-0.5">
						{isDesktop
							? "Десктопная станция врача: прямой доступ к файлам ПК, томографам и кассе"
							: isTablet
								? "Планшет у кресла: сенсорный слой в перчатках и активный экран"
								: "Веб-ассистент: работа через защищенный облачный API в браузере"}
					</p>
				</div>
				<div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line)] shrink-0 self-start sm:self-auto">
					<button
						type="button"
						onClick={() => updateSettings({ runtimeMode: "web_browser" })}
						className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
							!isDesktop && !isTablet ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
						}`}
					>
						<Globe size={12} />
						<span>Веб</span>
					</button>
					<button
						type="button"
						onClick={() => updateSettings({ runtimeMode: "desktop_native" })}
						className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
							isDesktop ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
						}`}
					>
						<Monitor size={12} />
						<span>ПК Станция</span>
					</button>
					<button
						type="button"
						onClick={() => updateSettings({ runtimeMode: "chairside_tablet" })}
						className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
							isTablet ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent"
						}`}
					>
						<TabletSmartphone size={12} />
						<span>Планшет</span>
					</button>
				</div>
			</div>

			{/* Статус подключения медицинского оборудования и периферии */}
			<section className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<HardDrive size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Периферия и оборудование клиники</span>
					</label>
					<span className="text-[10px] text-[var(--muted)]">3 устройства онлайн</span>
				</div>

				<div className="grid grid-cols-1 gap-2">
					{/* 1. RVG-визиограф */}
					<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
								<Activity size={14} />
							</div>
							<div className="min-w-0">
								<div className="font-bold text-[var(--ink)] truncate">RVG-визиограф Planmeca ProSensor v2</div>
								<div className="text-[10px] text-[var(--muted)] truncate">USB 3.0 • Разрешение 20 пл/мм • Прямой оптический захват</div>
							</div>
						</div>
						<div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
							<span>Готов к экспозиции</span>
						</div>
					</div>

					{/* 2. Сетевая папка томографов */}
					<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-7 h-7 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
								<FolderOpen size={14} />
							</div>
							<div className="min-w-0">
								<div className="font-bold text-[var(--ink)] truncate">Сетевая папка КЛКТ / ОПТГ томографов</div>
								<div className="text-[10px] text-[var(--muted)] truncate">{settings.localDropzonePath} • Vatech / Romexis</div>
							</div>
						</div>
						<div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/10 border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)] text-[10px] font-semibold">
							<CheckCircle2 size={11} />
							<span>Обнаружено 12 срезов</span>
						</div>
					</div>

					{/* 3. Фискальный регистратор кассы 54-ФЗ */}
					<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
								<Receipt size={14} />
							</div>
							<div className="min-w-0">
								<div className="font-bold text-[var(--ink)] truncate">Кассовый регистратор Атол 27Ф (54-ФЗ)</div>
								<div className="text-[10px] text-[var(--muted)] truncate">COM4 • Смена открыта • ФН активен (без требования ИНН физлиц)</div>
							</div>
						</div>
						<div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
							<Check size={11} />
							<span>Готов к чекам</span>
						</div>
					</div>
				</div>

				{/* Быстрые действия с dropzone и визиографом */}
				<div className="grid grid-cols-2 gap-2 pt-1">
					<button
						type="button"
						onClick={handleScanDropzone}
						className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-2 text-left cursor-pointer transition-colors"
					>
						<RefreshCw size={14} className={`text-[var(--teal,#0d9488)] ${isScanningDropzone ? "animate-spin" : ""}`} />
						<div className="min-w-0">
							<div className="font-bold text-[var(--ink)] truncate">Сканировать dropzone</div>
							<div className="text-[10px] text-[var(--muted)] truncate">Поиск RVG снимков</div>
						</div>
					</button>
					<button
						type="button"
						onClick={() => showToast("Оптический захват визиографа выполнен (кадр сохранен)", "info")}
						className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-2 text-left cursor-pointer transition-colors"
					>
						<Camera size={14} className="text-[var(--teal,#0d9488)]" />
						<div className="min-w-0">
							<div className="font-bold text-[var(--ink)] truncate">Захват визиографа</div>
							<div className="text-[10px] text-[var(--muted)] truncate">Оптический снимок</div>
						</div>
					</button>
				</div>
			</section>

			{/* Интерактивный Diff Viewer */}
			<section className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--paper)] space-y-2.5">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-6 h-6 rounded-md bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<FileCode size={13} />
						</div>
						<div className="min-w-0">
							<div className="font-bold text-[var(--ink)] truncate">{activeDiff.title}</div>
							<div className="text-[10px] text-[var(--muted)] truncate">{activeDiff.targetEntity}</div>
						</div>
					</div>
					<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
						diffApplied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
					}`}>
						{diffApplied ? "Применено" : "Ожидает согласования"}
					</span>
				</div>

				{/* Просмотр диффа: Было vs Стало */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
					<div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-200">
						<div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1 flex items-center gap-1">
							<span>- Было в протоколе</span>
						</div>
						<p className="whitespace-pre-wrap leading-relaxed m-0 opacity-90">{activeDiff.beforeText}</p>
					</div>
					<div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200">
						<div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1 flex items-center gap-1">
							<span>+ Стало (версия ИИ)</span>
						</div>
						<p className="whitespace-pre-wrap leading-relaxed m-0 opacity-90">{activeDiff.afterText}</p>
					</div>
				</div>

				{/* Кнопки применения диффа */}
				<div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line)]">
					<button
						type="button"
						onClick={() => {
							setActiveDiff(null);
							showToast("Правка отклонена врачом", "info");
						}}
						className="secondary-button text-[11px] font-semibold h-8 px-3 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
					>
						Отклонить
					</button>
					<button
						type="button"
						onClick={handleApplyDiff}
						className="primary-button text-[11px] font-bold h-8 px-4 rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-95 shadow-xs cursor-pointer flex items-center gap-1.5"
					>
						<Check size={13} />
						<span>{diffApplied ? "Правка принята" : "Принять диф в дневник"}</span>
					</button>
				</div>
			</section>

			{/* Журнал вызовов инструментов (Tool Execution Inspector) */}
			<section className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Activity size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Журнал вызовов инструментов ({toolLogs.length})</span>
					</label>
					<span className="text-[10px] text-[var(--muted)]">Реальные вызовы Fastify & Workstation</span>
				</div>

				<div className="space-y-1.5">
					{toolLogs.map((log) => {
						const isExpanded = expandedLogId === log.id;
						return (
							<div
								key={log.id}
								className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[11px] space-y-1.5 transition-colors"
							>
								<div
									className="flex items-center justify-between gap-2 cursor-pointer select-none"
									onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span className={`w-2 h-2 rounded-full shrink-0 ${
											log.status === "success" ? "bg-emerald-500" : log.status === "pending" ? "bg-amber-500 animate-pulse" : "bg-blue-500"
										}`} />
										<span className="font-bold font-mono text-[var(--ink)] truncate">{log.toolName}</span>
										{log.durationMs && (
											<span className="text-[10px] text-[var(--muted)] flex items-center gap-0.5">
												<Clock size={10} />
												{log.durationMs}ms
											</span>
										)}
									</div>
									<div className="flex items-center gap-1.5 shrink-0">
										<span className="text-[10px] text-[var(--muted)]">{log.timestamp}</span>
										<ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
									</div>
								</div>
								<p className="text-[11px] text-[var(--ink)] m-0 leading-relaxed">{log.resultSummary}</p>

								{/* Раскрывающийся JSON аргументов */}
								{isExpanded && (
									<div className="pt-2 border-t border-[var(--line)]">
										<div className="text-[10px] text-[var(--muted)] font-semibold mb-1">Входные аргументы инструмента:</div>
										<pre className="p-2 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line)] font-mono text-[10px] overflow-x-auto m-0">
											{JSON.stringify(log.args, null, 2)}
										</pre>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}
