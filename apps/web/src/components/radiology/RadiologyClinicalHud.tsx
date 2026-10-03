/**
 * DENTE CRM — EzDent-i Fullscreen Clinical HUD (Cockpit Telemetry)
 * Semi-transparent golden-yellow / ivory telemetry overlay displaying:
 * Patient name, Age, Card number, FDI tooth (e.g. 14), acquisition date, kVp, mA, and DAP dose.
 * Standards: EzDent-i screenshot 24; Mandate 8b (<=800 lines); Doctor Autonomy (Mandate 8e).
 */

import React, { useState } from "react";
import {
	Activity,
	ChevronDown,
	ChevronUp,
	FileText,
	Maximize2,
	Minimize2,
	Radiation,
	ShieldCheck,
	User,
	X,
	Zap,
} from "lucide-react";
import { TOOTH_ANATOMICAL_NAMES, formatRadiationDap } from "./dentalViewerMath.js";

export interface RadiologyClinicalHudProps {
	readonly patientName?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientGender?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly toothFdi?: string | number | undefined;
	readonly modalityLabel?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly voltageKv?: number | undefined;
	readonly currentMa?: number | undefined;
	readonly exposureSec?: number | undefined;
	readonly dapDoseDgyCm2?: number | undefined;
	readonly effectiveDoseMicrosv?: number | undefined;
	readonly apparatusModel?: string | undefined;
	readonly isFullscreen?: boolean;
	readonly onToggleFullscreen?: () => void;
	readonly onClose?: () => void;
	readonly className?: string;
}

export const RadiologyClinicalHud: React.FC<RadiologyClinicalHudProps> = ({
	patientName = "Чухрова Лариса",
	patientAge = "58Y",
	patientBirthDate = "01.01.1968",
	patientGender = "Жен.",
	medicalCardNumber = "20190621_101042",
	toothFdi = "14",
	modalityLabel = "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)",
	studyDate = "01.10.2026",
	voltageKv = 65,
	currentMa = 7.0,
	exposureSec = 0.08,
	dapDoseDgyCm2 = 0.024,
	effectiveDoseMicrosv = 3.0,
	apparatusModel = "Vatech EzSensor Soft",
	isFullscreen = false,
	onToggleFullscreen,
	onClose,
	className = "",
}) => {
	const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

	const toothCodeStr = toothFdi ? String(toothFdi) : "";
	const anatomicalName = toothCodeStr ? TOOTH_ANATOMICAL_NAMES[toothCodeStr] : null;

	const formattedDap = dapDoseDgyCm2 ? formatRadiationDap(dapDoseDgyCm2) : null;

	return (
		<div
			data-testid="radiology-clinical-hud"
			style={{
				position: "absolute",
				top: "12px",
				left: "12px",
				zIndex: 30,
				userSelect: "none",
			}}
			className={`radiology-clinical-hud flex flex-col font-sans transition-all duration-200 ${className}`}
		>
			{/* HUD Header Banner (EzDent-i Green/Jade Badge) */}
			<div
				style={{
					backgroundColor: "rgba(16, 185, 129, 0.92)",
					border: "1px solid rgba(5, 150, 105, 0.8)",
					boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
				}}
				className="flex items-center justify-between px-2.5 py-1 rounded-t-md text-white font-black text-[11px] tracking-wider uppercase"
			>
				<div className="flex items-center gap-1.5">
					<Activity size={13} className="text-white animate-pulse" />
					<span data-testid="hud-modality-label">{modalityLabel}</span>
				</div>

				<div className="flex items-center gap-1 ml-3">
					<button
						type="button"
						onClick={() => setIsCollapsed((prev) => !prev)}
						className="p-0.5 rounded hover:bg-emerald-600 cursor-pointer"
						title={isCollapsed ? "Развернуть телеметрию" : "Свернуть телеметрию"}
						data-testid="hud-collapse-btn"
					>
						{isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
					</button>

					{onToggleFullscreen && (
						<button
							type="button"
							onClick={onToggleFullscreen}
							className="p-0.5 rounded hover:bg-emerald-600 cursor-pointer ml-0.5"
							title={isFullscreen ? "Выйти из полноэкранного режима (Esc)" : "Полноэкранный режим (F)"}
							data-testid="hud-fullscreen-btn"
						>
							{isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
						</button>
					)}

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="p-0.5 rounded hover:bg-emerald-600 cursor-pointer ml-0.5"
							title="Закрыть (Esc)"
							data-testid="hud-close-btn"
						>
							<X size={13} />
						</button>
					)}
				</div>
			</div>

			{/* HUD Content Body (EzDent-i Screenshot 24 Golden-Yellow & White telemetry) */}
			{!isCollapsed && (
				<div
					style={{
						backgroundColor: "rgba(2, 6, 23, 0.82)",
						backdropFilter: "blur(6px)",
						border: "1px solid rgba(30, 41, 59, 0.8)",
						borderTop: "none",
						boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
						minWidth: "260px",
						maxWidth: "320px",
					}}
					className="p-2.5 rounded-b-md flex flex-col gap-1 text-[11px] text-[#f8fafc]"
				>
					{/* 1. Patient Name */}
					<div className="flex items-baseline justify-between gap-2 border-b border-slate-800/80 pb-1">
						<span className="text-slate-400 text-[10px]">Имя :</span>
						<span className="font-bold text-[#fef08a] text-[12px] truncate" data-testid="hud-patient-name">
							{patientName}
						</span>
					</div>

					{/* 2. Medical Card Number */}
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-slate-400 text-[10px]">Номер карты :</span>
						<span className="font-mono text-slate-200 font-semibold" data-testid="hud-card-number">
							{medicalCardNumber}
						</span>
					</div>

					{/* 3. Birth Date & Age */}
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-slate-400 text-[10px]">Дата рожд. :</span>
						<span className="text-slate-200">
							{patientBirthDate} <span className="text-[#a7f3d0] font-bold">({patientAge})</span>
						</span>
					</div>

					{/* 4. Gender */}
					{patientGender && (
						<div className="flex items-baseline justify-between gap-2">
							<span className="text-slate-400 text-[10px]">Пол :</span>
							<span className="text-slate-300">{patientGender}</span>
						</div>
					)}

					{/* 5. Study Date */}
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-slate-400 text-[10px]">Дата съемки :</span>
						<span className="text-slate-200 font-semibold" data-testid="hud-study-date">{studyDate}</span>
					</div>

					{/* 6. Mode / FDI Tooth (EzDent-i "Режим : 14") */}
					{toothCodeStr && (
						<div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-800/80">
							<span className="text-slate-400 text-[10px]">Режим (Зуб FDI) :</span>
							<div className="flex items-center gap-1">
								<span
									className="px-1.5 py-0.2 rounded font-black text-[12px] bg-[#00C853] text-[#022c15] shadow-sm"
									title={anatomicalName || `Зуб ${toothCodeStr}`}
									data-testid="hud-tooth-fdi"
								>
									#{toothCodeStr}
								</span>
								{anatomicalName && (
									<span className="text-slate-400 text-[9px] truncate max-w-[130px]" title={anatomicalName}>
										({anatomicalName.split(" ")[0]} {anatomicalName.split(" ")[1]})
									</span>
								)}
							</div>
						</div>
					)}

					{/* 7. Radiation & Dosimetry Telemetry (SanPiN / EzDent-i screenshot 27) */}
					<div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
						<div className="flex items-center gap-1 text-amber-400 font-semibold">
							<Radiation size={11} />
							<span>{voltageKv} kVp · {currentMa} mA</span>
						</div>
						{formattedDap && (
							<span className="text-[#38bdf8] font-mono font-bold" data-testid="hud-dap-dose">
								{formattedDap}
							</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
