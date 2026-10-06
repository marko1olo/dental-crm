import React from "react";
import { Activity, Camera, Check, CheckCircle2, Sliders } from "lucide-react";
import { ANB_CLASS_OPTIONS, type AnbClass } from "@dental/shared";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import { CephalometricAnalysisModal } from "../radiology/CephalometricAnalysisModal";

export interface OrthoPhotoAndCephProtocolSectionProps {
	readonly isPhotoProtocolOpen: boolean;
	readonly setIsPhotoProtocolOpen: (open: boolean) => void;
	readonly isPhotoProtocolCompleted: boolean;
	readonly onTogglePhotoProtocolCompleted: () => void;
	readonly isCephModalOpen: boolean;
	readonly setIsCephModalOpen: (open: boolean) => void;
	readonly anbClass: AnbClass;
	readonly setAnbClass: (c: AnbClass) => void;
	readonly anbAngle: number;
	readonly setAnbAngle: (angle: number) => void;
	readonly onSetAnbNorm: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly onInsertCephToProtocol: (protocolText: string) => void;
}

export const OrthoPhotoAndCephProtocolSection: React.FC<OrthoPhotoAndCephProtocolSectionProps> = ({
	isPhotoProtocolOpen,
	setIsPhotoProtocolOpen,
	isPhotoProtocolCompleted,
	onTogglePhotoProtocolCompleted,
	isCephModalOpen,
	setIsCephModalOpen,
	anbClass,
	setAnbClass,
	anbAngle,
	setAnbAngle,
	onSetAnbNorm,
	patientId,
	patientName = "Пациент",
	doctorName = "Лечащий врач-ортодонт",
	clinicName = "Стоматологическая клиника DENTE",
	onInsertCephToProtocol,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-photo-and-ceph-protocol-section">
			{/* Mandate 8e: Doctor Autonomy & Photo Protocol Optionality Banner */}
			<div
				data-testid="photo-protocol-optional-badge"
				className="flex items-center justify-between p-2 rounded-lg bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/20 text-xs flex-wrap gap-2"
			>
				<div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-200 font-bold text-[11px]">
					<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Автономия врача: фотопротокол опционален (отсутствие фото не блокирует приём)</span>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setIsPhotoProtocolOpen(true)}
						data-testid="ortho-open-photo-protocol-btn"
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-slate-800 cursor-pointer min-h-[32px] transition-colors"
						title="Открыть фотопротокол ортодонтии (8 ракурсов ABO: анфас, профиль, улыбка, окклюзия)"
					>
						<Camera size={13} className="text-teal-600 dark:text-teal-400" />
						<span>{isPhotoProtocolCompleted ? "Фотопротокол (8/8)" : "Фотопротокол (8 ракурсов ABO)"}</span>
					</button>
					<button
						type="button"
						onClick={onTogglePhotoProtocolCompleted}
						data-testid="ortho-confirm-photos-1click-btn"
						className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer min-h-[32px] transition-colors ${
							isPhotoProtocolCompleted
								? "bg-teal-600 text-white border-teal-700"
								: "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
						}`}
						title="Подтверждение съемки фотопротокола"
					>
						<Check size={12} />
						<span>{isPhotoProtocolCompleted ? "Снято" : "Подтвердить"}</span>
					</button>
					<span className="text-[10px] text-teal-700 dark:text-teal-300 font-mono font-medium">
						Клиническая автономия врача
					</span>
				</div>
			</div>

			{/* Steiner ANB Sagittal Skeletal Classification Bar (I, II, III) */}
			<div
				data-testid="ortho-anb-class-selector"
				className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2"
			>
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
						<Activity size={14} className="text-indigo-500" />
						Скелетный класс по Steiner (угол ANB)
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onSetAnbNorm}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer min-h-[36px]"
							data-testid="anb-class-norm-1click-btn"
							title="Скелетный класс I по Steiner (норма ANB 2° ± 2°)"
						>
							<CheckCircle2 size={12} />
							<span>Норма (ANB I: 2.0°)</span>
						</button>
						<button
							type="button"
							onClick={() => setIsCephModalOpen(true)}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer min-h-[36px]"
							data-testid="ortho-open-ceph-analysis-btn"
							title="Открыть боковую ТРГ цефалометрию (расчет углов Steiner, Tweed, Downs, Ricketts)"
						>
							<Sliders size={12} className="text-indigo-600 dark:text-indigo-400" />
							<span>ТРГ-анализ (Steiner)</span>
						</button>
						<span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
							{ANB_CLASS_OPTIONS.find((a) => a.id === anbClass)?.shortLabel} ({anbAngle.toFixed(1)}°)
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
					{ANB_CLASS_OPTIONS.map((opt) => {
						const isSelected = anbClass === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => {
									setAnbClass(opt.id);
									setAnbAngle(opt.typicalDegrees);
								}}
								data-testid={`anb-class-${opt.id}-btn`}
								className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
									isSelected
										? "bg-indigo-600 text-white border-indigo-700 font-black shadow-xs ring-1 ring-indigo-400"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
								}`}
								title={opt.desc}
							>
								<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
								<span className={`text-[10px] truncate w-full ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
									{opt.id === "class_1" ? "Норма 2° (0°..4°)" : opt.id === "class_2" ? "Дистальный >4°" : "Мезиальный <0°"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Modals */}
			{isPhotoProtocolOpen && (
				<OrthodonticPhotoProtocolModal
					isOpen={isPhotoProtocolOpen}
					onClose={() => setIsPhotoProtocolOpen(false)}
					patientId={patientId || ""}
					patientName={patientName}
					doctorName={doctorName}
					clinicName={clinicName}
					onSaveSession={() => {
						setIsPhotoProtocolOpen(false);
						onTogglePhotoProtocolCompleted();
					}}
				/>
			)}
			{isCephModalOpen && (
				<CephalometricAnalysisModal
					isOpen={isCephModalOpen}
					onClose={() => setIsCephModalOpen(false)}
					patientId={patientId || ""}
					patientName={patientName}
					onInsertToProtocol={onInsertCephToProtocol}
				/>
			)}
		</div>
	);
};
