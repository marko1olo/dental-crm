/**
 * ============================================================================
 * MEDICAL WASTE JOURNAL & DECONTAMINATION ACCOUNTING MODAL (САНПИН 2.1.3684-21)
 * Интерактивный сенсорный HUD фиксации накопления, обеззараживания, контроля
 * сроков хранения и формирования официального акта передачи отходов на утилизацию.
 * ============================================================================
 */

import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	Download,
	FileSpreadsheet,
	FileText,
	Filter,
	Flame,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	Scale,
	ShieldAlert,
	ShieldCheck,
	Snowflake,
	Sparkles,
	Thermometer,
	Trash2,
	Truck,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	calculateWasteWeights,
	exportWasteJournalToCsv,
	generateMedicalWasteTransferAct,
	generateWasteBarcode,
	generateWasteSealNumber,
	generateWasteTransferActHtml,
	generateWasteThermalStickerHtml,
	type MedicalWasteJournalRecord,
	type MedicalWasteTransferAct,
	validateStorageDuration,
} from "./medicalWasteEngine.js";
import "./medicalWaste.css";
import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
	getWasteStorageLocation,
	SANPIN_DECONTAMINATION_METHODS,
	SANPIN_MEDICAL_WASTE_CLASSES,
	SANPIN_WASTE_PACKAGING_TYPES,
	SANPIN_STORAGE_LOCATIONS,
	type DecontaminationMethodType,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
	type WasteStorageLocationId,
} from "./medicalWastePresets.js";

export interface MedicalWasteJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialRecords?: readonly MedicalWasteJournalRecord[] | undefined;
	readonly onRecordAdded?: ((record: MedicalWasteJournalRecord) => void) | undefined;
	readonly onActCreated?: ((act: MedicalWasteTransferAct) => void) | undefined;
}

const DEFAULT_DEMO_WASTE_RECORDS: MedicalWasteJournalRecord[] = [
	{
		id: "rec-1",
		timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString().slice(0, 16),
		wasteClass: "class_B",
		departmentNameRu: "Терапевтический кабинет № 1",
		packageType: "yellow_bag",
		packageCount: 2,
		grossWeightKg: 3.2,
		tareWeightKg: 0.16,
		netWeightKg: 3.04,
		sealNumber: "ПЛ-Б-2026-00381",
		barcode: "WASTE-CLASS_B-TER-20260822-1042",
		decontaminationMethod: "chemical_soaking_disinfectant",
		decontamDisinfectantName: "Бриллиант Классик 2% 60 мин",
		storageLocation: "cabinet_room_temp",
		operatorStaffFullName: "Смирнова А.В.",
		operatorStaffPosition: "Медсестра",
		status: "accumulating",
	},
	{
		id: "rec-2",
		timestamp: new Date(Date.now() - 3600 * 1000 * 18).toISOString().slice(0, 16),
		wasteClass: "class_B",
		departmentNameRu: "Хирургический кабинет",
		packageType: "yellow_sharps_box_needle_remover",
		packageCount: 1,
		grossWeightKg: 1.45,
		tareWeightKg: 0.18,
		netWeightKg: 1.27,
		sealNumber: "ПЛ-Б-2026-00382",
		barcode: "WASTE-CLASS_B-SURG-20260821-9921",
		decontaminationMethod: "physical_autoclave_134",
		storageLocation: "waste_refrigerator_2_8",
		operatorStaffFullName: "Иванова Е.К.",
		operatorStaffPosition: "Старшая медсестра",
		status: "accumulating",
	},
	{
		id: "rec-3",
		timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString().slice(0, 16),
		wasteClass: "class_A",
		departmentNameRu: "Административный блок",
		packageType: "white_bag",
		packageCount: 3,
		grossWeightKg: 4.8,
		tareWeightKg: 0.15,
		netWeightKg: 4.65,
		sealNumber: "ПЛ-А-2026-00109",
		barcode: "WASTE-CLASS_A-ADM-20260822-5501",
		decontaminationMethod: "none_class_a",
		storageLocation: "central_accumulation_site",
		operatorStaffFullName: "Петрова Н.С.",
		operatorStaffPosition: "Санитарка",
		status: "accumulating",
	},
];

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
	const [operatorName, setOperatorName] = useState<string>("Смирнова А.В.");
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
	const [driverName, setDriverName] = useState<string>("Кузнецов М.С.");
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

	// Экспорт журнала в CSV
	const handleExportCsv = () => {
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
							<div className="font-bold text-lg leading-tight">
								Учет и Обезвреживание Медицинских Отходов
							</div>
							<div className="text-xs font-normal text-muted">
								СанПиН 2.1.3684-21 • Классы А, Б, Г • Весовой контроль • Акты приема-передачи
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
						<div className="flex flex-col gap-4">
							{/* 1. Выбор класса отходов */}
							<div>
								<div className="text-xs font-bold uppercase text-muted mb-2">
									1. Класс медицинских отходов (СанПиН 2.1.3684-21)
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
									{SANPIN_MEDICAL_WASTE_CLASSES.map((cls) => {
										const isSelected = selectedClass === cls.id;
										return (
											<div
												key={cls.id}
												className={`waste-class-card ${
													cls.id === "class_A" && isSelected
														? "selected-class-a"
														: cls.id === "class_B" && isSelected
														? "selected-class-b"
														: cls.id === "class_V" && isSelected
														? "selected-class-v"
														: isSelected
														? "selected-class-g"
														: ""
												}`}
												onClick={() => handleClassChange(cls.id)}
											>
												<div className="flex items-center justify-between">
													<span
														className="text-xs font-black px-2.5 py-1 rounded-full uppercase"
														style={{
															backgroundColor: cls.colorTheme.hexBadgeBg,
															color: cls.colorTheme.hexBadgeFg,
															border: `1px solid ${cls.colorTheme.hexBorder}`,
														}}
													>
														Класс {cls.letterCode}
													</span>
													{isSelected && <CheckCircle2 size={18} className="text-[var(--teal,#0d9488)]" />}
												</div>
												<div className="font-bold text-sm text-ink">{cls.nameRu}</div>
												<div className="text-xs text-muted leading-tight">
													{cls.dentalSpecificItemsRu[0]}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* 2. Тара, весы и количество */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border border-line bg-paper-soft">
								{/* Тара */}
								<div>
									<label htmlFor="waste-packaging-select" className="text-xs font-semibold text-muted block mb-1">
										Тип тары / Упаковки
									</label>
									<select
										id="waste-packaging-select"
										value={selectedPackaging}
										onChange={(e) => setSelectedPackaging(e.target.value as MedicalWastePackagingTypeId)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
									>
										{SANPIN_WASTE_PACKAGING_TYPES.filter((p) => p.wasteClass === selectedClass).map((pkg) => (
											<option key={pkg.id} value={pkg.id}>
												{pkg.nameRu} (тара {pkg.defaultTareWeightKg} кг)
											</option>
										))}
									</select>
								</div>

								{/* Количество упаковок */}
								<div>
									<label htmlFor="waste-package-count" className="text-xs font-semibold text-muted block mb-1">
										Количество мест (пакетов/баков)
									</label>
									<input
										id="waste-package-count"
										type="number"
										min={1}
										max={50}
										value={packageCount}
										onChange={(e) => setPackageCount(Number(e.target.value))}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								{/* Вес брутто */}
								<div>
									<label htmlFor="waste-gross-weight" className="text-xs font-semibold text-muted block mb-1">
										Вес брутто по весам (кг)
									</label>
									<div className="flex items-center gap-2">
										<Scale size={20} className="text-[var(--teal,#0d9488)]" />
										<input
											id="waste-gross-weight"
											type="number"
											step="0.01"
											min="0.01"
											value={grossWeightInput}
											onChange={(e) => setGrossWeightInput(Number(e.target.value))}
											className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-focus-ring"
										/>
									</div>
								</div>
							</div>

							{/* 3. Дисплей весового баланса */}
							<div className="waste-weight-display">
								<div className="waste-weight-metric">
									<span className="waste-weight-lbl">Брутто (с тарой)</span>
									<span className="waste-weight-val">{currentWeights.grossKg.toFixed(2)} кг</span>
								</div>
								<div className="waste-weight-metric">
									<span className="waste-weight-lbl">Тара (пакет/контейнер)</span>
									<span className="waste-weight-val text-muted">{currentWeights.tareKg.toFixed(2)} кг</span>
								</div>
								<div className="waste-weight-metric">
									<span className="waste-weight-lbl">Чистый вес нетто</span>
									<span className="waste-weight-net-val">{currentWeights.netKg.toFixed(2)} кг</span>
								</div>
							</div>

							{/* 4. Обеззараживание, пломба и место хранения */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								{/* Обеззараживание */}
								<div>
									<label htmlFor="waste-decontam-select" className="text-xs font-semibold text-muted block mb-1">
										Метод обеззараживания
									</label>
									<select
										id="waste-decontam-select"
										value={decontamMethod}
										onChange={(e) => setDecontamMethod(e.target.value as DecontaminationMethodType)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									>
										{SANPIN_DECONTAMINATION_METHODS.map((m) => (
											<option key={m.id} value={m.id}>
												{m.nameRu}
											</option>
										))}
									</select>
								</div>

								{/* Место хранения */}
								<div>
									<label htmlFor="waste-storage-select" className="text-xs font-semibold text-muted block mb-1">
										Режим накопления / Хранилище
									</label>
									<select
										id="waste-storage-select"
										value={storageLocation}
										onChange={(e) => setStorageLocation(e.target.value as WasteStorageLocationId)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									>
										{SANPIN_STORAGE_LOCATIONS.map((loc) => (
											<option key={loc.id} value={loc.id}>
												{loc.nameRu} ({loc.temperatureRangeRu})
											</option>
										))}
									</select>
								</div>

								{/* Номер пломбы */}
								<div>
									<label htmlFor="waste-seal-number" className="text-xs font-semibold text-muted block mb-1">
										Номер бирки / Пломбы-стяжки
									</label>
									<input
										id="waste-seal-number"
										type="text"
										value={sealNumber}
										onChange={(e) => setSealNumber(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>
							</div>

							{/* Штрихкод и кнопка фиксации */}
							<div className="p-4 rounded-xl border border-line bg-paper-soft flex items-center justify-between flex-wrap gap-3">
								<div className="flex items-center gap-3">
									<Barcode size={28} className="text-[var(--teal,#0d9488)]" />
									<div>
										<div className="text-xs text-muted">Сгенерированный штрихкод СанПиН</div>
										<div className="font-mono font-bold text-ink text-sm">{barcode}</div>
									</div>
								</div>

								<button
									type="button"
									onClick={handleAddRecord}
									className="waste-btn waste-btn-primary"
								>
									<CheckCircle2 size={18} /> Зафиксировать в журнале
								</button>
							</div>
						</div>
					)}

					{/* Вкладка 2: Технологический журнал */}
					{activeTab === "journal" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<div className="font-bold text-sm text-ink">
									Записи технологического журнала отходов подразделения
								</div>
								<button
									type="button"
									onClick={handleExportCsv}
									className="waste-btn waste-btn-secondary h-9 text-xs"
								>
									<FileSpreadsheet size={16} /> Экспорт журнала (CSV)
								</button>
							</div>

							<div className="waste-table-wrapper">
								<table className="waste-table">
									<thead>
										<tr>
											<th>Дата / Время</th>
											<th>Класс</th>
											<th>Тара</th>
											<th className="text-center">Мест</th>
											<th className="text-right">Нетто (кг)</th>
											<th>Пломба</th>
											<th>Метод обеззараживания</th>
											<th>Хранение / Срок</th>
											<th>Статус</th>
											<th className="text-center">Этикетка</th>
										</tr>
									</thead>
									<tbody>
										{records.length === 0 ? (
											<tr>
												<td colSpan={10} className="text-center py-8 text-muted">
													<div className="flex flex-col items-center gap-2">
														<ShieldCheck size={32} className="text-muted opacity-50" />
														<div className="font-semibold text-ink text-sm">В журнале пока нет записей медотходов</div>
														<div className="text-xs text-muted max-w-sm">Зафиксируйте первый пакет или емкость с отходами классов А, Б, В или Г на вкладке «Фиксация отходов».</div>
													</div>
												</td>
											</tr>
										) : (
											records.map((r) => {
											const classDef = getMedicalWasteClass(r.wasteClass);
											const storageCheck = validateStorageDuration(r.timestamp, r.storageLocation);

											return (
												<tr key={r.id}>
													<td className="whitespace-nowrap font-medium">{r.timestamp}</td>
													<td>
														<span
															className="waste-badge"
															style={{
																backgroundColor: classDef.colorTheme.hexBadgeBg,
																color: classDef.colorTheme.hexBadgeFg,
																border: `1px solid ${classDef.colorTheme.hexBorder}`,
															}}
														>
															Класс {classDef.letterCode}
														</span>
													</td>
													<td className="text-xs">{getMedicalWastePackaging(r.packageType).nameRu}</td>
													<td className="text-center font-bold">{r.packageCount}</td>
													<td className="text-right font-black text-ink">{r.netWeightKg.toFixed(2)}</td>
													<td className="font-mono text-xs font-semibold text-muted">{r.sealNumber || "—"}</td>
													<td className="text-xs">{getDecontaminationMethod(r.decontaminationMethod).nameRu}</td>
													<td>
														{storageCheck.isExpired ? (
															<span className="text-xs font-bold text-bad-fg flex items-center gap-1">
																<AlertTriangle size={14} /> Истек ({Math.abs(storageCheck.hoursRemaining)} ч)
															</span>
														) : (
															<span className="text-xs font-semibold text-ok-fg flex items-center gap-1">
																<Clock size={14} /> {storageCheck.hoursRemaining} ч
															</span>
														)}
													</td>
													<td>
														{r.status === "accumulating" ? (
															<span className="text-xs font-bold text-amber bg-amber-soft px-2 py-0.5 rounded-full">
																Накопление
															</span>
														) : (
															<span className="text-xs font-bold text-ok-fg bg-ok-bg px-2 py-0.5 rounded-full">
																Вывезено ({r.transferActNumber})
															</span>
														)}
													</td>
													<td className="text-center">
														<button
															type="button"
															onClick={() => handlePrintThermalSticker(r)}
															className="waste-btn waste-btn-secondary min-h-[38px] px-2.5 py-1 text-xs font-bold whitespace-nowrap cursor-pointer hover:border-[var(--teal,#0d9488)]"
															title="Печать термоэтикетки со штрихкодом 58x40 мм для бака/пакета"
															data-testid={`print-sticker-${r.id}`}
														>
															<Printer size={13} className="text-[var(--teal,#0d9488)]" />
															<span>58×40 мм</span>
														</button>
													</td>
												</tr>
											);
										})
									)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Вкладка 3: Акт передачи спецоператору */}
					{activeTab === "transfer_act" && (
						<div className="flex flex-col gap-4">
							<div className="p-4 rounded-xl border border-line bg-paper-soft grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label htmlFor="waste-act-number" className="text-xs font-semibold text-muted block mb-1">
										Номер Акта приема-передачи
									</label>
									<input
										id="waste-act-number"
										type="text"
										value={actNumber}
										onChange={(e) => setActNumber(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-bold focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								<div>
									<label htmlFor="waste-disposal-company" className="text-xs font-semibold text-muted block mb-1">
										Лицензированный Спецоператор по вывозу
									</label>
									<input
										id="waste-disposal-company"
										type="text"
										value={disposalCompanyName}
										onChange={(e) => setDisposalCompanyName(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								<div>
									<label htmlFor="waste-contract-number" className="text-xs font-semibold text-muted block mb-1">
										Номер Договора
									</label>
									<input
										id="waste-contract-number"
										type="text"
										value={disposalContractNo}
										onChange={(e) => setDisposalContractNo(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								<div>
									<label htmlFor="waste-driver-name" className="text-xs font-semibold text-muted block mb-1">
										ФИО водителя / ГРЗ спецавтотранспорта
									</label>
									<div className="flex gap-2">
										<input
											id="waste-driver-name"
											type="text"
											placeholder="Водитель"
											value={driverName}
											onChange={(e) => setDriverName(e.target.value)}
											className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
										/>
										<input
											type="text"
											placeholder="ГРЗ авто"
											value={vehiclePlate}
											onChange={(e) => setVehiclePlate(e.target.value)}
											className="w-32 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-focus-ring"
										/>
									</div>
								</div>
							</div>

							{/* Сводка партии */}
							<div className="p-4 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,#f0fdfa)] flex items-center justify-between">
								<div>
									<div className="text-xs font-semibold text-muted uppercase">Партия к передаче</div>
									<div className="text-lg font-black text-ink">
										{records.filter((r) => r.status === "accumulating").length} мест • Масса нетто:{" "}
										{records
											.filter((r) => r.status === "accumulating")
											.reduce((acc, r) => acc + r.netWeightKg, 0)
											.toFixed(2)}{" "}
										кг
									</div>
								</div>

								<button
									type="button"
									onClick={handleCreateAndPrintAct}
									className="waste-btn waste-btn-primary"
								>
									<Printer size={18} /> Сформировать и Распечатать Акт (А4)
								</button>
							</div>
						</div>
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
