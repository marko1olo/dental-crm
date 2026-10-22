import type { PeriodPreset } from "../retroactiveSanpinEngine";

export interface RetroactiveBatchHeroBannerProps {
	readonly periodPreset: PeriodPreset;
	readonly setPeriodPreset: (preset: PeriodPreset) => void;
	readonly customStartDate: string;
	readonly setCustomStartDate: (d: string) => void;
	readonly customEndDate: string;
	readonly setCustomEndDate: (d: string) => void;
	readonly selectedCabinetIds: string[];
	readonly toggleCabinet: (id: string) => void;
	readonly selectAllCabinets: () => void;
	readonly nurseFullName: string;
	readonly setNurseFullName: (n: string) => void;
	readonly sterilizerModel: string;
	readonly setSterilizerModel: (m: string) => void;
	readonly availableSterilizers: Array<{ id: string; label: string; modelName: string }>;
	readonly onOpenEquipmentModal: () => void;
	readonly autoclaveRegimeId: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly setAutoclaveRegimeId: (r: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min") => void;
	readonly onGenerateBatch: () => void;
	readonly onRecordDayCycle?: () => void;
	readonly isLoggingDayCycle?: boolean;
}
