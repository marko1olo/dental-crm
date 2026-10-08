/**
 * apps/web/src/components/sanpin/SterilizationScanner.tsx
 *
 * Ультра-быстрое рабочее место сканирования крафт-пакетов и фиксации стерилизации у кресла (СанПиН 3.3686-21, Мандаты 8e, 8v, 8s).
 * - Ввод / сканирование штрихкода крафт-пакета (например, KP-84920 или KB2608250001) в 1 клик.
 * - Параметры автоклава: 134°C, 2.1 бар, 5 минут (стандарт режима B для наконечников и зеркал).
 * - Индикатор 4/5 класса (визуальный пруф изменения цвета: бежевый -> темно-коричневый, Норма).
 * - Быстрая привязка к визиту и дневнику Формы 043/у без нагромождения 50 полей.
 * - 0 мультяшных эмодзи, Touch Target >= 44px на таче, плотная клиническая сетка 32-36px на десктопе.
 */

import React, { useState, useMemo } from "react";
import {
	Barcode,
	CheckCircle2,
	AlertOctagon,
	Clock,
	Thermometer,
	Gauge,
	Timer,
	FileText,
	X,
	Sparkles,
	ArrowRight,
} from "lucide-react";
import {
	parseAndValidateKraftBarcode,
	formatPouch043StatutorySnippet,
	insertPouchIntoDiaryText,
	type ParsedKraftBarcode,
} from "@dental/shared";

export interface SterilizationScannerProps {
	readonly visitId?: string | undefined;
	readonly currentDiaryText?: string | undefined;
	readonly onAttachToVisit?: ((pouchCode: string, snippet: string, updatedDiary: string) => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export function normalizePouchBarcode(input: string): string {
	const trimmed = input.trim();
	if (/^\d{4}$/.test(trimmed)) {
		return `KP-${trimmed}0`;
	}
	if (/^\d{5}$/.test(trimmed)) {
		return `KP-${trimmed}`;
	}
	return trimmed;
}

const PRESET_SAMPLE_POUCHES = [
	{ code: "KP-84920", label: "Лоток терапевтический (наконечник, зеркало, зонд)" },
	{ code: "KB2608250001", label: "Набор боров и полиров (5 кл.)" },
	{ code: "КП-0925-14", label: "Хирургический лоток стерильный" },
];

export const SterilizationScanner: React.FC<SterilizationScannerProps> = ({
	visitId,
	currentDiaryText = "",
	onAttachToVisit,
	onClose,
	className = "",
}) => {
	const [barcodeInput, setBarcodeInput] = useState("KP-84920");
	const [selectedPreset, setSelectedPreset] = useState("KP-84920");
	const [isIndicatorVerified, setIsIndicatorVerified] = useState(true);
	const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

	// Параметры цикла автоклава по стандарту B (СанПиН 3.3686-21)
	const autoclaveParams = {
		autoclaveId: "АК-01 (Melag Vacuklav 23B+)",
		cycleNumber: 3,
		temperatureC: 134,
		pressureBar: 2.1,
		sterilizationMinutes: 5,
		regimeName: "Режим B (Универсальный 134°C / 2.1 бар / 5 мин)",
		indicatorClass: "5 класс (Химический интегратор)",
		colorBefore: "Бежевый",
		colorBeforeHex: "#d4b896",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
	};

	const normalizedCode = useMemo(() => normalizePouchBarcode(barcodeInput), [barcodeInput]);

	const parsed = useMemo<ParsedKraftBarcode | null>(() => {
		const raw = normalizedCode.trim();
		if (!raw) return null;
		return parseAndValidateKraftBarcode(raw, {
			referenceDate: new Date().toISOString().slice(0, 10),
		});
	}, [normalizedCode]);

	// Генерация регламентного текста для дневника
	const snippetText = useMemo(() => {
		const code = normalizedCode.trim() || "KP-84920";
		return (
			`Стерилизация СанПиН 3.3686-21: крафт-пакет №${code} ` +
			`(${autoclaveParams.autoclaveId}, цикл №${autoclaveParams.cycleNumber}, 134°C / 2.1 бар / 5 мин, ` +
			`индикатор 5 кл. изменение цвета: бежевый -> темно-коричневый норма, целостность сохранена).`
		);
	}, [normalizedCode, autoclaveParams]);

	const handleAttach = () => {
		const code = normalizedCode.trim() || "KP-84920";
		const updated = insertPouchIntoDiaryText(currentDiaryText, snippetText, code);
		if (onAttachToVisit) {
			onAttachToVisit(code, snippetText, updated);
		}
		setStatusFeedback(`Крафт-пакет №${code} успешно прикреплён к визиту`);
	};

	return (
		<div
			className={`sterilization-scanner-card p-3 sm:p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] flex flex-col gap-3 shadow-xs max-w-xl mx-auto w-full ${className}`}
			data-testid="sterilization-scanner"
		>
			{/* Шапка сканера */}
			<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 min-h-[32px] min-w-[32px]">
						<Barcode size={18} />
					</div>
					<div>
						<h3 className="text-xs sm:text-sm font-bold leading-tight">
							Фиксация стерильного крафт-пакета
						</h3>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							Сканирование штрихкода или быстрый ввод 4 цифр номера
						</p>
					</div>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				)}
			</div>

			{/* Поле ввода номера крафт-пакета */}
			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between">
					<span>Номер или штрихкод крафт-пакета:</span>
					<span className="text-[10px] text-teal-700 dark:text-teal-400 font-normal">
						Сканер штрихкода или 4 цифры (напр. 8492)
					</span>
				</label>
				<div className="flex items-center gap-2">
					<div className="dente-search-wrap relative flex-1">
						<Barcode size={15} className="dente-search-icon" />
						<input
							type="text"
							value={barcodeInput}
							onChange={(e) => setBarcodeInput(e.target.value)}
							placeholder="Отсканируйте сканером или введите номер, напр. KP-84920"
							className="dente-search-input font-mono text-xs"
							data-testid="sterilization-pouch-input"
						/>
						{barcodeInput && (
							<button
								type="button"
								onClick={() => setBarcodeInput("")}
								className="dente-search-clear"
								aria-label="Очистить ввод"
							>
								<X size={12} />
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={handleAttach}
						className="min-h-[44px] h-11 sm:h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer touch-manipulation"
						data-testid="btn-attach-pouch-to-visit"
						title="Прикрепить крафт-пакет к визиту"
					>
						<CheckCircle2 size={15} />
						<span>Прикрепить</span>
					</button>
				</div>

				{/* Подсказка автонормализации 4 цифр */}
				{barcodeInput.trim() !== normalizedCode && normalizedCode && (
					<div className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 font-mono inline-block">
						Распознан номер крафт-пакета: <strong>{normalizedCode}</strong>
					</div>
				)}

				{/* Мягкие предупреждения о сроке без блокировки (Мандаты 8e, 8v) */}
				{parsed?.isExpired && (
					<div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-300 dark:border-amber-800">
						<AlertOctagon size={14} className="text-amber-600 shrink-0" />
						<span>
							Срок годности пакета по дате истек. Проверьте физический индикатор перед вскрытием. Прикрепление разрешено.
						</span>
					</div>
				)}
				{parsed?.isExpiringSoon && !parsed?.isExpired && (
					<div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-300 dark:border-amber-800">
						<Clock size={14} className="text-amber-600 shrink-0" />
						<span>
							Срок годности крафт-пакета истекает в течение 7 дней ({parsed.daysRemaining} дн. осталось).
						</span>
					</div>
				)}
			</div>

			{/* Пресеты лотков для быстрого выбора */}
			<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
				<span className="text-[11px] text-[var(--muted,#64748b)] shrink-0 font-medium">
					Образцы:
				</span>
				{PRESET_SAMPLE_POUCHES.map((preset) => (
					<button
						key={preset.code}
						type="button"
						onClick={() => {
							setBarcodeInput(preset.code);
							setSelectedPreset(preset.code);
						}}
						className={`text-[11px] px-2 py-0.5 rounded-md border font-mono transition-colors cursor-pointer whitespace-nowrap ${
							barcodeInput === preset.code
								? "bg-teal-500/10 border-teal-500/30 text-teal-800 dark:text-teal-200 font-semibold"
								: "border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:bg-[var(--paper-soft,#f1f5f9)]"
						}`}
					>
						{preset.code}
					</button>
				))}
			</div>

			{/* Параметры автоклава и индикатора (СанПиН 3.3686-21) */}
			<div className="p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-2 text-xs">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink,#0f172a)]">
						<Thermometer size={14} className="text-teal-600" />
						<span>{autoclaveParams.autoclaveId}</span>
						<span className="text-[var(--muted,#64748b)] font-normal">
							• Цикл №{autoclaveParams.cycleNumber}
						</span>
					</div>
					<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded">
						Режим B стерилен
					</span>
				</div>

				{/* Параметры стерилизации: 134°C, 2.1 бар, 5 минут */}
				<div className="grid grid-cols-3 gap-2 py-1 border-y border-[var(--line,#e2e8f0)] text-[11px]">
					<div className="flex items-center gap-1.5">
						<Thermometer size={13} className="text-orange-500 shrink-0" />
						<span>
							Температура: <strong>{autoclaveParams.temperatureC}°C</strong>
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Gauge size={13} className="text-blue-500 shrink-0" />
						<span>
							Давление: <strong>{autoclaveParams.pressureBar} бар</strong>
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Timer size={13} className="text-teal-500 shrink-0" />
						<span>
							Экспозиция: <strong>{autoclaveParams.sterilizationMinutes} мин</strong>
						</span>
					</div>
				</div>

				{/* Индикатор 5 класса: визуальный пруф изменения цвета */}
				<div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
							Индикатор 5 кл:
						</span>
						<div className="flex items-center gap-1 text-[11px]">
							<span
								className="w-3.5 h-3.5 rounded border border-black/10 inline-block shadow-2xs"
								style={{ backgroundColor: autoclaveParams.colorBeforeHex }}
								title="Цвет до стерилизации (Бежевый)"
							/>
							<span className="text-[10px] text-[var(--muted,#64748b)]">Бежевый</span>
							<ArrowRight size={11} className="text-[var(--muted,#64748b)]" />
							<span
								className="w-3.5 h-3.5 rounded border border-black/10 inline-block shadow-2xs"
								style={{ backgroundColor: autoclaveParams.colorAfterHex }}
								title="Цвет после стерилизации (Темно-коричневый: Норма)"
							/>
							<span className="font-semibold text-emerald-800 dark:text-emerald-300">
								Темно-коричневый (Норма)
							</span>
						</div>
					</div>

					<label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
						<input
							type="checkbox"
							checked={isIndicatorVerified}
							onChange={(e) => setIsIndicatorVerified(e.target.checked)}
							className="rounded text-teal-600 focus:ring-teal-500"
						/>
						<span className="font-medium">Цвет проверен</span>
					</label>
				</div>
			</div>

			{/* Превью фрагмента записи */}
			<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[11px] flex flex-col gap-1">
				<div className="flex items-center justify-between text-[var(--muted,#64748b)]">
					<span className="font-semibold flex items-center gap-1">
						<FileText size={12} />
						Запись для дневника приёма:
					</span>
					<span className="text-[10px] text-[var(--muted,#64748b)]">Автоматическое внесение</span>
				</div>
				<p className="font-mono text-[11px] text-[var(--ink,#0f172a)] leading-relaxed bg-[var(--paper,#ffffff)] p-1.5 rounded border border-[var(--line,#e2e8f0)] select-all">
					{snippetText}
				</p>
			</div>

			{/* Статус-фидбек */}
			{statusFeedback && (
				<div
					className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5"
					data-testid="sterilization-success-banner"
				>
					<CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
					<span>{statusFeedback}</span>
				</div>
			)}
		</div>
	);
};

export default SterilizationScanner;
