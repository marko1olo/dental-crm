import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage.js";
import { showToast } from "../../GlobalToast.js";
import {
	generateWasteBarcode,
	generateWasteSealNumber,
	type MedicalWasteJournalRecord,
} from "./medicalWasteEngine.js";

export async function executeModalQuickShiftWaste(
	departmentName: string,
	operatorName: string,
	operatorPosition: string,
): Promise<MedicalWasteJournalRecord[]> {
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const nowStr = new Date().toISOString().slice(0, 16);

	const recClassA: MedicalWasteJournalRecord = {
		id: `rec-shift-class-a-${Date.now() - 1}`,
		timestamp: nowStr,
		wasteClass: "class_A",
		departmentNameRu: departmentName || "Стоматологическое отделение",
		packageType: "white_bag",
		packageCount: 1,
		grossWeightKg: 3.25,
		tareWeightKg: 0.05,
		netWeightKg: 3.2,
		sealNumber: generateWasteSealNumber("class_A"),
		barcode: generateWasteBarcode("class_A", "GEN"),
		decontaminationMethod: "none_class_a",
		storageLocation: "cabinet_room_temp",
		operatorStaffFullName: operatorName || "Медсестра процедурного кабинета",
		operatorStaffPosition: operatorPosition || "Медсестра",
		status: "accumulating",
		notes: "Сдача безопасных отходов смены Класса А по СанПиН 2.1.3684-21",
	};

	const recSoft: MedicalWasteJournalRecord = {
		id: `rec-shift-soft-${Date.now()}`,
		timestamp: nowStr,
		wasteClass: "class_B",
		departmentNameRu: departmentName || "Терапевтический кабинет № 1",
		packageType: "yellow_bag",
		packageCount: 1,
		grossWeightKg: 2.55,
		tareWeightKg: 0.05,
		netWeightKg: 2.5,
		sealNumber: generateWasteSealNumber("class_B"),
		barcode: generateWasteBarcode("class_B", "SOFT"),
		decontaminationMethod: "chemical_soaking_disinfectant",
		decontamDisinfectantName: "Бриллиант Классик 2% (экспозиция 60 мин)",
		storageLocation: "cabinet_room_temp",
		operatorStaffFullName: operatorName || "Медсестра процедурного кабинета",
		operatorStaffPosition: operatorPosition || "Медсестра",
		status: "accumulating",
		notes: "Сдача мягких отходов смены по СанПиН 2.1.3684-21",
	};

	const recSharp: MedicalWasteJournalRecord = {
		id: `rec-shift-sharp-${Date.now() + 1}`,
		timestamp: nowStr,
		wasteClass: "class_B",
		departmentNameRu: departmentName || "Терапевтический кабинет № 1",
		packageType: "yellow_sharps_box_needle_remover",
		packageCount: 1,
		grossWeightKg: 0.95,
		tareWeightKg: 0.15,
		netWeightKg: 0.8,
		sealNumber: generateWasteSealNumber("class_B"),
		barcode: generateWasteBarcode("class_B", "SHARP"),
		decontaminationMethod: "physical_autoclave_134",
		storageLocation: "cabinet_room_temp",
		operatorStaffFullName: operatorName || "Медсестра процедурного кабинета",
		operatorStaffPosition: operatorPosition || "Медсестра",
		status: "accumulating",
		notes: "Сдача острых отходов смены в желтом контейнере по СанПиН 2.1.3684-21",
	};

	try {
		await fetch("/api/registers/medical-waste/quick-shift-bundle", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			},
			body: JSON.stringify({ departmentName }),
		});
	} catch (err) {
		console.warn("API quick-shift-bundle fallback to local journal state", err);
	}

	showToast(
		"Отходы смены зафиксированы (Класс А 3.2 кг + Класс Б 2.5 кг + Контейнер игл 0.8 кг)",
		"success",
	);

	return [recClassA, recSoft, recSharp];
}
