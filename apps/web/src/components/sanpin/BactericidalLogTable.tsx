import React from "react";
import { BactericidalDesktopTable } from "./bactericidal/BactericidalDesktopTable";
import { BactericidalMobileCards } from "./bactericidal/BactericidalMobileCards";
import { BactericidalTableToolbar } from "./bactericidal/BactericidalTableToolbar";

export interface BactericidalLogTableProps {
	readonly logs: any[];
	readonly equipments: any[];
	readonly selectedEquipId: string;
	readonly setSelectedEquipId: (id: string) => void;
	readonly loading: boolean;
	readonly onPrintJournal: () => void;
}

export function BactericidalLogTable({
	logs,
	equipments,
	selectedEquipId,
	setSelectedEquipId,
	loading,
	onPrintJournal,
}: BactericidalLogTableProps) {
	return (
		<div className="sanpin-table-wrapper" style={{ marginTop: "0.5rem" }}>
			<BactericidalTableToolbar
				equipments={equipments}
				selectedEquipId={selectedEquipId}
				setSelectedEquipId={setSelectedEquipId}
				onPrintJournal={onPrintJournal}
			/>
			<BactericidalMobileCards logs={logs} loading={loading} />
			<BactericidalDesktopTable logs={logs} loading={loading} />
		</div>
	);
}

export { BactericidalDesktopTable } from "./bactericidal/BactericidalDesktopTable";
export { BactericidalMobileCards } from "./bactericidal/BactericidalMobileCards";
export { BactericidalTableToolbar } from "./bactericidal/BactericidalTableToolbar";
