import React from "react";
import { SoapAnamnesisSection } from "./SoapAnamnesisSection";
import { SoapDiagnosisSection } from "./SoapDiagnosisSection";
import { SoapExpressProtocolsBar } from "./SoapExpressProtocolsBar";
import { SoapTreatmentSection } from "./SoapTreatmentSection";
import type { SoapFieldsEditorProps } from "./types";

export const SoapFieldsEditor: React.FC<SoapFieldsEditorProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
	selectedTooth,
	isIcd10SelectorOpen,
	onToggleIcd10Selector,
	onApplyExpressProtocol,
}) => {
	return (
		<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-4">
			<SoapExpressProtocolsBar onApplyExpressProtocol={onApplyExpressProtocol} />

			<SoapAnamnesisSection
				values={values}
				onFieldChange={onFieldChange}
				onInputFocus={onInputFocus}
				onInputBlur={onInputBlur}
			/>

			<SoapDiagnosisSection
				values={values}
				onFieldChange={onFieldChange}
				onInputFocus={onInputFocus}
				onInputBlur={onInputBlur}
				selectedTooth={selectedTooth}
				isIcd10SelectorOpen={isIcd10SelectorOpen}
				onToggleIcd10Selector={onToggleIcd10Selector}
			/>

			<SoapTreatmentSection
				values={values}
				onFieldChange={onFieldChange}
				onInputFocus={onInputFocus}
				onInputBlur={onInputBlur}
			/>
		</div>
	);
};
