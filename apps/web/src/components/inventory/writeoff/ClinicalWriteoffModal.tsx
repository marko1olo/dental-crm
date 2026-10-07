/**
 * ============================================================================
 * CLINICAL WRITEOFF MODAL (HUD СПИСАНИЯ КЛИНИЧЕСКИХ МАТЕРИАЛОВ ПО ПРИКАЗУ 804Н)
 * Сенсорный Touch-First интерфейс автосписания расходников приема, контроля
 * партий FEFO, фиксации отклонений и генерации нормативных актов (0504230/М-11/ТОРГ-16).
 * ============================================================================
 */

import {
	AlertTriangle,
	Clock,
	Download,
	FileText,
	Layers,
	MoreVertical,
	PackageCheck,
	Printer,
	RefreshCw,
	ShieldAlert,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../GlobalToast.js";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	type ClinicalWriteoffTotals,
	type CompletedClinicalService,
	aggregateWriteoffFromServices,
	calculateClinicalWriteoffTotals,
	createQuickAnesthesiaPackageWriteoffDocument,
	createQuickCarpuleWriteoffDocument,
	createQuickVisitWriteoffDocument,
	exportClinicalWriteoffToCsv,
	generateAct0504230Html,
	generateFormM11Html,
	generateTorg16Html,
	updateLineActualQuantity,
	validateWriteoffDocument,
} from "./clinicalWriteoffEngine.js";
import {
	type CabinetStockBatch,
	DEFAULT_CLINIC_LEGAL_INFO,
	DENTAL_CABINET_STOCK_PRESETS,
	type DiscrepancyReasonCode,
} from "./clinicalWriteoffPresets.js";
import { ClinicalWriteoffQuickStrip } from "./ClinicalWriteoffQuickStrip.js";
import { ClinicalWriteoffServiceTable } from "./ClinicalWriteoffServiceTable.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { useAppStore } from "../../../store/appStore.js";

export interface ClinicalWriteoffModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmWriteoff?: ((doc: ClinicalWriteoffDocument) => void | Promise<void>) | undefined;
	readonly initialServices?: readonly CompletedClinicalService[] | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly assistantFullName?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly defaultFormType?: "0504230" | "M11" | "TORG16" | undefined;
	readonly isDeducting?: boolean | undefined;
}

export const DEFAULT_CLINICAL_SERVICES: readonly CompletedClinicalService[] = [
	{
		serviceCode: "A16.07.002.001",
		toothNumber: 26,
		serviceTitle: "Пломбирование зуба светоотверждаемым композитом",
		quantityMultiplier: 1,
	},
	{
		serviceCode: "A16.07.004",
		toothNumber: 26,
		serviceTitle: "Местная анестезия инфильтрационная",
		quantityMultiplier: 1,
	},
];

export const ClinicalWriteoffModal: React.FC<ClinicalWriteoffModalProps> = ({
	isOpen,
	onClose,
	onConfirmWriteoff,
	initialServices,
	patientName: propPatientName,
	patientId: propPatientId,
	patientBirthDate = "1988-04-12",
	doctorFullName: propDoctorFullName,
	doctorSpecialty = "Врач-стоматолог терапевт",
	assistantFullName = "Смирнова А.В. (ассистент)",
	cabinetId = "cab_01_therapy",
	cabinetNameRu = "Кабинет №1 (Терапия)",
	stockBatches: propStockBatches,
	defaultFormType = "0504230",
	isDeducting = false,
}) => {
	const isDemo = isDemoShowcaseMode();
	const patientName = propPatientName ?? (isDemo ? "Смирнов Алексей Викторович" : "Пациент");
	const patientId = propPatientId ?? (isDemo ? "PAT-2026-0881" : "");
	const doctorFullName = propDoctorFullName ?? (isDemo ? "Д-р Кузнецов М.С." : "Лечащий врач");
	const stockBatches = propStockBatches ?? (isDemo ? DENTAL_CABINET_STOCK_PRESETS : []);

	const services = useMemo((): readonly CompletedClinicalService[] => {
		if (initialServices && initialServices.length > 0) {
			return initialServices;
		}
		if (isDemo) {
			return DEFAULT_CLINICAL_SERVICES;
		}
		try {
			const activeVisitServices = (useAppStore.getState() as any)?.dashboard?.activeVisit?.completedServices;
			if (Array.isArray(activeVisitServices) && activeVisitServices.length > 0) {
				return activeVisitServices.map((s: any) => ({
					serviceCode: s.serviceCode || s.code || "A16.07.002.001",
					toothNumber: s.toothNumber ? Number(s.toothNumber) : undefined,
					serviceTitle: s.serviceTitle || s.title || s.name || "Клиническая процедура",
					quantityMultiplier: s.quantityMultiplier ?? s.quantity ?? 1,
				}));
			}
		} catch {
			// Non-blocking fallback
		}
		return [];
	}, [initialServices, isDemo]);
	// 1. Состояние шапки акта
	const [actNumber, setActNumber] = useState<string>(
		() => `АКТ-СПИС-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-4)}`,
	);
	const [actDate, setActDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [selectedCabinetId, setSelectedCabinetId] = useState<string>(cabinetId);
	const [statutoryFormType] = useState<"0504230" | "M11" | "TORG16">(defaultFormType);
	const [notes, setNotes] = useState<string>("");
	const [isSingleSigner, setIsSingleSigner] = useState<boolean>(true);
	const [showExtraForms, setShowExtraForms] = useState<boolean>(false);

	// 2. Строки списания
	const [lines, setLines] = useState<ClinicalWriteoffLine[]>([]);

	// Инициализация строк при открытии модального окна
	useEffect(() => {
		if (isOpen) {
			const aggregated = aggregateWriteoffFromServices(
				services,
				stockBatches,
				selectedCabinetId,
				actDate,
			);
			setLines(aggregated);
		}
	}, [isOpen, services, stockBatches, selectedCabinetId, actDate]);

	// Сводные суммы и валидация
	const totals = useMemo<ClinicalWriteoffTotals>(() => {
		return calculateClinicalWriteoffTotals(lines, services.length);
	}, [lines, services.length]);

	const validation = useMemo(() => {
		return validateWriteoffDocument({
			patientName,
			doctorFullName,
			lines,
		});
	}, [patientName, doctorFullName, lines]);

	// Изменение фактического количества
	const handleQuantityChange = useCallback((lineId: string, newQty: number) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id === lineId) {
					return updateLineActualQuantity(line, newQty);
				}
				return line;
			}),
		);
	}, []);

	// Изменение причины расхождения
	const handleReasonChange = useCallback((lineId: string, reasonCode: DiscrepancyReasonCode) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id === lineId) {
					return updateLineActualQuantity(line, line.actualQuantity, reasonCode);
				}
				return line;
			}),
		);
	}, []);

	// Изменение серийного номера
	const handleSerialNumberChange = useCallback((lineId: string, serial: string) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id === lineId) {
					return { ...line, serialNumber: serial.trim() };
				}
				return line;
			}),
		);
	}, []);

	// Сброс строки к технологической норме
	const handleResetToNorm = useCallback((lineId: string) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id === lineId) {
					return updateLineActualQuantity(line, line.standardQuantity, "standard_consumption");
				}
				return line;
			}),
		);
	}, []);

	// Удаление позиции
	const handleRemoveLine = useCallback((lineId: string) => {
		setLines((prev) => prev.filter((l) => l.id !== lineId));
	}, []);

	// Экспресс-списание карпулы анестетика (Мандат 8e п. 10, Мандат 8n)
	const handleQuickCarpuleWriteoff = useCallback(() => {
		const doc = createQuickCarpuleWriteoffDocument({
			count: 1,
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			nurseFullName: assistantFullName || doctorFullName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Списание карпулы анестетика оформлено без комиссии!", "success");
	}, [selectedCabinetId, stockBatches, assistantFullName, doctorFullName]);

	// Экспресс-списание пакета анестезии (карпула 1.7 мл + игла 30G + антисептик) без комиссии (Мандат 8e п. 10, 8n)
	const handleQuickAnesthesiaPackageWriteoff = useCallback(() => {
		const doc = createQuickAnesthesiaPackageWriteoffDocument({
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			nurseFullName: assistantFullName || doctorFullName,
			doctorFullName,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Пакет анестезии (карпула + игла + антисептик) списан без комиссии!", "success");
	}, [selectedCabinetId, stockBatches, assistantFullName, doctorFullName, patientName]);

	// Экспресс-списание визита терапии
	const handleQuickTherapyWriteoff = useCallback(() => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "therapy",
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			doctorFullName,
			doctorSpecialty,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Акт списания материалов терапии сформирован!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName]);

	// Экспресс-списание визита хирургии
	const handleQuickSurgeryWriteoff = useCallback(() => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "surgery",
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			doctorFullName,
			doctorSpecialty,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Акт списания материалов хирургии сформирован!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName]);

	// Формирование объекта документа
	const currentDocument = useMemo<ClinicalWriteoffDocument>(() => {
		return {
			id: `doc_writeoff_${Date.now()}`,
			actNumber,
			actDate,
			patientId,
			patientName,
			patientBirthDate,
			doctorFullName,
			doctorSpecialty,
			assistantFullName,
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			completedServices: services,
			lines,
			totals,
			statutoryFormType,
			status: "confirmed",
			notes: notes.trim() || undefined,
			confirmedAt: new Date().toISOString(),
			clinicInfo: DEFAULT_CLINIC_LEGAL_INFO,
			isSingleSigner,
		};
	}, [
		actNumber,
		actDate,
		patientId,
		patientName,
		patientBirthDate,
		doctorFullName,
		doctorSpecialty,
		assistantFullName,
		selectedCabinetId,
		services,
		lines,
		totals,
		statutoryFormType,
		notes,
		isSingleSigner,
	]);

	// 1-Click Списание в наряд (Мандат 8e: без скрытых блокировок, ясный фидбек)
	const handleConfirm = async () => {
		if (!validation.isValid) {
			const errorMsg = validation.errors[0] ?? "Заполните обязательные поля акта списания";
			showToast(errorMsg, "warning");
			return;
		}
		if (onConfirmWriteoff) {
			await onConfirmWriteoff(currentDocument);
		}
		onClose();
	};

	// 1-Click Печать официального акта (0504230, М-11, ТОРГ-16)
	const handlePrintAct = (formType: "0504230" | "M11" | "TORG16") => {
		let html = "";
		if (formType === "0504230") {
			html = generateAct0504230Html(currentDocument);
		} else if (formType === "M11") {
			html = generateFormM11Html(currentDocument);
		} else {
			html = generateTorg16Html(currentDocument);
		}

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

	// Экспорт в CSV
	const handleExportCsv = () => {
		const csv = exportClinicalWriteoffToCsv([currentDocument]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${actNumber}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	if (!isOpen) return null;

	// Группировка строк по услугам приема
	const servicesMap = new Map<string, { service: CompletedClinicalService; lines: ClinicalWriteoffLine[] }>();
	for (const service of services) {
		const key = `${service.serviceCode}_${service.toothNumber || "general"}`;
		servicesMap.set(key, {
			service,
			lines: lines.filter(
				(l) => l.serviceCode === service.serviceCode && l.toothNumber === service.toothNumber,
			),
		});
	}

	const modalContent = (
		<div
			className="cw-modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="cw-modal-title"
			data-testid="clinical-writeoff-modal"
		>
			<div className="cw-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Шапка модального окна */}
				<header className="cw-modal-header">
					<div className="cw-modal-title" id="cw-modal-title">
						<PackageCheck size={26} className="text-teal-600 shrink-0" />
						<div className="min-w-0">
							<div
								className="font-bold text-lg leading-tight truncate"
								title="Клиническое списание материалов по выполненным процедурам"
							>
								Клиническое списание материалов
							</div>
							<div className="text-xs font-normal text-muted flex items-center gap-2 mt-0.5 truncate">
								<span>Клинические нормы</span> • <span>Партии по срокам</span> •{" "}
								<span>Акты списания материалов</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						className="cw-btn cw-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно автосписания"
					>
						<X size={20} />
					</button>
				</header>

				{/* Тело модального окна */}
				<div className="cw-modal-body">
					{/* Паспорт наряда приема */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl border border-line bg-paper-soft">
						<div>
							<span className="text-xs font-semibold text-muted block mb-1">Пациент</span>
							<div className="font-bold text-sm text-ink">{patientName}</div>
							<div className="text-xs text-muted">ID: {patientId}</div>
						</div>

						<div>
							<span className="text-xs font-semibold text-muted block mb-1">Лечащий врач (МОЛ)</span>
							<div className="font-bold text-sm text-ink">{doctorFullName}</div>
							<div className="text-xs text-muted">{doctorSpecialty}</div>
						</div>

						<div>
							<label htmlFor="cw-cabinet-select" className="text-xs font-semibold text-muted block mb-1">
								Кабинет списания (Кресло)
							</label>
							<select
								id="cw-cabinet-select"
								value={selectedCabinetId}
								onChange={(e) => setSelectedCabinetId(e.target.value)}
								className="w-full min-h-[44px] px-2.5 rounded-lg border border-line bg-paper text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
							>
								<option value="cab_01_therapy">Кабинет №1 (Терапия)</option>
								<option value="cab_02_surgery">Кабинет №2 (Хирургия)</option>
							</select>
						</div>

						<div>
							<span className="text-xs font-semibold text-muted block mb-1">№ Акта и Дата</span>
							<div className="flex gap-1.5">
								<input
									type="text"
									value={actNumber}
									onChange={(e) => setActNumber(e.target.value)}
									className="flex-1 min-h-[44px] px-2 rounded-lg border border-line bg-paper text-ink text-xs font-mono font-bold"
								/>
								<input
									type="date"
									value={actDate}
									onChange={(e) => setActDate(e.target.value)}
									className="w-32 min-h-[44px] px-1.5 rounded-lg border border-line bg-paper text-ink text-xs"
								/>
							</div>
						</div>
					</div>

					{/* Экспресс-Списание и Единоличное списание */}
					<ClinicalWriteoffQuickStrip
						onQuickCarpuleWriteoff={handleQuickCarpuleWriteoff}
						onQuickAnesthesiaPackageWriteoff={handleQuickAnesthesiaPackageWriteoff}
						onQuickTherapyWriteoff={handleQuickTherapyWriteoff}
						onQuickSurgeryWriteoff={handleQuickSurgeryWriteoff}
					/>

					{/* Предупреждения: Сроки годности или дефицит */}
					{totals.hasExpiredLots && (
						<div className="cw-warning-banner cw-warning-red">
							<ShieldAlert size={18} className="shrink-0 text-bad-fg" />
							<div>
								<strong>Внимание! Обнаружены партии с истекшим сроком годности:</strong>
								<div className="mt-0.5">
									Списание просроченных медикаментов пациенту запрещено санитарными нормами. Выберите свежую партию со склада.
								</div>
							</div>
						</div>
					)}

					{totals.hasExpiringLots && !totals.hasExpiredLots && (
						<div className="cw-warning-banner cw-warning-amber">
							<Clock size={18} className="shrink-0 text-amber-600" />
							<div>
								<strong>Внимание! Партии, истекающие в течение 30 дней ({totals.expiringBatchesCount} поз.):</strong>
								<div className="mt-0.5">
									Материалы подлежат первоочередному списанию по сроку годности (FEFO).
								</div>
							</div>
						</div>
					)}

					{totals.hasDeficit && !totals.hasExpiredLots && (
						<div className="cw-warning-banner cw-warning-amber">
							<AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<div>
								<strong>Внимание: остаток отрицательный, требуется оприходование накладной (списание с дефицитом: {totals.deficitItemsCount} поз.):</strong>
								<div className="mt-0.5">
									Позиции будут списаны с отрицательным остатком до оприходования накладной медсестрой (Клинический регламент, режим соло-практики). Задержка накладной не блокирует прием.
								</div>
							</div>
						</div>
					)}

					{!validation.isValid && (
						<div className="cw-warning-banner cw-warning-red">
							<AlertTriangle size={18} className="shrink-0 text-bad-fg" />
							<div>
								<strong>Ошибки валидации акта списания:</strong>
								<ul className="list-disc pl-4 mt-0.5">
									{validation.errors.map((err, i) => (
										<li key={i}>{err}</li>
									))}
								</ul>
							</div>
						</div>
					)}

					{/* Дерево выполненных услуг и списание материалов */}
					<div className="flex flex-col gap-4">
						<div className="font-bold text-sm flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Layers size={18} className="text-teal-600" />
								<span>Технологические нормы списания по услугам наряда ({services.length})</span>
							</div>
							<div className="text-xs text-muted">
								Позиций ТМЦ: <span className="font-bold text-ink">{lines.length}</span>
							</div>
						</div>

						{services.length === 0 ? (
							<div
								className="p-8 text-center text-muted bg-paper-soft rounded-xl border border-line flex flex-col items-center justify-center gap-2"
								data-testid="cw-empty-services"
							>
								<Layers size={32} className="text-slate-400 opacity-60" />
								<p className="font-semibold text-sm text-ink">
									В текущем приёме нет выполненных клинических услуг
								</p>
								<p className="text-xs text-muted max-w-md">
									Автосписание материалов активируется при добавлении процедур в наряд или при применении клинического протокола
								</p>
							</div>
						) : (
							Array.from(servicesMap.entries()).map(([key, { service, lines: serviceLines }]) => {
								return (
									<div key={key} className="cw-service-card">
										{/* Заголовок услуги */}
										<div className="cw-service-card-header">
											<div className="flex items-center gap-2.5 flex-wrap">
												<span className="cw-service-badge">{service.serviceCode}</span>
												{service.toothNumber && (
													<span className="cw-tooth-badge">Зуб №{service.toothNumber}</span>
												)}
												<span className="font-bold text-sm text-ink">
													{service.serviceTitle || `Услуга ${service.serviceCode}`}
												</span>
											</div>
											<div className="text-xs text-muted">
												Позиций к списанию: <strong>{serviceLines.length}</strong>
											</div>
										</div>

										{/* Таблица материалов услуги */}
										<ClinicalWriteoffServiceTable
											serviceLines={serviceLines}
											onQuantityChange={handleQuantityChange}
											onReasonChange={handleReasonChange}
											onSerialNumberChange={handleSerialNumberChange}
											onResetToNorm={handleResetToNorm}
											onRemoveLine={handleRemoveLine}
										/>
									</div>
								);
							})
						)}
					</div>

					{/* Сводная плашка себестоимости и объемов */}
					<div className="cw-summary-bar">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Услуг в наряде</span>
							<span className="text-lg font-black text-ink">{services.length} проц.</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Расходников списано</span>
							<span className="text-lg font-black text-ink">{totals.totalMaterialsQuantity} ед.</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Сумма списания (Себестоимость)</span>
							<span className="text-xl font-extrabold text-teal-dark">
								{totals.totalCostFormatted}
							</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold uppercase text-muted">Сумма отклонений</span>
							<span className="text-lg font-black text-ink">
								{totals.totalDiscrepancyCostFormatted}
							</span>
						</div>
					</div>
				</div>

				{/* Подвал и управляющие кнопки (Мандат 8d: не более 1-2 кнопок прямого действия) */}
				<footer className="cw-modal-footer">
					<div className="flex items-center gap-2 relative">
						{/* Secondary direct action: Печать акта 0504230 */}
						<button
							type="button"
							className="cw-btn cw-btn-secondary"
							onClick={() => handlePrintAct("0504230")}
							title="Печать Акта о списании материальных запасов по форме № 0504230 (Приказ Минфина 52н)"
						>
							<Printer size={16} /> Акт 0504230 (Минфин 52н)
						</button>

						{/* Secondary menu ... (другие формы и экспорт) */}
						<div className="relative">
							<button
								type="button"
								className="cw-btn cw-btn-secondary p-2"
								onClick={() => setShowExtraForms((v) => !v)}
								title="Другие бланки и экспорт..."
								aria-label="Другие бланки и экспорт"
							>
								<MoreVertical size={16} />
							</button>

							{showExtraForms && (
								<div
									className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1"
									onClick={() => setShowExtraForms(false)}
								>
									<button
										type="button"
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
										onClick={() => handlePrintAct("M11")}
										title="Печать Требования-накладной на списание (форма М-11)"
									>
										<FileText size={14} className="text-teal-600" />
										<span>Накладная на списание</span>
										<span className="text-[10px] opacity-60 ml-auto font-mono">Накладная</span>
									</button>

									<button
										type="button"
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
										onClick={() => handlePrintAct("TORG16")}
										title="Печать акта о списании материалов"
									>
										<FileText size={14} className="text-teal-600" />
										<span>Акт списания материалов</span>
										<span className="text-[10px] opacity-60 ml-auto font-mono">Акт списания</span>
									</button>

									<button
										type="button"
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
										onClick={handleExportCsv}
										title="Экспорт в CSV"
									>
										<Download size={14} className="text-teal-600" />
										<span>Экспорт в CSV</span>
									</button>
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button type="button" className="cw-btn cw-btn-secondary" onClick={onClose}>
							Отмена
						</button>

						<button
							type="button"
							className={`cw-btn ${
								!validation.isValid
									? "cw-btn-secondary border-amber-500/50 text-amber-700 dark:text-amber-300"
									: totals.hasDeficit
										? "cw-btn-primary bg-amber-600 hover:bg-amber-500 border-amber-400/50 text-white"
										: "cw-btn-primary"
							}`}
							onClick={handleConfirm}
							disabled={isDeducting}
							title={
								!validation.isValid
									? `Внимание: ${validation.errors[0] || "Требуется заполнить обязательные поля"}`
									: totals.hasDeficit
										? "Позиции будут списаны с отрицательным остатком до оприходования накладной медсестрой (Клинический регламент, режим соло-практики)"
										: "Списать материалы со склада в наряд визита"
							}
						>
							{isDeducting ? (
								<>
									<RefreshCw size={18} className="animate-spin" /> Списание со склада...
								</>
							) : totals.hasDeficit ? (
								<>
									<AlertTriangle size={18} /> Списать (с дефицитом: {totals.deficitItemsCount} поз.)
								</>
							) : (
								<>
									<PackageCheck size={18} /> Списать материалы в наряд
								</>
							)}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
