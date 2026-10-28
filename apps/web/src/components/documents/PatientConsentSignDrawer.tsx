import React, { useState } from "react";
import type { ConsentKindOption, PatientConsentSignDrawerProps } from "./consentDrawer/types";
import { ConsentTypeSelector } from "./consentDrawer/ConsentTypeSelector";
import { ConsentTextPreview } from "./consentDrawer/ConsentTextPreview";
import { ConsentSignCanvas } from "./consentDrawer/ConsentSignCanvas";
import { ConsentSignFooter } from "./consentDrawer/ConsentSignFooter";

export type { PatientConsentSignDrawerProps };

export const PatientConsentSignDrawer: React.FC<PatientConsentSignDrawerProps> = React.memo(
	function PatientConsentSignDrawer({
		isOpen,
		onClose,
		patient,
		doctorFullName,
		clinicName,
		defaultConsentKind = "therapeutic",
		onSigned,
		onPrintBlank,
	}) {
		const [selectedKind, setSelectedKind] = useState<ConsentKindOption>(defaultConsentKind);
		const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

		if (!isOpen) return null;

		const handleConfirm = () => {
			if (onSigned) {
				onSigned(signatureDataUrl || "", selectedKind);
			}
			onClose();
		};

		return (
			<div
				className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
				role="dialog"
				aria-modal="true"
				aria-label="Подписание согласия пациентом"
			>
				<div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
					{/* Drag handle for mobile touch ergonomics */}
					<div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
						<div className="w-9 h-1 rounded-full bg-[var(--line)]" />
					</div>

					<div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
						<div>
							<h3 className="font-bold text-sm m-0">Подписание документа у кресла</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Пациент: {patient?.fullName || "Не выбран"} {patient?.birthDate ? `(${patient.birthDate})` : ""}
							</p>
						</div>
					</div>

					<div className="p-4 flex flex-col gap-3.5 overflow-y-auto">
						<ConsentTypeSelector
							selectedKind={selectedKind}
							onSelectKind={setSelectedKind}
						/>
						<ConsentTextPreview
							selectedKind={selectedKind}
							patient={patient}
							doctorFullName={doctorFullName}
							clinicName={clinicName}
						/>
						<ConsentSignCanvas onSignatureChange={setSignatureDataUrl} />
					</div>

					<div className="p-4 bg-[var(--paper-soft)]/50">
						<ConsentSignFooter
							selectedKind={selectedKind}
							onConfirm={handleConfirm}
							onPrintBlank={onPrintBlank}
							onClose={onClose}
						/>
					</div>
				</div>
			</div>
		);
	},
);
