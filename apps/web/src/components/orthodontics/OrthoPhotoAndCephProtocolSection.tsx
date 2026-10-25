import React from "react";
import type { AnbClass } from "@dental/shared";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import { CephalometricAnalysisModal } from "../radiology/CephalometricAnalysisModal";
import { PhotoProtocolOptionalityBanner } from "./photoAndCeph/PhotoProtocolOptionalityBanner";
import { SteinerAnbCard } from "./photoAndCeph/SteinerAnbCard";

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
			<PhotoProtocolOptionalityBanner
				isPhotoProtocolCompleted={isPhotoProtocolCompleted}
				onOpenPhotoProtocol={() => setIsPhotoProtocolOpen(true)}
				onTogglePhotoProtocolCompleted={onTogglePhotoProtocolCompleted}
			/>

			<SteinerAnbCard
				anbClass={anbClass}
				setAnbClass={setAnbClass}
				anbAngle={anbAngle}
				setAnbAngle={setAnbAngle}
				onSetAnbNorm={onSetAnbNorm}
				onOpenCephModal={() => setIsCephModalOpen(true)}
			/>

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
