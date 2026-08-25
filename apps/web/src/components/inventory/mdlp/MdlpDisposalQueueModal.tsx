import {
	type MdlpCarpuleQueueItem,
	type MdlpParsedBarcode,
	type MdlpSchema10560Document,
	calculateQueueStats,
	createCarpuleQueueItem,
	generateMdlpSchema10560Payload,
	parseMdlpDataMatrix,
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
import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
	const [lastScanned, setLastScanned] = useState<MdlpParsedBarcode | null>(
		null,
	);
	const [isDisposing, setIsDisposing] = useState<boolean>(false);
	const [successDoc, setSuccessDoc] =
		useState<MdlpSchema10560Document | null>(null);
	const [isActModalOpen, setIsActModalOpen] = useState<boolean>(false);

	// Реквизиты документа списания
	const [docNum, setDocNum] = useState<string>(
		() =>
			`СХ-10560-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
	);
	const [docDate, setDocDate] = useState<string>(
		() => new Date().toISOString().slice(0, 10),
	);
	const [reason, setReason] = useState<string>(
		"Оказание медицинской помощи (Схема 10560)",
	);

	// Сводная статистика очереди
	const stats = useMemo(() => calculateQueueStats(items), [items]);

	// Валидация очереди
	const validation = useMemo(
		() => validateQueueForDisposal(items, false),
		[items],
	);

	// Добавление карпулы по штрихкоду
	const handleAddBarcode = useCallback(
		(rawCode: string) => {
			if (!rawCode || rawCode.trim().length === 0) return;
			const trimmed = rawCode.trim();
			const parsed = parseMdlpDataMatrix(trimmed);
			setLastScanned(parsed);

			if (!parsed.isValid) return;

			const defaultCost = parsed.recognizedDrug
				? parsed.recognizedDrug.vasoconstrictor === "1:100000"
					? 450
					: 420
				: 380;

			const newItem = createCarpuleQueueItem(trimmed, {
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
					return prev;
				}
				return [newItem, ...prev];
			});

			setBarcodeInput("");
		},
		[patientId, patientName, visitId, doctorId, doctorName, cabinetId],
	);

	// Быстрый выбор из демо-каталога для тестирования
	const handleAddDemoDrug = (gtinSample: string) => {
		const serialSample = `SN${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
		const raw = `01${gtinSample}21${serialSample}\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92qwe+rtyu1234567890abcdefghijklmnopqrstuvwxyz12`;
		handleAddBarcode(raw);
	};

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

	// Списание по Схеме 10560
	const handleConfirmDisposal = async () => {
		if (!validation.isValid || items.length === 0) return;
		setIsDisposing(true);

		try {
			const schemaDoc = generateMdlpSchema10560Payload({
				subjectId: organizationId,
				docNum,
				docDate,
				withdrawalType: 13,
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
						className="mdlp-btn mdlp-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно"
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
									className="mdlp-btn mdlp-btn-secondary h-8 text-xs px-3"
									onClick={handleDownloadXml}
								>
									<Download size={14} /> Скачать XML Схемы 10560
								</button>
								<button
									type="button"
									className="mdlp-btn mdlp-btn-primary h-8 text-xs px-3"
									onClick={() => setIsActModalOpen(true)}
								>
									<Printer size={14} /> Печать акта для старшей медсестры
								</button>
							</div>
						</div>
					)}

					{/* Блок сканирования DataMatrix */}
					<div className="mdlp-scanner-card">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-ink flex items-center gap-1.5">
								<QrCode size={18} className="text-teal-600" />
								<span>Сканирование 2D DataMatrix Честный ЗНАК / GS1:</span>
							</span>
							<div className="flex items-center gap-1.5 text-xs text-muted">
								<span>Быстрый тест:</span>
								<button
									type="button"
									className="text-[11px] font-semibold text-teal-700 hover:underline"
									onClick={() => handleAddDemoDrug("03664798000016")}
								>
									+ Ультракаин форте
								</button>
								•
								<button
									type="button"
									className="text-[11px] font-semibold text-teal-700 hover:underline"
									onClick={() => handleAddDemoDrug("03400930000014")}
								>
									+ Септанест
								</button>
								•
								<button
									type="button"
									className="text-[11px] font-semibold text-teal-700 hover:underline"
									onClick={() => handleAddDemoDrug("03400930000038")}
								>
									+ Скандонест
								</button>
								•
								<button
									type="button"
									className="text-[11px] font-semibold text-teal-700 hover:underline"
									onClick={() => handleAddDemoDrug("04046719000012")}
								>
									+ Убистезин
								</button>
							</div>
						</div>

						<div className="mdlp-input-group">
							<input
								type="text"
								placeholder="Отсканируйте штрихкод DataMatrix (01...21...17...10...) или вставьте строку"
								value={barcodeInput}
								onChange={(e) => setBarcodeInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddBarcode(barcodeInput);
									}
								}}
								className="mdlp-scanner-input"
								autoFocus
							/>
							<button
								type="button"
								className="mdlp-btn mdlp-btn-primary"
								onClick={() => handleAddBarcode(barcodeInput)}
								disabled={!barcodeInput.trim()}
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
									className="mdlp-btn mdlp-btn-secondary h-8 text-xs px-2.5"
									onClick={handleSortFefo}
									title="Сортировать по сроку годности (FEFO)"
								>
									<ArrowUpDown size={14} /> Сортировка FEFO
								</button>
								<button
									type="button"
									className="mdlp-btn mdlp-btn-ghost h-8 text-xs px-2 text-bad-fg hover:bg-red-50"
									onClick={handleClearQueue}
									title="Очистить всю очередь"
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
												карпулы или воспользуйтесь быстрым тестом выше.
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
							className="mdlp-btn mdlp-btn-secondary"
							onClick={() => setIsActModalOpen(true)}
							disabled={items.length === 0}
							title="Сформировать и напечатать Акт списания для старшей медсестры"
						>
							<FileText size={16} /> Печать акта списания
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>

						<button
							type="button"
							className="mdlp-btn mdlp-btn-primary"
							onClick={handleConfirmDisposal}
							disabled={
								isDisposing ||
								items.length === 0 ||
								!validation.isValid
							}
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

			{/* Модальное окно акта списания для старшей медсестры */}
			{isActModalOpen && (
				<SeniorNurseDisposalActModal
					isOpen={isActModalOpen}
					onClose={() => setIsActModalOpen(false)}
					items={items}
					organizationName={organizationName}
				/>
			)}
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};
