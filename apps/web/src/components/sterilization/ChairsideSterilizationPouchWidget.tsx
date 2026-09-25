/**
 * ============================================================================
 * CHAIRSIDE STERILIZATION POUCH WIDGET (СанПиН 3.3686-21 & Форма 043/у)
 * Компактный виджет фиксации вскрытия крафт-пакетов стерилизации у кресла:
 * - 1-клик ввод номера/штрихкода вскрытого крафт-пакета (например «КП-0925-14»).
 * - Контроль индикатора стерильности 4–5 класса («Индикатор сработал: розовый -> коричневый, стерильно»).
 * - Параметры автоклава B-класса D-типа (режим 134°C, 2.1 бар, 5 мин, дата/смена).
 * - Вставка в текст дневника 043/у: «Стерильный лоток №КП-0925-14 вскрыт в присутствии пациента, индикатор 5 класса сработал».
 * - Сквозная криптографическая связь с электронным журналом контроля стерилизации (Форма 257/у).
 * Эргономика: высота кнопки 28–32px, раскрывающийся компактный поповер, нулевое загромождение экрана врача.
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import {
	ShieldCheck,
	Check,
	CheckCircle2,
	ChevronDown,
	X,
	FileText,
	Clock,
	Sparkles,
} from "lucide-react";
import {
	type ChairsidePouchRecord,
	type ChemicalIndicatorClass,
	type ChairsideTrayKind,
	createChairsidePouchRecord,
	generateChairsidePouchCode,
	normalizeChairsidePouchCode,
	insertPouchIntoDiaryText,
	CHAIRSIDE_TRAY_PRESETS,
	DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS,
} from "@dental/shared";

export interface ChairsideSterilizationPouchWidgetProps {
	/** Коллбэк при привязке или вставке записи в дневник */
	readonly onInsertToDiary?: ((diarySnippet: string, record: ChairsidePouchRecord) => void) | undefined;
	/** Текущий текст дневника приёма (для автоматического обновления) */
	readonly currentDiaryText?: string | undefined;
	/** Обработчик обновления полного текста дневника */
	readonly onUpdateDiaryText?: ((updatedDiaryText: string) => void) | undefined;
	/** Начальный номер крафт-пакета (по умолчанию генерируется КП-{MMDD}-14) */
	readonly defaultPouchCode?: string | undefined;
	/** Дополнительный CSS-класс контейнера */
	readonly className?: string | undefined;
	/** Отключена ли кнопка */
	readonly disabled?: boolean | undefined;
}

export const ChairsideSterilizationPouchWidget: React.FC<ChairsideSterilizationPouchWidgetProps> = ({
	onInsertToDiary,
	currentDiaryText = "",
	onUpdateDiaryText,
	defaultPouchCode,
	className = "",
	disabled = false,
}) => {
	const popoverId = useId();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	// Дата сегодняшней смены (YYYY-MM-DD)
	const todayDate = new Date();
	const todayIso = todayDate.toISOString().slice(0, 10);

	// Локальное состояние параметров крафт-пакета
	const initialCode = defaultPouchCode || generateChairsidePouchCode(todayDate, 14);
	const [pouchCodeInput, setPouchCodeInput] = useState<string>(initialCode);
	const [activeTrayKind, setActiveTrayKind] = useState<ChairsideTrayKind>("therapeutic");
	const [indicatorClass, setIndicatorClass] = useState<ChemicalIndicatorClass>(5);
	const [indicatorPassed, setIndicatorPassed] = useState<boolean>(true);
	const [openedInPresence, setOpenedInPresence] = useState<boolean>(true);
	const [shiftName, setShiftName] = useState<string>("Смена 1 (утро)");
	const [cycleNumber, setCycleNumber] = useState<number>(1);
	const [justAttached, setJustAttached] = useState<boolean>(false);
	const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

	// Проверяем, привязан ли уже данный крафт-пакет в текущем тексте дневника (деривативное состояние для мгновенного SSR и реактивности)
	const cleanCode = normalizeChairsidePouchCode(pouchCodeInput);
	const isAttached = Boolean(cleanCode && currentDiaryText.includes(cleanCode)) || justAttached;

	// Закрытие по клику вне поповера и по клавише Escape
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		const handlePointerDown = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handlePointerDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handlePointerDown);
		};
	}, [isOpen]);

	// Генерация текущей записи
	const currentRecord = useCallback(() => {
		return createChairsidePouchRecord({
			customCode: pouchCodeInput,
			trayKind: activeTrayKind,
			indicatorClass,
			indicatorPassed,
			openedInPresenceOfPatient: openedInPresence,
			autoclaveParams: {
				shiftName,
				cycleNumber,
				dateIso: todayIso,
			},
			referenceDate: todayIso,
		});
	}, [pouchCodeInput, activeTrayKind, indicatorClass, indicatorPassed, openedInPresence, shiftName, cycleNumber, todayIso]);

	// 1-клик вставка стандартной записи в дневник карты Формы 043/у
	const handleInsertStatutorySnippet = useCallback(() => {
		const record = currentRecord();
		const snippet = record.statutoryDiarySnippet;

		onInsertToDiary?.(snippet, record);

		if (onUpdateDiaryText) {
			const updated = insertPouchIntoDiaryText(currentDiaryText, snippet, record.pouchCode);
			onUpdateDiaryText(updated);
		}

		setJustAttached(true);
		setCopiedFeedback(true);
		setTimeout(() => setCopiedFeedback(false), 2000);
		setIsOpen(false);
	}, [currentRecord, onInsertToDiary, onUpdateDiaryText, currentDiaryText]);

	// Вставка полной развернутой записи с параметрами автоклава B-класса
	const handleInsertFullSnippet = useCallback(() => {
		const record = currentRecord();
		const fullText = record.formattedDiaryText043;

		onInsertToDiary?.(fullText, record);

		if (onUpdateDiaryText) {
			const updated = insertPouchIntoDiaryText(currentDiaryText, fullText, record.pouchCode);
			onUpdateDiaryText(updated);
		}

		setJustAttached(true);
		setCopiedFeedback(true);
		setTimeout(() => setCopiedFeedback(false), 2000);
		setIsOpen(false);
	}, [currentRecord, onInsertToDiary, onUpdateDiaryText, currentDiaryText]);

	// Быстрый выбор стандартного набора
	const handleSelectPreset = (trayKind: ChairsideTrayKind) => {
		setActiveTrayKind(trayKind);
		const preset = CHAIRSIDE_TRAY_PRESETS.find((p) => p.trayKind === trayKind);
		if (preset) {
			const mm = String(todayDate.getMonth() + 1).padStart(2, "0");
			const dd = String(todayDate.getDate()).padStart(2, "0");
			setPouchCodeInput(`КП-${mm}${dd}-${preset.defaultSuffix}`);
		}
	};

	const recordSnapshot = currentRecord();

	return (
		<div className={`relative inline-block ${className}`} ref={popoverRef}>
			{/* ── КНОПКА ВИДЖЕТА (ВЫСОТА 28–32px, МЕДИЦИНСКАЯ ПЛОТНОСТЬ) ── */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				disabled={disabled}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-controls={popoverId}
				data-testid="btn-chairside-pouch-widget"
				title="Крафт-пакет СанПиН 3.3686-21: стерильный лоток у кресла (Форма 043/у, Форма 257/у)"
				className={`min-h-[28px] h-7 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs select-none ${
					isAttached
						? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-400/50"
						: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
				}`}
			>
				<ShieldCheck
					className={`w-3.5 h-3.5 shrink-0 ${isAttached ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--teal)]"}`}
					aria-hidden="true"
				/>
				<span className="font-mono text-[11px] font-bold">
					{normalizeChairsidePouchCode(pouchCodeInput) || "КП-0925-14"}
				</span>
				{isAttached ? (
					<span
						className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.2 bg-emerald-600 text-white rounded font-bold uppercase tracking-tight"
						title="Стерильный лоток зафиксирован в карте 043/у"
					>
						043/у
					</span>
				) : (
					<span className="hidden xl:inline text-[11px] text-[var(--muted)]">
						Стерильно
					</span>
				)}
				<ChevronDown
					className={`w-3 h-3 text-[var(--muted)] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
					aria-hidden="true"
				/>
			</button>

			{/* ── РАСКРЫВАЮЩИЙСЯ КОМПАКТНЫЙ ПОПОВЕР (0 ЗАГРОМОЖДЕНИЯ) ── */}
			{isOpen && (
				<div
					id={popoverId}
					role="dialog"
					aria-label="Фиксация крафт-пакета стерилизации СанПиН 3.3686-21"
					data-testid="chairside-pouch-popover"
					className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 w-[340px] sm:w-[380px] p-3 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-xl space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-100"
				>
					{/* Шапка поповера */}
					<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
						<div className="flex items-center gap-1.5 min-w-0">
							<ShieldCheck className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<div className="min-w-0">
								<h4 className="font-bold text-xs text-[var(--ink)] m-0 leading-tight">
									Крафт-пакет стерилизации
								</h4>
								<span className="text-[10px] text-[var(--muted)] leading-none block">
									СанПиН 3.3686-21 • Индикатор 4–5 класса
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							data-testid="btn-close-chairside-pouch"
							className="p-1 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer border-none bg-transparent"
							aria-label="Закрыть панель крафт-пакета"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Быстрые чипы готовых лотков */}
					<div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
						{CHAIRSIDE_TRAY_PRESETS.map((preset) => (
							<button
								key={preset.trayKind}
								type="button"
								onClick={() => handleSelectPreset(preset.trayKind)}
								data-testid={`btn-tray-preset-${preset.trayKind}`}
								className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
									activeTrayKind === preset.trayKind
										? "bg-[var(--teal)] text-white border-[var(--teal)]"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
								}`}
							>
								{preset.shortLabelRu}
							</button>
						))}
					</div>

					{/* Поле 1-клик ввода номера / штрихкода крафт-пакета */}
					<div className="space-y-1">
						<div className="flex items-center justify-between">
							<label
								htmlFor="chairside-pouch-code-input"
								className="text-[11px] font-bold text-[var(--ink)]"
							>
								Номер / штрихкод пакета:
							</label>
							<span className="text-[10px] text-[var(--muted)]">
								Годен до: {recordSnapshot.expDateIso}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<input
								id="chairside-pouch-code-input"
								type="text"
								value={pouchCodeInput}
								onChange={(e) => setPouchCodeInput(e.target.value)}
								placeholder="КП-0925-14 или ШК"
								data-testid="input-chairside-pouch-code"
								className="flex-1 min-h-[30px] h-7.5 px-2 font-mono text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
							/>
							<button
								type="button"
								onClick={() => {
									const fresh = generateChairsidePouchCode(new Date(), Math.floor(Math.random() * 80) + 1);
									setPouchCodeInput(fresh);
								}}
								title="Сгенерировать следующий регламентный номер лотка"
								className="min-h-[30px] h-7.5 px-2 text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] border border-[var(--line)] rounded-lg cursor-pointer transition-colors"
							>
								Новый КП
							</button>
						</div>
					</div>

					{/* Контроль химического индикатора 4–5 класса */}
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-bold text-[var(--ink)]">
								Химический индикатор:
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setIndicatorClass(5)}
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
										indicatorClass === 5
											? "bg-teal-600 text-white border-teal-600"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
									}`}
								>
									5 класс (Интегратор)
								</button>
								<button
									type="button"
									onClick={() => setIndicatorClass(4)}
									className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
										indicatorClass === 4
											? "bg-teal-600 text-white border-teal-600"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
									}`}
								>
									4 класс
								</button>
							</div>
						</div>

						{/* Визуальный статус сработки индикатора (розовый -> коричневый, стерильно) */}
						<div className="flex items-center justify-between gap-2 p-1.5 rounded bg-[var(--paper)] border border-[var(--line)]">
							<div className="flex items-center gap-2 min-w-0">
								{/* Цветовой индикатор образца */}
								<div className="flex items-center gap-0.5 shrink-0" title="Цветовой переход индикатора">
									<span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block shadow-2xs" />
									<span className="text-[9px] text-[var(--muted)] font-mono">→</span>
									<span className="w-2.5 h-2.5 rounded-full bg-amber-950 inline-block shadow-2xs" />
								</div>
								<span
									data-testid="pouch-indicator-status-text"
									className={`text-[11px] font-medium leading-tight truncate ${
										indicatorPassed
											? "text-emerald-700 dark:text-emerald-300 font-semibold"
											: "text-rose-600 dark:text-rose-400 font-bold"
									}`}
								>
									{indicatorPassed
										? "Индикатор сработал: розовый -> коричневый, стерильно"
										: "Индикатор НЕ сработал: брак!"}
								</span>
							</div>

							<button
								type="button"
								onClick={() => setIndicatorPassed((v) => !v)}
								data-testid="btn-toggle-indicator-passed"
								className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer border transition-colors shrink-0 ${
									indicatorPassed
										? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
										: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
								}`}
							>
								{indicatorPassed ? "Стерильно" : "Брак"}
							</button>
						</div>
					</div>

					{/* Параметры автоклава B-класса D-типа */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
							<span>Автоклав B-класса D-типа:</span>
							<span className="font-mono text-[10px] text-[var(--ink)]">
								{DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS.autoclaveCode} (134°C, 2.1 бар, 5 мин)
							</span>
						</div>
						<div className="grid grid-cols-2 gap-1.5 text-[10px]">
							<div className="p-1 rounded bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between">
								<span className="text-[var(--muted)]">Смена:</span>
								<select
									value={shiftName}
									onChange={(e) => setShiftName(e.target.value)}
									className="bg-transparent border-none text-[var(--ink)] font-semibold p-0 text-[10px] focus:outline-none cursor-pointer"
								>
									<option value="Смена 1 (утро)">1 (утро)</option>
									<option value="Смена 2 (вечер)">2 (вечер)</option>
								</select>
							</div>
							<div className="p-1 rounded bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between">
								<span className="text-[var(--muted)]">Цикл:</span>
								<select
									value={cycleNumber}
									onChange={(e) => setCycleNumber(Number(e.target.value))}
									className="bg-transparent border-none text-[var(--ink)] font-semibold p-0 text-[10px] focus:outline-none cursor-pointer"
								>
									<option value={1}>№1</option>
									<option value={2}>№2</option>
									<option value={3}>№3</option>
									<option value={4}>№4</option>
								</select>
							</div>
						</div>
					</div>

					{/* Связка с Журналом 257/у */}
					<div className="flex items-center justify-between p-1.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[10px]">
						<div className="flex items-center gap-1.5 min-w-0">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
							<span className="text-[var(--ink)] font-semibold truncate">
								Журнал 257/у: {recordSnapshot.form257Link.recordId}
							</span>
						</div>
						<span className="text-[var(--muted)] font-mono text-[9px] shrink-0">
							{recordSnapshot.form257Link.digitalStampHash.slice(0, 16)}...
						</span>
					</div>

					{/* Чекбоксы СанПиН (вскрыт в присутствии пациента) */}
					<div className="flex items-center justify-between pt-0.5">
						<label className="flex items-center gap-1.5 text-[11px] text-[var(--ink)] cursor-pointer select-none">
							<input
								type="checkbox"
								checked={openedInPresence}
								onChange={(e) => setOpenedInPresence(e.target.checked)}
								className="rounded border-[var(--line)] text-teal-600 focus:ring-teal-500"
							/>
							<span>Вскрыт в присутствии пациента</span>
						</label>
					</div>

					{/* Превью генерируемой записи */}
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-mono text-[10.5px] text-[var(--ink)] leading-snug break-words">
						{recordSnapshot.statutoryDiarySnippet}
					</div>

					{/* Кнопки вставки в дневник 043/у (высота 30-32px) */}
					<div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]">
						<button
							type="button"
							onClick={handleInsertStatutorySnippet}
							data-testid="btn-insert-pouch-to-043"
							className="flex-1 min-h-[30px] h-8 px-3 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-98 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
						>
							<Check className="w-3.5 h-3.5" />
							<span>Вставить в 043/у (1 клик)</span>
						</button>

						<button
							type="button"
							onClick={handleInsertFullSnippet}
							title="Вставить развернутый протокол с параметрами автоклава и штампом 257/у"
							data-testid="btn-insert-full-pouch-to-043"
							className="min-h-[30px] h-8 px-2.5 text-xs font-semibold rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer"
						>
							Развернуто
						</button>
					</div>

					{copiedFeedback && (
						<div className="text-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
							Запись успешно зафиксирована в Форме 043/у
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ChairsideSterilizationPouchWidget;
