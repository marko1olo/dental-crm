/**
 * DmsInsurerAndPolicyForm.tsx — Форма выбора страховой компании РФ в 1 клик,
 * реквизитов полиса ДМС, сроков действия гарантийного письма и прикрепления PDF-скана.
 * (Мандат 8b: <= 120 строк)
 */

import { Shield } from "lucide-react";
import React, { useId } from "react";
import { DmsQuickActionBanners } from "../DmsQuickActionBanners.js";
import type { DmsInsurerItem } from "../insuranceMath.js";
import { DmsInsurerChipsSelector } from "./DmsInsurerChipsSelector.js";
import { DmsInsurerDetailsInputs } from "./DmsInsurerDetailsInputs.js";
import { DmsLetterDateInputs } from "./DmsLetterDateInputs.js";
import { DmsPolicyEmergencyAndScanToggles } from "./DmsPolicyEmergencyAndScanToggles.js";
import { EXPRESS_GUARANTEE_LETTER_PRESETS, type ExpressDmsGuaranteePreset } from "./types.js";

export { DmsInsurerChipsSelector } from "./DmsInsurerChipsSelector.js";
export { DmsInsurerDetailsInputs } from "./DmsInsurerDetailsInputs.js";
export { DmsLetterDateInputs } from "./DmsLetterDateInputs.js";
export { DmsPolicyEmergencyAndScanToggles } from "./DmsPolicyEmergencyAndScanToggles.js";

export interface DmsInsurerAndPolicyFormProps {
	readonly insurerKey: string;
	readonly customInsurerName: string;
	readonly policyNumber: string;
	readonly letterNumber: string;
	readonly issueDate: string;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly isEmergencyCare: boolean;
	readonly isDeferredScan: boolean;
	readonly attachedScanFileName: string;
	readonly activeInsurer?: DmsInsurerItem | undefined;
	readonly onInsurerKeyChange: (key: string) => void;
	readonly onCustomInsurerNameChange: (val: string) => void;
	readonly onPolicyNumberChange: (val: string) => void;
	readonly onLetterNumberChange: (val: string) => void;
	readonly onIssueDateChange: (val: string) => void;
	readonly onValidFromChange: (val: string) => void;
	readonly onValidUntilChange: (val: string) => void;
	readonly onEmergencyCareChange: (val: boolean) => void;
	readonly onDeferredScanChange: (val: boolean) => void;
	readonly onAttachedScanFileNameChange: (fileName: string) => void;
	readonly onActivateEmergency: () => void;
	readonly onApplyExpressPreset: (preset: ExpressDmsGuaranteePreset) => void;
}

export function DmsInsurerAndPolicyForm(props: DmsInsurerAndPolicyFormProps) {
	const insurerSelectId = useId();
	const policyNumberInputId = useId();
	const letterNumberInputId = useId();
	const issueDateInputId = useId();
	const validFromInputId = useId();
	const validUntilInputId = useId();

	return (
		<>
			<DmsQuickActionBanners
				isEmergencyCare={props.isEmergencyCare}
				onActivateEmergency={props.onActivateEmergency}
				onApplyExpressPreset={props.onApplyExpressPreset}
				presets={EXPRESS_GUARANTEE_LETTER_PRESETS}
			/>
			<div className="dms-card" data-testid="dms-insurer-policy-form">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
					<h3 className="dms-card-title" style={{ margin: 0 }}>
						<Shield size={18} style={{ color: "var(--teal, #0d9488)" }} />
						<span>1. Страховая компания и реквизиты гарантийного письма</span>
					</h3>
					<DmsPolicyEmergencyAndScanToggles
						isEmergencyCare={props.isEmergencyCare}
						isDeferredScan={props.isDeferredScan}
						attachedScanFileName={props.attachedScanFileName}
						onEmergencyCareChange={props.onEmergencyCareChange}
						onDeferredScanChange={props.onDeferredScanChange}
						onAttachedScanFileNameChange={props.onAttachedScanFileNameChange}
					/>
				</div>
				<DmsInsurerChipsSelector
					insurerKey={props.insurerKey}
					onInsurerKeyChange={props.onInsurerKeyChange}
				/>
				<DmsInsurerDetailsInputs
					insurerKey={props.insurerKey}
					customInsurerName={props.customInsurerName}
					policyNumber={props.policyNumber}
					letterNumber={props.letterNumber}
					activeInsurer={props.activeInsurer}
					onInsurerKeyChange={props.onInsurerKeyChange}
					onCustomInsurerNameChange={props.onCustomInsurerNameChange}
					onPolicyNumberChange={props.onPolicyNumberChange}
					onLetterNumberChange={props.onLetterNumberChange}
					insurerSelectId={insurerSelectId}
					policyNumberInputId={policyNumberInputId}
					letterNumberInputId={letterNumberInputId}
				/>
				<DmsLetterDateInputs
					issueDate={props.issueDate}
					validFrom={props.validFrom}
					validUntil={props.validUntil}
					onIssueDateChange={props.onIssueDateChange}
					onValidFromChange={props.onValidFromChange}
					onValidUntilChange={props.onValidUntilChange}
					issueDateInputId={issueDateInputId}
					validFromInputId={validFromInputId}
					validUntilInputId={validUntilInputId}
				/>
			</div>
		</>
	);
}
