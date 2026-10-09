import type { SterilizationLogRecord } from "@dental/shared";
import type { ClinicAutoclaveDevice } from "../AutoclaveEquipmentModal";

/**
 * SanPiN 3.3686-21 Autoclave Cycle & Table Types
 */
export type AutoclaveCycleRecord = SterilizationLogRecord;

export interface AutoclaveLogsSlice {
	readonly visibleItems: SterilizationLogRecord[];
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly totalCount: number;
}

export interface AutoclaveRegisterTableProps {
	readonly logs: SterilizationLogRecord[];
	readonly filteredLogs: SterilizationLogRecord[];
	readonly logsSlice: AutoclaveLogsSlice;
	readonly loading: boolean;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly deviceFilter: string;
	readonly setDeviceFilter: (f: string) => void;
	readonly stampedRows: Record<string, boolean>;
	readonly onStampVerification: (logId: string) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
	readonly onQuickShiftBatch: () => void;
	readonly isLoggingBatch: boolean;
	readonly onOpenNewCycleModal?: () => void;
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenJournal257Modal: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onLoadMore: () => void;
	readonly onLoadAll: () => void;
}

export function getPackagingLabel(packagingType?: string): string {
	switch (packagingType) {
		case "kraft_heat_sealed":
			return "Крафт термосварной (365 сут)";
		case "kraft_self_adhesive":
			return "Крафт самоклейка (50 сут)";
		case "laminated_heat_sealed":
			return "Ламинир. пакет (180 сут)";
		case "metal_cassette":
			return "Металл. кассета (72 ч)";
		case "bix_filter":
			return "Бикс с фильтром (20 сут)";
		case "kraft_bag":
			return "Крафт-пакет (30 сут)";
		default:
			return packagingType || "Крафт-пакет";
	}
}
