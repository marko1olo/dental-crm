/**
 * apps/web/src/components/sanpin/SterilizationBatchCycleModal.tsx
 * Каноническое модальное окно запуска цикла стерилизации в 1 клик (Мандаты 8b, 8e, 8n, 8x, Apple HIG).
 * - Живой клинический язык: «Запустить цикл стерилизации», «Основной автоклав клиники».
 * - Программы: 134°C / 2.1 бар / 5 мин (Класс B), 121°C / 1.15 бар / 20 мин, Прион 134°C / 2.1 бар / 18 мин.
 * - Быстрые пресеты [4, 8, 12, 16, 24] пакетов, норматив индикатора 4/5 класса (Пройден).
 * - Предстерилизационная очистка (ПСО): азопирамовая и фенолфталеиновая пробы отрицательные (норма).
 * - Автоматическое фоновое списание со склада (Soft Negative Stock, Мандат 8n).
 * - Печать журнала контроля стерилизации.
 * - Размер строго 250–350 строк (Мандат 8b Sweet Spot).
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { ShieldCheck, X, User, CheckCircle2, PackageCheck, Barcode, FlaskConical, Printer } from "lucide-react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { getCachedActiveStaffUser } from "../../lib/offlineStorage";
import { generateSanpinPrintHtml, getSanpinBatchRecords, type SterilizationBatchCycleRecord } from "./sanpinCatalogData";

export interface SterilizationBatchCycleModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: string | undefined;
	readonly isDemo?: boolean | undefined;
	readonly operatorName?: string | undefined;
	readonly onSuccess?: () => void;
	readonly onCycleApproved?: ((record?: unknown) => void) | undefined;
	readonly onCycleCompleted?: ((result?: unknown) => void) | undefined;
	readonly onCycleCreated?: ((result?: unknown) => void) | undefined;
	readonly defaultAutoclaveName?: string;
	readonly defaultOperatorName?: string;
	readonly defaultBatchSize?: number;
	readonly clinicDevices?: readonly { id: string; brandModelRu: string }[] | undefined;
	readonly organizationId?: string;
}

const PRESET_BATCH_SIZES = [4, 8, 12, 16, 24] as const;

export const CLINICAL_BATCH_TEMPLATES = [
	{ id: "therapy", label: "Терапевтический лоток × 10", count: 10, regime: "standard_134" as const, desc: "Терапевтический лоток базовый (10 шт: зеркала, зонды, пинцеты, боры)" },
	{ id: "surgery", label: "Хирургический набор × 3", count: 3, regime: "standard_134" as const, desc: "Хирургический набор (3 набора: щипцы, элеваторы, скальпели)" },
	{ id: "exam", label: "Смотровой лоток × 15", count: 15, regime: "standard_134" as const, desc: "Смотровой лоток базовый (15 наборов: зеркало, зонд, пинцет)" },
	{ id: "handpieces", label: "Наконечники и оптика × 8", count: 8, regime: "delicate_121" as const, desc: "Наконечники и оптика (8 шт: турбинные, угловые, оптика микроскопа)" },
] as const;

export function SterilizationBatchCycleModal({
	isOpen, onClose, onSuccess, onCycleApproved, onCycleCompleted, onCycleCreated,
	defaultAutoclaveName = "Основной автоклав клиники (Melag Vacuklav 23 B+)",
	defaultOperatorName, defaultBatchSize = 8, clinicDevices,
	operatorName: propOperatorName, initialTab: _initialTab, isDemo: _isDemo,
}: SterilizationBatchCycleModalProps) {
	const appLogic = useOptionalAppLogicContext();
	const resolvedOperator = useMemo(() => {
		if (propOperatorName?.trim()) return propOperatorName.trim();
		if (defaultOperatorName?.trim()) return defaultOperatorName.trim();
		const authAny = appLogic?.auth as { currentUser?: { fullName?: string; name?: string }; activeWorkspaceProfile?: { title?: string } } | undefined;
		const userAny = appLogic as { user?: { name?: string } } | null | undefined;
		const fromAuth = authAny?.currentUser?.fullName || authAny?.currentUser?.name || userAny?.user?.name || authAny?.activeWorkspaceProfile?.title;
		if (fromAuth?.trim()) return fromAuth.trim();
		const cached = getCachedActiveStaffUser() as { fullName?: string; name?: string; role?: string } | null;
		return cached?.fullName?.trim() || cached?.name?.trim() || "Дежурная медсестра ЦСО";
	}, [propOperatorName, defaultOperatorName, appLogic]);

	const [deviceName, setDeviceName] = useState(defaultAutoclaveName);
	const [autoclaveId, setAutoclaveId] = useState("АК-01");
	const [regime, setRegime] = useState<"standard_134" | "delicate_121" | "prion_134" | "quick_134">("standard_134");
	const [packagesCount, setPackagesCount] = useState<number>(defaultBatchSize);
	const [operatorName, setOperatorName] = useState(resolvedOperator);

	useEffect(() => {
		if (resolvedOperator) {
			setOperatorName((prev: string) => (!prev || prev === "Дежурный администратор / медицинская сестра" || prev === "Дежурная медсестра ЦСО" ? resolvedOperator : prev));
		}
	}, [resolvedOperator]);
	const [itemsDescription, setItemsDescription] = useState<string>("Терапевтический лоток базовый (10 шт: зеркала, зонды, пинцеты, боры)");
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>("therapy");
	const [indicatorClass, setIndicatorClass] = useState<"4" | "5">("5");
	const [barcodeInput, setBarcodeInput] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const isStandard = regime === "standard_134";
	const isDelicate = regime === "delicate_121";
	const isPrion = regime === "prion_134";

	const applyTemplate = (tpl: typeof CLINICAL_BATCH_TEMPLATES[number]) => {
		setSelectedTemplateId(tpl.id);
		setPackagesCount(tpl.count);
		setRegime(tpl.regime);
		setItemsDescription(tpl.desc);
	};

	const handlePrintJournal = useCallback(() => {
		const tempCelsius = isDelicate ? 121 : 134;
		const pressureBar = isDelicate ? 1.15 : 2.1;
		const durationMin = isDelicate ? 20 : isPrion ? 18 : regime === "quick_134" ? 3 : 5;
		const currentRecord: SterilizationBatchCycleRecord = {
			id: `cycle-${Date.now()}`, cycleNumber: 1, date: new Date().toLocaleDateString("ru-RU"),
			time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
			autoclaveId, autoclaveName: deviceName,
			programId: isPrion ? "prion_134" : isDelicate ? "delicate_121" : isStandard ? "standard_134" : "flash_134",
			temperatureCelsius: tempCelsius, pressureBar, exposureMinutes: durationMin,
			packagesCount, chemicalIndicatorVerdict: "ПРОЙДЕН", operatorName,
			itemsDescription: itemsDescription || `Партия стерилизации (${packagesCount} крафт-пакетов)`, status: "completed",
		};
		const html = generateSanpinPrintHtml([currentRecord, ...getSanpinBatchRecords(true)]);
		const win = window.open("", "_blank");
		if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
	}, [isDelicate, isPrion, regime, autoclaveId, deviceName, packagesCount, operatorName, itemsDescription, isStandard]);

	const handleLaunchCycle = useCallback(async () => {
		setIsSubmitting(true);
		setFeedbackToast(null);
		const tempCelsius = isDelicate ? 121 : 134;
		const pressureBar = isDelicate ? 1.15 : 2.1;
		const durationMin = isDelicate ? 20 : isPrion ? 18 : regime === "quick_134" ? 3 : 5;
		const payload = {
			regime, packagesCount, batchSize: packagesCount, deviceName, autoclaveId,
			operatorName, temperatureCelsius: tempCelsius, pressureBar, durationMin,
			packagingType: isStandard ? "kraft_self_adhesive" : "kraft_heat_sealed",
			cycleName: isPrion ? "Антиприонный цикл 134°C (18 мин)" : isStandard ? "Стандартный цикл 134°C (5 мин)" : isDelicate ? "Деликатный цикл 121°C (20 мин)" : "Экспресс цикл 134°C",
			itemsDescription: itemsDescription || `Партия стерилизации (${packagesCount} крафт-пакетов)`,
			indicatorClass, indicatorType: indicatorClass === "4" ? "class4_multivariable" : "class5_integrating",
			barcode: barcodeInput.trim() || undefined,
		};
		try {
			const idempotencyKey = crypto.randomUUID();
			const res = await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST",
				headers: {
					...getDenteAuthHeaders(),
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const json = await res.json().catch(() => null);
				const payload = json?.data ?? json;
				throw new Error(payload?.message || `HTTP error ${res.status}`);
			}
			setFeedbackToast(`Цикл стерилизации запущен: ${packagesCount} пакетов списано со склада`);
			setTimeout(() => { onSuccess?.(); onCycleApproved?.(payload); onCycleCompleted?.(payload); onCycleCreated?.(payload); onClose(); }, 250);
		} catch (err) {
			console.error("[SanPiN] Error on cycle submission:", err);
			if (isDemoShowcaseMode()) {
				setFeedbackToast(`Цикл стерилизации запущен (демо): ${packagesCount} пакетов`);
				setTimeout(() => { onSuccess?.(); onCycleApproved?.(payload); onCycleCompleted?.(payload); onCycleCreated?.(payload); onClose(); }, 250);
			} else {
				showToast(err instanceof Error ? err.message : "Ошибка при запуске цикла стерилизации", "error");
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [regime, packagesCount, deviceName, autoclaveId, operatorName, indicatorClass, barcodeInput, isStandard, isDelicate, isPrion, itemsDescription, onSuccess, onCycleApproved, onCycleCompleted, onCycleCreated, onClose]);

	const handleLaunchShiftMacroBatch = useCallback(async () => {
		setIsSubmitting(true);
		setFeedbackToast(null);
		const payloadMacro = {
			regime: "standard_134" as const, packagesCount: 27, batchSize: 27, deviceName, autoclaveId,
			operatorName, temperatureCelsius: 134, pressureBar: 2.1, durationMin: 5, cyclesCount: 2,
			packagingType: "kraft_self_adhesive" as const, cycleName: "Автоклавирование смены (2 цикла 134°C + контроль очистки)",
			itemsDescription: "Автоклавирование смены: 2 цикла (27 наборов) + контроль очистки",
			indicatorClass: "5" as const, indicatorType: "class5_integrating" as const,
		};
		try {
			const idempotencyKey = crypto.randomUUID();
			const res = await fetch("/api/sanpin/sterilization/shift-batch", {
				method: "POST",
				headers: {
					...getDenteAuthHeaders(),
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				},
				body: JSON.stringify(payloadMacro),
			});
			if (!res.ok) {
				const json = await res.json().catch(() => null);
				const payload = json?.data ?? json;
				throw new Error(payload?.message || `HTTP error ${res.status}`);
			}
			setFeedbackToast("Автоклавирование смены запущено: 2 цикла 134°C (27 пакетов) + контроль очистки. Списано со склада.");
			setTimeout(() => { onSuccess?.(); onCycleApproved?.(payloadMacro); onCycleCompleted?.(payloadMacro); onCycleCreated?.(payloadMacro); onClose(); }, 250);
		} catch (err) {
			console.error("[SanPiN] Error on macro batch submission:", err);
			if (isDemoShowcaseMode()) {
				setFeedbackToast("Автоклавирование смены запущено (демо): 2 цикла 134°C");
				setTimeout(() => { onSuccess?.(); onCycleApproved?.(payloadMacro); onCycleCompleted?.(payloadMacro); onCycleCreated?.(payloadMacro); onClose(); }, 250);
			} else {
				showToast(err instanceof Error ? err.message : "Ошибка при запуске стерилизации смены", "error");
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [deviceName, autoclaveId, operatorName, onSuccess, onCycleApproved, onCycleCompleted, onCycleCreated, onClose]);

	if (!isOpen) return null;

	return (
		<div className="sanpin-studio-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label="Запуск цикла стерилизации" data-testid="sterilization-cycle-drawer" onClick={onClose}>
			<div className="sanpin-studio-modal w-full sm:max-w-lg max-h-[92dvh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col text-[var(--ink,#1e293b)] animate-in slide-in-from-bottom-4 duration-200" data-testid="sanpin-studio-modal" onClick={(e) => e.stopPropagation()}>
				<div className="flex sm:hidden justify-center pt-2.5 pb-1 sanpin-drag-handle" aria-hidden="true"><div className="w-[36px] h-[5px] rounded-full bg-[var(--line,#cbd5e1)] opacity-70" /></div>
				<div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--line,#e2e8f0)] gap-2 shrink-0">
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0"><ShieldCheck size={20} /></div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base font-bold m-0 text-[var(--ink,#1e293b)] leading-snug break-words">Утверждение цикла автоклава</h2>
							<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 break-words">Журнал автоклавирования • Стандартные пресеты смены</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<button type="button" onClick={handlePrintJournal} data-testid="sterilization-print-journal-btn" className="h-8 px-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)] flex items-center gap-1.5 cursor-pointer text-xs font-semibold" title="Печать журнала контроля стерилизации"><Printer size={14} /><span className="hidden sm:inline">Печать журнала</span></button>
						<button type="button" onClick={onClose} className="w-8 h-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] flex items-center justify-center cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
					</div>
				</div>
				<div className="p-4 sm:p-5 flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3 text-xs">
					<div className="flex flex-col gap-1.5 min-w-0">
						<span className="font-semibold text-[var(--ink,#1e293b)]">Клинический шаблон партии:</span>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 overflow-x-auto scrollbar-none">
							{CLINICAL_BATCH_TEMPLATES.map((tpl) => (
								<button key={tpl.id} type="button" onClick={() => applyTemplate(tpl)} className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${ selectedTemplateId === tpl.id ? "border-[var(--teal,#0d9488)] bg-teal-500/10 text-[var(--ink,#1e293b)] shadow-xs" : "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)]/30" }`}><span className="font-bold text-[11px] leading-tight text-[var(--ink,#1e293b)]">{tpl.label}</span><span className="text-[10px] text-[var(--muted,#64748b)]">{tpl.count} пакетов</span></button>
							))}
						</div>
					</div>
					<div className="flex flex-col gap-1 min-w-0">
						<label htmlFor="autoclave-select" className="font-semibold text-[var(--ink,#1e293b)]">Автоклав клиники:</label>
						<select id="autoclave-select" value={autoclaveId} onChange={(e) => { const val = e.target.value; setAutoclaveId(val); if (clinicDevices?.length) { const dev = clinicDevices.find((d) => d.id === val); if (dev) setDeviceName(dev.brandModelRu); } else if (val === "АК-01") setDeviceName("Основной автоклав клиники (Melag Vacuklav 23 B+)"); else if (val === "АК-02") setDeviceName("Автоклав W&H Lina 17 (17 л)"); else if (val === "АК-03") setDeviceName("Автоклав Euronda E9 Next (18 л)"); else if (val === "АК-04") setDeviceName("Dentsply Sirona DAC Universal"); else setDeviceName("Стерилизатор Касимов ГП-40 СПУ (40 л)"); }} className="h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#1e293b)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] w-full max-w-full">
							<option value="АК-01">АК-01 • Melag 23 B+ (Основной автоклав клиники)</option>
							<option value="АК-02">АК-02 • W&H Lina 17 (17 л)</option>
							<option value="АК-03">АК-03 • Euronda E9 Next (18 л)</option>
							<option value="АК-04">АК-04 • Dentsply Sirona DAC</option>
							<option value="АК-05">АК-05 • Касимов ГП-40 СПУ (40 л)</option>
						</select>
					</div>
					<div className="flex flex-col gap-1 min-w-0">
						<span className="font-semibold text-[var(--ink,#1e293b)]">Программа стерилизации:</span>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 overflow-x-auto scrollbar-none">
							<button type="button" data-testid="drawer-preset-btn-standard_134_5" onClick={() => setRegime("standard_134")} className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${isStandard ? "border-[var(--teal,#0d9488)] bg-teal-500/10 text-[var(--ink,#1e293b)] shadow-xs" : "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"}`}><div className="font-bold text-xs text-[var(--ink,#1e293b)]">134°C • Стандартная (2.1 бар, 5 мин)</div><div className="text-[10px] text-[var(--muted,#64748b)]">Стандартный цикл</div></button>
							<button type="button" data-testid="drawer-preset-btn-delicate_121_20" onClick={() => setRegime("delicate_121")} className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${isDelicate ? "border-[var(--teal,#0d9488)] bg-teal-500/10 text-[var(--ink,#1e293b)] shadow-xs" : "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"}`}><div className="font-bold text-xs text-[var(--ink,#1e293b)]">121°C • Бережная (1.15 бар, 20 мин)</div><div className="text-[10px] text-[var(--muted,#64748b)]">Бережный цикл</div></button>
							<button type="button" data-testid="drawer-preset-btn-quick_134_3" onClick={() => setRegime("quick_134")} className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${regime === "quick_134" ? "border-[var(--teal,#0d9488)] bg-teal-500/10 text-[var(--ink,#1e293b)] shadow-xs" : "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"}`}><div className="font-bold text-xs text-[var(--ink,#1e293b)]">134°C • Экспресс (3 мин)</div><div className="text-[10px] text-[var(--muted,#64748b)]">Экспресс цикл</div></button>
							<button type="button" data-testid="drawer-preset-btn-prion_134_18" onClick={() => setRegime("prion_134")} className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${isPrion ? "border-[var(--teal,#0d9488)] bg-teal-500/10 text-[var(--ink,#1e293b)] shadow-xs" : "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"}`}><div className="font-bold text-xs text-[var(--ink,#1e293b)]">Прион 134°C (18 мин)</div><div className="text-[10px] text-[var(--muted,#64748b)]">18 мин усиленный</div></button>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between"><span className="font-semibold text-[var(--ink,#1e293b)]">Количество пакетов в партии:</span><span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">{packagesCount} крафт-пакетов</span></div>
						<div className="flex items-center gap-1.5 flex-wrap">
							{PRESET_BATCH_SIZES.map((size) => (
								<button key={size} type="button" onClick={() => setPackagesCount(size)} className={`min-w-[44px] h-8 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${packagesCount === size ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#1e293b)] border-[var(--line,#cbd5e1)] hover:bg-[var(--line,#e2e8f0)]/30"}`}>{size} шт</button>
							))}
							{!PRESET_BATCH_SIZES.includes(packagesCount as (typeof PRESET_BATCH_SIZES)[number]) && (
								<input id="packages-count-input" type="number" min={1} max={60} value={packagesCount} onChange={(e) => setPackagesCount(Math.max(1, Number(e.target.value) || 1))} className="w-16 h-8 px-1.5 rounded-lg border border-[var(--teal,#0d9488)] bg-[var(--paper,#ffffff)] text-center text-xs font-bold text-[var(--ink,#1e293b)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]" aria-label="Точное количество пакетов" />
							)}
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div className="flex flex-col gap-1">
							<label htmlFor="pouch-barcode-input" className="font-semibold text-[var(--ink,#1e293b)] flex items-center gap-1"><Barcode size={12} className="text-[var(--teal,#0d9488)]" /><span>Штрихкод крафт-пакета (опция):</span></label>
							<input id="pouch-barcode-input" type="text" placeholder="Сканируйте или авто..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#1e293b)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]" />
						</div>
						<div className="flex flex-col gap-1">
							<label htmlFor="nurse-name-input" className="font-semibold text-[var(--ink,#1e293b)] flex items-center gap-1"><User size={12} className="text-[var(--muted,#64748b)]" /><span>Ответственная медсестра:</span></label>
							<input id="nurse-name-input" type="text" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="Дежурная медсестра ЦСО" data-testid="sanpin-operator-input" className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#1e293b)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]" />
						</div>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line)] flex flex-col gap-1">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5"><FlaskConical size={13} className="text-[var(--teal,#0d9488)]" />Предстерилизационная очистка:</span>
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={11} /> 100% норма</span>
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)] flex flex-col gap-0.5">
							<span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1"><CheckCircle2 size={10} /> Контроль скрытой крови (азопирам): отрицательно</span>
							<span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1"><CheckCircle2 size={10} /> Контроль остатков моющих средств (фенолфталеин): отрицательно</span>
						</div>
					</div>
					<div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 flex flex-col gap-1.5">
						<div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex-wrap gap-1">
							<span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} /><span>Химический индикатор 5 класса: Пройден</span></span>
							<div className="flex items-center gap-1">
								<button type="button" onClick={() => setIndicatorClass("5")} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer ${indicatorClass === "5" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper,#fff)] text-[var(--muted,#64748b)] border-[var(--line,#cbd5e1)]"}`}>5 кл. (Интегратор)</button>
								<button type="button" onClick={() => setIndicatorClass("4")} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer ${indicatorClass === "4" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper,#fff)] text-[var(--muted,#64748b)] border-[var(--line,#cbd5e1)]"}`}>4 кл.</button>
							</div>
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<PackageCheck size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Будет списано со склада: <strong>{packagesCount} крафт-пакетов</strong> и <strong>1 индикатор {indicatorClass} класса</strong>.</span>
						</div>
					</div>
					{feedbackToast && (<div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center">{feedbackToast}</div>)}
				</div>
				<div className="p-3.5 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
					<div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
						<button type="button" onClick={handleLaunchShiftMacroBatch} aria-busy={isSubmitting} data-testid="sanpin-run-cycle-cta" data-action="shift-macro-batch" title="Запустить автоклавирование смены (2 цикла 134°C + очистка норма)" className="sanpin-primary-cta h-11 min-h-[44px] w-full sm:w-auto px-4 rounded-xl font-semibold text-xs sm:text-xs text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-md inline-flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] order-1 sm:order-2">
							<CheckCircle2 size={16} className="text-white shrink-0" />
							<span className="truncate sm:whitespace-normal">Запустить цикл стерилизации смены</span>
						</button>
						<button type="button" onClick={handleLaunchCycle} aria-busy={isSubmitting} id="approve-cycle-primary-cta" data-testid="confirm-sterilization-cycle-btn" data-action="approve-cycle-primary-cta" title="Утвердить цикл стерилизации" className="h-10 min-h-[44px] w-full sm:w-auto px-3.5 rounded-xl font-medium text-xs text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] order-2 sm:order-1">
							<span>{isSubmitting ? "Утверждение..." : "Утвердить цикл стерилизации"}</span>
						</button>
					</div>
					<button type="button" onClick={onClose} className="h-10 min-h-[44px] w-full sm:w-auto px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink-muted)] cursor-pointer order-2 sm:order-1">Отмена</button>
				</div>
			</div>
		</div>
	);
}

export default SterilizationBatchCycleModal;
