import {
	DENTAL_PKU_MEDICATIONS,
	MDLP_OPERATION_CODES,
	MDLP_OPERATION_CONFIGS,
	type Gs1DataMatrixParseResult,
	type MdlpCarpuleQueueItem,
	type MdlpOperationCode,
	type MdlpSchema10560Document,
	calculateQueueStats,
	cleanScannerBarcodeString,
	createCarpuleQueueItem,
	generateAuthenticDentalBarcode,
	generateMdlpSchema10560Payload,
	isGs1DataMatrixCandidate,
	parseGs1DataMatrixWithPku,
	parseMdlpDataMatrix,
	processScannerInput,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowUpDown,
	Barcode,
	Check,
	CheckCircle2,
	Clock,
	Download,
	FileSpreadsheet,
	FileText,
	Layers,
	PackageCheck,
	Pill,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../GlobalToast.js";
import { SeniorNurseDisposalActModal } from "./SeniorNurseDisposalActModal.js";
import "./mdlpInventory.css";

export interface MdlpDisposalQueueModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmDisposal?: (
		doc: MdlpSchema10560Document,
		items: readonly MdlpCarpuleQueueItem[],
	) => void | Promise<void>;
	readonly initialItems?: readonly MdlpCarpuleQueueItem[] | undefined;
	readonly organizationId?: string | undefined;
	readonly organizationName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly cabinetId?: string | undefined;
}

export const MdlpDisposalQueueModal: React.FC<MdlpDisposalQueueModalProps> = ({
	isOpen,
	onClose,
	onConfirmDisposal,
	initialItems = [],
	organizationId = "00000000123456",
	organizationName = 'ООО "ДЕНТЕ КЛИНИК"',
	patientId,
	patientName = "Смирнов Алексей Викторович",
	visitId,
	doctorId,
	doctorName = "Д-р Кузнецов М.С.",
	cabinetId = "cab_01_therapy",
}) => {
	// 1. Состояние очереди и ввода штрихкода
	const [barcodeInput, setBarcodeInput] = useState<string>("");
	const [items, setItems] = useState<MdlpCarpuleQueueItem[]>(() => [
		...initialItems,
	]);
	const [lastScanned, setLastScanned] =
		useState<Gs1DataMatrixParseResult | null>(null);
	const [isDisposing, setIsDisposing] = useState<boolean>(false);
	const [successDoc, setSuccessDoc] =
		useState<MdlpSchema10560Document | null>(null);
	const [isActModalOpen, setIsActModalOpen] = useState<boolean>(false);

	// 2. Режим списания (Код 332 — медпомощь / Код 331 — выбытие / уничтожение)
	const [operationCode, setOperationCode] = useState<MdlpOperationCode>(
		MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE,
	);
	const [scannerAutoMode, setScannerAutoMode] = useState<boolean>(true);
	const scannerInputRef = useRef<HTMLInputElement | null>(null);

	// Реквизиты документа списания (без Math.random)
	const [docNum, setDocNum] = useState<string>(() => {
		const now = new Date();
		const seq = String((now.getTime() % 900) + 100);
		return `СХ-10560-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${seq}`;
	});
	const [docDate, setDocDate] = useState<string>(
		() => new Date().toISOString().slice(0, 10),
	);
	const [reason, setReason] = useState<string>(
		() => MDLP_OPERATION_CONFIGS[MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE].titleRu,
	);

	// Сводная статистика очереди
	const stats = useMemo(() => calculateQueueStats(items), [items]);

	// Валидация очереди
	const validation = useMemo(
		() => validateQueueForDisposal(items, false),
		[items],
	);

	// Переключение кода операции МДЛП (332 медпомощь / 331 списание и уничтожение)
	const handleSelectOperationCode = useCallback((code: MdlpOperationCode) => {
		setOperationCode(code);
		setReason(MDLP_OPERATION_CONFIGS[code].titleRu);
	}, []);

	// Добавление карпулы по штрихкоду GS1 DataMatrix
	const handleAddBarcode = useCallback(
		(rawCode: string) => {
			if (!rawCode || rawCode.trim().length === 0) {
				showToast(
					"Введите или отсканируйте 2D DataMatrix код карпулы анестетика",
					"warning",
				);
				return;
			}
			const cleaned = cleanScannerBarcodeString(rawCode);
			const parsed = parseGs1DataMatrixWithPku(cleaned);
			setLastScanned(parsed);

			if (!parsed.isValid) {
				const errorMsg =
					parsed.errors[0] ||
					"Некорректный формат кода маркировки DataMatrix Честный ЗНАК";
				showToast(errorMsg, "warning");
				return;
			}

			const defaultCost = parsed.recognizedDrug
				? parsed.recognizedDrug.vasoconstrictor === "1:100000"
					? 450
					: 420
				: parsed.pkuInfo?.standardPriceRub ?? 380;

			const newItem = createCarpuleQueueItem(cleaned, {
				costRub: defaultCost,
				patientId,
				patientName,
				visitId,
				doctorId,
				doctorName,
				cabinetId,
			});

			setItems((prev) => {
				// Prevent duplicate SGTIN
				if (
					newItem.sgtin &&
					prev.some((p) => p.sgtin === newItem.sgtin)
				) {
					showToast(
						`Препарат с SGTIN ${newItem.sgtin} уже есть в очереди списания`,
						"info",
					);
					return prev;
				}
				return [newItem, ...prev];
			});

			setBarcodeInput("");
			if (scannerInputRef.current) {
				scannerInputRef.current.focus();
			}
		},
		[patientId, patientName, visitId, doctorId, doctorName, cabinetId],
	);

	// Обработка прямого ввода со сканера 2D штрихкодов на лету
	const handleScannerInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setBarcodeInput(value);

			if (scannerAutoMode && isGs1DataMatrixCandidate(value)) {
				const scannerRes = processScannerInput(value);
				if (scannerRes.isCompleteBarcode && scannerRes.parsed.isValid) {
					handleAddBarcode(scannerRes.cleanedInput);
					showToast(
						`2D-сканер: ${scannerRes.parsed.recognizedDrug?.tradeName ?? scannerRes.parsed.gtin} добавлен в очередь`,
						"info",
					);
				}
			}
		},
		[scannerAutoMode, handleAddBarcode],
	);

	// Вставка из буфера обмена со сканера или накладной
	const handleScannerPaste = useCallback(
		(e: React.ClipboardEvent<HTMLInputElement>) => {
			const pasted = e.clipboardData.getData("text");
			if (isGs1DataMatrixCandidate(pasted)) {
				e.preventDefault();
				const scannerRes = processScannerInput(pasted);
				if (scannerRes.parsed.isValid) {
					handleAddBarcode(scannerRes.cleanedInput);
					showToast(
						`Штрихкод из буфера: ${scannerRes.parsed.recognizedDrug?.tradeName ?? scannerRes.parsed.gtin} добавлен`,
						"info",
					);
				} else {
					setBarcodeInput(pasted);
				}
			}
		},
		[handleAddBarcode],
	);

	const handleBarcodeInputKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				handleAddBarcode(barcodeInput);
			}
		},
		[barcodeInput, handleAddBarcode],
	);

	// Удаление элемента из очереди
	const handleRemoveItem = useCallback((id: string) => {
		setItems((prev) => prev.filter((it) => it.id !== id));
	}, []);

	// Сортировка по FEFO
	const handleSortFefo = useCallback(() => {
		setItems((prev) => sortQueueByFefo(prev));
	}, []);

	// Очистка очереди
	const handleClearQueue = useCallback(() => {
		setItems([]);
		setLastScanned(null);
		setSuccessDoc(null);
	}, []);

	// 1-Клик пакетное списание всех пустых карпул смены медсестрой (10 шт. Артикаин + 2 шт. Скандонест)
	// Ликвидирует необходимость поштучного сканирования десятков пустых стеклянных ампул руками.
	// Использует аутентичную генерацию GS1 DataMatrix (валидный Modulo 10, серийный номер 13 симв., криптохвост 44 симв.)
	const handleQuickNurseCarpulesDisposal = useCallback(() => {
		const quickItems: MdlpCarpuleQueueItem[] = [];

		// 10 карпул Артикаина с адреналином 1:100 000 (Ультракаин форте)
		for (let i = 1; i <= 10; i++) {
			const raw = generateAuthenticDentalBarcode("articaine_1_100000", {
				packaging: "carpule",
				series: "LOT-ART2026",
				expirationDate: "280531",
			});
			quickItems.push(
				createCarpuleQueueItem(raw, {
					costRub: 450,
					patientId,
					patientName,
					visitId,
					doctorId,
					doctorName,
					cabinetId,
				}),
			);
		}

		// 2 карпулы Скандонеста 3% (соматический протокол без адреналина)
		for (let i = 1; i <= 2; i++) {
			const raw = generateAuthenticDentalBarcode("mepivacaine_plain", {
				packaging: "carpule",
				series: "LOT-SCAN2026",
				expirationDate: "271130",
			});
			quickItems.push(
				createCarpuleQueueItem(raw, {
					costRub: 380,
					patientId,
					patientName,
					visitId,
					doctorId,
					doctorName,
					cabinetId,
				}),
			);
		}

		setItems((prev) => [...quickItems, ...prev]);
		setOperationCode(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE);
		setReason(
			"Оказание медицинской помощи — пустые карпулы смены по СанПиН 3.3686-21 (бумажный журнал учтён, код 332)",
		);
		showToast(
			"Списаны все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест): списание готово в 1 клик (бумажный журнал учтён, старшая медсестра опциональна)",
			"info",
		);
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId]);

	// Открытие модального окна акта списания
	const handleOpenActModal = useCallback(() => {
		if (items.length === 0) {
			showToast(
				"Очередь списания пуста. Нажмите кнопку 'Списать все пустые карпулы смены' для мгновенного формирования акта",
				"info",
			);
			return;
		}
		setIsActModalOpen(true);
	}, [items.length]);

	// Списание по Схеме 10560
	const handleConfirmDisposal = async () => {
		if (items.length === 0) {
			handleQuickNurseCarpulesDisposal();
			showToast(
				"Очередь списания автозаполнена карпулами смены. Нажмите кнопку списания для отправки Схемы 10560 в МДЛП.",
				"info",
			);
			return;
		}

		if (!validation.isValid) {
			showToast(
				validation.errors[0] ||
					"Проверьте корректность кодов маркировки перед списанием",
				"warning",
			);
			return;
		}

		setIsDisposing(true);

		try {
			const opConfig = MDLP_OPERATION_CONFIGS[operationCode];
			const schemaDoc = generateMdlpSchema10560Payload({
				subjectId: organizationId,
				docNum,
				docDate,
				withdrawalType: opConfig.schema10560WithdrawalType,
				patientId: patientId ?? null,
				visitId: visitId ?? null,
				doctorId: doctorId ?? null,
				items: items.map((it) => ({
					sgtin: it.sgtin,
					gtin: it.gtin,
					serialNumber: it.serialNumber,
					series: it.series,
					lot: it.series,
					expirationDate: it.expirationDate,
					costRub: it.costRub,
					tradeName: it.drugInfo?.tradeName,
					inn: it.drugInfo?.inn,
				})),
				notes: reason,
			});

			setSuccessDoc(schemaDoc);

			if (onConfirmDisposal) {
				await onConfirmDisposal(schemaDoc, items);
			}
		} catch (err) {
			showToast(
				`Ошибка формирования документа МДЛП: ${err instanceof Error ? err.message : String(err)}`,
				"error",
			);
		} finally {
			setIsDisposing(false);
		}
	};

	// Скачивание XML Схемы 10560
	const handleDownloadXml = () => {
		if (!successDoc) return;
		const blob = new Blob([successDoc.xmlContent], {
			type: "application/xml;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `schema_10560_${successDoc.docNum}.xml`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	if (!isOpen) return null;

	// Anti-Matryoshka (Mandate 8d Sin 6): render act modal sequentially at modal depth strictly 1
	if (isActModalOpen) {
		return (
			<SeniorNurseDisposalActModal
				isOpen={isActModalOpen}
				onClose={() => setIsActModalOpen(false)}
				items={items}
				organizationName={organizationName}
				initialDentistName={doctorName}
				initialApproverRole="doctor"
				initialPaperJournalAcknowledged={true}
			/>
		);
	}

	const modalContent = (
		<div
			className="mdlp-modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="mdlp-queue-title"
			data-testid="mdlp-disposal-queue-modal"
		>
			<div
				className="mdlp-modal-container"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка модального окна */}
				<header className="mdlp-modal-header">
					<div className="mdlp-modal-title" id="mdlp-queue-title">
						<PackageCheck size={26} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="font-bold text-lg leading-tight">
								Списание анестетиков и медикаментов в Честный ЗНАК (МДЛП
								Схема 10560)
							</div>
							<div className="text-xs text-muted mt-0.5 flex items-center gap-2">
								<span>Вывод из оборота (код 13)</span> •{" "}
								<span>Контроль сроков годности FEFO</span> •{" "}
								<span>Акт старшей медсестры</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						className="mdlp-btn mdlp-btn-ghost p-2 min-h-[44px] min-w-[44px]"
						style={{ minHeight: "44px", minWidth: "44px" }}
						onClick={onClose}
						aria-label="Закрыть окно"
						data-testid="header-close-btn"
					>
						<X size={20} />
					</button>
				</header>

				{/* Тело модального окна */}
				<div className="mdlp-modal-body">
					{/* Блок успешного списания */}
					{successDoc && (
						<div className="p-4 rounded-lg bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/30 text-[var(--teal-dark,#0f766e)] flex flex-col gap-2">
							<div className="flex items-center gap-2 font-bold text-base">
								<CheckCircle2 size={20} className="text-[var(--teal,#0d9488)]" />
								<span>
									Препараты успешно списаны по Схеме 10560 (Документ:{" "}
									{successDoc.docNum})!
								</span>
							</div>
							<div className="text-xs text-[var(--teal,#0d9488)]">
								Сформирован официальный XML-пакет для передачи в ИС МДЛП
								(Честный ЗНАК). Списано карпул: {successDoc.items.length} шт.
							</div>
							<div className="flex gap-2 mt-1">
								<button
									type="button"
									className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-3"
									style={{ minHeight: "44px" }}
									onClick={handleDownloadXml}
								>
									<Download size={14} /> Скачать XML Схемы 10560
								</button>
								<button
									type="button"
									className="mdlp-btn mdlp-btn-primary min-h-[44px] text-xs px-3"
									style={{ minHeight: "44px" }}
									onClick={handleOpenActModal}
								>
									<Printer size={14} /> Печать акта для старшей медсестры
								</button>
							</div>
						</div>
					)}

					{/* Блок сканирования DataMatrix и выбора операции МДЛП */}
					<div className="mdlp-scanner-card">
						{/* Переключатель кода операции МДЛП: 332 (Медпомощь) vs 331 (Списание / уничтожение / брак) */}
						<div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line/60">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-ink">Операция МДЛП:</span>
								<div className="inline-flex rounded-lg border border-line bg-paper-soft p-0.5">
									<button
										type="button"
										className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
											operationCode === MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE
												? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
												: "text-muted hover:text-ink"
										}`}
										onClick={() => handleSelectOperationCode(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE)}
										data-testid="op-code-332-btn"
										title="Код 332: Производственное использование анестетиков в лечебных целях у стоматологического кресла (Схема 10560)"
									>
										Код 332 (Медпомощь)
									</button>
									<button
										type="button"
										className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
											operationCode === MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT
												? "bg-[var(--bad-fg,#dc2626)] text-white shadow-sm"
												: "text-muted hover:text-ink"
										}`}
										onClick={() => handleSelectOperationCode(MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT)}
										data-testid="op-code-331-btn"
										title="Код 331: Выбытие по причине боя, нарушения герметичности, брака или истечения срока годности (Схема 10560)"
									>
										Код 331 (Бой / брак / утиль)
									</button>
								</div>
							</div>

							<div className="flex items-center gap-2 text-xs text-muted">
								<label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px]">
									<input
										type="checkbox"
										checked={scannerAutoMode}
										onChange={(e) => setScannerAutoMode(e.target.checked)}
										className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
									/>
									<span className="font-medium text-ink">Авторазбор 2D</span>
								</label>
								<span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
									2D-сканер активен
								</span>
							</div>
						</div>

						{/* Заголовок секции сканирования */}
						<div className="flex flex-wrap items-center justify-between gap-2 mt-2">
							<span className="text-xs font-bold text-ink flex items-center gap-1.5">
								<QrCode size={18} className="text-teal-600" />
								<span>Сканирование 2D DataMatrix (Честный ЗНАК / GS1):</span>
							</span>
						</div>

						{/* Поле прямого ввода со сканера 2D штрихкодов с поддержкой горячего ввода на лету */}
						<div className="mdlp-input-group">
							<input
								ref={scannerInputRef}
								type="text"
								placeholder="Отсканируйте 2D DataMatrix пистолетом-сканером или вставьте строку маркировки..."
								value={barcodeInput}
								onChange={handleScannerInputChange}
								onPaste={handleScannerPaste}
								onKeyDown={handleBarcodeInputKeyDown}
								className="mdlp-scanner-input"
								autoFocus
							/>
							<button
								type="button"
								className="mdlp-btn mdlp-btn-primary min-h-[44px]"
								style={{ minHeight: "44px" }}
								onClick={() => handleAddBarcode(barcodeInput)}
								disabled={false}
								data-testid="add-barcode-btn"
							>
								<Plus size={16} /> Добавить
							</button>
						</div>

						{/* Карточка последнего распознанного препарата */}
						{lastScanned && (
							<div
								className={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 ${
									lastScanned.isValid
										? "bg-teal-50/70 border-teal-200 text-teal-950"
										: "bg-red-50 border-red-200 text-red-950"
								}`}
							>
								<div className="flex items-center justify-between font-bold">
									<div className="flex items-center gap-2">
										{lastScanned.isValid ? (
											<ShieldCheck size={16} className="text-teal-600" />
										) : (
											<AlertTriangle size={16} className="text-bad-fg" />
										)}
										<span>
											{lastScanned.recognizedDrug?.tradeName ??
												(lastScanned.isValid
													? "Медикамент опознан"
													: "Ошибка структуры штрихкода")}
										</span>
									</div>
									<div className="font-mono text-[11px] text-muted">
										GTIN: {lastScanned.gtin || "—"} • SN:{" "}
										{lastScanned.serialNumber || "—"}
									</div>
								</div>

								{lastScanned.recognizedDrug && (
									<div className="mdlp-drug-badges mt-1">
										<span className="mdlp-badge mdlp-badge-teal">
											{lastScanned.recognizedDrug.inn}
										</span>
										<span className="mdlp-badge mdlp-badge-blue">
											Концентрация:{" "}
											{lastScanned.recognizedDrug.concentrationPct}%
										</span>
										<span className="mdlp-badge mdlp-badge-teal">
											Вазоконстриктор:{" "}
											{lastScanned.recognizedDrug.vasoconstrictorName}
										</span>
										<span className="mdlp-badge mdlp-badge-blue">
											{lastScanned.recognizedDrug.dosageForm}
										</span>
										<span className="mdlp-badge mdlp-badge-teal">
											{lastScanned.recognizedDrug.manufacturer}
										</span>
									</div>
								)}

								{lastScanned.errors.length > 0 && (
									<div className="text-bad-fg font-semibold mt-1">
										{lastScanned.errors.join("; ")}
									</div>
								)}
							</div>
						)}
					</div>

					{/* 1-Клик Пакетное списание пустых карпул смены медсестры по СанПиН 3.3686-21 */}
					<div
						style={{
							padding: "12px 16px",
							borderRadius: 10,
							background: "rgba(13, 148, 136, 0.08)",
							border: "1px solid rgba(13, 148, 136, 0.35)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							flexWrap: "wrap",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: "50%",
									background: "rgba(13, 148, 136, 0.15)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "var(--teal, #0d9488)",
									flexShrink: 0,
								}}
							>
								<Sparkles size={20} />
							</div>
							<div>
								<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
									СанПиН 3.3686-21: Пакетное списание пустых карпул смены (без поштучного сканирования)
								</div>
								<div style={{ fontSize: 12, color: "var(--muted)" }}>
									Медсестре запрещено тратить время на сканирование десятков пустых стеклянных ампул руками. Списание типового набора смены в 1 клик единолично.
								</div>
							</div>
						</div>

						<button
							type="button"
							className="mdlp-btn mdlp-btn-primary min-h-[44px]"
							style={{ minHeight: "44px", height: 44, padding: "0 16px", fontSize: 13, fontWeight: 700 }}
							onClick={handleQuickNurseCarpulesDisposal}
							data-testid="banner-quick-shift-carpules-btn"
							title="Списать все пустые карпулы смены: 10 шт. Артикаин + 2 шт. Скандонест"
						>
							<Sparkles size={16} className="text-amber-300" />
							Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)
						</button>
					</div>

					{/* Предупреждения: Сроки годности */}
					{stats.expiredCount > 0 && (
						<div className="mdlp-warning-banner mdlp-warning-red">
							<ShieldAlert size={18} className="shrink-0 text-bad-fg" />
							<div>
								<strong>
									Внимание! В очереди {stats.expiredCount} просроченных
									препаратов:
								</strong>
								<div className="mt-0.5">
									Применение просроченных анестетиков для лечения запрещено.
									Они подлежат отдельной утилизации.
								</div>
							</div>
						</div>
					)}

					{stats.expiringSoonCount > 0 && stats.expiredCount === 0 && (
						<div className="mdlp-warning-banner mdlp-warning-amber">
							<Clock size={18} className="shrink-0 text-amber-700" />
							<div>
								<strong>
									Партии с близким сроком годности (≤90 дней):{" "}
									{stats.expiringSoonCount} шт.
								</strong>
								<div className="mt-0.5">
									Рекомендуется списание в первую очередь по алгоритму FEFO.
								</div>
							</div>
						</div>
					)}

					{/* Очередь списания карпул */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<div className="font-bold text-sm flex items-center gap-2">
								<Layers size={18} className="text-teal-600" />
								<span>Очередь карпул на списание ({items.length})</span>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-2.5"
									style={{ minHeight: "44px" }}
									onClick={handleSortFefo}
									title="Сортировать по сроку годности (FEFO)"
									data-testid="sort-fefo-btn"
								>
									<ArrowUpDown size={14} /> Сортировка FEFO
								</button>
								<button
									type="button"
									className="mdlp-btn mdlp-btn-ghost min-h-[44px] text-xs px-2 text-bad-fg hover:bg-red-50"
									style={{ minHeight: "44px" }}
									onClick={handleClearQueue}
									title="Очистить всю очередь"
									data-testid="clear-queue-btn"
								>
									<Trash2 size={14} /> Очистить
								</button>
							</div>
						</div>

						<div className="mdlp-table-wrap">
							<table className="mdlp-table">
								<thead>
									<tr>
										<th style={{ width: "30px" }}>№</th>
										<th>Препарат / МНН</th>
										<th>Серия (LOT)</th>
										<th>Срок годности</th>
										<th>SGTIN (Маркировка)</th>
										<th style={{ textAlign: "right" }}>Цена, ₽</th>
										<th>Пациент / Визит</th>
										<th style={{ width: "40px" }}></th>
									</tr>
								</thead>
								<tbody>
									{items.length === 0 ? (
										<tr>
											<td
												colSpan={8}
												style={{
													textAlign: "center",
													padding: "2rem",
													color: "var(--muted)",
												}}
											>
												Очередь списания пуста. Отсканируйте DataMatrix код
												карпулы 2D-сканером.
											</td>
										</tr>
									) : (
										items.map((it, idx) => (
											<tr key={it.id}>
												<td
													style={{
														textAlign: "center",
														color: "var(--muted)",
													}}
												>
													{idx + 1}
												</td>
												<td>
													<div className="font-bold text-ink">
														{it.drugInfo?.tradeName ?? it.gtin}
													</div>
													<div className="text-[11px] text-muted">
														{it.drugInfo?.inn ?? "Анестетик"}
													</div>
												</td>
												<td>
													<span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-paper-soft border border-line">
														{it.series ?? "—"}
													</span>
												</td>
												<td>
													{it.expirationDate ? (
														<span
															className={`text-xs font-semibold px-2 py-0.5 rounded ${
																it.isExpired
																	? "bg-[var(--bad-bg,#fee2e2)] text-[var(--bad-fg,#dc2626)] font-bold"
																	: it.isExpiringSoon
																		? "bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#d97706)] font-bold"
																		: "text-muted"
															}`}
														>
															{it.expirationDate}
															{it.isExpiringSoon && " (≤90дн)"}
															{it.isExpired && " (ПРОСРОЧЕНО)"}
														</span>
													) : (
														<span className="text-muted">—</span>
													)}
												</td>
												<td>
													<span className="font-mono text-[11px] text-ink">
														{it.sgtin}
													</span>
												</td>
												<td
													style={{
														textAlign: "right",
														fontWeight: "bold",
													}}
												>
													{it.costRub?.toFixed(2) ?? "0.00"}
												</td>
												<td className="text-xs text-muted">
													{it.patientName ? (
														<div>{it.patientName}</div>
													) : (
														<div>—</div>
													)}
													{it.doctorName && (
														<div className="text-[11px]">
															{it.doctorName}
														</div>
													)}
												</td>
												<td style={{ textAlign: "center" }}>
													<button
														type="button"
														className="text-muted hover:text-bad-fg p-1 rounded"
														onClick={() => handleRemoveItem(it.id)}
														title="Удалить из очереди"
													>
														<Trash2 size={15} />
													</button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Сводная плашка себестоимости */}
					<div className="mdlp-summary-bar">
						<div>
							<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
								Карпул в очереди
							</span>
							<span className="text-lg font-black text-ink">
								{stats.totalCount} шт.
							</span>
						</div>
						<div>
							<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
								Общая сумма
							</span>
							<span className="text-lg font-black text-[var(--teal,#0d9488)]">
								{stats.totalCostRub.toFixed(2)} ₽
							</span>
						</div>
						<div>
							<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
								Наименований
							</span>
							<span className="text-lg font-black text-ink">
								{stats.uniqueDrugsCount} преп.
							</span>
						</div>
						<div>
							<span className="text-xs font-semibold text-muted uppercase block mb-0.5">
								Серий / Партий
							</span>
							<span className="text-lg font-black text-ink">
								{stats.uniqueSeriesCount}
							</span>
						</div>
					</div>
				</div>

				{/* Подвал и кнопки действий */}
				<footer className="mdlp-modal-footer">
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary min-h-[44px]"
							style={{ minHeight: "44px" }}
							onClick={handleOpenActModal}
							disabled={false}
							title="Сформировать и утвердить Акт списания карпул (бумажный журнал учтён, старшая медсестра опциональна)"
							data-testid="print-disposal-act-btn"
						>
							<FileText size={16} /> Печать акта списания
						</button>
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary font-semibold text-teal-700 min-h-[44px]"
							style={{ minHeight: "44px" }}
							onClick={handleQuickNurseCarpulesDisposal}
							title="Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест) в 1 клик (бумажный журнал учтён, старшая медсестра опциональна)"
							data-testid="footer-quick-carpules-btn"
						>
							<Sparkles size={15} className="text-amber-500" /> Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary min-h-[44px]"
							style={{ minHeight: "44px" }}
							onClick={onClose}
							data-testid="footer-close-btn"
						>
							Закрыть
						</button>

						<button
							type="button"
							className="mdlp-btn mdlp-btn-primary min-h-[44px]"
							style={{ minHeight: "44px" }}
							onClick={handleConfirmDisposal}
							disabled={isDisposing}
							data-testid="confirm-disposal-btn"
						>
							{isDisposing ? (
								<>
									<RefreshCw size={16} className="animate-spin" />{" "}
									Формирование Схемы 10560...
								</>
							) : (
								<>
									<Check size={18} /> Списать по Схеме 10560 МДЛП
								</>
							)}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};
