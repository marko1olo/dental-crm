import type { ClinicLegalInfo, Form257Record } from "../autoclaveLogEngine.js";

export interface AutoclaveJournal257TabProps {
	readonly records: readonly Form257Record[];
	readonly activeClinicalDates?: readonly string[];
	readonly onDeleteRecord?: (id: string) => void;
	readonly onVerifyRecord?: (id: string, headNurseName: string) => void;
	readonly onBatchAddRecords?: (records: Form257Record[]) => void;
	readonly onOpenNewCycle?: () => void;
	readonly clinicInfo?: ClinicLegalInfo;
}
