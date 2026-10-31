/**
 * ImplantologyStudioModal.tsx — Каноническая студия хирурга-имплантолога DENTE CRM (Мандаты 8e, 8n, 8am, 8b).
 * Модульный фасад: 6 систем РФ, зубная формула FDI 11–48, зеленая зона торка 35–45 Н·см, ISQ 65–85,
 * гарантийный паспорт А5 с векторным QR-кодом и ровно 1 Primary CTA кнопка var(--teal).
 */

import React, { useId } from "react";
import { Check, Printer } from "lucide-react";
import type {
	ImplantWarrantyPassportData,
} from "./implantologyCatalogData";
import {
	useImplantologyStudioState,
	type ImplantStudioTab,
	ImplantStudioHeader,
	ImplantProtocolTab,
	ImplantPassportTab,
	ImplantDiaryTab,
	ImplantMemoTab,
} from "./studio";
import "./implants.css";
import "./implantsDarkAndResponsive.css";

export type { ImplantStudioTab };

export interface ImplantologyStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialTab?: ImplantStudioTab | undefined;
	readonly onSaveProtocol?: ((passport: ImplantWarrantyPassportData, soapDiary: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const ImplantologyStudioModal: React.FC<ImplantologyStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Иванов Иван Иванович",
	patientId = "PAT-01",
	doctorName = "Д-р Воронов А. В.",
	doctorId = "DOC-01",
	initialTooth = 46,
	initialTab = "protocol",
	onSaveProtocol,
	className = "",
}) => {
	const titleId = useId();

	const studio = useImplantologyStudioState({
		initialTooth,
		initialTab,
		patientName,
		patientId,
		doctorName,
		doctorId,
		onSaveProtocol,
		onClose,
	});

	if (!isOpen) return null;

	return (
		<div className="implant-passport-modal-backdrop" data-testid="implantology-studio-backdrop">
			<div
				className={`implant-passport-card-container implant-surgical-passport-modal flex flex-col min-h-0 ${className}`.trim()}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				data-testid="implantology-studio-modal"
			>
				{/* Шапка и навигация */}
				<ImplantStudioHeader
					titleId={titleId}
					toothFdi={studio.toothFdi}
					patientName={patientName}
					doctorName={doctorName}
					activeTab={studio.activeTab}
					torqueNcm={studio.torqueNcm}
					onTabChange={studio.setActiveTab}
					onClose={onClose}
				/>

				{/* Основной контент вкладок */}
				<main className="implant-passport-content p-4 overflow-y-auto min-h-0 flex-1 space-y-3.5">
					{studio.activeTab === "protocol" && (
						<ImplantProtocolTab
							toothFdi={studio.toothFdi}
							onToothChange={studio.setToothFdi}
							boneDensity={studio.boneDensity}
							systemId={studio.systemId}
							activeSystem={studio.activeSystem}
							onSystemChange={studio.handleSystemChange}
							diameterMm={studio.diameterMm}
							onDiameterChange={studio.setDiameterMm}
							lengthMm={studio.lengthMm}
							onLengthChange={studio.setLengthMm}
							torqueNcm={studio.torqueNcm}
							onTorqueChange={studio.setTorqueNcm}
							torqueZone={studio.torqueZone}
							isqValue={studio.isqValue}
							onIsqChange={studio.setIsqValue}
							stage={studio.stage}
							onStageChange={studio.setStage}
							isGbrPerformed={studio.isGbrPerformed}
							onGbrChange={studio.setIsGbrPerformed}
							onApplyTemplate={studio.handleApplyTemplate}
						/>
					)}

					{studio.activeTab === "passport" && (
						<ImplantPassportTab
							warrantyPassport={studio.warrantyPassport}
							lotNumber={studio.lotNumber}
							onLotChange={studio.setLotNumber}
							serialNumber={studio.serialNumber}
							onSerialChange={studio.setSerialNumber}
						/>
					)}

					{studio.activeTab === "diary" && (
						<ImplantDiaryTab
							soapDiary={studio.soapDiary}
							toothFdi={studio.toothFdi}
						/>
					)}

					{studio.activeTab === "memo" && (
						<ImplantMemoTab
							toothFdi={studio.toothFdi}
							patientName={patientName}
							doctorName={doctorName}
						/>
					)}
				</main>

				{/* Подвал — ровно ОДНА Primary CTA кнопка var(--teal) #0d9488 (Мандат 8e, Мандат 8am) */}
				<footer className="implant-passport-actions flex items-center justify-between gap-2.5 p-3 bg-[var(--paper-soft)] border-t border-[var(--line)] shrink-0">
					<div className="text-xs text-[var(--muted)] truncate min-w-0 flex-1 hidden sm:flex items-center gap-2">
						<span className="font-semibold text-[var(--ink)]">{studio.activeSystem.brandName}</span>
						<span>
							Ø {studio.diameterMm} × {studio.lengthMm} мм
						</span>
						<span className="text-[var(--line-strong,#94a3b8)]">|</span>
						<span>{studio.torqueNcm} Н·см</span>
						<span className="text-[var(--line-strong,#94a3b8)]">|</span>
						<span className="font-mono text-[11px]">{studio.activeSystem.screwdriverType}</span>
					</div>

					<div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={() => typeof window !== "undefined" && window.print()}
							className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 sm:px-3.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-[0.98] transition-all shrink-0"
							data-testid="btn-print-passport-a5"
							title="Печать паспорта А5"
						>
							<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="hidden sm:inline">Печать паспорта А5</span>
							<span className="sm:hidden">Печать А5</span>
						</button>

						<button
							type="button"
							onClick={studio.handleCommitProtocol}
							className="primary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 sm:px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer bg-[var(--teal,#0d9488)] text-white hover:bg-[#0f766e] active:scale-[0.98] shadow-sm transition-all whitespace-nowrap"
							data-testid="btn-save-implant-protocol"
						>
							<Check size={15} className="shrink-0" />
							<span className="hidden sm:inline">Сохранить протокол и паспорт</span>
							<span className="sm:hidden">Сохранить</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ImplantologyStudioModal;
