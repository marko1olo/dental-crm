export interface LinkedChairsideLabOrderInfo {
	readonly id?: string | undefined;
	readonly orderNumber?: string | undefined;
	readonly toothFdi?: string | number | undefined;
	readonly material?: string | undefined;
	readonly colorVita?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly workType?: string | undefined;
	readonly constructionType?: string | undefined;
	readonly technicianName?: string | undefined;
	readonly warrantyPassport?: string | undefined;
	readonly status?: string | undefined;
	readonly stage?: string | undefined;
}

export interface OrthopedicsChairsideTopBarProps {
	readonly selectId: string;
	readonly activeTeethInput: string;
	readonly onChangeActiveTeethInput: (val: string) => void;
	readonly activeXrayUrl: string | null;
	readonly onDetachXray: () => void;
	readonly jawScope: "upper" | "lower" | "both" | "none";
	readonly onChangeJawScope: (scope: "upper" | "lower" | "both" | "none") => void;
	readonly selectedMaterial: string;
	readonly onChangeSelectedMaterial: (material: string) => void;
}

export interface OrthopedicsChairsideLabOrderBannerProps {
	readonly readinessHeadline: string;
	readonly orderNumber: string;
	readonly technicianName: string;
	readonly selectedMaterial: string;
	readonly selectedShade: string;
	readonly warrantyPassport: string;
	readonly fittingConfirmed: boolean;
	readonly onConfirmFitting: () => void;
	readonly onOpenPassportA4?: (() => void) | undefined;
}

export interface OrthopedicsChairsideFooterBarProps {
	readonly overrideActive: boolean;
	readonly overrideReason: string;
	readonly onToggleOverride: () => void;
	readonly onChangeOverrideReason: (val: string) => void;
	readonly isWarrantyRework: boolean;
	readonly onToggleWarrantyRework: () => void;
	readonly warrantyLiabilityType: "clinic_warranty" | "lab_defect";
	readonly onSelectWarrantyLiability: (val: "clinic_warranty" | "lab_defect") => void;
	readonly labOrderSentNumber: string | null;
	readonly isLabOrderSending: boolean;
	readonly onImmediateSendToLab: () => void;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onOpenPassportA4?: (() => void) | undefined;
}
