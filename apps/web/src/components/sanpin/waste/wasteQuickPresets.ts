import { calculateWasteWeights } from "./wasteWeightCalculators";
import { generateWasteBarcode, generateWasteSealNumber } from "./wasteBarcodesAndSeals";
import type { MedicalWasteJournalRecord } from "./types";

export function createQuickClassBWasteRecord(params?: {
	grossWeightKg?: number;
	operatorStaffFullName?: string;
	departmentNameRu?: string;
	notes?: string;
	counter?: number;
}): MedicalWasteJournalRecord {
	const count = params?.counter ?? 1;
	const gross = params?.grossWeightKg ?? 2.45;
	const weights = calculateWasteWeights(gross, "yellow_bag");
	return {
		id: `waste-b-${Date.now()}-${count}`,
		timestamp: new Date().toISOString().slice(0, 16),
		wasteClass: "class_B",
		departmentNameRu: params?.departmentNameRu || "Терапевтический кабинет № 1",
		packageType: "yellow_bag",
		packageCount: 1,
		grossWeightKg: weights.grossKg,
		tareWeightKg: weights.tareKg,
		netWeightKg: weights.netKg,
		sealNumber: generateWasteSealNumber("class_B", count),
		barcode: generateWasteBarcode("class_B", "CAB1", new Date().toISOString().slice(0, 10), count),
		decontaminationMethod: "chemical_soaking_disinfectant",
		decontamDisinfectantName: "Бриллиант Классик 2% (экспозиция 60 мин)",
		storageLocation: "waste_refrigerator_2_8",
		operatorStaffFullName: params?.operatorStaffFullName || "Медсестра процедурного кабинета",
		operatorStaffPosition: "Медсестра процедурного кабинета",
		status: "accumulating",
		notes: params?.notes || "Эпидемиологически опасные отходы Класса Б: карпулы от анестетиков с кровью, салфетки, перчатки, удаленные зубы. Дезинфекция проведена, упаковано в желтый пакет.",
	};
}

export function createQuickClassGWasteRecord(params?: {
	grossWeightKg?: number;
	operatorStaffFullName?: string;
	departmentNameRu?: string;
	notes?: string;
	counter?: number;
}): MedicalWasteJournalRecord {
	const count = params?.counter ?? 1;
	const gross = params?.grossWeightKg ?? 3.80;
	const weights = calculateWasteWeights(gross, "marked_container_class_g");
	return {
		id: `waste-g-${Date.now()}-${count}`,
		timestamp: new Date().toISOString().slice(0, 16),
		wasteClass: "class_G",
		departmentNameRu: params?.departmentNameRu || "ЦСО / Рентген-кабинет",
		packageType: "marked_container_class_g",
		packageCount: 1,
		grossWeightKg: weights.grossKg,
		tareWeightKg: weights.tareKg,
		netWeightKg: weights.netKg,
		sealNumber: generateWasteSealNumber("class_G", count),
		barcode: generateWasteBarcode("class_G", "CSO", new Date().toISOString().slice(0, 10), count),
		decontaminationMethod: "centralized_licensed_incineration",
		storageLocation: "central_accumulation_site",
		operatorStaffFullName: params?.operatorStaffFullName || "Старшая медицинская сестра",
		operatorStaffPosition: "Старшая медицинская сестра",
		status: "accumulating",
		notes: params?.notes || "Токсикологически опасные отходы Класса Г: люминесцентные и бактерицидные лампы, дезинфектанты с истекшим сроком, рентген-реактивы. Упаковано в маркированную тару для передачи спецоператору.",
	};
}
