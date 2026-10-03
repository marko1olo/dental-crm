/**
 * ============================================================================
 * MEDICAL WASTE JOURNAL & DECONTAMINATION ACCOUNTING MODAL (САНПИН 2.1.3684-21)
 * Интерактивный сенсорный HUD фиксации накопления, обеззараживания, контроля
 * сроков хранения и формирования официального акта передачи отходов на утилизацию.
 * ============================================================================
 */

import {
	FileText,
	Plus,
	ShieldAlert,
	Sparkles,
	Truck,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../GlobalToast.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage.js";
import {
	calculateWasteWeights,
	generateMedicalWasteTransferAct,
	generateWasteBarcode,
	generateWasteSealNumber,
	generateWasteTransferActHtml,
	generateWasteThermalStickerHtml,
	type MedicalWasteJournalRecord,
	type MedicalWasteTransferAct,
} from "./medicalWasteEngine.js";
import "./medicalWaste.css";
import {
	getMedicalWasteClass,
	type DecontaminationMethodType,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
	type WasteStorageLocationId,
} from "./medicalWastePresets.js";
import { MedicalWasteAccumulateTab } from "./MedicalWasteAccumulateTab";
import { MedicalWasteJournalTableTab } from "./MedicalWasteJournalTableTab";
import { MedicalWasteTransferActTab } from "./MedicalWasteTransferActTab";

export interface MedicalWasteJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialRecords?: readonly MedicalWasteJournalRecord[] | undefined;
	readonly onRecordAdded?: ((record: MedicalWasteJournalRecord) => void) | undefined;
	readonly onActCreated?: ((act: MedicalWasteTransferAct) => void) | undefined;
}

export const MedicalWasteJournalModal: React.FC<MedicalWasteJournalModalProps> = ({
	isOpen,
	onClose,
	initialRecords = [],
	onRecordAdded,
	onActCreated,
}) => {
	const [activeTab, setActiveTab] = useState<"accumulate" | "journal" | "transfer_act">("accumulate");

	// 1. Состояние формы накопления
	const [selectedClass, setSelectedClass] = useState<MedicalWasteClassId>("class_B");
	const [selectedPackaging, setSelectedPackaging] = useState<MedicalWastePackagingTypeId>("yellow_bag");
	const [packageCount, setPackageCount] = useState<number>(1);
	const [grossWeightInput, setGrossWeightInput] = useState<number>(2.45);
	const [customTareInput, setCustomTareInput] = useState<number | undefined>(undefined);
	const [departmentName, setDepartmentName] = useState<string>("Терапевтический кабинет № 1");
	const [decontamMethod, setDecontamMethod] = useState<DecontaminationMethodType>("chemical_soaking_disinfectant");
	const [disinfectantName, setDisinfectantName] = useState<string>("Бриллиант Классик 2% (экспозиция 60 мин)");
	const [storageLocation, setStorageLocation] = useState<WasteStorageLocationId>("cabinet_room_temp");
	const [operatorName, setOperatorName] = useState<string>("Медсестра / Санитар");
	const [operatorPosition, setOperatorPosition] = useState<string>("Медсестра процедурного кабинета");
	const [sealNumber, setSealNumber] = useState<string>(generateWasteSealNumber("class_B"));
	const [barcode, setBarcode] = useState<string>(generateWasteBarcode("class_B", "TER"));
	const [notes, setNotes] = useState<string>("");

	// 2. Список записей журнала
	const [records, setRecords] = useState<MedicalWasteJournalRecord[]>(() =>
		initialRecords && initialRecords.length > 0 ? [...initialRecords] : []
	);

	// 3. Состояние акта передачи
	const [actNumber, setActNumber] = useState<string>(`АКТ-ВЫВОЗ-${new Date().getFullYear()}/048`);
	const [disposalCompanyName, setDisposalCompanyName] = useState<string>("ООО «ЭкоМедУтилизация-Сервис»");
	const [disposalContractNo, setDisposalContractNo] = useState<string>("ДОГ-УТИЛ-2026/08-ДЕНТЕ");
	const [driverName, setDriverName] = useState<string>("");
	const [vehiclePlate, setVehiclePlate] = useState<string>("А 784 МЕ 777");

	// Автоматический пересчет весов
	const currentWeights = useMemo(() => {
		return calculateWasteWeights(grossWeightInput, selectedPackaging, customTareInput);
	}, [grossWeightInput, selectedPackaging, customTareInput]);

	// Смена класса -> смена доступной тары
	const handleClassChange = (newClass: MedicalWasteClassId) => {
		setSelectedClass(newClass);
		const classDef = getMedicalWasteClass(newClass);
		const defaultPkg = classDef.mandatoryPackaging[0] || "yellow_bag";
		setSelectedPackaging(defaultPkg);

		const defaultDecontam = classDef.allowedDecontamination[0] || "chemical_soaking_disinfectant";
		setDecontamMethod(defaultDecontam);

		setSealNumber(generateWasteSealNumber(newClass));
		setBarcode(generateWasteBarcode(newClass, departmentName.slice(0, 3).toUpperCase()));
	};

	// Добавление новой записи в журнал
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
			decontamDisinfectantName:
				decontamMethod === "chemical_soaking_disinfectant" ? disinfectantName : undefined,
			storageLocation,
			operatorStaffFullName: operatorName,
			operatorStaffPosition: operatorPosition,
			status: "accumulating",
			notes: notes.trim() || undefined,
		};

		setRecords((prev) => [newRecord, ...prev]);
		if (onRecordAdded) {
			onRecordAdded(newRecord);
		}

		// Сброс на новую пломбу и штрихкод
		setSealNumber(generateWasteSealNumber(selectedClass));
		setBarcode(generateWasteBarcode(selectedClass, departmentName.slice(0, 3).toUpperCase()));
		setActiveTab("journal");
	};

	const [isSubmittingQuickShift, setIsSubmittingQuickShift] = useState(false);

	// 1-Клик сдать отходы смены (Класс Б: пакет 2.5 кг + контейнер игл 0.8 кг) по СанПиН 2.1.3684-21
	const handleQuickShiftWaste = async () => {
		try {
			setIsSubmittingQuickShift(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const nowStr = new Date().toISOString().slice(0, 16);
			const sealClassA = generateWasteSealNumber("class_A");
			const sealSoft = generateWasteSealNumber("class_B");
			const sealSharp = generateWasteSealNumber("class_B");
			const barcodeClassA = generateWasteBarcode("class_A", "GEN");
			const barcodeSoft = generateWasteBarcode("class_B", "SOFT");
			const barcodeSharp = generateWasteBarcode("class_B", "SHARP");

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
				sealNumber: sealClassA,
				barcode: barcodeClassA,
				decontaminationMethod: "none_class_a",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: operatorName || "Медсестра процедурного кабинета",
				operatorStaffPosition: operatorPosition || "Медсестра",
				status: "accumulating",
				notes: "1-клик сдача безопасных отходов смены Класса А (упаковка, картон, бумага, чистые бахилы) по СанПиН 2.1.3684-21",
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
				sealNumber: sealSoft,
				barcode: barcodeSoft,
				decontaminationMethod: "chemical_soaking_disinfectant",
				decontamDisinfectantName: "Бриллиант Классик 2% (экспозиция 60 мин)",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: operatorName || "Медсестра процедурного кабинета",
				operatorStaffPosition: operatorPosition || "Медсестра",
				status: "accumulating",
				notes: "1-клик сдача мягких отходов смены (перчатки, маски, салфетки, валики, слюноотсосы) по СанПиН 2.1.3684-21",
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
				sealNumber: sealSharp,
				barcode: barcodeSharp,
				decontaminationMethod: "physical_autoclave_134",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: operatorName || "Медсестра процедурного кабинета",
				operatorStaffPosition: operatorPosition || "Медсестра",
				status: "accumulating",
				notes: "1-клик сдача острых отходов смены в желтом непрокалываемом контейнере (карпулы, иглы, скальпели) по СанПиН 2.1.3684-21",
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
			} catch (fetchErr) {
				console.warn("API quick-shift-bundle fallback to local journal state", fetchErr);
			}

			setRecords((prev) => [recClassA, recSoft, recSharp, ...prev]);
			if (onRecordAdded) {
				onRecordAdded(recClassA);
				onRecordAdded(recSoft);
				onRecordAdded(recSharp);
			}

			showToast(
				"Отходы смены успешно зафиксированы (Белый пакет Класса А 3.2 кг + Желтый пакет Класса Б 2.5 кг + Контейнер игл 0.8 кг)",
				"success",
			);
			setActiveTab("journal");
		} catch (err) {
			showToast("Ошибка при фиксации отходов смены", "error");
		} finally {
			setIsSubmittingQuickShift(false);
		}
	};

	// Экспорт журнала в CSV
	const handleExportCsv = async () => {
		const { exportWasteJournalToCsv } = await import("./medicalWasteEngine.js");
		const csv = exportWasteJournalToCsv(records);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Журнал_медицинских_отходов_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Формирование и печать Акта передачи
	const handleCreateAndPrintAct = () => {
		const act = generateMedicalWasteTransferAct({
			actNumber,
			records: records.filter((r) => r.status === "accumulating"),
			disposalCompanyInfo: {
				name: disposalCompanyName,
				contractNumber: disposalContractNo,
				driverFullName: driverName,
				vehiclePlateNumber: vehiclePlate,
			},
		});

		if (onActCreated) {
			onActCreated(act);
		}

		// Помечаем отходы как переданные
		setRecords((prev) =>
			prev.map((r) =>
				r.status === "accumulating"
					? { ...r, status: "transferred_for_disposal", transferActNumber: actNumber }
					: r,
			),
		);

		// Открытие окна печати А4
		const html = generateWasteTransferActHtml(act);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	// 1-клик печать термоэтикетки 58x40 мм
	const handlePrintThermalSticker = (record: MedicalWasteJournalRecord) => {
		const html = generateWasteThermalStickerHtml(record, {
			clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
			disposalContractNo: disposalContractNo,
		});
		const printWin = window.open("", "_blank", "width=450,height=350");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="waste-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="waste-modal-title">
			<div className="waste-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="waste-modal-header">
					<div className="waste-header-title" id="waste-modal-title">
						<ShieldAlert size={24} className="text-[var(--teal,#0d9488)]" />
						<div>
							<div className="font-bold text-lg leading-tight flex items-center gap-1.5">
								<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span>Учет и передача отходов</span>
							</div>
							<div className="text-xs font-normal text-muted">
								Утилизация отходов • Весовой контроль • Акты передачи
							</div>
						</div>
					</div>

					<button
						type="button"
						className="waste-btn waste-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно учета медицинских отходов"
					>
						<X size={20} />
					</button>
				</header>

				{/* Tabs Navigation */}
				<div className="flex border-b border-line bg-paper-strong px-6 gap-2 pt-2">
					<button
						type="button"
						className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
							activeTab === "accumulate"
								? "border-teal text-teal-dark bg-paper rounded-t-lg"
								: "border-transparent text-muted hover:text-ink"
						}`}
						onClick={() => setActiveTab("accumulate")}
					>
						<Plus size={16} /> Накопление и Взвешивание
					</button>

					<button
						type="button"
						className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
							activeTab === "journal"
								? "border-teal text-teal-dark bg-paper rounded-t-lg"
								: "border-transparent text-muted hover:text-ink"
						}`}
						onClick={() => setActiveTab("journal")}
					>
						<FileText size={16} /> Технологический Журнал ({records.length})
					</button>

					<button
						type="button"
						className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
							activeTab === "transfer_act"
								? "border-teal text-teal-dark bg-paper rounded-t-lg"
								: "border-transparent text-muted hover:text-ink"
						}`}
						onClick={() => setActiveTab("transfer_act")}
					>
						<Truck size={16} /> Акт Передачи Спецоператору
					</button>
				</div>

				{/* Body */}
				<div className="waste-modal-body">
					{/* Вкладка 1: Фиксация накопления */}
					{activeTab === "accumulate" && (
						<MedicalWasteAccumulateTab
							selectedClass={selectedClass}
							handleClassChange={handleClassChange}
							selectedPackaging={selectedPackaging}
							setSelectedPackaging={setSelectedPackaging}
							packageCount={packageCount}
							setPackageCount={setPackageCount}
							grossWeightInput={grossWeightInput}
							setGrossWeightInput={setGrossWeightInput}
							currentWeights={currentWeights}
							decontamMethod={decontamMethod}
							setDecontamMethod={setDecontamMethod}
							storageLocation={storageLocation}
							setStorageLocation={setStorageLocation}
							sealNumber={sealNumber}
							setSealNumber={setSealNumber}
							barcode={barcode}
							handleAddRecord={handleAddRecord}
							handleQuickShiftWaste={handleQuickShiftWaste}
							isSubmittingQuickShift={isSubmittingQuickShift}
						/>
					)}

					{/* Вкладка 2: Технологический журнал */}
					{activeTab === "journal" && (
						<MedicalWasteJournalTableTab
							records={records}
							onExportCsv={handleExportCsv}
							onPrintThermalSticker={handlePrintThermalSticker}
						/>
					)}

					{/* Вкладка 3: Акт передачи спецоператору */}
					{activeTab === "transfer_act" && (
						<MedicalWasteTransferActTab
							actNumber={actNumber}
							setActNumber={setActNumber}
							disposalCompanyName={disposalCompanyName}
							setDisposalCompanyName={setDisposalCompanyName}
							disposalContractNo={disposalContractNo}
							setDisposalContractNo={setDisposalContractNo}
							driverName={driverName}
							setDriverName={setDriverName}
							vehiclePlate={vehiclePlate}
							setVehiclePlate={setVehiclePlate}
							records={records}
							onCreateAndPrintAct={handleCreateAndPrintAct}
						/>
					)}
				</div>

				{/* Footer */}
				<footer className="waste-modal-footer">
					<button
						type="button"
						className="waste-btn waste-btn-secondary"
						onClick={onClose}
					>
						Закрыть
					</button>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export * from "./MedicalWasteAccumulateTab";
export * from "./MedicalWasteJournalTableTab";
export * from "./MedicalWasteTransferActTab";
