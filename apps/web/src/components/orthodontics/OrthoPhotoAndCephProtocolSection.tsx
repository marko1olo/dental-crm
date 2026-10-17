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
				className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex-wrap gap-2"
			>
				<div className="flex items-center gap-1.5 text-[var(--ink)] font-bold text-[11px]">
					<CheckCircle2 size={14} className="text-[var(--primary)] shrink-0" />
					<span>Клинический фотопротокол опционален</span>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setIsPhotoProtocolOpen(true)}
						data-testid="ortho-open-photo-protocol-btn"
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px] transition-colors"
						title="Открыть фотопротокол ортодонтии (8 ракурсов ABO: анфас, профиль, улыбка, окклюзия)"
					>
						<Camera size={14} className="text-[var(--primary)]" />
						<span>{isPhotoProtocolCompleted ? "Фотопротокол (8/8)" : "Фотопротокол (8 ракурсов ABO)"}</span>
					</button>
					<button
						type="button"
						onClick={onTogglePhotoProtocolCompleted}
						data-testid="ortho-confirm-photos-1click-btn"
						className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer min-h-[36px] transition-colors ${
							isPhotoProtocolCompleted
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						title="Подтверждение съемки фотопротокола"
					>
						<Check size={13} />
						<span>{isPhotoProtocolCompleted ? "Снято" : "Подтвердить"}</span>
					</button>
				</div>
			</div>

			{/* Steiner ANB Sagittal Skeletal Classification Bar (I, II, III) */}
			<div
				data-testid="ortho-anb-class-selector"
				className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2"
			>
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<Activity size={14} className="text-[var(--primary)]" />
						Скелетный класс по Steiner (угол ANB)
					</span>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={onSetAnbNorm}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px]"
							data-testid="anb-class-norm-1click-btn"
							title="Скелетный класс I по Steiner (норма ANB 2° ± 2°)"
						>
							<CheckCircle2 size={13} className="text-[var(--primary)]" />
							<span>Норма (ANB I: 2.0°)</span>
						</button>
						<button
							type="button"
							onClick={() => setIsCephModalOpen(true)}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px]"
							data-testid="ortho-open-ceph-analysis-btn"
							title="Открыть боковую ТРГ цефалометрию (расчет углов Steiner, Tweed, Downs, Ricketts)"
						>
							<Sliders size={13} className="text-[var(--primary)]" />
							<span>ТРГ-анализ (Steiner)</span>
						</button>
						<span className="text-[12px] font-bold text-[var(--primary)]">
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
										? "bg-[var(--primary)] text-white border-[var(--primary)] font-black shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								title={opt.desc}
							>
								<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
								<span className={`text-[10px] truncate w-full ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
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
