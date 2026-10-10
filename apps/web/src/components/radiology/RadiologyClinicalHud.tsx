/**
 * DENTE CRM — EzDent-i Fullscreen Clinical HUD (Cockpit Telemetry)
 * Semi-transparent golden-yellow / ivory telemetry overlay displaying:
 * Patient name, Age, Card number, FDI tooth (e.g. 14), and acquisition date.
 * Standards: EzDent-i screenshot 24; Mandate 8b (<=800 lines); Doctor Autonomy (Mandate 8e).
 * NOTE: kVp, mA, and radiation dose parameters are STRICTLY EXCLUDED. Doctor is not a physicist!
 */

import React, { useState } from "react";
import {
	Activity,
	ChevronDown,
	ChevronUp,
	FileText,
	Maximize2,
	Minimize2,
	User,
	X,
} from "lucide-react";
import {
	TOOTH_ANATOMICAL_NAMES,
	formatHumanStudyDate,
	formatPatientAge,
} from "./dentalViewerMath.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";

export interface RadiologyClinicalHudProps {
	readonly patientName?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientGender?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly toothFdi?: string | number | undefined;
	readonly modalityLabel?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly isFullscreen?: boolean;
	readonly onToggleFullscreen?: () => void;
	readonly onClose?: () => void;
	readonly className?: string;
}

export const RadiologyClinicalHud: React.FC<RadiologyClinicalHudProps> = ({
	patientName,
	patientAge,
	patientBirthDate,
	patientGender,
	medicalCardNumber,
	toothFdi,
	modalityLabel = "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)",
	studyDate,
	isFullscreen = false,
	onToggleFullscreen,
	onClose,
	className = "",
}) => {
	const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
	const isDemo = isDemoShowcaseMode();

	const { formattedAge, formattedBirthDate } = formatPatientAge(patientBirthDate, patientAge);
	const effectivePatientName = patientName || (isDemo ? "Чухрова Лариса" : "Пациент клиники");
	const effectiveCardNumber = medicalCardNumber || (isDemo ? "20190621_101042" : "20261001_101420");
	const effectiveStudyDate = formatHumanStudyDate(studyDate || (isDemo ? "01.10.2026" : "01.10.2026 10:14"));
	const effectiveToothFdi = toothFdi !== undefined && toothFdi !== "" ? toothFdi : (isDemo ? "14" : null);

	const toothCodeStr = effectiveToothFdi ? String(effectiveToothFdi) : "";
	const anatomicalName = toothCodeStr ? TOOTH_ANATOMICAL_NAMES[toothCodeStr] : null;

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
					<Activity size={13} className="text-white" />
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
							{effectivePatientName}
						</span>
					</div>

					{/* 2. Medical Card Number */}
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-slate-400 text-[10px]">Номер карты :</span>
						<span className="font-mono text-slate-200 font-semibold" data-testid="hud-card-number">
							{effectiveCardNumber}
						</span>
					</div>

					{/* 3. Birth Date & Age */}
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-slate-400 text-[10px]">Дата рожд. :</span>
						<span className="text-slate-200">
							{formattedBirthDate} <span className="text-[#a7f3d0] font-bold">({formattedAge})</span>
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
						<span className="text-slate-200 font-semibold" data-testid="hud-study-date">{effectiveStudyDate}</span>
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

				</div>
			)}
		</div>
	);
};
