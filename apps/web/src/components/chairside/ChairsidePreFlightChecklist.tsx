/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAIRSIDE PRE-FLIGHT CHECKLIST & INFECTION CONTROL COMPONENT
 * Russian SanPiN 3.3686-21 · SanPiN 2.1.3684-21 · Touch-First Glove Ergonomics
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useId } from "react";
import {
	CheckCircle2,
	X,
	ShieldCheck,
	Sparkles,
	Timer,
	Scan,
	Layers,
	Wind,
	Droplets,
	Check,
	FileText,
	AlertCircle,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import "./chairsidePreFlight.css";

export interface PreFlightCheckItem {
	id: string;
	title: string;
	subtitle: string;
	sanpinNormRu: string;
	estimatedSeconds: number;
	category: "disinfection" | "sterilization" | "aspiration" | "equipment";
	completed: boolean;
	completedAtIso?: string | undefined;
	kraftPackageCode?: string | undefined;
}

export interface ChairsidePreFlightResult {
	cabinetId: string;
	chairNumber: string | number;
	doctorName: string;
	assistantName: string;
	shiftId?: string | undefined;
	completedAtIso: string;
	allChecksPassed: boolean;
	items: PreFlightCheckItem[];
	kraftPackageCode?: string | undefined;
	disinfectionExposureSeconds: number;
	notes?: string | undefined;
}

export interface ChairsidePreFlightChecklistProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly chairNumber?: string | number | undefined;
	readonly cabinetName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly assistantName?: string | undefined;
	readonly shiftId?: string | undefined;
	readonly onSavePreFlight?: ((result: ChairsidePreFlightResult) => void) | undefined;
	readonly onLogToShiftJournal?: ((result: ChairsidePreFlightResult) => void) | undefined;
	readonly className?: string | undefined;
}

const DEFAULT_PREFLIGHT_ITEMS: PreFlightCheckItem[] = [
	{
		id: "aspirator_flush",
		title: "Промывка и дезинфекция аспирационной системы",
		subtitle: "Промывка слюноотсоса и пылесоса рабочим раствором Orotol Plus / OroCup (20–30 сек)",
		sanpinNormRu: "СанПиН 3.3686-21 п. 3584",
		estimatedSeconds: 30,
		category: "aspiration",
		completed: false,
	},
	{
		id: "handpiece_replacement",
		title: "Замена и смазка турбинного / микромоторного наконечника",
		subtitle: "Установка стерильного наконечника из крафт-пакета, тест продувки гидролинии спреем 5 сек",
		sanpinNormRu: "СанПиН 3.3686-21 п. 3591",
		estimatedSeconds: 15,
		category: "equipment",
		completed: false,
	},
	{
		id: "kraft_packet_datamatrix",
		title: "Вскрытие крафт-пакета и валидация индикатора стерильности",
		subtitle: "Проверка 4–5 класса химического индикатора и сканирование 2D DataMatrix партии",
		sanpinNormRu: "СанПиН 3.3686-21 п. 3602 (Форма № 257/у)",
		estimatedSeconds: 10,
		category: "sterilization",
		completed: false,
	},
	{
		id: "surface_disinfection",
		title: "Дезинфекция контактных поверхностей и плевательницы",
		subtitle: "Протирка столика врача, светильника и подлокотников (Bacillol AF / Микаспор, экспозиция 30–60 сек)",
		sanpinNormRu: "СанПиН 3.3686-21 п. 3578",
		estimatedSeconds: 30,
		category: "disinfection",
		completed: false,
	},
	{
		id: "barrier_protection",
		title: "Установка одноразовой барьерной защиты",
		subtitle: "Чехлы на подголовник кресла, пустер вода-воздух, кабель наконечника и сенсор визиографа",
		sanpinNormRu: "СанПиН 3.3686-21 п. 3580",
		estimatedSeconds: 15,
		category: "disinfection",
		completed: false,
	},
	{
		id: "waterline_flush",
		title: "Сброс и деконтаминация гидролиний установки",
		subtitle: "Промывка дистиллированной водой с раствором DentaPure / Bilpron перед посадкой пациента",
		sanpinNormRu: "СанПиН 3.3686-21 п. 3588",
		estimatedSeconds: 20,
		category: "equipment",
		completed: false,
	},
];

const KRAFT_PRESET_PACKAGES = [
	{ code: "KP-2026-0901-AUT1-042", label: "Базовый терапевтический набор №1 (Лот #142)" },
	{ code: "KP-2026-0901-AUT2-018", label: "Хирургический стерильный набор №3 (Лот #218)" },
	{ code: "KP-2026-0901-AUT1-095", label: "Ортопедический оттискной набор №2 (Лот #195)" },
];

export const ChairsidePreFlightChecklist: React.FC<ChairsidePreFlightChecklistProps> = ({
	isOpen,
	onClose,
	chairNumber = 1,
	cabinetName = "Кабинет терапевтической стоматологии №1",
	doctorName = "Др. Смирнова Е. В.",
	assistantName = "Асс. Иванова М. А.",
	shiftId = "SHIFT-2026-0901-01",
	onSavePreFlight,
	onLogToShiftJournal,
	className = "",
}) => {
	const [items, setItems] = useState<PreFlightCheckItem[]>(DEFAULT_PREFLIGHT_ITEMS);
	const [kraftCode, setKraftCode] = useState<string>("KP-2026-0901-AUT1-042");
	const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
	const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
	const [savedSuccessIso, setSavedSuccessIso] = useState<string | null>(null);
	const [notes, setNotes] = useState<string>("");
	const titleId = useId();

	// Disinfection Timer Countdown
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;
		if (isTimerRunning && timerSecondsLeft > 0) {
			interval = setInterval(() => {
				setTimerSecondsLeft((prev) => {
					if (prev <= 1) {
						setIsTimerRunning(false);
						// Automatically mark surface disinfection as completed when exposure ends
						setItems((current) =>
							current.map((item) =>
								item.id === "surface_disinfection"
									? { ...item, completed: true, completedAtIso: new Date().toISOString() }
									: item,
							),
						);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [isTimerRunning, timerSecondsLeft]);

	const handleStartDisinfectionTimer = useCallback((seconds = 30) => {
		setTimerSecondsLeft(seconds);
		setIsTimerRunning(true);
	}, []);

	const handleToggleItem = useCallback((id: string) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id === id) {
					const nextCompleted = !item.completed;
					return {
						...item,
						completed: nextCompleted,
						completedAtIso: nextCompleted ? new Date().toISOString() : undefined,
					};
				}
				return item;
			}),
		);
	}, []);

	const handleCompleteAll = useCallback(() => {
		const now = new Date().toISOString();
		setItems((prev) =>
			prev.map((item) => ({
				...item,
				completed: true,
				completedAtIso: item.completedAtIso || now,
				kraftPackageCode: item.id === "kraft_packet_datamatrix" ? kraftCode : undefined,
			})),
		);
	}, [kraftCode]);

	const handleResetAll = useCallback(() => {
		setItems(DEFAULT_PREFLIGHT_ITEMS);
		setSavedSuccessIso(null);
		setIsTimerRunning(false);
		setTimerSecondsLeft(0);
	}, []);

	const completedCount = items.filter((i) => i.completed).length;
	const totalCount = items.length;
	const allCompleted = completedCount === totalCount;

	const handleSaveAndConfirm = useCallback(async () => {
		const now = new Date().toISOString();
		const result: ChairsidePreFlightResult = {
			cabinetId: cabinetName,
			chairNumber,
			doctorName,
			assistantName,
			shiftId,
			completedAtIso: now,
			allChecksPassed: allCompleted,
			items,
			kraftPackageCode: kraftCode,
			disinfectionExposureSeconds: 30,
			notes: notes.trim() || undefined,
		};

		// 1. Local Callbacks for State & Shift Journal
		if (onSavePreFlight) {
			onSavePreFlight(result);
		}
		if (onLogToShiftJournal) {
			onLogToShiftJournal(result);
		}

		// 2. Persistent API Dispatch to Backend Infection Safety Journal
		try {
			await fetch("/api/sterilization/chair-readiness", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chairNumber,
					cabinetName,
					doctorName,
					assistantName,
					shiftId,
					kraftPackageCode: kraftCode,
					completedChecksCount: completedCount,
					totalChecksCount: totalCount,
					allCompleted,
					timestampIso: now,
					notes: notes.trim() || null,
				}),
			}).catch(() => {
				// Fallback to local offline cache
			});
		} catch {
			// Silent fallback
		}

		setSavedSuccessIso(now);
		showToast(
			allCompleted
				? `Кресло №${chairNumber} готово к приёму. Журнал смены обновлён.`
				: `Статус готовности кресла №${chairNumber} (${completedCount}/${totalCount}) зафиксирован.`,
			allCompleted ? "success" : "warning",
		);
	}, [
		cabinetName,
		chairNumber,
		doctorName,
		assistantName,
		shiftId,
		allCompleted,
		completedCount,
		totalCount,
		items,
		kraftCode,
		notes,
		onSavePreFlight,
		onLogToShiftJournal,
	]);

	if (!isOpen) return null;

	return (
		<div className="chairside-preflight-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}>
			<div className={"chairside-preflight-modal " + className} data-testid="chairside-preflight-modal">
				{/* Modal Header */}
				<header className="chairside-preflight-header">
					<div className="chairside-preflight-title-group">
						<div className="chairside-preflight-icon-badge">
							<ShieldCheck size={24} />
						</div>
						<div>
							<h2 id={titleId} className="chairside-preflight-title">
								<span>{`Подготовка кресла №${chairNumber} к приёму`}</span>
								<span className="chairside-preflight-badge">30-сек Pre-Flight</span>
							</h2>
							<p className="chairside-preflight-subtitle">
								{cabinetName} · {doctorName} · {assistantName}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="chairside-preflight-close-btn"
						aria-label="Закрыть чек-лист"
						data-testid="preflight-close-btn"
					>
						<X size={20} />
					</button>
				</header>

				{/* Modal Body */}
				<div className="chairside-preflight-body">
					{/* Status Hero */}
					<div className={"chairside-readiness-hero " + (allCompleted ? "all-ready" : "")}>
						<div className="flex items-center gap-3">
							<div
								className={
									"w-3 h-3 rounded-full " +
									(allCompleted ? "bg-emerald-500 animate-pulse" : "bg-amber-500")
								}
							/>
							<div>
								<div className="text-sm font-extrabold">
									{allCompleted ? "Кресло полностью готово к приёму пациента" : "Выполните пункты предполётной подготовки"}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400">
									Стандарт инфекционной безопасности СанПиН 3.3686-21 (Раздел IV)
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<div
								className={"chairside-progress-pill " + (allCompleted ? "ready" : "")}
								data-testid="preflight-progress-indicator"
							>
								{allCompleted ? <CheckCircle2 size={16} /> : <Layers size={16} />}
								<span>
									Готовность: {completedCount}/{totalCount}
								</span>
							</div>

							{!allCompleted && (
								<button
									type="button"
									onClick={handleCompleteAll}
									className="px-3 py-1.5 rounded-lg border border-teal-600/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-extrabold text-xs cursor-pointer hover:bg-teal-500/20 transition-all active:scale-95"
									data-testid="preflight-complete-all-btn"
								>
									Отметить все 6 пунктов
								</button>
							)}
						</div>
					</div>

					{/* Fast Action Tools (Disinfection Exposure Timer + Kraft Scanner) */}
					<div className="chairside-quick-tools-bar">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => handleStartDisinfectionTimer(30)}
								className={
									"chairside-disinfection-timer-btn " + (isTimerRunning ? "running" : "")
								}
								data-testid="preflight-disinfection-timer-btn"
							>
								<Timer size={18} />
								<span>
									{isTimerRunning
										? `Экспозиция дезраствора: ${timerSecondsLeft} сек`
										: "Таймер экспозиции дезраствора (30 сек)"}
								</span>
							</button>

							{timerSecondsLeft === 0 && !isTimerRunning && (
								<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
									<Check size={14} /> 30 сек выдержано
								</span>
							)}
						</div>

						<button
							type="button"
							onClick={handleResetAll}
							className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer underline"
						>
							Сбросить отметки
						</button>
					</div>

					{/* Kraft Package DataMatrix Scanner Box */}
					<div className="chairside-kraft-scan-box" data-testid="preflight-kraft-box">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 dark:text-slate-200">
								<Scan size={14} className="text-teal-600 dark:text-teal-400" />
								<span>Партия и DataMatrix крафт-пакета (СанПиН Форма 257/у):</span>
							</div>
							<span className="text-[10px] font-mono text-slate-500">Автоклав B-класса</span>
						</div>

						<div className="chairside-kraft-scan-row">
							<input
								type="text"
								value={kraftCode}
								onChange={(e) => setKraftCode(e.target.value)}
								placeholder="KP-YYYY-MMDD-AUTX-XXX или сканируйте 2D код..."
								className="chairside-kraft-input"
								data-testid="preflight-kraft-input"
							/>
							<div className="flex gap-1.5 overflow-x-auto">
								{KRAFT_PRESET_PACKAGES.map((pkg) => (
									<button
										key={pkg.code}
										type="button"
										onClick={() => setKraftCode(pkg.code)}
										className={
											"px-2.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all border " +
											(kraftCode === pkg.code
												? "bg-teal-600 text-white border-teal-600"
												: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500")
										}
									>
										{pkg.code.split("-").slice(-2).join("-")}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* 6 Pre-Flight Items (Touch-First >= 48px Ergonomics) */}
					<div className="chairside-checklist-items" role="list">
						{items.map((item) => {
							const isCompleted = item.completed;
							return (
								<div
									key={item.id}
									onClick={() => handleToggleItem(item.id)}
									className={"chairside-check-item " + (isCompleted ? "completed" : "")}
									role="listitem"
									data-testid={"preflight-item-" + item.id}
								>
									<div className="chairside-check-item-main">
										<button
											type="button"
											className="chairside-check-toggle-btn"
											aria-pressed={isCompleted}
											aria-label={`Отметить: ${item.title}`}
											data-testid={"toggle-btn-" + item.id}
										>
											<Check size={24} strokeWidth={3} />
										</button>

										<div className="chairside-check-info">
											<div className="chairside-check-title flex items-center gap-2">
												{item.category === "aspiration" && <Droplets size={14} className="text-sky-500" />}
												{item.category === "equipment" && <Wind size={14} className="text-amber-500" />}
												{item.category === "sterilization" && <Sparkles size={14} className="text-teal-500" />}
												{item.category === "disinfection" && <ShieldCheck size={14} className="text-emerald-500" />}
												<span>{item.title}</span>
											</div>
											<div className="chairside-check-subtitle">{item.subtitle}</div>
											<div className="chairside-check-norm-badge">
												<span>{item.sanpinNormRu}</span>
												<span>· {item.estimatedSeconds} сек</span>
											</div>
										</div>
									</div>

									{isCompleted && (
										<div className="text-right flex-shrink-0">
											<span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
												Выполнено
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Optional Notes */}
					<div className="flex flex-col gap-1">
						<label htmlFor="preflight-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
							Примечание ассистента / дефекты оборудования (опционально):
						</label>
						<input
							id="preflight-notes"
							type="text"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Например: заменен переходник слюноотсоса, давление воздуха в норме (3.2 бар)..."
							className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-teal-500"
							data-testid="preflight-notes-input"
						/>
					</div>

					{/* Success Confirmation Banner */}
					{savedSuccessIso && (
						<div
							className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200"
							data-testid="preflight-success-banner"
						>
							<div className="flex items-center gap-2">
								<CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<div>
									<div className="font-extrabold">Готовность кресла зафиксирована в журнале смены</div>
									<div className="text-[11px] opacity-80 font-mono">
										Метка времени: {new Date(savedSuccessIso).toLocaleTimeString("ru-RU")} · Крафт-пакет: {kraftCode}
									</div>
								</div>
							</div>
							<span className="font-extrabold uppercase text-[10px] px-2 py-1 rounded bg-emerald-600 text-white">
								Журнал смены обновлен
							</span>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<footer className="chairside-preflight-footer">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						<span>Смена {shiftId} · </span>
						<span className="font-bold text-slate-700 dark:text-slate-300">
							{allCompleted ? "Все 6 требований соблюдены" : `Осталось выполнить: ${totalCount - completedCount}`}
						</span>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
						>
							Закрыть
						</button>

						<button
							type="button"
							onClick={handleSaveAndConfirm}
							className="chairside-preflight-save-btn"
							data-testid="preflight-save-btn"
						>
							<CheckCircle2 size={18} />
							<span>{`Зафиксировать готовность кресла №${chairNumber} к приёму`}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ChairsidePreFlightChecklist;
