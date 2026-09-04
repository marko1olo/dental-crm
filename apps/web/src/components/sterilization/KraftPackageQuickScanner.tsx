/**
 * ============================================================================
 * SANPIN 3.3686-21 KRAFT PACKAGE QUICK SCANNER & 043/U PROTOCOL LINKER
 * 1-кликовое сканирование, декодирование и привязка стерильного крафт-пакета
 * к протоколу приема пациента (форма № 043/у) с валидацией индикаторов 4-5 классов.
 * ============================================================================
 */

import {
	AlertOctagon,
	AlertTriangle,
	Award,
	Barcode,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Flame,
	FlaskConical,
	Package,
	QrCode,
	Scan,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Tag,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
} from "@dental/shared";
import { SAMPLE_TEST_BARCODES } from "./sterilizationPresets";
import "./sterilization.css";

export interface KraftPackageQuickScannerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAttachToProtocol?: ((parsed: ParsedKraftBarcode) => void | Promise<void>) | undefined;
	readonly initialBarcode?: string | null | undefined;
	readonly currentDiaryBarcode?: string | null | undefined;
}

export function KraftPackageQuickScanner({
	isOpen,
	onClose,
	onAttachToProtocol,
	initialBarcode = "",
	currentDiaryBarcode = null,
}: KraftPackageQuickScannerProps) {
	const [barcodeInput, setBarcodeInput] = useState<string>(initialBarcode || "");

	const parsed = useMemo<ParsedKraftBarcode | null>(() => {
		if (!barcodeInput.trim()) return null;
		return parseAndValidateKraftBarcode(barcodeInput.trim());
	}, [barcodeInput]);

	if (!isOpen) return null;

	const handleApply = () => {
		if (!parsed) return;
		if (onAttachToProtocol) {
			onAttachToProtocol(parsed);
		}
		onClose();
	};

	const handleApplyDefaultPreset = () => {
		const sampleBarcode = SAMPLE_TEST_BARCODES[0]?.barcode || "STER-2026-AUTOCLAVE-01#0042";
		const defaultSample = parseAndValidateKraftBarcode(sampleBarcode);
		if (defaultSample && onAttachToProtocol) {
			onAttachToProtocol(defaultSample);
		}
		onClose();
	};

	return (
		<div
			className="sterilization-studio-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Сканирование и привязка крафт-пакета стерилизации (СанПиН 3.3686-21)"
			data-testid="kraft-package-quick-scanner-modal"
		>
			<div className="sterilization-studio-modal" style={{ maxWidth: "680px" }}>
				{/* Header */}
				<div className="sterilization-header">
					<div className="sterilization-title-wrap">
						<div className="sterilization-badge-icon">
							<ShieldCheck size={24} />
						</div>
						<div>
							<h3 className="sterilization-title">
								Сканер крафт-пакетов стерилизации (СанПиН 3.3686-21)
							</h3>
							<div className="sterilization-subtitle">
								1-клик привязка штрихкода автоклавирования к протоколу приема (Форма № 043/у)
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="sterilization-close-btn"
						aria-label="Закрыть сканер"
					>
						<X size={20} />
					</button>
				</div>

				{/* Body */}
				<div className="sterilization-body">
					{/* Scanner Box */}
					<div className="sterilization-scanner-box">
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
								<Scan size={16} color="var(--brand-primary, #0284c7)" />
								Штрихкод крафт-пакета (1D Code128 / 2D DataMatrix):
							</span>
							{currentDiaryBarcode && (
								<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
									Текущий в дневнике: <strong style={{ fontFamily: "monospace" }}>{currentDiaryBarcode}</strong>
								</span>
							)}
						</div>

						<div className="sterilization-input-group">
							<input
								type="text"
								autoFocus
								className="sterilization-scanner-input"
								placeholder="Отсканируйте 1D/2D штрихкод или введите KB..."
								value={barcodeInput}
								onChange={(e) => setBarcodeInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && parsed?.isValid) {
										e.preventDefault();
										handleApply();
									}
								}}
								data-testid="kraft-scanner-input"
							/>
							{barcodeInput && (
								<button
									type="button"
									onClick={() => setBarcodeInput("")}
									className="sterilization-action-btn secondary"
									style={{ minWidth: "48px", padding: "0 0.75rem" }}
									title="Очистить ввод"
								>
									<X size={18} />
								</button>
							)}
						</div>

						{/* Sample Quick Chips */}
						<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)" }}>
								Быстрые тестовые образцы (1 клик):
							</span>
							<div className="sterilization-chips-wrap">
								{SAMPLE_TEST_BARCODES.map((s) => (
									<button
										key={s.barcode}
										type="button"
										onClick={() => setBarcodeInput(s.barcode)}
										className="sterilization-quick-chip"
										title={s.label}
										data-testid={`chip-sample-${s.badge}`}
									>
										<span style={{ color: "var(--brand-primary)" }}>•</span> {s.label}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Decoded Package Evaluation Card */}
					{parsed ? (
						<div
							className={`sterilization-decoded-card ${
								parsed.isExpired
									? "expired"
									: parsed.isExpiringSoon
										? "expiring"
										: "valid"
							}`}
							data-testid="kraft-decoded-result-card"
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
									{parsed.isExpired ? (
										<span className="sterilization-tag expired">
											<AlertOctagon size={14} /> ПРОСРОЧЕНО (Истек {Math.abs(parsed.daysRemaining)} дн. назад)
										</span>
									) : parsed.isExpiringSoon ? (
										<span className="sterilization-tag expiring">
											<Clock size={14} /> ИСТЕКАЕТ (Осталось {parsed.daysRemaining} дн.)
										</span>
									) : (
										<span className="sterilization-tag valid">
											<CheckCircle2 size={14} /> СТЕРИЛЬНО (Годен до {parsed.expDateIso})
										</span>
									)}
									<span style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--muted)", fontWeight: 700 }}>
										{parsed.barcodeType === "datamatrix_2d" ? "2D DataMatrix" : "1D Code128"}
									</span>
								</div>

								<span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
									{parsed.sanpinClauseRu}
								</span>
							</div>

							{parsed.isExpired && (
								<div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)", color: "var(--bad-fg, #dc2626)", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
									<AlertTriangle size={18} shrink-0="true" />
									<span>
										КРИТИЧЕСКИЙ ЗАПРЕТ: Использование просроченного инструментария категорически запрещено п. 3632 СанПиН 3.3686-21. Отправьте набор на повторную предстерилизационную очистку (ПСО) и автоклавирование!
									</span>
								</div>
							)}

							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", fontSize: "0.85rem" }}>
								<div>
									<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Набор инструментария:</div>
									<div style={{ fontWeight: 700, color: "var(--ink)" }}>{parsed.toolSetNameRu}</div>
								</div>
								<div>
									<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Стерилизатор и цикл:</div>
									<div style={{ fontWeight: 700, color: "var(--ink)" }}>
										{parsed.autoclaveId} • Цикл №{parsed.cycleNumber}
									</div>
								</div>
								<div>
									<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Дата упаковки / Срок:</div>
									<div style={{ fontWeight: 700, color: "var(--ink)" }}>
										{parsed.packDateIso} ({parsed.daysLifespan} сут.)
									</div>
								</div>
								<div>
									<div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Химический индикатор:</div>
									<div style={{ fontWeight: 700, color: parsed.indicatorPassed ? "var(--ok-fg, #059669)" : "var(--bad-fg, #dc2626)" }}>
										{parsed.indicatorClassRu}
									</div>
								</div>
							</div>

							{/* Formatted Protocol 043 Record Preview */}
							<div style={{ marginTop: "0.25rem", padding: "0.75rem", borderRadius: "8px", background: "var(--paper-soft, #f1f5f9)", border: "1px solid var(--border, #e2e8f0)", fontSize: "0.8rem", color: "var(--ink)", lineHeight: 1.45 }}>
								<div style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--muted)", fontSize: "0.75rem" }}>
									Запись для формы № 043/у (Приказ 834н):
								</div>
								<div style={{ fontFamily: "ui-sans-serif, system-ui", fontStyle: "italic" }}>
									{parsed.formattedProtocolRecord043}
								</div>
							</div>
						</div>
					) : (
						<div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem", border: "1px dashed var(--border, #e2e8f0)", borderRadius: "12px" }}>
							Отсканируйте штрихкод крафт-пакета или выберите образец для проверки срока стерильности.
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="sterilization-footer">
					<button
						type="button"
						onClick={onClose}
						className="sterilization-action-btn secondary"
						style={{ minHeight: "44px" }}
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleApplyDefaultPreset}
						className="sterilization-action-btn secondary"
						style={{ minHeight: "44px", color: "var(--brand-primary, #0284c7)", fontWeight: 700 }}
						title="1-клик СанПиН: внести стандартный терапевтический лоток без ручного сканирования"
						data-testid="btn-attach-default-tray"
					>
						<CheckCircle2 size={18} />
						<span>Норма: Смотровой лоток (1 клик)</span>
					</button>

					<button
						type="button"
						onClick={handleApply}
						disabled={!parsed}
						className={`sterilization-action-btn ${parsed?.isExpired ? "warning" : "success"}`}
						style={{
							minHeight: "44px",
							padding: "0.6rem 1.5rem",
							background: parsed?.isExpired ? "var(--warn-fg, #d97706)" : undefined,
						}}
						title={
							!parsed
								? "Отсканируйте штрихкод или выберите образец"
								: parsed.isExpired
									? "Пакет просрочен по расчетной дате — применение по решению врача под повторный визуальный контроль индикатора"
									: "1 Клик: внести запись стерилизации в протокол приема"
						}
						data-testid="btn-attach-kraft-to-043"
					>
						<Sparkles size={18} />
						<span>
							{parsed?.isExpired
								? "Применить по решению врача (043/у)"
								: "Привязать к протоколу 043/у (1 клик)"}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
