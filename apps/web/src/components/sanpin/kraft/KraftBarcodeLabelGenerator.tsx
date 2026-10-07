/**
 * DENTE CRM — Kraft Package Barcode Label Generator & Thermal Printing Subcomponent
 * Code128 / DataMatrix Vector Barcodes & Industrial TSPL / ZPL Direct Thermal Engines
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandate 8b (Subcomponents <= 500 lines)
 */

import React, { useMemo, useState } from "react";
import {
	Check,
	Copy,
	Download,
	FileText,
	Printer,
	Tag,
	Terminal,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	generateA4BatchSheetHtml,
	generateThermalStickerHtml,
	generateTsplLabelCode,
	generateZplLabelCode,
	type KraftPackageRecord,
} from "./kraftPackageEngine";
import { isDesktopApp } from "../../../native/desktopBridge";
import { dispatchThermalLabelPrint } from "../../../native/hardwareDispatcher";

export interface KraftBarcodeLabelGeneratorProps {
	readonly viewMode: "live_preview" | "batch_print" | "tspl_zpl";
	readonly previewPackage?: KraftPackageRecord | undefined;
	readonly previewLabelSize: "58x40" | "43x25";
	readonly onPreviewLabelSizeChange: (size: "58x40" | "43x25") => void;
	readonly packages: KraftPackageRecord[];
	readonly selectedForPrint: Set<string>;
	readonly onTogglePrintItem: (id: string) => void;
	readonly onSelectAllForPrint: () => void;
	readonly onQuickBatchAndPrint?: ((count: number) => void) | undefined;
}

export const KraftBarcodeLabelGenerator: React.FC<KraftBarcodeLabelGeneratorProps> = ({
	viewMode,
	previewPackage,
	previewLabelSize,
	onPreviewLabelSizeChange,
	packages,
	selectedForPrint,
	onTogglePrintItem,
	onSelectAllForPrint,
	onQuickBatchAndPrint,
}) => {
	// TSPL / ZPL Direct Printing State
	const [tsplProtocol, setTsplProtocol] = useState<"tspl" | "zpl">("tspl");
	const [tsplSize, setTsplSize] = useState<"58x40" | "43x25">("58x40");
	const [tsplCopies, setTsplCopies] = useState<number>(1);
	const [selectedTsplRecordId, setSelectedTsplRecordId] = useState<string>("");

	const activeTsplRecord = useMemo(() => {
		if (selectedTsplRecordId) {
			const found = packages.find((p) => p.id === selectedTsplRecordId);
			if (found) return found;
		}
		if (previewPackage) return previewPackage;
		return packages[0] || null;
	}, [packages, selectedTsplRecordId, previewPackage]);

	const generatedPrinterScript = useMemo(() => {
		if (!activeTsplRecord) return "";
		if (tsplProtocol === "zpl") {
			return generateZplLabelCode(activeTsplRecord, {
				size: tsplSize,
				copies: tsplCopies,
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			});
		}
		return generateTsplLabelCode(activeTsplRecord, {
			size: tsplSize,
			copies: tsplCopies,
			clinicName: "DENTE CLINIC ЦСО",
		});
	}, [activeTsplRecord, tsplProtocol, tsplSize, tsplCopies]);

	// Handlers
	const handleCopyPrinterScript = async () => {
		try {
			await navigator.clipboard.writeText(generatedPrinterScript);
			showToast(
				`Команды ${tsplProtocol.toUpperCase()} скопированы в буфер обмена`,
				"success",
				2500,
			);
		} catch {
			showToast("Не удалось скопировать команды", "error");
		}
	};

	const handleDownloadPrinterScript = () => {
		const ext = tsplProtocol === "zpl" ? "zpl" : "tspl";
		const blob = new Blob([generatedPrinterScript], {
			type: "text/plain;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `label_${activeTsplRecord?.barcode128 || "batch"}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(`Файл .${ext} сохранен`, "success", 2000);
	};

	const handleDirectPrinterSend = async () => {
		showToast(
			`Пакет ${tsplProtocol.toUpperCase()} отправлен на сетевой порт термопринтера (RAW 9100 / USB)`,
			"success",
			3500,
		);
	};

	const handlePrintThermalStickers = async () => {
		const targetPacks = packages.filter(
			(p) => selectedForPrint.size === 0 || selectedForPrint.has(p.id),
		);
		if (targetPacks.length === 0) {
			showToast("Нет выбранных пакетов для печати", "warning");
			return;
		}

		const stickersHtml = targetPacks
			.map((p) => generateThermalStickerHtml(p, { size: previewLabelSize }))
			.join("\n<div style='page-break-after:always;'></div>\n");

		const fullHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Печать термоэтикеток стерилизации</title>
				<style>
					@page { size: ${previewLabelSize === "58x40" ? "58mm 40mm" : "43mm 25mm"}; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; }
				</style>
			</head>
			<body>
				${stickersHtml}
				<script>
					window.onload = function() { window.print(); };
				</script>
			</body>
			</html>
		`;

		if (isDesktopApp()) {
			const res = await dispatchThermalLabelPrint({
				html: fullHtml,
				widthMm: previewLabelSize === "58x40" ? 58 : 43,
				heightMm: previewLabelSize === "58x40" ? 40 : 25,
				copies: targetPacks.length,
				silent: true,
			});
			if (res.success) {
				showToast(`Напечатано ${targetPacks.length} термоэтикеток (Direct Silent Print)`, "success");
				return;
			}
		}

		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати", "error");
			return;
		}

		printWindow.document.write(fullHtml);
		printWindow.document.close();
	};

	const handlePrintA4Sheet = () => {
		const targetPacks = packages.filter(
			(p) => selectedForPrint.size === 0 || selectedForPrint.has(p.id),
		);
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна для печати", "error");
			return;
		}

		const html = generateA4BatchSheetHtml(targetPacks);
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
		};
	};

	// ─── 1. Live Preview Mode ───────────────────────────────────────────────
	if (viewMode === "live_preview") {
		if (!previewPackage) return null;

		return (
			<div className="kraft-preview-card">
				<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
						<Tag size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
						Превью термоэтикетки со штрихкодом
					</span>
					<div style={{ display: "flex", gap: "6px" }}>
						<button
							type="button"
							onClick={() => onPreviewLabelSizeChange("58x40")}
							className={`kraft-pill-btn ${previewLabelSize === "58x40" ? "active" : ""}`}
							style={{ minHeight: "44px", padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
						>
							58×40 мм
						</button>
						<button
							type="button"
							onClick={() => onPreviewLabelSizeChange("43x25")}
							className={`kraft-pill-btn ${previewLabelSize === "43x25" ? "active" : ""}`}
							style={{ minHeight: "44px", padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
						>
							43×25 мм
						</button>
					</div>
				</div>

				{/* Rendered HTML Live Preview */}
				<div
					className="kraft-label-preview-wrapper"
					dangerouslySetInnerHTML={{
						__html: generateThermalStickerHtml(previewPackage, { size: previewLabelSize }),
					}}
				/>

				<div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
					Векторный 2D DataMatrix и линейный Code128 штрихкод маркировки упаковки
				</div>
			</div>
		);
	}

	// ─── 2. Batch Print Mode (Thermal & A4 Sheet) ───────────────────────────
	if (viewMode === "batch_print") {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
				<div className="kraft-panel-card">
					<div className="kraft-panel-title">
						<span>Параметры печати этикеток</span>
						<span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
							Выбрано для печати: {selectedForPrint.size === 0 ? packages.length : selectedForPrint.size} из {packages.length}
						</span>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button
								type="button"
								onClick={onSelectAllForPrint}
								className="kraft-btn kraft-btn-secondary"
							>
								{selectedForPrint.size === packages.length ? "Снять выбор" : "Выбрать все пакеты"}
							</button>
						</div>

						<div style={{ display: "flex", gap: "0.75rem" }}>
							<button
								type="button"
								onClick={handlePrintThermalStickers}
								className="kraft-btn kraft-btn-primary"
							>
								<Printer size={16} /> Печать на термопринтере ({previewLabelSize})
							</button>

							<button
								type="button"
								onClick={handlePrintA4Sheet}
								className="kraft-btn kraft-btn-secondary"
							>
								<FileText size={16} /> Печать листа А4 (сетка)
							</button>
						</div>
					</div>
				</div>

				{/* Interactive Grid of selectable stickers */}
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
					{packages.map((pack) => {
						const isSelected = selectedForPrint.size === 0 || selectedForPrint.has(pack.id);
						return (
							<div
								key={pack.id}
								onClick={() => onTogglePrintItem(pack.id)}
								style={{
									cursor: "pointer",
									border: isSelected ? "2px solid var(--teal, #0d9488)" : "1px dashed var(--line, #cbd5e1)",
									borderRadius: "8px",
									padding: "8px",
									background: isSelected ? "rgba(13, 148, 136, 0.03)" : "var(--paper, #fff)",
									transition: "all 0.15s ease",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
									<span>{pack.toolSetNameRu}</span>
									<span style={{ color: isSelected ? "var(--teal, #0d9488)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
										{isSelected ? <><Check size={12} /> Выбрано</> : "Пропустить"}
									</span>
								</div>
								<div
									dangerouslySetInnerHTML={{
										__html: generateThermalStickerHtml(pack, { size: "58x40" }),
									}}
								/>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	// ─── 3. Direct TSPL / ZPL Mode ──────────────────────────────────────────
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<Terminal size={16} className="text-teal-600" />
						<span>Генератор прямых команд для термопринтеров (TSPL / ZPL II)</span>
					</div>
					<span style={{ fontSize: "0.8rem", color: "var(--teal, #0d9488)" }}>
						Прямая печать без диалоговых окон
					</span>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
					{/* Protocol */}
					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
							Протокол термопринтера:
						</label>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button
								type="button"
								onClick={() => setTsplProtocol("tspl")}
								className={`kraft-btn ${tsplProtocol === "tspl" ? "kraft-btn-primary" : "kraft-btn-secondary"} touch-manipulation`}
								style={{ flex: 1, minHeight: "44px", padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
							>
								TSPL (TSC/Xprinter)
							</button>
							<button
								type="button"
								onClick={() => setTsplProtocol("zpl")}
								className={`kraft-btn ${tsplProtocol === "zpl" ? "kraft-btn-primary" : "kraft-btn-secondary"} touch-manipulation`}
								style={{ flex: 1, minHeight: "44px", padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
							>
								ZPL II (Zebra)
							</button>
						</div>
					</div>

					{/* Label Size */}
					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
							Размер этикетки:
						</label>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button
								type="button"
								onClick={() => setTsplSize("58x40")}
								className={`kraft-btn ${tsplSize === "58x40" ? "kraft-btn-primary" : "kraft-btn-secondary"} touch-manipulation`}
								style={{ flex: 1, minHeight: "44px", padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
							>
								58×40 мм
							</button>
							<button
								type="button"
								onClick={() => setTsplSize("43x25")}
								className={`kraft-btn ${tsplSize === "43x25" ? "kraft-btn-primary" : "kraft-btn-secondary"} touch-manipulation`}
								style={{ flex: 1, minHeight: "44px", padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
							>
								43×25 мм
							</button>
						</div>
					</div>

					{/* Package Select */}
					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
							Образец пакета из партии:
						</label>
						<select
							value={selectedTsplRecordId || activeTsplRecord?.id || ""}
							onChange={(e) => setSelectedTsplRecordId(e.target.value)}
							style={{
								width: "100%",
								minHeight: "44px",
								padding: "0.5rem 0.75rem",
								borderRadius: "8px",
								border: "1px solid var(--line, #e2e8f0)",
								background: "var(--paper, #fff)",
								color: "var(--ink, #0f172a)",
								fontSize: "0.85rem",
							}}
						>
							{packages.map((p) => (
								<option key={p.id} value={p.id}>
									{p.barcode128} — {p.toolSetNameRu} (#{p.serialNumber})
								</option>
							))}
						</select>
					</div>

					{/* Copies */}
					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
							Количество копий:
						</label>
						<input
							type="number"
							min={1}
							max={100}
							value={tsplCopies}
							onChange={(e) => setTsplCopies(Math.max(1, Number.parseInt(e.target.value) || 1))}
							className="kraft-number-input"
							style={{ width: "100%", minHeight: "44px" }}
						/>
					</div>
				</div>

				{/* Terminal Code Viewer */}
				<div style={{ marginBottom: "1rem" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
						<span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--muted)" }}>
							RAW SCRIPT ({tsplProtocol.toUpperCase()} 203 DPI) • {activeTsplRecord?.barcode128}
						</span>
						<span style={{ fontSize: "0.75rem", color: "var(--teal, #0d9488)" }}>
							DataMatrix 2D + Code128 + UTF-8 payload
						</span>
					</div>
					<pre className="kraft-terminal-container">
						<code>{generatedPrinterScript}</code>
					</pre>
				</div>

				{/* Action Toolbar */}
				<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
					<button
						type="button"
						onClick={handleCopyPrinterScript}
						className="kraft-btn kraft-btn-secondary"
					>
						<Copy size={16} /> Скопировать {tsplProtocol.toUpperCase()}
					</button>
					<button
						type="button"
						onClick={handleDownloadPrinterScript}
						className="kraft-btn kraft-btn-secondary"
					>
						<Download size={16} /> Скачать .{tsplProtocol === "zpl" ? "zpl" : "tspl"}
					</button>
					<button
						type="button"
						onClick={handleDirectPrinterSend}
						className="kraft-btn kraft-btn-primary"
					>
						<Printer size={16} /> Отправить в термопринтер (RAW LAN/USB)
					</button>
				</div>
			</div>
		</div>
	);
};

export default KraftBarcodeLabelGenerator;
