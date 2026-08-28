/**
 * ============================================================================
 * CLINICAL WRITEOFF MODAL (HUD СПИСАНИЯ КЛИНИЧЕСКИХ МАТЕРИАЛОВ ПО ПРИКАЗУ 804Н)
 * Сенсорный Touch-First интерфейс автосписания расходников приема, контроля
 * партий FEFO, фиксации отклонений и генерации нормативных актов (0504230/М-11/ТОРГ-16).
 * ============================================================================
 */

import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Copy,
	Download,
	FileSpreadsheet,
	FileText,
	Layers,
	Package,
	PackageCheck,
	PackagePlus,
	PackageSearch,
	Plus,
	Printer,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	User,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./clinicalWriteoff.css";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	type ClinicalWriteoffTotals,
	type CompletedClinicalService,
	aggregateWriteoffFromServices,
	calculateClinicalWriteoffTotals,
	exportClinicalWriteoffToCsv,
	generateAct0504230Html,
	generateFormM11Html,
	generateTorg16Html,
	kopecksToRubles,
	updateLineActualQuantity,
	validateWriteoffDocument,
} from "./clinicalWriteoffEngine.js";
import {
	CLINICAL_MATERIALS_CATALOG,
	type CabinetStockBatch,
	DEFAULT_CLINIC_LEGAL_INFO,
	DENTAL_CABINET_STOCK_PRESETS,
	DISCREPANCY_REASONS,
	type DiscrepancyReasonCode,
	ORDER_804N_SERVICE_NORMS,
	type Order804nServiceNorm,
	getDiscrepancyReason,
	getOrder804nServiceNorm,
} from "./clinicalWriteoffPresets.js";

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

const DEFAULT_CLINICAL_SERVICES: readonly CompletedClinicalService[] = [
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
	initialServices = DEFAULT_CLINICAL_SERVICES,
	patientName = "Смирнов Алексей Викторович",
	patientId = "PAT-2026-0881",
	patientBirthDate = "1988-04-12",
	doctorFullName = "Д-р Кузнецов М.С.",
	doctorSpecialty = "Врач-стоматолог терапевт",
	assistantFullName = "Смирнова А.В. (ассистент)",
	cabinetId = "cab_01_therapy",
	cabinetNameRu = "Кабинет №1 (Терапия)",
	stockBatches = DENTAL_CABINET_STOCK_PRESETS,
	defaultFormType = "0504230",
	isDeducting = false,
}) => {
	// 1. Состояние шапки акта
	const [actNumber, setActNumber] = useState<string>(
		() => `АКТ-СПИС-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
	);
	const [actDate, setActDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [selectedCabinetId, setSelectedCabinetId] = useState<string>(cabinetId);
	const [statutoryFormType, setStatutoryFormType] = useState<"0504230" | "M11" | "TORG16">(defaultFormType);
	const [notes, setNotes] = useState<string>("");

	// 2. Строки списания
	const [lines, setLines] = useState<ClinicalWriteoffLine[]>([]);

	// Инициализация строк при открытии модального окна
	useEffect(() => {
		if (isOpen) {
			const aggregated = aggregateWriteoffFromServices(
				initialServices,
				stockBatches,
				selectedCabinetId,
				actDate,
			);
			setLines(aggregated);
		}
	}, [isOpen, initialServices, stockBatches, selectedCabinetId, actDate]);

	// Сводные суммы и валидация
	const totals = useMemo<ClinicalWriteoffTotals>(() => {
		return calculateClinicalWriteoffTotals(lines, initialServices.length);
	}, [lines, initialServices.length]);

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
			completedServices: initialServices,
			lines,
			totals,
			statutoryFormType,
			status: "confirmed",
			notes: notes.trim() || undefined,
			confirmedAt: new Date().toISOString(),
			clinicInfo: DEFAULT_CLINIC_LEGAL_INFO,
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
		initialServices,
		lines,
		totals,
		statutoryFormType,
		notes,
	]);

	// 1-Click Списание в наряд
	const handleConfirm = async () => {
		if (!validation.isValid) return;
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
	for (const service of initialServices) {
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
						<div>
							<div className="font-bold text-lg leading-tight">
								Клиническое автосписание материалов (Приказ № 804н)
							</div>
							<div className="text-xs font-normal text-muted flex items-center gap-2 mt-0.5">
								<span>Нормы Минздрава РФ</span> • <span>Партии FEFO</span> •{" "}
								<span>Акты 0504230 / М-11 / ТОРГ-16</span>
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
								className="w-full h-9 px-2.5 rounded-lg border border-line bg-paper text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
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
									className="flex-1 h-9 px-2 rounded-lg border border-line bg-paper text-ink text-xs font-mono font-bold"
								/>
								<input
									type="date"
									value={actDate}
									onChange={(e) => setActDate(e.target.value)}
									className="w-32 h-9 px-1.5 rounded-lg border border-line bg-paper text-ink text-xs"
								/>
							</div>
						</div>
					</div>

					{/* Предупреждения: Сроки годности или дефицит */}
					{totals.hasExpiredLots && (
						<div className="cw-warning-banner cw-warning-red">
							<ShieldAlert size={18} className="shrink-0 text-bad-fg" />
							<div>
								<strong>Внимание! Обнаружены партии с истекшим сроком годности:</strong>
								<div className="mt-0.5">
									Списание просроченных медикаментов пациенту запрещено нормами СанПиН. Выберите свежую партию со склада.
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
									Материалы подлежат первоочередному списанию по регламенту FEFO.
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
								<span>Технологические нормы списания по услугам наряда ({initialServices.length})</span>
							</div>
							<div className="text-xs text-muted">
								Позиций ТМЦ: <span className="font-bold text-ink">{lines.length}</span>
							</div>
						</div>

						{Array.from(servicesMap.entries()).map(([key, { service, lines: serviceLines }]) => {
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
									<div className="cw-table-wrap">
										<table className="cw-table">
											<thead>
												<tr>
													<th>Материал / SKU</th>
													<th>Партия (LOT)</th>
													<th>Срок годности</th>
													<th className="text-center">Норма (804н)</th>
													<th className="text-center">Факт расход</th>
													<th className="text-center">Отклонение</th>
													<th>Причина расхождения</th>
													<th className="text-right">Цена, ₽</th>
													<th className="text-right">Сумма, ₽</th>
													<th></th>
												</tr>
											</thead>
											<tbody>
												{serviceLines.map((line) => {
													const unitRub = kopecksToRubles(line.unitCostKopecks);
													const totalRub = kopecksToRubles(line.totalCostKopecks);
													const isFractional = line.unit === "г" || line.unit === "мл";
													const stepVal = isFractional ? 0.1 : 1;

													return (
														<tr key={line.id}>
															<td>
																<div className="font-semibold text-ink leading-snug">
																	{line.nameRu}
																</div>
																<div className="text-xs text-muted font-mono">{line.sku}</div>
																{line.requiresSerialNumber && (
																	<div className="mt-1 flex items-center gap-1">
																		<span className="text-[11px] font-bold text-teal-dark">SN:</span>
																		<input
																			type="text"
																			placeholder="Введите серийный номер (МДЛП)"
																			value={line.serialNumber || ""}
																			onChange={(e) =>
																				handleSerialNumberChange(line.id, e.target.value)
																			}
																			className="h-7 px-2 rounded border border-line bg-paper text-xs font-mono w-48"
																		/>
																	</div>
																)}
															</td>

															<td>
																<span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-paper-soft border border-line">
																	{line.lotNumber || "БЕЗ ПАРТИИ"}
																</span>
															</td>

															<td>
																{line.expirationDate ? (
																	<span
																		className={`text-xs font-semibold px-2 py-0.5 rounded ${
																			line.isExpired
																				? "bg-bad-bg text-bad-fg font-bold"
																				: line.isExpiringSoon
																					? "bg-amber-100 text-amber-900 font-bold"
																					: "text-muted"
																		}`}
																	>
																		{line.expirationDate}
																		{line.isExpiringSoon && " (≤30 дн)"}
																		{line.isExpired && " (ПРОСРОЧЕНО)"}
																	</span>
																) : (
																	<span className="text-xs text-muted">—</span>
																)}
															</td>

															<td className="text-center font-semibold text-muted">
																{line.standardQuantity} {line.unit}
															</td>

															<td className="text-center">
																<div className="flex items-center justify-center gap-1">
																	<div className="cw-stepper-control">
																		<button
																			type="button"
																			className="cw-stepper-btn"
																			onClick={() =>
																				handleQuantityChange(
																					line.id,
																					Math.max(0, line.actualQuantity - stepVal),
																				)
																			}
																			title="Уменьшить"
																		>
																			-
																		</button>
																		<input
																			type="number"
																			step={stepVal}
																			min={0}
																			value={line.actualQuantity}
																			onChange={(e) =>
																				handleQuantityChange(line.id, Number(e.target.value))
																			}
																			className="cw-stepper-input"
																		/>
																		<button
																			type="button"
																			className="cw-stepper-btn"
																			onClick={() =>
																				handleQuantityChange(
																					line.id,
																					line.actualQuantity + stepVal,
																				)
																			}
																			title="Увеличить"
																		>
																			+
																		</button>
																	</div>
																</div>

																{/* Быстрые чипы приращения */}
																<div className="flex items-center justify-center gap-1 mt-1">
																	{isFractional ? (
																		<>
																			<button
																				type="button"
																				className="cw-chip-btn"
																				onClick={() =>
																					handleQuantityChange(
																						line.id,
																						Number((line.actualQuantity + 0.1).toFixed(2)),
																					)
																				}
																			>
																				+0.1
																			</button>
																			<button
																				type="button"
																				className="cw-chip-btn"
																				onClick={() =>
																					handleQuantityChange(
																						line.id,
																						Number((line.actualQuantity + 0.2).toFixed(2)),
																					)
																				}
																			>
																				+0.2
																			</button>
																		</>
																	) : (
																		<>
																			<button
																				type="button"
																				className="cw-chip-btn"
																				onClick={() =>
																					handleQuantityChange(line.id, line.actualQuantity + 1)
																				}
																			>
																				+1
																			</button>
																			<button
																				type="button"
																				className="cw-chip-btn"
																				onClick={() =>
																					handleQuantityChange(line.id, line.actualQuantity + 2)
																				}
																			>
																				+2
																			</button>
																		</>
																	)}
																	{line.discrepancyQuantity !== 0 && (
																		<button
																			type="button"
																			className="cw-chip-btn text-teal-dark font-bold"
																			onClick={() => handleResetToNorm(line.id)}
																			title="Сбросить к норме 804н"
																		>
																			Норма
																		</button>
																	)}
																</div>
															</td>

															<td className="text-center">
																{line.discrepancyQuantity !== 0 ? (
																	<span
																		className={`text-xs font-bold px-2 py-0.5 rounded-full ${
																			line.discrepancyQuantity > 0
																				? "bg-amber-100 text-amber-900"
																				: "bg-teal-100 text-teal-900"
																		}`}
																	>
																		{line.discrepancyQuantity > 0
																			? `+${line.discrepancyQuantity}`
																			: `${line.discrepancyQuantity}`}{" "}
																		{line.unit}
																	</span>
																) : (
																	<span className="text-xs font-semibold text-ok-fg">Норма</span>
																)}
															</td>

															<td>
																{line.discrepancyQuantity !== 0 ? (
																	<select
																		value={line.discrepancyReasonCode}
																		onChange={(e) =>
																			handleReasonChange(
																				line.id,
																				e.target.value as DiscrepancyReasonCode,
																			)
																		}
																		className="h-8 px-2 rounded border border-line bg-paper text-ink text-xs max-w-[180px]"
																	>
																		{DISCREPANCY_REASONS.map((r) => (
																			<option key={r.code} value={r.code}>
																				{r.labelRu}
																			</option>
																		))}
																	</select>
																) : (
																	<span className="text-xs text-muted">—</span>
																)}
															</td>

															<td className="text-right font-medium text-muted">
																{unitRub.toFixed(2)}
															</td>

															<td className="text-right font-black text-ink">
																{totalRub.toFixed(2)}
															</td>

															<td className="text-center">
																<button
																	type="button"
																	onClick={() => handleRemoveLine(line.id)}
																	className="text-muted hover:text-bad-fg p-1.5 rounded transition-colors"
																	title="Удалить позицию"
																>
																	<Trash2 size={16} />
																</button>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>
							);
						})}
					</div>

					{/* Сводная плашка себестоимости и объемов */}
					<div className="cw-summary-bar">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Услуг в наряде</span>
							<span className="text-lg font-black text-ink">{initialServices.length} проц.</span>
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

				{/* Подвал и управляющие кнопки */}
				<footer className="cw-modal-footer">
					<div className="flex items-center gap-2 flex-wrap">
						{/* Печать официальных актов */}
						<button
							type="button"
							className="cw-btn cw-btn-secondary"
							onClick={() => handlePrintAct("0504230")}
							title="Печать Акта о списании материальных запасов по форме № 0504230 (Приказ Минфина 52н)"
						>
							<Printer size={16} /> Акт 0504230 (Минфин 52н)
						</button>

						<button
							type="button"
							className="cw-btn cw-btn-secondary"
							onClick={() => handlePrintAct("M11")}
							title="Печать Требования-накладной М-11"
						>
							<FileText size={16} /> Накладная М-11
						</button>

						<button
							type="button"
							className="cw-btn cw-btn-secondary"
							onClick={() => handlePrintAct("TORG16")}
							title="Печать Акта о списании товаров ТОРГ-16"
						>
							<FileText size={16} /> Акт ТОРГ-16
						</button>

						<button
							type="button"
							className="cw-btn cw-btn-secondary"
							onClick={handleExportCsv}
							title="Экспорт в CSV"
						>
							<Download size={16} /> CSV
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button type="button" className="cw-btn cw-btn-secondary" onClick={onClose}>
							Отмена
						</button>

						<button
							type="button"
							className="cw-btn cw-btn-primary"
							onClick={handleConfirm}
							disabled={isDeducting || !validation.isValid}
						>
							{isDeducting ? (
								<>
									<RefreshCw size={18} className="animate-spin" /> Списание со склада...
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
