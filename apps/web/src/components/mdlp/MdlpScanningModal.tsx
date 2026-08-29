import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Check,
	CheckCircle2,
	Coins,
	Copy,
	Download,
	FileCode2,
	PackageCheck,
	QrCode,
	Scan,
	ShieldCheck,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import {
	type ChestnyZnakScannedItem,
	calculateChestnyZnakSummary,
	createChestnyZnakScannedItem,
	generateMdlpSchema531Payload,
	generateMdlpSchema701Payload,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import "./mdlpScanning.css";

export interface MdlpScanningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMode?: "acceptance_701" | "disposal_531" | undefined;
	readonly subjectId?: string | undefined;
	readonly shipperId?: string | undefined;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly clinicName?: string | undefined;
}

const SAMPLE_BARCODES = [
	{
		label: "Ультракаин® Д-С форте",
		code: "0103664798000016211A2B3C4D5E6F7\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Септанест 1:100 000",
		code: "010340093000001421SN9876543210\x1d17271231\x1d10SER99\x1d91KEY1\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 390,
	},
	{
		label: "Убистезин",
		code: "010404671900001221UBI1234567890\x1d17280331\x1d10LOT42\x1d91ABCD\x1d92SIG44CHARS1234567890123456789012345678901234",
		cost: 520,
	},
	{
		label: "Просроченный (2024)",
		code: "010366479800001621SNEXPIRED123\x1d17240101\x1d10EXP01\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
	{
		label: "Ошибка КС GTIN",
		code: "010366479800001921SNBADCHECKSUM\x1d17280531\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
		cost: 450,
	},
];

export const MdlpScanningModal: React.FC<MdlpScanningModalProps> = ({
	isOpen,
	onClose,
	initialMode = "acceptance_701",
	subjectId = "00000000123456",
	shipperId = "00000000654321",
	patientId = null,
	visitId = null,
	doctorId = null,
	clinicName = "ООО «Денте Стоматология»",
}) => {
	const scannerInputId = useId();
	const [mode, setMode] = useState<"acceptance_701" | "disposal_531">(initialMode);
	const [barcodeInput, setBarcodeInput] = useState("");
	const [docNum, setDocNum] = useState(() =>
		initialMode === "acceptance_701" ? "УПД-2026-0891" : "АКТ-531-0042",
	);
	const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [scannedItems, setScannedItems] = useState<readonly ChestnyZnakScannedItem[]>(() => [
		createChestnyZnakScannedItem(SAMPLE_BARCODES[0]!.code, { costRub: SAMPLE_BARCODES[0]!.cost }),
		createChestnyZnakScannedItem(SAMPLE_BARCODES[1]!.code, { costRub: SAMPLE_BARCODES[1]!.cost }),
	]);
	const [generatedXml, setGeneratedXml] = useState<string | null>(null);
	const [xmlDocType, setXmlDocType] = useState<"701" | "531" | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	// Focus scanner input on open
	useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus();
		}
	}, [isOpen, mode]);

	// Synchronize mode switch default docNum
	const handleModeSwitch = (newMode: "acceptance_701" | "disposal_531") => {
		setMode(newMode);
		setDocNum(newMode === "acceptance_701" ? "УПД-2026-0891" : "АКТ-531-0042");
		setGeneratedXml(null);
		setXmlDocType(null);
	};

	// Handle Barcode Scan
	const handleScanSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const raw = barcodeInput.trim();
		if (!raw) return;

		const newItem = createChestnyZnakScannedItem(raw, { costRub: 450 });
		setScannedItems((prev) => [newItem, ...prev]);
		setBarcodeInput("");
		setGeneratedXml(null);

		if (newItem.status === "verified") {
			showToast(`Отсканировано: ${newItem.tradeName}`, "success");
		} else if (newItem.status === "warning") {
			showToast(`Внимание: ${newItem.statusReason}`, "warning");
		} else if (newItem.status === "expired") {
			showToast(`Ошибка: ${newItem.statusReason}`, "error");
		} else {
			showToast(`Ошибка кода: ${newItem.statusReason}`, "error");
		}

		inputRef.current?.focus();
	};

	const handleAddSample = (sample: (typeof SAMPLE_BARCODES)[0]) => {
		const newItem = createChestnyZnakScannedItem(sample.code, { costRub: sample.cost });
		setScannedItems((prev) => [newItem, ...prev]);
		setGeneratedXml(null);
		showToast(`Добавлен тестовый код: ${sample.label}`, "info");
	};

	const handleRemoveItem = (id: string) => {
		setScannedItems((prev) => prev.filter((it) => it.id !== id));
		setGeneratedXml(null);
	};

	const handleClearAll = () => {
		setScannedItems([]);
		setGeneratedXml(null);
		setXmlDocType(null);
		showToast("Список сканирования очищен", "info");
	};

	// Summary statistics
	const summary = useMemo(() => calculateChestnyZnakSummary(scannedItems), [scannedItems]);

	// XML Document Generation
	const handleGenerateXml = () => {
		if (scannedItems.length === 0) {
			showToast("Нет отсканированных упаковок для формирования документа", "warning");
			return;
		}

		try {
			if (mode === "acceptance_701") {
				const doc = generateMdlpSchema701Payload({
					subjectId,
					shipperId,
					docNum,
					docDate,
					receivingType: 1,
					items: scannedItems.map((it) => ({
						sgtin: it.sgtin || it.rawBarcode,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						vatValueRub: it.costRub ? Math.round(it.costRub * (it.vatRate / 100) * 100) / 100 : 0,
					})),
				});
				setGeneratedXml(doc.xmlContent);
				setXmlDocType("701");
				showToast("Сформирован XML Схемы 701 (Приемка по УПД)", "success");
			} else {
				const doc = generateMdlpSchema531Payload({
					subjectId,
					docNum,
					docDate,
					withdrawalType: 13,
					patientId,
					visitId,
					doctorId,
					items: scannedItems.map((it) => ({
						sgtin: it.sgtin || it.rawBarcode,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						costRub: it.costRub,
						vatValueRub: it.costRub ? Math.round(it.costRub * (it.vatRate / 100) * 100) / 100 : 0,
					})),
				});
				setGeneratedXml(doc.xmlContent);
				setXmlDocType("531");
				showToast("Сформирован XML Схемы 531 (Выбытие для мед. помощи)", "success");
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка формирования XML";
			showToast(message, "error");
		}
	};

	const handleCopyXml = async () => {
		if (!generatedXml) return;
		try {
			await navigator.clipboard.writeText(generatedXml);
			setIsCopied(true);
			showToast("XML скопирован в буфер обмена", "success");
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать XML", "error");
		}
	};

	const handleDownloadXml = () => {
		if (!generatedXml) return;
		const filename = `mdlp_schema_${xmlDocType}_${docNum.replace(/[^a-zA-Z0-9_-]/g, "_")}.xml`;
		const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		showToast(`Файл ${filename} сохранен`, "success");
	};

	if (!isOpen) return null;

	return (
		<div
			className="mdlp-scanning-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mdlp-modal-title"
			data-testid="mdlp-scanning-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="mdlp-scanning-modal" data-testid="mdlp-scanning-modal-container">
				{/* ─── Header ─── */}
				<header className="mdlp-header">
					<div className="mdlp-header-title-group">
						<div className="mdlp-header-icon" aria-hidden="true">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2 id="mdlp-modal-title" className="mdlp-header-title">
								<span>Честный ЗНАК · ИС МДЛП</span>
								<span className="mdlp-badge-version">СХЕМА 701 / 531</span>
							</h2>
							<p className="mdlp-header-subtitle">
								2D DataMatrix верификация медикаментов, приемка по УПД и списание при оказании медпомощи · {clinicName}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="mdlp-close-btn"
						data-testid="close-mdlp-modal-btn"
						aria-label="Закрыть окно сканирования МДЛП"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* ─── Mode Selector Tabs ─── */}
				<div className="mdlp-mode-tabs" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={mode === "acceptance_701"}
						onClick={() => handleModeSwitch("acceptance_701")}
						className={`mdlp-tab-btn ${mode === "acceptance_701" ? "active" : ""}`}
						data-testid="mdlp-tab-acceptance"
					>
						<PackageCheck className="w-4 h-4" />
						<span>Приемка на склад (Схема 701 — УПД)</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === "disposal_531"}
						onClick={() => handleModeSwitch("disposal_531")}
						className={`mdlp-tab-btn ${mode === "disposal_531" ? "active" : ""}`}
						data-testid="mdlp-tab-disposal"
					>
						<ShieldCheck className="w-4 h-4" />
						<span>Списание в кабинете (Схема 531 — Выбытие)</span>
					</button>
				</div>

				{/* ─── Body ─── */}
				<main className="mdlp-body">
					{/* Live Metrics Strip */}
					<div className="mdlp-metrics-grid" data-testid="mdlp-metrics-summary">
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<Scan className="w-3.5 h-3.5" />
								<span>Всего упаковок</span>
							</span>
							<span className="mdlp-metric-value">{summary.totalCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
								<span>Проверено</span>
							</span>
							<span className="mdlp-metric-value verified">{summary.verifiedCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
								<span>Предупреждения</span>
							</span>
							<span className="mdlp-metric-value warning">{summary.warningCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<AlertCircle className="w-3.5 h-3.5 text-rose-500" />
								<span>Просрочено</span>
							</span>
							<span className="mdlp-metric-value expired">{summary.expiredCount}</span>
						</div>
						<div className="mdlp-metric-card">
							<span className="mdlp-metric-title">
								<Coins className="w-3.5 h-3.5" />
								<span>Сумма партии</span>
							</span>
							<span className="mdlp-metric-value">
								{summary.totalCostRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					{/* 2D Scanner Input Bar */}
					<div className="mdlp-scanner-box">
						<form onSubmit={handleScanSubmit} className="mdlp-scanner-row">
							<label htmlFor={scannerInputId} className="sr-only">
								Поле 2D-сканера Честный ЗНАК DataMatrix
							</label>
							<input
								id={scannerInputId}
								ref={inputRef}
								type="text"
								value={barcodeInput}
								onChange={(e) => setBarcodeInput(e.target.value)}
								placeholder="Отсканируйте 2D DataMatrix код маркировки или вставьте строку (01...21...)"
								className="mdlp-scanner-input"
								data-testid="mdlp-scanner-input"
								autoComplete="off"
								spellCheck="false"
							/>
							<button
								type="submit"
								disabled={!barcodeInput.trim()}
								className="mdlp-action-btn"
								data-testid="mdlp-scan-submit-btn"
							>
								<Scan className="w-4 h-4" />
								<span>Добавить</span>
							</button>
						</form>

						{/* Quick Sample Scans Strip */}
						<div className="mdlp-sample-strip">
							<span className="mdlp-sample-label">Тестовые образцы:</span>
							{SAMPLE_BARCODES.map((sample) => (
								<button
									key={sample.label}
									type="button"
									onClick={() => handleAddSample(sample)}
									className="mdlp-sample-pill"
									data-testid={`mdlp-sample-${sample.label.replace(/\s+/g, "_")}`}
								>
									+ {sample.label}
								</button>
							))}
						</div>
					</div>

					{/* Scanned Items Table */}
					<div className="mdlp-table-container">
						<table className="mdlp-table" data-testid="mdlp-scanned-table">
							<thead>
								<tr>
									<th>№</th>
									<th>Препарат / Номенклатура</th>
									<th>GTIN / SGTIN</th>
									<th>Серия</th>
									<th>Срок годности</th>
									<th>Статус МДЛП</th>
									<th>Сумма</th>
									<th style={{ textAlign: "center" }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{scannedItems.length === 0 ? (
									<tr>
										<td colSpan={8}>
											<div className="mdlp-empty-table">
												<Scan className="w-8 h-8 text-[var(--muted)] opacity-50" />
												<p className="font-semibold text-sm text-[var(--ink)]">
													Нет отсканированных упаковок
												</p>
												<p className="text-xs text-[var(--muted)]">
													Поднесите 2D-сканер к коду DataMatrix на упаковке или используйте тестовые образцы выше
												</p>
											</div>
										</td>
									</tr>
								) : (
									scannedItems.map((item, index) => (
										<tr key={item.id} data-testid={`mdlp-row-${item.id}`}>
											<td style={{ color: "var(--muted)", fontWeight: 700 }}>
												{scannedItems.length - index}
											</td>
											<td>
												<div className="font-bold text-[var(--ink)]">{item.tradeName}</div>
												<div className="text-xs text-[var(--muted)]">
													{item.inn} · {item.dosageForm}
												</div>
											</td>
											<td>
												<div className="font-mono text-xs text-[var(--ink)]">
													{item.gtin || "—"}
												</div>
												<div className="font-mono text-[10px] text-[var(--muted)] truncate max-w-[180px]">
													{item.serialNumber ? `SN: ${item.serialNumber}` : "—"}
												</div>
											</td>
											<td>
												<span className="font-mono text-xs text-[var(--ink)]">
													{item.series || "—"}
												</span>
											</td>
											<td>
												<div className="font-mono text-xs text-[var(--ink)]">
													{item.expirationDate || "—"}
												</div>
												{item.isExpired && (
													<div className="text-[10px] text-rose-400 font-semibold">
														Истек
													</div>
												)}
												{item.isExpiringSoon && (
													<div className="text-[10px] text-amber-400 font-semibold">
														{item.daysUntilExpiration} дн.
													</div>
												)}
											</td>
											<td>
												{item.status === "verified" && (
													<span className="mdlp-status-badge verified">
														<ShieldCheck className="w-3 h-3" />
														<span>Проверен</span>
													</span>
												)}
												{item.status === "warning" && (
													<span className="mdlp-status-badge warning" title={item.statusReason}>
														<AlertTriangle className="w-3 h-3" />
														<span>Внимание</span>
													</span>
												)}
												{item.status === "expired" && (
													<span className="mdlp-status-badge expired" title={item.statusReason}>
														<AlertCircle className="w-3 h-3" />
														<span>Просрочен</span>
													</span>
												)}
												{item.status === "invalid_checksum" && (
													<span className="mdlp-status-badge expired" title={item.statusReason}>
														<XCircle className="w-3 h-3" />
														<span>Ошибка КС</span>
													</span>
												)}
												{item.status === "invalid_format" && (
													<span className="mdlp-status-badge invalid" title={item.statusReason}>
														<AlertCircle className="w-3 h-3" />
														<span>Невалидный</span>
													</span>
												)}
											</td>
											<td style={{ fontWeight: 700 }}>
												{item.costRub != null ? `${item.costRub.toFixed(2)} ₽` : "—"}
											</td>
											<td style={{ textAlign: "center" }}>
												<button
													type="button"
													onClick={() => handleRemoveItem(item.id)}
													className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
													title="Удалить из списка"
													data-testid={`delete-item-${item.id}`}
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* Generated XML Preview Drawer */}
					{generatedXml && (
						<div className="mdlp-xml-preview" data-testid="mdlp-xml-preview-box">
							<div className="mdlp-xml-header">
								<div className="flex items-center gap-2 text-[var(--teal)]">
									<FileCode2 className="w-4 h-4" />
									<span>
										XML Документ ИС МДЛП (Схема {xmlDocType}) · {scannedItems.length} позиций
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleCopyXml}
										className="mdlp-action-btn secondary text-xs"
										style={{ height: 32 }}
										data-testid="copy-mdlp-xml-btn"
									>
										{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
										<span>{isCopied ? "Скопировано" : "Копировать XML"}</span>
									</button>
									<button
										type="button"
										onClick={handleDownloadXml}
										className="mdlp-action-btn text-xs"
										style={{ height: 32 }}
										data-testid="download-mdlp-xml-btn"
									>
										<Download className="w-3.5 h-3.5" />
										<span>Скачать .xml</span>
									</button>
								</div>
							</div>
							<pre className="mdlp-xml-code">{generatedXml}</pre>
						</div>
					)}
				</main>

				{/* ─── Footer Controls ─── */}
				<footer className="mdlp-footer">
					<div className="mdlp-footer-info">
						<span>Документ:</span>
						<input
							type="text"
							value={docNum}
							onChange={(e) => setDocNum(e.target.value)}
							className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
							style={{ width: 140 }}
							placeholder="Номер документа"
							data-testid="mdlp-doc-num-input"
						/>
						<span>от</span>
						<input
							type="date"
							value={docDate}
							onChange={(e) => setDocDate(e.target.value)}
							className="px-2 py-1 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
							data-testid="mdlp-doc-date-input"
						/>
					</div>

					<div className="mdlp-footer-actions">
						<button
							type="button"
							onClick={handleClearAll}
							disabled={scannedItems.length === 0}
							className="mdlp-action-btn danger text-xs"
							style={{ height: 36 }}
							data-testid="mdlp-clear-all-btn"
						>
							<Trash2 className="w-3.5 h-3.5" />
							<span>Очистить</span>
						</button>

						<button
							type="button"
							onClick={handleGenerateXml}
							disabled={scannedItems.length === 0}
							className="mdlp-action-btn text-xs font-bold"
							style={{ height: 36 }}
							data-testid="mdlp-generate-xml-btn"
						>
							<FileCode2 className="w-4 h-4" />
							<span>Сформировать XML ({mode === "acceptance_701" ? "Схема 701" : "Схема 531"})</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
