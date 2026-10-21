import React from "react";
import type { OrthopedicWorkTypeId } from "../dentalLabWorkflowEngine";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
} from "../orders/labWorkOrderPresets";
import { OrderWorkTypeAndShade } from "./materialShadeModules/OrderWorkTypeAndShade";
import { OrderStumpAndImplantFields } from "./materialShadeModules/OrderStumpAndImplantFields";

export interface LabOrderMaterialAndShadeSelectorProps {
	readonly workType: OrthopedicWorkTypeId;
	readonly onWorkTypeChange: (type: OrthopedicWorkTypeId) => void;
	readonly shade: string;
	readonly onShadeChange: (shade: string) => void;
	readonly stumpShade: string;
	readonly onStumpShadeChange: (stump: string) => void;
	readonly implantPlatform: ImplantPlatformType | "";
	readonly onImplantPlatformChange: (platform: ImplantPlatformType | "") => void;
	readonly abutmentType: AbutmentCategoryType | "";
	readonly onAbutmentTypeChange: (abutment: AbutmentCategoryType | "") => void;
	readonly fixationType: FixationType | "";
	readonly onFixationTypeChange: (fixation: FixationType | "") => void;
	readonly clinicalNotes: string;
	readonly onClinicalNotesChange: (notes: string) => void;
}

export const LabOrderMaterialAndShadeSelector: React.FC<LabOrderMaterialAndShadeSelectorProps> = ({
	workType, onWorkTypeChange, shade, onShadeChange, stumpShade, onStumpShadeChange,
	implantPlatform, onImplantPlatformChange, abutmentType, onAbutmentTypeChange,
	fixationType, onFixationTypeChange, clinicalNotes, onClinicalNotesChange,
}) => {
	return (
		<div className="space-y-3.5">
			<OrderWorkTypeAndShade
				workType={workType} onWorkTypeChange={onWorkTypeChange}
				shade={shade} onShadeChange={onShadeChange}
			/>

			<OrderStumpAndImplantFields
				stumpShade={stumpShade} onStumpShadeChange={onStumpShadeChange}
				implantPlatform={implantPlatform} onImplantPlatformChange={onImplantPlatformChange}
				abutmentType={abutmentType} onAbutmentTypeChange={onAbutmentTypeChange}
				fixationType={fixationType} onFixationTypeChange={onFixationTypeChange}
			/>

			<div className="ztl-form-group">
				<label className="ztl-form-label" htmlFor="textarea-clinical-notes">
					Клинические указания врачу и зубному технику
				</label>
				<textarea
					id="textarea-clinical-notes"
					className="ztl-form-input w-full min-h-[58px] p-2 resize-none"
					placeholder="Особенности краевого прилегания, прозрачность режущего края, контактные пункты, прикус..."
					value={clinicalNotes}
					onChange={(e) => onClinicalNotesChange(e.target.value)}
					data-testid="textarea-clinical-notes"
				/>
			</div>
		</div>
	);
};
