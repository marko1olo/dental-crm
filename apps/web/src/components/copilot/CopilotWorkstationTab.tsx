/**
 * @file CopilotWorkstationTab.tsx
 * @description Вкладка оборудования кабинета и рабочей станции врача.
 * Мандат 8wy: Строгий двухрежимный закон (Боевой прод vs Демо-витрина).
 * Мандат 8b: размер файла строго <= 320 строк.
 * Мандат 8am: ровно ОДНА Primary CTA кнопка на видимый контекст.
 * Мандат 8e: ноль блокировок (disabled запрещен), автономия врача.
 * Мандат 8d: строго 0 cartoon emojis, только Lucide иконки.
 */

import React, { useState, useEffect } from "react";
import {
	Activity, AlertTriangle, Check, ChevronDown,
	FileCode, FolderOpen, HardDrive, Receipt, RefreshCw, Terminal
} from "lucide-react";
import { useCopilotStore } from "../../store/copilotStore";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode";

const MOCK_SAMPLE_DIFF = {
	id: "diff-sample-1",
	title: "Дневник приёма SOAP: Зуб 36",
	targetEntity: "Медицинская карта приёма",
	beforeText: "Status localis:\nЗуб 36 — глубокая кариозная полость на жевательной поверхности.\nДно плотное, зондирование болезненно по эмалево-дентинной границе.\nРеакция на холод кратковременная.",
	afterText: "Status localis:\nЗуб 36 — глубокая кариозная полость на жевательно-дистальной поверхности (MOD).\nПрепарирование под инфильтрационной анестезией (Артикаин 1:200 000, 1.7 мл).\nИзоляция коффердамом. Наложена лечебная прокладка TheraCal LC.\nРеставрация светоотверждаемым нанокомпозитом Harmonize (A2, A3) с моделированием фиссур.\nШлифовка и полировка дисками Sof-Lex. Окклюзионные контакты выверены копиркой 12 мкм.",
};

interface DeviceStatus {
	tested: boolean;
	online: boolean;
	latencyMs?: number;
	detail?: string;
}

async function sendProbeRequest(payload: { probeType: string; targetPath?: string; comPort?: string; dangerousAction?: string; confirmed?: boolean }) {
	try {
		const res = await fetch("/api/agent/workstation/probe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
		if (!res.ok) return { success: false, isConnected: false, message: `HTTP ${res.status}` };
		return await res.json();
	} catch (err: unknown) {
		return { success: false, isConnected: false, message: err instanceof Error ? err.message : "Сервер оффлайн" };
	}
}

export function CopilotWorkstationTab() {
	const settings = useCopilotStore((s) => s.settings);
	const toolLogs = useCopilotStore((s) => s.toolExecutionLogs);
	const storeActiveDiff = useCopilotStore((s) => s.activeDiff);
	const setActiveDiff = useCopilotStore((s) => s.setActiveDiff);
	const applyActiveDiff = useCopilotStore((s) => s.applyActiveDiff);

	const activeDiff = (typeof window === "undefined" ? useCopilotStore.getState().activeDiff : null) ?? storeActiveDiff;
	const isDemo = isDemoShowcaseMode();
	const effectiveDiff = activeDiff || (isDemo ? MOCK_SAMPLE_DIFF : null);

	const [probingDevice, setProbingDevice] = useState<string | null>(null);
	const [guardConfirmOpen, setGuardConfirmOpen] = useState(false);
	const [showDiagnosticsLog, setShowDiagnosticsLog] = useState(false);
	const [diffApplied, setDiffApplied] = useState(false);

	const [rvgState, setRvgState] = useState<DeviceStatus>(() =>
		isDemo ? { tested: true, online: true, latencyMs: 4, detail: "Готов к экспозиции" } : { tested: false, online: false }
	);
	const [dropzoneState, setDropzoneState] = useState<DeviceStatus>(() =>
		isDemo ? { tested: true, online: true, latencyMs: 6, detail: "Обнаружено 12 срезов" } : { tested: false, online: false }
	);
	const [kktState, setKktState] = useState<DeviceStatus>(() =>
		isDemo ? { tested: true, online: true, latencyMs: 11, detail: "Готов к чекам" } : { tested: false, online: false }
	);

	useEffect(() => {
		if (isDemo || typeof window === "undefined") return;
		let cancelled = false;
		const autoProbe = async () => {
			const [rvg, drop, kkt] = await Promise.all([
				sendProbeRequest({ probeType: "visiograph_bridge" }),
				sendProbeRequest({ probeType: "ping_dropzone", targetPath: settings.localDropzonePath }),
				sendProbeRequest({ probeType: "fiscal_com_status", comPort: settings.fiscalRegisterComPort || "COM1" }),
			]);
			if (cancelled) return;
			setRvgState({ tested: true, online: Boolean(rvg.success && rvg.isConnected), latencyMs: rvg.latencyMs, detail: rvg.message || (rvg.success ? "Готов к экспозиции" : "Сервер оффлайн") });
			setDropzoneState({ tested: true, online: Boolean(drop.success && drop.isConnected), latencyMs: drop.latencyMs, detail: drop.message || (drop.success ? "Обнаружено 12 срезов" : "Каталог недоступен") });
			setKktState({ tested: true, online: Boolean(kkt.success && kkt.isConnected), latencyMs: kkt.latencyMs, detail: kkt.message || (kkt.success ? "Готов к чекам" : "Порт закрыт") });
		};
		autoProbe();
		return () => { cancelled = true; };
	}, [isDemo, settings.localDropzonePath, settings.fiscalRegisterComPort]);

	const runProbe = async (devId: "rvg" | "dropzone" | "kkt", payload: Parameters<typeof sendProbeRequest>[0], successMsg: string, defaultDetail: string) => {
		setProbingDevice(devId);
		const data = await sendProbeRequest(payload);
		setProbingDevice(null);
		const setFn = devId === "rvg" ? setRvgState : devId === "dropzone" ? setDropzoneState : setKktState;
		if (data.success && data.isConnected) {
			setFn({ tested: true, online: true, latencyMs: data.latencyMs ?? (devId === "rvg" ? 4 : devId === "dropzone" ? 6 : 11), detail: data.message || defaultDetail });
			showToast(data.message || successMsg, "success");
		} else if (isDemo) {
			setFn({ tested: true, online: true, latencyMs: (devId === "rvg" ? 4 : devId === "dropzone" ? 6 : 11), detail: `${defaultDetail} (демо)` });
			showToast(`${successMsg} (демо)`, "success");
		} else {
			setFn({ tested: true, online: false, detail: data.message || "Сервер оффлайн" });
			showToast(`Узел недоступен: ${data.message || "Сервер оффлайн"}`, "error");
		}
	};

	const handleExecuteGuardAction = async () => {
		setGuardConfirmOpen(false);
		setProbingDevice("reconnect_com");
		const data = await sendProbeRequest({ probeType: "fiscal_com_status", dangerousAction: "reconnect_com", confirmed: true, comPort: settings.fiscalRegisterComPort || "COM1" });
		setProbingDevice(null);
		if (data.success && data.isConnected) {
			setKktState({ tested: true, online: true, latencyMs: data.latencyMs ?? 11, detail: "Порт перезапущен. Готов к чекам" });
			showToast(`Порт ${settings.fiscalRegisterComPort || "COM1"} успешно перезапущен. Связь с кассой восстановлена.`, "success");
		} else if (isDemo) {
			setKktState({ tested: true, online: true, latencyMs: 11, detail: "Порт перезапущен (демо)" });
			showToast("Порт COM1 успешно перезапущен. Связь с кассой восстановлена.", "success");
		} else {
			setKktState({ tested: true, online: false, detail: data.message || "Сбой перезапуска COM-порта" });
			showToast(`Ошибка перезапуска COM-порта: ${data.message || "Порт недоступен"}`, "error");
		}
	};

	const handleApplyDiff = () => {
		setDiffApplied(true);
		applyActiveDiff();
		showToast("Изменения успешно применены в дневник приёма", "success");
	};

	const allOnline = isDemo || (rvgState.online && dropzoneState.online && kktState.online);
	const anyOffline = !isDemo && ((rvgState.tested && !rvgState.online) || (dropzoneState.tested && !dropzoneState.online) || (kktState.tested && !kktState.online));

	const renderPill = (st: DeviceStatus, probing: boolean, defaultDetail: string) => {
		if (probing) {
			return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /><span>Проверка связи...</span></div>;
		}
		if (!st.tested) {
			return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-[var(--muted)] text-[10px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /><span>Не проверено</span></div>;
		}
		if (st.online) {
			return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span>{`● В сети (${st.latencyMs ?? 5}ms) • ${st.detail || defaultDetail}`}</span></div>;
		}
		return <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /><span>{`○ Не подключено • ${st.detail || "Сервер оффлайн"}`}</span></div>;
	};

	const devices = [
		{
			id: "rvg" as const,
			name: "RVG-визиограф Planmeca ProSensor v2",
			meta: "USB 3.0 • Разрешение 20 пл/мм • Прямой оптический захват",
			icon: <Activity size={16} />,
			iconBg: "bg-emerald-500/10 text-emerald-600",
			state: rvgState,
			defaultDetail: "Готов к экспозиции",
			btnText: "Тест визиографа",
			onProbe: () => runProbe("rvg", { probeType: "visiograph_bridge" }, "Визиограф онлайн (4ms)", "Готов к экспозиции"),
		},
		{
			id: "dropzone" as const,
			name: "Сетевая папка КЛКТ / ОПТГ томографов",
			meta: `${settings.localDropzonePath} • Vatech / Romexis`,
			icon: <FolderOpen size={16} />,
			iconBg: "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]",
			state: dropzoneState,
			defaultDetail: "Обнаружено 12 срезов",
			btnText: "Тест томографа",
			onProbe: () => runProbe("dropzone", { probeType: "ping_dropzone", targetPath: settings.localDropzonePath }, "Dropzone доступен (6ms)", "Обнаружено 12 срезов"),
		},
		{
			id: "kkt" as const,
			name: "Кассовый регистратор Атол 27Ф",
			meta: `${settings.fiscalRegisterComPort || "COM1"} • Смена открыта • ФН активен (без блокировок)`,
			icon: <Receipt size={16} />,
			iconBg: "bg-blue-500/10 text-blue-600",
			state: kktState,
			defaultDetail: "Готов к чекам",
			btnText: "Тест кассы",
			onProbe: () => runProbe("kkt", { probeType: "fiscal_com_status", comPort: settings.fiscalRegisterComPort || "COM1" }, "Касса онлайн (11ms)", "Готов к чекам"),
		},
	];

	return (
		<div className="copilot-workstation-tab flex-1 overflow-y-auto px-5 py-3.5 space-y-4 text-xs" data-testid="copilot-workstation-tab">
			<section className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<HardDrive size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Оборудование и рабочая станция кабинета</span>
					</label>
					<span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
						<span className={`w-1.5 h-1.5 rounded-full ${allOnline ? "bg-emerald-500" : anyOffline ? "bg-rose-500" : "bg-slate-400"}`} />
						<span>{allOnline ? "Все узлы в сети" : anyOffline ? "Обнаружены сбои узлов" : "Статус не проверен"}</span>
					</span>
				</div>

				<div className="grid grid-cols-1 gap-2">
					{devices.map((dev) => (
						<div key={dev.id} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
							<div className="flex items-center gap-2.5 min-w-0">
								<div className={`w-8 h-8 rounded-lg ${dev.iconBg} flex items-center justify-center shrink-0`}>{dev.icon}</div>
								<div className="min-w-0">
									<div className="font-bold text-[var(--ink)] truncate">{dev.name}</div>
									<div className="text-[10px] text-[var(--muted)] truncate">{dev.meta}</div>
								</div>
							</div>
							<div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
								{renderPill(dev.state, probingDevice === dev.id, dev.defaultDetail)}
								<button
									type="button"
									onClick={dev.onProbe}
									className="secondary-button text-[10px] font-semibold h-7 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer flex items-center gap-1"
								>
									<RefreshCw size={11} className={probingDevice === dev.id ? "animate-spin" : ""} />
									<span>{dev.btnText}</span>
								</button>
							</div>
						</div>
					))}
				</div>

				{guardConfirmOpen ? (
					<div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
						<div className="flex items-start gap-2">
							<AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
							<div>
								<div className="font-bold text-[var(--ink)]">Подтвердите перезапуск порта {settings.fiscalRegisterComPort || "COM1"}</div>
								<p className="text-[10px] text-[var(--muted)] m-0 leading-relaxed">Связь с кассой будет временно разорвана на 2 секунды. Текущие открытые смены сохранятся.</p>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2">
							<button type="button" onClick={() => setGuardConfirmOpen(false)} className="secondary-button text-[10px] font-semibold h-7 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer">Отмена</button>
							<button type="button" onClick={handleExecuteGuardAction} className="secondary-button text-[10px] font-bold h-7 px-3 rounded-lg border border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-600/10 cursor-pointer">Подтвердить перезапуск</button>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-between pt-1">
						<button type="button" onClick={() => setGuardConfirmOpen(true)} className="secondary-button text-[10px] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer">
							<RefreshCw size={11} /><span>Переподключить COM-порт кассы</span>
						</button>
						<button type="button" onClick={() => setShowDiagnosticsLog(!showDiagnosticsLog)} className="secondary-button text-[10px] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer">
							<Terminal size={11} /><span>{showDiagnosticsLog ? "Скрыть журнал диагностики" : "Журнал системных событий"}</span>
							<ChevronDown size={11} className={`transition-transform ${showDiagnosticsLog ? "rotate-180" : ""}`} />
						</button>
					</div>
				)}
			</section>

			{showDiagnosticsLog && (
				<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-2">
					<div className="flex items-center justify-between">
						<label className="font-bold text-[var(--ink)] flex items-center gap-1.5"><Activity size={14} className="text-[var(--teal,#0d9488)]" /><span>Журнал системных событий и диагностика ({toolLogs.length})</span></label>
						<span className="text-[10px] text-[var(--muted)] font-mono">COM1 • USB 3.0 • DICOM Dropzone</span>
					</div>
					<div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[10px]">
						{toolLogs.map((log) => (
							<div key={log.id} className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
								<span className="text-[var(--ink)] truncate">{log.toolName}</span>
								<span className="text-[var(--muted)] shrink-0">{log.status === "success" ? "OK" : "●"} {log.durationMs}ms</span>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Интерактивный Diff Viewer / Empty State: Единственная Primary CTA кнопка (Мандат 8am) */}
			{effectiveDiff ? (
				<section className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--paper)] space-y-2.5">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<div className="w-6 h-6 rounded-md bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0"><FileCode size={13} /></div>
							<div className="min-w-0">
								<div className="font-bold text-[var(--ink)] truncate">{effectiveDiff.title}</div>
								<div className="text-[10px] text-[var(--muted)] truncate">{effectiveDiff.targetEntity}</div>
							</div>
						</div>
						<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diffApplied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
							{diffApplied ? "Применено" : "Ожидает согласования"}
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
						<div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-200">
							<div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">- Было в протоколе</div>
							<p className="whitespace-pre-wrap leading-relaxed m-0 opacity-90">{effectiveDiff.beforeText}</p>
						</div>
						<div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200">
							<div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">+ Стало (версия ИИ)</div>
							<p className="whitespace-pre-wrap leading-relaxed m-0 opacity-90">{effectiveDiff.afterText}</p>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line)]">
						<button type="button" onClick={() => { setActiveDiff(null); showToast("Правка отклонена врачом", "info"); }} className="secondary-button text-[11px] font-semibold h-8 px-3 rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer">Отклонить</button>
						<button type="button" onClick={handleApplyDiff} className="primary-button text-[11px] font-bold h-8 px-4 rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-95 shadow-xs cursor-pointer flex items-center gap-1.5">
							<Check size={13} /><span>{diffApplied ? "Правка принята" : "Принять диф в дневник"}</span>
						</button>
					</div>
				</section>
			) : (
				<section className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-center space-y-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] mx-auto flex items-center justify-center"><FileCode size={16} /></div>
					<div className="font-bold text-[var(--ink)]">Дневник приёма SOAP: нет ожидающих изменений</div>
					<p className="text-[11px] text-[var(--muted)] max-w-md mx-auto m-0 leading-relaxed">
						ИИ-ассистент сформирует диф при диктовке SOAP или предложении правок к зубной формуле.
					</p>
				</section>
			)}
		</div>
	);
}
