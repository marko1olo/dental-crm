export type MedicalWasteClassId = "class_A" | "class_B" | "class_V" | "class_G";

export type MedicalWastePackagingTypeId =
	| "white_bag"
	| "white_bin"
	| "yellow_bag"
	| "yellow_puncture_proof_container"
	| "yellow_sharps_box_needle_remover"
	| "red_bag"
	| "red_puncture_proof_container"
	| "black_container_mercury"
	| "black_bag_g"
	| "marked_container_class_g";

export type DecontaminationMethodType =
	| "physical_autoclave_134"
	| "physical_microwave_decontam"
	| "chemical_soaking_disinfectant"
	| "centralized_licensed_incineration"
	| "none_class_a";

export type WasteStorageLocationId =
	| "cabinet_room_temp"
	| "waste_refrigerator_2_8"
	| "waste_freezer_minus_18"
	| "central_accumulation_site";

export interface MedicalWasteClassDefinition {
	readonly id: MedicalWasteClassId;
	readonly letterCode: "А" | "Б" | "В" | "Г";
	readonly nameRu: string;
	readonly dangerCategoryRu: string;
	readonly colorTheme: {
		readonly bagColorRu: string;
		readonly hexBadgeBg: string;
		readonly hexBadgeFg: string;
		readonly hexBorder: string;
	};
	readonly standardCompositionRu: readonly string[];
	readonly dentalSpecificItemsRu: readonly string[];
	readonly mandatoryPackaging: readonly MedicalWastePackagingTypeId[];
	readonly allowedDecontamination: readonly DecontaminationMethodType[];
	readonly sanpinNormRefRu: string;
}

export interface MedicalWastePackagingDefinition {
	readonly id: MedicalWastePackagingTypeId;
	readonly nameRu: string;
	readonly wasteClass: MedicalWasteClassId;
	readonly isPunctureProof: boolean;
	readonly isHermeticSealed: boolean;
	readonly defaultTareWeightKg: number;
	readonly maxCapacityLiters: number;
	readonly colorRu: string;
}

export interface DecontaminationMethodDefinition {
	readonly id: DecontaminationMethodType;
	readonly nameRu: string;
	readonly category: "physical" | "chemical" | "centralized" | "exempt";
	readonly descriptionRu: string;
	readonly standardParametersRu: string;
	readonly validationRequired: boolean;
}

export interface WasteStorageLocationDefinition {
	readonly id: WasteStorageLocationId;
	readonly nameRu: string;
	readonly temperatureRangeRu: string;
	readonly maxAllowedStorageHours: number;
	readonly maxAllowedStorageDays: number;
	readonly appliesToClasses: readonly MedicalWasteClassId[];
	readonly descriptionRu: string;
}
