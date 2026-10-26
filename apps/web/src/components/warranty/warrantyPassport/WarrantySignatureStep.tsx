import type React from "react";
import type { WarrantyItem, WarrantyRemediationOrder } from "../../warrantyEngine.js";
import type { WarrantyDefectType, WarrantyRemediationMaterialItem } from "../../warrantyPresets.js";
import { WarrantyRemediationHeader } from "./remediationStep/WarrantyRemediationHeader";
import { WarrantyRemediationForm } from "./remediationStep/WarrantyRemediationForm";
import { WarrantyRemediationsHistory } from "./remediationStep/WarrantyRemediationsHistory";

export interface WarrantySignatureStepProps {
	certificateId: string;
	integrityHash?: string;
	items: WarrantyItem[];
	remediations: WarrantyRemediationOrder[];
	selectedRemediationTooth: string;
	onSelectRemediationTooth: (tooth: string) => void;
	selectedDefectType: WarrantyDefectType;
	onSelectDefectType: (type: WarrantyDefectType) => void;
	customRemediationFinding: string;
	onFindingChange: (val: string) => void;
	customRemediationAction: string;
	onActionChange: (val: string) => void;
	remediationMaterials: WarrantyRemediationMaterialItem[];
	remediationNotes: string;
	onNotesChange: (val: string) => void;
	remediationSuccessNotice: string | null;
	onCreateRemediation: () => void;
	onPrintRemediationAct: (order: WarrantyRemediationOrder) => void;
}

export const WarrantySignatureStep: React.FC<WarrantySignatureStepProps> = ({
	certificateId,
	items,
	remediations,
	selectedRemediationTooth,
	onSelectRemediationTooth,
	selectedDefectType,
	onSelectDefectType,
	customRemediationFinding,
	onFindingChange,
	customRemediationAction,
	onActionChange,
	remediationMaterials,
	remediationNotes,
	onNotesChange,
	remediationSuccessNotice,
	onCreateRemediation,
	onPrintRemediationAct,
}) => {
	return (
		<div className="warranty-remediation-container">
			<WarrantyRemediationHeader remediationSuccessNotice={remediationSuccessNotice} />
			<WarrantyRemediationForm
				items={items}
				selectedRemediationTooth={selectedRemediationTooth}
				onSelectRemediationTooth={onSelectRemediationTooth}
				selectedDefectType={selectedDefectType}
				onSelectDefectType={onSelectDefectType}
				customRemediationFinding={customRemediationFinding}
				onFindingChange={onFindingChange}
				customRemediationAction={customRemediationAction}
				onActionChange={onActionChange}
				remediationMaterials={remediationMaterials}
				remediationNotes={remediationNotes}
				onNotesChange={onNotesChange}
				onCreateRemediation={onCreateRemediation}
			/>
			<WarrantyRemediationsHistory
				certificateId={certificateId}
				remediations={remediations}
				onPrintRemediationAct={onPrintRemediationAct}
			/>
		</div>
	);
};
