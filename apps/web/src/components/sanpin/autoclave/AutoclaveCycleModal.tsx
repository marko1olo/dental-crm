import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Flame,
	Clock,
	CheckCircle2,
	AlertTriangle,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";
import { AutoclaveIndicatorControl, type IndicatorClassType } from "./AutoclaveIndicatorControl";
import { getPackagingLabel } from "./types";

export interface AutoclaveCycleModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaveCycle?: (cycleData: {
		deviceId: string;
		deviceName: string;
		cycleDate: string;
		cycleTime: string;
		cycleNumber: number;
		temperatureCelsius: number;
		pressureBar: number;
		durationMin: number;
		packagingType: string;
		itemsDescription: string;
		packsCount: number;
		indicatorType: string;
		passedIndicator: boolean;
		operatorName: string;
		azopyramNegative: boolean;
		phenolphthaleinNegative: boolean;
		psoSampleCount: number;
		chamberPointsPassed: boolean;
	}) => void;
	readonly onCycleCreated?: () => void;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly defaultOperatorName?: string;
}

interface ChamberPoint {
	id: number;
	code: string;
	label: string;
	passed: boolean;
}

const DEFAULT_POINTS: ChamberPoint[] = [
	{ id: 1, code: "КТ-1", label: "Верхний передний правый угол", passed: true },
	{ id: 2, code: "КТ-2", label: "Нижний задний левый угол", passed: true },
	{ id: 3, code: "КТ-3", label: "Центр камеры (в толще)", passed: true },
	{ id: 4, code: "КТ-4", label: "Зона выхода конденсата", passed: true },
	{ id: 5, code: "КТ-5", label: "Верхняя задняя зона", passed: true },
];

export function AutoclaveCycleModal({
	isOpen,
	onClose,
	onSaveCycle,
	onCycleCreated,
	clinicDevices,
	defaultOperatorName = "Медсестра ЦСО",
}: AutoclaveCycleModalProps) {
	const [cycleDate, setCycleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [cycleTime, setCycleTime] = useState<string>(() => {
		const now = new Date();
		return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
	});
	const [cycleNumber, setCycleNumber] = useState<number>(1);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>(clinicDevices[0]?.id || "");
	const [regime, setRegime] = useState<"134" | "121" | "180">("134");
	const [packagingType, setPackagingType] = useState<string>("kraft_heat_sealed");
	const [itemsDescription, setItemsDescription] = useState<string>(
		"Хирургические и терапевтические наборы (лотки, элеваторы, наконечники)",
	);
	const [packsCount, setPacksCount] = useState<number>(10);
	const [indicatorType, setIndicatorType] = useState<IndicatorClassType>("class5_integrating");
	const [passedIndicator, setPassedIndicator] = useState<boolean>(true);
	const [chamberPoints, setChamberPoints] = useState<ChamberPoint[]>(DEFAULT_POINTS);
	const [azopyramNegative, setAzopyramNegative] = useState<boolean>(true);
	const [phenolphthaleinNegative, setPhenolphthaleinNegative] = useState<boolean>(true);
	const [psoSampleCount, setPsoSampleCount] = useState<number>(3);
	const [operatorName, setOperatorName] = useState<string>(defaultOperatorName);

	if (!isOpen) return null;

	const allPointsPassed = chamberPoints.every((p) => p.passed);
	const isCompliant = passedIndicator && allPointsPassed && azopyramNegative && phenolphthaleinNegative;

	const togglePoint = (id: number) => {
		setChamberPoints((prev) =>
			prev.map((p) => (p.id === id ? { ...p, passed: !p.passed } : p)),
		);
	};

	const handleFillNormIn1Click = () => {
		setPassedIndicator(true);
		setChamberPoints((prev) => prev.map((p) => ({ ...p, passed: true })));
		setAzopyramNegative(true);
		setPhenolphthaleinNegative(true);
		setPsoSampleCount(Math.max(3, Math.ceil(packsCount * 0.01)));
	};

	const handleSave = () => {
		const dev = clinicDevices.find((d) => d.id === selectedDeviceId) || clinicDevices[0];
		let temp = 134;
		let press = 2.1;
		let duration = 5;

		if (regime === "121") {
			temp = 121;
			press = 1.1;
			duration = 20;
		} else if (regime === "180") {
			temp = 180;
			press = 0.0;
			duration = 60;
		}

		onSaveCycle?.({
			deviceId: dev?.id || "default",
			deviceName: dev ? dev.brandModelRu : "Автоклав B-класса",
			cycleDate,
			cycleTime,
			cycleNumber,
			temperatureCelsius: temp,
			pressureBar: press,
			durationMin: duration,
			packagingType,
			itemsDescription,
			packsCount,
			indicatorType,
			passedIndicator,
			operatorName,
			azopyramNegative,
			phenolphthaleinNegative,
			psoSampleCount,
			chamberPointsPassed: allPointsPassed,
		});

		onCycleCreated?.();
		onClose();
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Фиксация цикла в журнале автоклавирования"
		>
			<div
				className="w-full max-w-xl max-h-[90dvh] sm:max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-2xl p-4 sm:p-6 flex flex-col gap-4 text-ink"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Mobile drag handle for Apple HIG */}
				<div className="flex sm:hidden justify-center pt-1 pb-1 -mt-1" aria-hidden="true">
					<div className="w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-[var(--teal,#0d9488)]">
							<ShieldCheck size={20} />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold m-0 leading-tight">
								Фиксация цикла в журнале автоклавирования
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								СанПиН 3.3686-21 • Предстерилизационная очистка и стерилизация
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleFillNormIn1Click}
							className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 cursor-pointer min-h-[44px] inline-flex items-center gap-1"
							title="Заполнить всеми нормативными параметрами"
						>
							<Sparkles size={13} />
							<span>Норма 100%</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="flex flex-col gap-3.5">
					{/* 1. Date, Time, Cycle Number */}
					<div className="grid grid-cols-3 gap-2">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)]">Дата цикла</label>
							<input
								type="date"
								required
								value={cycleDate}
								onChange={(e) => setCycleDate(e.target.value)}
								className="w-full text-xs font-semibold rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)]">Время цикла</label>
							<input
								type="time"
								required
								value={cycleTime}
								onChange={(e) => setCycleTime(e.target.value)}
								className="w-full text-xs font-semibold rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)]">№ за смену</label>
							<input
								type="number"
								min={1}
								max={30}
								required
								value={cycleNumber}
								onChange={(e) => setCycleNumber(parseInt(e.target.value, 10) || 1)}
								className="w-full text-xs font-bold rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							/>
						</div>
					</div>

					{/* 2. Device Selection */}
					<div className="flex flex-col gap-1">
						<label className="text-xs font-bold text-ink">Стерилизационный аппарат</label>
						<select
							value={selectedDeviceId}
							onChange={(e) => setSelectedDeviceId(e.target.value)}
							className="sanpin-select w-full text-xs font-semibold rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
						>
							{clinicDevices.length === 0 ? (
								<option value="">Автоклав Melag Vacuklav 23 B+ (По умолчанию)</option>
							) : (
								clinicDevices.map((d) => (
									<option key={d.id} value={d.id}>
										{d.brandModelRu} {d.serialNumber ? `(№${d.serialNumber})` : ""}
									</option>
								))
							)}
						</select>
					</div>

					{/* 3. Physical Regime Selector */}
					<div className="flex flex-col gap-1">
						<label className="text-xs font-bold text-ink">
							Параметры режима (T°, Давление, Экспозиция)
						</label>
						<div className="grid grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => setRegime("134")}
								className={`p-2 rounded-xl border text-left transition-all touch-manipulation min-h-[44px] ${
									regime === "134"
										? "border-[var(--teal,#0d9488)] bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-[var(--teal,#0d9488)]/20"
										: "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)]"
								}`}
							>
								<div className="flex items-center gap-1 font-bold text-xs text-ink">
									<Flame size={13} className="text-teal-600" />
									<span>134°C • 2.1 бар</span>
								</div>
								<span className="text-[10px] text-[var(--muted,#64748b)] block mt-0.5">
									5 мин • B-класс
								</span>
							</button>

							<button
								type="button"
								onClick={() => setRegime("121")}
								className={`p-2 rounded-xl border text-left transition-all touch-manipulation min-h-[44px] ${
									regime === "121"
										? "border-[var(--teal,#0d9488)] bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-[var(--teal,#0d9488)]/20"
										: "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)]"
								}`}
							>
								<div className="flex items-center gap-1 font-bold text-xs text-ink">
									<Clock size={13} className="text-sky-600" />
									<span>121°C • 1.1 бар</span>
								</div>
								<span className="text-[10px] text-[var(--muted,#64748b)] block mt-0.5">
									20 мин • Деликатный
								</span>
							</button>

							<button
								type="button"
								onClick={() => setRegime("180")}
								className={`p-2 rounded-xl border text-left transition-all touch-manipulation min-h-[44px] ${
									regime === "180"
										? "border-[var(--teal,#0d9488)] bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-[var(--teal,#0d9488)]/20"
										: "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)]"
								}`}
							>
								<div className="flex items-center gap-1 font-bold text-xs text-ink">
									<Flame size={13} className="text-amber-600" />
									<span>180°C • 0 бар</span>
								</div>
								<span className="text-[10px] text-[var(--muted,#64748b)] block mt-0.5">
									60 мин • Сухожар
								</span>
							</button>
						</div>
					</div>

					{/* 4. Pre-Sterilization Cleaning Control */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-ink">
								Контроль предстерилизационной очистки (СанПиН 3.3686-21)
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								Серия: АЗО-2026/08-114
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] cursor-pointer text-xs">
								<input
									type="checkbox"
									checked={azopyramNegative}
									onChange={(e) => setAzopyramNegative(e.target.checked)}
								/>
								<span className="font-semibold">
									Азопирам: {azopyramNegative ? "Отрицательно (норма)" : "Положительно (брак!)"}
								</span>
							</label>
							<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] cursor-pointer text-xs">
								<input
									type="checkbox"
									checked={phenolphthaleinNegative}
									onChange={(e) => setPhenolphthaleinNegative(e.target.checked)}
								/>
								<span className="font-semibold">
									Фенолфталеин: {phenolphthaleinNegative ? "Отрицательно (норма)" : "Положительно (брак!)"}
								</span>
							</label>
							<div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] text-xs">
								<span className="text-[var(--muted,#64748b)]">Выборка:</span>
								<input
									type="number"
									min={3}
									value={psoSampleCount}
									onChange={(e) => setPsoSampleCount(parseInt(e.target.value, 10) || 3)}
									className="w-14 p-1 rounded font-bold border border-[var(--line,#cbd5e1)] text-xs text-center"
								/>
								<span className="text-[10px] text-[var(--muted,#64748b)]">шт. (≥1%)</span>
							</div>
						</div>
					</div>

					{/* 5. Chemical Indicators & 5 Chamber Points */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between">
							<label className="text-xs font-bold text-ink">
								Химический термоконтроль (Индикаторы и 5 точек КТ-1..КТ-5)
							</label>
							<div className="flex gap-1">
								{(["class5_integrating", "class6_emulating", "bowie_dick"] as const).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setIndicatorType(t)}
										className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
											indicatorType === t
												? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
												: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted)] border border-[var(--line,#e2e8f0)]"
										}`}
									>
										{t === "class5_integrating" ? "Класс 5" : t === "class6_emulating" ? "Класс 6" : "B-Dick"}
									</button>
								))}
							</div>
						</div>
						<AutoclaveIndicatorControl
							indicatorType={indicatorType}
							passed={passedIndicator}
							onChange={(_, p) => setPassedIndicator(p)}
							showDetails={false}
						/>

						{/* 5 Chamber Points */}
						<div className="grid grid-cols-5 gap-1.5 mt-1">
							{chamberPoints.map((pt) => (
								<button
									key={pt.id}
									type="button"
									onClick={() => togglePoint(pt.id)}
									title={pt.label}
									className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer min-h-[40px] flex flex-col items-center justify-center ${
										pt.passed
											? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
											: "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
									}`}
								>
									<span className="text-xs font-bold">{pt.code}</span>
									<span className="text-[9px]">{pt.passed ? "Норма" : "Брак"}</span>
								</button>
							))}
						</div>
					</div>

					{/* 6. Packaging & Items */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-ink">Вид упаковки</label>
							<select
								value={packagingType}
								onChange={(e) => setPackagingType(e.target.value)}
								className="sanpin-select w-full text-xs font-semibold rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							>
								<option value="kraft_heat_sealed">{getPackagingLabel("kraft_heat_sealed")} (до 365 дн.)</option>
								<option value="kraft_self_adhesive">{getPackagingLabel("kraft_self_adhesive")} (до 50 дн.)</option>
								<option value="laminated_heat_sealed">{getPackagingLabel("laminated_heat_sealed")} (до 180 дн.)</option>
								<option value="bix_filter">{getPackagingLabel("bix_filter")} (до 20 дн.)</option>
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-ink">Количество упаковок (шт.)</label>
							<input
								type="number"
								min={1}
								max={200}
								value={packsCount}
								onChange={(e) => setPacksCount(Number(e.target.value) || 1)}
								className="w-full text-xs font-bold rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							/>
						</div>
					</div>

					{/* 7. Items Description */}
					<div className="flex flex-col gap-1">
						<label className="text-[11px] font-bold text-ink">Стерилизуемые изделия</label>
						<input
							type="text"
							value={itemsDescription}
							onChange={(e) => setItemsDescription(e.target.value)}
							className="w-full text-xs font-medium rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							placeholder="Наименования лотков, инструментов..."
						/>
					</div>

					{/* 8. Operator Name */}
					<div className="flex flex-col gap-1">
						<label className="text-[11px] font-bold text-ink">
							Ответственная медицинская сестра ЦСО
						</label>
						<input
							type="text"
							value={operatorName}
							onChange={(e) => setOperatorName(e.target.value)}
							className="w-full text-xs font-medium rounded-xl p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[40px]"
							placeholder="ФИО сотрудника..."
						/>
					</div>

					{/* Compliance Status Banner */}
					<div
						className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
							isCompliant
								? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200"
								: "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200"
						}`}
					>
						{isCompliant ? (
							<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
						) : (
							<AlertTriangle size={16} className="text-red-600 shrink-0" />
						)}
						<span>
							{isCompliant
								? "Параметры цикла, термоиндикаторы и пробы очистки соответствуют нормам. Партия стерильна."
								: "ВНИМАНИЕ: Нарушение параметров! Инструменты подлежат браковке и повторной стерилизации."}
						</span>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-[#334155]">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-ink min-h-[44px] touch-manipulation cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-white hover:bg-teal-700 min-h-[44px] shadow-sm touch-manipulation cursor-pointer inline-flex items-center gap-1.5"
					>
						<CheckCircle2 size={16} />
						<span>Внести запись в журнал автоклавирования</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") return null;
	return createPortal(modalContent, document.body);
}
