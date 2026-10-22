import type { ClinicLegalInfo, Form257Record } from "../autoclaveLogEngine.js";

export interface AutoclaveJournal257TabProps {
	readonly records: readonly Form257Record[];
	readonly activeClinicalDates?: readonly string[] | undefined;
	readonly onDeleteRecord?: ((id: string) => void) | undefined;
	readonly onVerifyRecord?: ((id: string, headNurseName: string) => void) | undefined;
	readonly onBatchAddRecords?: ((records: Form257Record[]) => void) | undefined;
	readonly onOpenNewCycle?: (() => void) | undefined;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
}
