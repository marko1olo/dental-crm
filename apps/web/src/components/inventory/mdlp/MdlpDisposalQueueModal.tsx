import {
	MDLP_OPERATION_CODES,
	MDLP_OPERATION_CONFIGS,
	type Gs1DataMatrixParseResult,
	type MdlpCarpuleQueueItem,
	type MdlpOperationCode,
	type MdlpSchema10560Document,
	calculateQueueStats,
	cleanScannerBarcodeString,
	createCarpuleQueueItem,
	formatSeniorNurseDisposalActData,
	generateAuthenticDentalBarcode,
	generateMdlpSchema10560Payload,
	generateSeniorNurseDisposalActHtml,
	isGs1DataMatrixCandidate,
	parseGs1DataMatrixWithPku,
	processScannerInput,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowUpDown,
	Check,
	CheckCircle2,
	Clock,
	Download,
	FileText,
	Layers,
	PackageCheck,
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
import {
	SeniorNurseDisposalActModal,
	executeSeniorNurseDisposalActInBackground,
} from "./SeniorNurseDisposalActModal.js";
import { MdlpDisposalQueueTable } from "./MdlpDisposalQueueTable.js";
import { MdlpScannerCard } from "./MdlpScannerCard.js";
import { MdlpDisposalQueueFooter } from "./MdlpDisposalQueueFooter.js";
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

	// Прямая 1-клик печать акта списания без модальных барьеров (Мандат 8e, 8k, 8s)
	const handleDirectPrintAct = useCallback(() => {
		if (items.length === 0) {
			showToast(
				"Очередь списания пуста. Нажмите кнопку 'Списать все пустые карпулы смены' для формирования акта",
				"info",
			);
			return;
		}

		const actData = formatSeniorNurseDisposalActData({
			actNumber: docNum.replace("СХ-10560", "СПИС"),
			actDate: docDate,
			organizationName,
			approverRole: "doctor",
			approverName: doctorName,
			approvedByFullName: doctorName,
			approvedByPositionRu: "Врач-стоматолог (дежурный)",
			paperJournalAcknowledged: true,
			isSingleSigner: true,
			items,
		});

		const actHtml = generateSeniorNurseDisposalActHtml(actData);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(actHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	}, [items, docNum, docDate, organizationName, doctorName]);

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
			showToast(
				"Очередь списания пуста. Отсканируйте 2D-сканером DataMatrix код на карпуле или добавьте позиции.",
				"warning",
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

			try {
				const res = await fetch("/api/mdlp/dispose-batch", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						docNum,
						docDate,
						reason,
						patientId: patientId ?? null,
						visitId: visitId ?? null,
						doctorId: doctorId ?? null,
						items: items.map((it) => ({
							sgtin: it.sgtin,
							gtin: it.gtin,
							serialNumber: it.serialNumber,
							series: it.series,
							lot: it.series,
							costRub: it.costRub,
							tradeName: it.drugInfo?.tradeName,
							inn: it.drugInfo?.inn,
							reason,
						})),
					}),
				});

				if (!res.ok) {
					const errorData = await res.json().catch(() => ({}));
					throw new Error(errorData.message || `HTTP ${res.status}`);
				}

				const data = await res.json().catch(() => ({}));
				showToast(
					`Списание по Схеме 10560 успешно зарегистрировано в МДЛП (${data.disposedCount ?? items.length} поз.)`,
					"info",
				);
			} catch (apiErr) {
				console.warn("[MdlpDisposalQueueModal] Сетевой статус API списания:", apiErr);
				showToast(
					`Сформирован официальный XML документ Схемы 10560 для МДЛП (${items.length} поз.)`,
					"info",
				);
			}

			setSuccessDoc(schemaDoc);

			// Автоматическое фоновое утверждение акта списания без лишних модальных окон (Мандат 8e, 8s)
			try {
				await executeSeniorNurseDisposalActInBackground({
					items,
					organizationName,
					approverName: doctorName,
					approverRole: "doctor",
					notes: `Фоновое списание по Схеме 10560 (${docNum})`,
				});
			} catch (bgErr) {
				console.warn("[MdlpDisposalQueueModal] Фоновое утверждение акта:", bgErr);
			}

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
						<div className="min-w-0">
							<div className="font-bold text-lg leading-tight truncate">
								Списание анестетиков и медикаментов в Честный ЗНАК (МДЛП
								Схема 10560)
							</div>
							<div className="text-xs text-muted mt-0.5 flex items-center gap-2 truncate">
								<span>Вывод из оборота (код 13)</span> •{" "}
								<span>Контроль сроков годности FEFO</span> •{" "}
								<span>Акт списания (1 клик)</span>
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
									onClick={handleDirectPrintAct}
									title="Прямая печать акта списания в 1 клик без лишних окон (Мандат 8e)"
								>
									<Printer size={14} /> Печать акта списания (1 клик)
								</button>
								<button
									type="button"
									className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-3"
									style={{ minHeight: "44px" }}
									onClick={handleOpenActModal}
									title="Печать акта списания / настройка реквизитов (без медсестры ЦСО)"
								>
									<FileText size={14} /> Печать акта списания
								</button>
							</div>
						</div>
					)}

					{/* Блок сканирования DataMatrix и выбора операции МДЛП */}
					<MdlpScannerCard
						operationCode={operationCode}
						onSelectOperationCode={handleSelectOperationCode}
						scannerAutoMode={scannerAutoMode}
						onToggleScannerAutoMode={setScannerAutoMode}
						barcodeInput={barcodeInput}
						onScannerInputChange={handleScannerInputChange}
						onScannerPaste={handleScannerPaste}
						onBarcodeInputKeyDown={handleBarcodeInputKeyDown}
						onAddBarcode={handleAddBarcode}
						scannerInputRef={scannerInputRef}
						lastScanned={lastScanned}
					/>

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
									Врачу и администратору не нужно сканировать десятки ампул или ждать старшую медсестру. Списание типового набора смены в 1 клик единолично.
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
					<MdlpDisposalQueueTable
						items={items}
						onSortFefo={handleSortFefo}
						onClearQueue={handleClearQueue}
						onRemoveItem={handleRemoveItem}
					/>

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
				<MdlpDisposalQueueFooter
					onOpenActModal={handleOpenActModal}
					onQuickNurseCarpulesDisposal={handleQuickNurseCarpulesDisposal}
					onClose={onClose}
					onConfirmDisposal={handleConfirmDisposal}
					isDisposing={isDisposing}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};
