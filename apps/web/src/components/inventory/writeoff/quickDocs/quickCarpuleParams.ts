import type { CabinetStockBatch } from "../clinicalWriteoffPresets.js";

export interface QuickCarpuleWriteoffParams {
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly nurseFullName?: string | undefined;
	readonly nurseRole?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly count?: number | undefined;
	readonly materialId?: string | undefined;
	readonly lotNumber?: string | undefined;
	readonly notes?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly actDate?: string | undefined;
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | undefined;
	readonly includePackage?: boolean | undefined;
}
