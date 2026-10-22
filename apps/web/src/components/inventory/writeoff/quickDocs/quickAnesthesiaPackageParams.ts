import type { CabinetStockBatch } from "../clinicalWriteoffPresets.js";

export interface QuickAnesthesiaPackageWriteoffParams {
	readonly carpuleCount?: number | undefined;
	readonly carpuleMaterialId?: string | undefined;
	readonly needleCount?: number | undefined;
	readonly needleMaterialId?: string | undefined;
	readonly antisepticCount?: number | undefined;
	readonly antisepticMaterialId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly actDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly nurseFullName?: string | undefined;
	readonly nurseRole?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly notes?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly statutoryFormType?: "0504230" | "M11" | "TORG16" | undefined;
}
