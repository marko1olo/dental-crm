import React, { useState } from "react";
import { Stethoscope } from "lucide-react";
import { StandaloneTreatmentPlanWorkspaceShell } from "../StandaloneTreatmentPlanWorkspaceShell";
import { ChairsideEndoQuickBar } from "../../../../endo/ChairsideEndoQuickBar";
import { EndoCanalLogModal } from "../../../../endo/EndoCanalLogModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

export interface StandaloneEndoHostProps {
	readonly onClose: () => void;
}

export const StandaloneEndoHost: React.FC<StandaloneEndoHostProps> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl() || "pat-endo-primary";
	const patientName = useLauncherPatientName(patientId) || "Смирнова Елена Сергеевна";
	const [activeTooth, setActiveTooth] = useState<number>(16);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [treatmentText, setTreatmentText] = useState("");

	return (
		<StandaloneTreatmentPlanWorkspaceShell
			title="Эндодонтия и корневые каналы — Chairside Autopilot"
			onClose={onClose}
		>
			<div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-4" data-testid="endo-standalone-workspace">
				{/* Контекст пациента и активного зуба */}
				<div className="p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] flex items-center justify-center shrink-0">
							<Stethoscope size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-bold text-sm sm:text-base text-[var(--ink,#0f172a)]">
									{patientName}
								</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] font-bold">
									Зуб #{activeTooth}
								</span>
							</div>
							<div className="text-xs text-[var(--muted,#64748b)]">
								Диагноз: Острый очаговый пульпит (K04.0) · 1-клик протокол эндодонтии
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{[16, 26, 36, 46, 14, 21].map((tooth) => (
							<button
								key={tooth}
								type="button"
								onClick={() => setActiveTooth(tooth)}
								className={`secondary-button min-h-[32px] h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
									activeTooth === tooth
										? "bg-[var(--primary,#0d9488)] text-white border-[var(--primary,#0d9488)] shadow-2xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
							>
								#{tooth}
							</button>
						))}
					</div>
				</div>

				{/* 1-Click Chairside Endo QuickBar с аккордеоном детализации */}
				<ChairsideEndoQuickBar
					activeTooth={activeTooth}
					toothState="Острый пульпит (K04.0)"
					patientId={patientId}
					onInsertToDiary={(soapText) => {
						setTreatmentText((prev) => (prev ? `${prev}\n\n${soapText}` : soapText));
					}}
					onOpenFullModal={() => setIsModalOpen(true)}
				/>

				{/* Поле дневника лечения */}
				{treatmentText && (
					<div className="p-3 sm:p-4 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xs space-y-1.5">
						<div className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Зафиксированный протокол приёма:
						</div>
						<pre className="text-xs font-mono whitespace-pre-wrap text-[var(--ink,#0f172a)] bg-[var(--surface,#f8fafc)] p-3 rounded-xl border border-[var(--line,#e2e8f0)]">
							{treatmentText}
						</pre>
					</div>
				)}

				{/* Модальное окно подробного эндодонтического протокола */}
				<EndoCanalLogModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					toothNumber={activeTooth}
					toothState="Острый пульпит (K04.0)"
					patientId={patientId}
					patientName={patientName}
					doctorName="Д-р Смирнов А.П."
					clinicName="Стоматологическая клиника DENTE"
				/>
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};
