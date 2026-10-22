import { useMemo, useState } from "react";
import {
	calculateWasteWeights,
	generateMedicalWasteTransferAct,
	generateWasteBarcode,
	generateWasteSealNumber,
	type MedicalWasteJournalRecord,
	type MedicalWasteTransferAct,
} from "./medicalWasteEngine.js";
import {
	getMedicalWasteClass,
	type DecontaminationMethodType,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
	type WasteStorageLocationId,
} from "./medicalWastePresets.js";
import { executeModalQuickShiftWaste } from "./wasteModalQuickShiftAction.js";
import { exportWasteCsvBlob, printWasteThermalSticker, printWasteTransferAct } from "./wastePrintActions.js";

export function useMedicalWasteJournalModalState(
	initialRecords: readonly MedicalWasteJournalRecord[] = [],
	onRecordAdded?: (rec: MedicalWasteJournalRecord) => void,
	onActCreated?: (act: MedicalWasteTransferAct) => void,
) {
	const [activeTab, setActiveTab] = useState<"accumulate" | "journal" | "transfer_act">("accumulate");
	const [selectedClass, setSelectedClass] = useState<MedicalWasteClassId>("class_B");
	const [selectedPackaging, setSelectedPackaging] = useState<MedicalWastePackagingTypeId>("yellow_bag");
	const [packageCount, setPackageCount] = useState<number>(1);
	const [grossWeightInput, setGrossWeightInput] = useState<number>(2.45);
	const [departmentName] = useState<string>("Терапевтический кабинет № 1");
	const [decontamMethod, setDecontamMethod] = useState<DecontaminationMethodType>("chemical_soaking_disinfectant");
	const [storageLocation, setStorageLocation] = useState<WasteStorageLocationId>("cabinet_room_temp");
	const [operatorName] = useState<string>("Медсестра / Санитар");
	const [operatorPosition] = useState<string>("Медсестра процедурного кабинета");
	const [sealNumber, setSealNumber] = useState<string>(generateWasteSealNumber("class_B"));
	const [barcode, setBarcode] = useState<string>(generateWasteBarcode("class_B", "TER"));
	const [records, setRecords] = useState<MedicalWasteJournalRecord[]>(() =>
		initialRecords && initialRecords.length > 0 ? [...initialRecords] : [],
	);
	const [actNumber, setActNumber] = useState<string>(`АКТ-ВЫВОЗ-${new Date().getFullYear()}/048`);
	const [disposalCompanyName, setDisposalCompanyName] = useState<string>("ООО «ЭкоМедУтилизация-Сервис»");
	const [disposalContractNo, setDisposalContractNo] = useState<string>("ДОГ-УТИЛ-2026/08-ДЕНТЕ");
	const [driverName, setDriverName] = useState<string>("");
	const [vehiclePlate, setVehiclePlate] = useState<string>("А 784 МЕ 777");
	const [isSubmittingQuickShift, setIsSubmittingQuickShift] = useState(false);

	const currentWeights = useMemo(() => calculateWasteWeights(grossWeightInput, selectedPackaging), [grossWeightInput, selectedPackaging]);

	const handleClassChange = (newClass: MedicalWasteClassId) => {
		setSelectedClass(newClass);
		const classDef = getMedicalWasteClass(newClass);
		setSelectedPackaging(classDef.mandatoryPackaging[0] || "yellow_bag");
		setDecontamMethod(classDef.allowedDecontamination[0] || "chemical_soaking_disinfectant");
		setSealNumber(generateWasteSealNumber(newClass));
		setBarcode(generateWasteBarcode(newClass, departmentName.slice(0, 3).toUpperCase()));
	};

	const handleAddRecord = () => {
		if (grossWeightInput <= 0) return;
		const newRecord: MedicalWasteJournalRecord = {
			id: `rec-${Date.now()}`,
			timestamp: new Date().toISOString().slice(0, 16),
			wasteClass: selectedClass,
			departmentNameRu: departmentName,
			packageType: selectedPackaging,
			packageCount: Math.max(1, packageCount),
			grossWeightKg: currentWeights.grossKg,
			tareWeightKg: currentWeights.tareKg,
			netWeightKg: currentWeights.netKg,
			sealNumber: sealNumber.trim() || undefined,
			barcode,
			decontaminationMethod: decontamMethod,
			storageLocation,
			operatorStaffFullName: operatorName,
			operatorStaffPosition: operatorPosition,
			status: "accumulating",
		};
		setRecords((prev) => [newRecord, ...prev]);
		onRecordAdded?.(newRecord);
		setSealNumber(generateWasteSealNumber(selectedClass));
		setBarcode(generateWasteBarcode(selectedClass, departmentName.slice(0, 3).toUpperCase()));
		setActiveTab("journal");
	};

	const handleQuickShiftWaste = async () => {
		setIsSubmittingQuickShift(true);
		try {
			const newRecs = await executeModalQuickShiftWaste(departmentName, operatorName, operatorPosition);
			setRecords((prev) => [...newRecs, ...prev]);
			newRecs.forEach((r) => onRecordAdded?.(r));
			setActiveTab("journal");
		} finally {
			setIsSubmittingQuickShift(false);
		}
	};

	const handleExportCsv = () => exportWasteCsvBlob(records);

	const handleCreateAndPrintAct = () => {
		const act = generateMedicalWasteTransferAct({
			actNumber,
			records: records.filter((r) => r.status === "accumulating"),
			disposalCompanyInfo: { name: disposalCompanyName, contractNumber: disposalContractNo, driverFullName: driverName, vehiclePlateNumber: vehiclePlate },
		});
		onActCreated?.(act);
		setRecords((prev) => prev.map((r) => (r.status === "accumulating" ? { ...r, status: "transferred_for_disposal", transferActNumber: actNumber } : r)));
		printWasteTransferAct(act);
	};

	return {
		activeTab, setActiveTab, selectedClass, selectedPackaging, setSelectedPackaging, packageCount, setPackageCount,
		grossWeightInput, setGrossWeightInput, currentWeights, decontamMethod, setDecontamMethod, storageLocation,
		setStorageLocation, sealNumber, setSealNumber, barcode, records, actNumber, setActNumber, disposalCompanyName,
		setDisposalCompanyName, disposalContractNo, setDisposalContractNo, driverName, setDriverName, vehiclePlate,
		setVehiclePlate, isSubmittingQuickShift, handleClassChange, handleAddRecord, handleQuickShiftWaste, handleExportCsv,
		handleCreateAndPrintAct, handlePrintThermalSticker: (rec: MedicalWasteJournalRecord) => printWasteThermalSticker(rec, disposalContractNo),
	};
}
