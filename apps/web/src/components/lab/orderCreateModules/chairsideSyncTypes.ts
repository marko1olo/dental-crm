import type React from "react";
import type { OrthopedicWorkTypeId } from "../dentalLabWorkflowEngine";

export interface ChairsideSyncSetters {
	isOpen: boolean;
	setNewTeethInput: (v: string) => void;
	setIsBridge: (v: boolean) => void;
	setNewWorkType: (v: OrthopedicWorkTypeId) => void;
	setNewShade: (v: string) => void;
	setNewStumpShade: (v: string) => void;
	setNewPriceRub: (v: number) => void;
	setNewCostRub: (v: number) => void;
	setNewExpectedLabDate: (v: string) => void;
	setNewFittingDate: (v: string) => void;
	setNewClinicalNotes: React.Dispatch<React.SetStateAction<string>>;
}
