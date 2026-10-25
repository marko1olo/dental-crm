import type React from "react";

export interface DocumentQuickRoleScenariosProps {
	readonly onOpenPrimaryIntake: () => void;
	readonly onPrintPrimaryIntake?: (() => void) | undefined;
	readonly onOpenClinicalVisit: () => void;
	readonly onOpenSurgicalPackage?: (() => void) | undefined;
	readonly onOpenTaxAccounting: () => void;
	readonly onOpenSanpinRegistry: () => void;
	readonly onOpenSickLeaveEln?: (() => void) | undefined;
	readonly onSelectCompletedAct?: (() => void) | undefined;
	readonly onSelectAttendanceCert?: (() => void) | undefined;
}

export interface ScenarioDefinition {
	readonly id: string;
	readonly testId: string;
	readonly title: string;
	readonly tooltipTitle: string;
	readonly badge: string;
	readonly icon: React.ReactNode;
	readonly getOnClick: (props: DocumentQuickRoleScenariosProps) => () => void;
}
