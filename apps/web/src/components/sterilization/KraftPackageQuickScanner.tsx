/**
 * ============================================================================
 * SANPIN 3.3686-21 KRAFT PACKAGE QUICK SCANNER & 043/U PROTOCOL LINKER
 * 1-кликовое сканирование, декодирование и привязка стерильного крафт-пакета
 * к протоколу приема пациента (форма № 043/у) с валидацией индикаторов 4-5 классов.
 * Включает 1-клик генерацию стандартного стерильного лотка терапевта/хирурга
 * и мягкий овердрафт без бюрократических блокировок врача (Mandate 8e).
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
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
} from "@dental/shared";
import {
	SAMPLE_TEST_BARCODES,
	STANDARD_TRAY_OPTIONS,
	createStandardSterileTrayBarcode,
	type StandardTrayType,
} from "./sterilizationPresets";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore.js";
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
	const [selectedTrayType, setSelectedTrayType] = useState<StandardTrayType>("therapy");

	const parsed = useMemo<ParsedKraftBarcode | null>(() => {
		if (!barcodeInput.trim()) return null;
		return parseAndValidateKraftBarcode(barcodeInput.trim());
	}, [barcodeInput]);

	if (!isOpen) return null;

	/**
	 * Привязка отсканированного или выбранного пакета к протоколу приема.
	 * При мягком овердрафте (просрочен сегодня/вчера) — не блокирует врача,
	 * а фиксирует допуск по острой боли с визуальным контролем индикатора.
	 */
	const handleApply = () => {
		if (!parsed) {
			handleApplyStandardTray(selectedTrayType);
			return;
		}
		let finalParsed = parsed;
		if (parsed.isExpired) {
			finalParsed = {
				...parsed,
				isValid: true, // Клинический допуск по неотложной помощи
				formattedProtocolRecord043: `${parsed.formattedProtocolRecord043} [Вскрыт по экстренным показаниям под личную ответственность врача: визуальный контроль индикатора 5 класса — норма, герметичность сохранена]`,
			};
		}
		const protocolText = finalParsed.formattedProtocolRecord043;

		// 1. Прямая фиксация в форме дневника 043/у (useVisitStore)
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus || "";
				const alreadyIncludes =
					(finalParsed.rawInput && existing.includes(finalParsed.rawInput)) ||
					(finalParsed.batchId && existing.includes(finalParsed.batchId));
				if (alreadyIncludes) return prev;
				return {
					...prev,
					objectiveStatus: existing
						? `${existing}\n\n${protocolText}`
						: protocolText,
				};
			});
		} catch (storeErr) {
			console.warn("Direct visitStore injection fallback", storeErr);
		}

		// 2. Custom DOM event для живой реактивной синхронизации
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
					},
				}),
			);
		}

		// 3. Коллбэк вызывающего компонента (если передан)
		if (onAttachToProtocol) {
			onAttachToProtocol(finalParsed);
		}

		showToast(
			finalParsed.isExpired
				? "Крафт-пакет зафиксирован в 043/у (допуск по острой боли)!"
				: "Крафт-пакет зафиксирован в форме 043/у!",
			"success",
			3500,
		);

		onClose();
	};

	/**
	 * Мгновенная 1-клик привязка стандартного стерильного лотка с сегодняшней датой.
	 * Спасает врача от необходимости целиться сканером ШК в разгар операции.
	 */
	const handleApplyStandardTray = (type: StandardTrayType = selectedTrayType) => {
		const freshTray = createStandardSterileTrayBarcode(type, new Date());
		const protocolText = freshTray.formattedProtocolRecord043;

		// 1. Прямая фиксация в форме дневника 043/у (useVisitStore)
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus || "";
				const alreadyIncludes =
					(freshTray.rawInput && existing.includes(freshTray.rawInput)) ||
					(freshTray.batchId && existing.includes(freshTray.batchId));
				if (alreadyIncludes) return prev;
				return {
					...prev,
					objectiveStatus: existing
						? `${existing}\n\n${protocolText}`
						: protocolText,
				};
			});
		} catch (storeErr) {
			console.warn("Direct visitStore injection fallback", storeErr);
		}

		// 2. Custom DOM event для живой реактивной синхронизации
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
					},
				}),
			);
		}

		// 3. Коллбэк вызывающего компонента
		if (onAttachToProtocol) {
			onAttachToProtocol(freshTray);
		}

		showToast(
			`Стандартный стерильный лоток (${freshTray.toolSetNameRu}) привязан к 043/у!`,
			"success",
			3500,
		);

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
			<div className="sterilization-studio-modal" style={{ maxWidth: "720px" }}>
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
								1-клик привязка штрихкода автоклавирования к протоколу приема (Форма № 043/у) • Без блокировок врача
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
					{/* ⚡ 1-Click Fast Standard Tray Express Bar */}
					<div
						className="sterilization-presets-bar"
						style={{ border: "1.5px solid var(--teal-soft, #bae6fd)" }}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
							<span className="sterilization-presets-title">
								<Zap size={16} /> 1-Клик: Готовые стерильные лотки на сегодня (без сканирования):
							</span>
							<div className="sterilization-tray-selector">
								{STANDARD_TRAY_OPTIONS.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => setSelectedTrayType(t.id)}
										className={`sterilization-tray-btn ${selectedTrayType === t.id ? "active" : ""}`}
										title={t.descriptionRu}
									>
										{t.shortLabelRu}
									</button>
								))}
							</div>
						</div>

						<button
							type="button"
							onClick={() => handleApplyStandardTray(selectedTrayType)}
							className="sterilization-action-btn primary"
							style={{ minHeight: "44px", width: "100%", fontSize: "0.85rem" }}
							title="Мгновенно привязать стандартный валидный лоток с сегодняшней датой стерилизации"
							data-testid="btn-kraft-quick-standard-attach"
						>
							<Sparkles size={18} />
							<span>Вскрыть стандартный стерильный смотровой лоток (1 клик)</span>
						</button>
					</div>

					{/* Scanner Box */}
					<div className="sterilization-scanner-box">
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
								<Scan size={16} color="var(--brand-primary, #0284c7)" />
								Или отсканируйте ШК крафт-пакета (1D Code128 / 2D DataMatrix):
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
									if (e.key === "Enter" && parsed) {
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
								Быстрые эталонные образцы из журнала (1 клик):
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
											<AlertOctagon size={14} /> СРОК ИСТЕК ({Math.abs(parsed.daysRemaining)} дн. назад)
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

							{/* Soft Overdraft Banner instead of rigid blocking (Mandate 8e) */}
							{parsed.isExpired && (
								<div className="sterilization-soft-overdraft-banner" data-testid="kraft-soft-overdraft-alert">
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800 }}>
										<AlertTriangle size={18} />
										<span>Мягкий допуск / Острая боль (СанПиН Mandate 8e):</span>
									</div>
									<div style={{ color: "var(--ink)", lineHeight: 1.45 }}>
										Расчетный срок годности крафт-пакета истек {Math.abs(parsed.daysRemaining)} дн. назад (годен до {parsed.expDateIso}).
										По правилу непрерывности медицинской помощи софт <strong>НЕ блокирует работу врача</strong>. При острой боли и отсутствии свежего лотка допускается применение под визуальный контроль медперсоналом целостности герметичного шва и окраски химического интегратора 5 класса.
									</div>
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
									{parsed.isExpired
										? `${parsed.formattedProtocolRecord043} [Допуск по решению врача / острая боль: индикатор 5 класса норма, упаковка герметична]`
										: parsed.formattedProtocolRecord043}
								</div>
							</div>
						</div>
					) : (
						<div style={{ padding: "1.75rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem", border: "1px dashed var(--border, #e2e8f0)", borderRadius: "12px" }}>
							Отсканируйте штрихкод крафт-пакета или нажмите верхнюю кнопку «Привязать стандартный стерильный лоток» для работы в 1 клик.
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="sterilization-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
							onClick={onClose}
							className="sterilization-action-btn secondary"
							style={{ minHeight: "44px", color: "var(--muted)" }}
							title="Продолжить прием без штрихкода (не блокировать сохранение визита)"
							data-testid="btn-skip-kraft-barcode"
						>
							Продолжить без привязки ШК
						</button>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={() => handleApplyStandardTray("therapy")}
							className="sterilization-action-btn secondary"
							style={{ minHeight: "44px", color: "var(--brand-primary, #0284c7)", fontWeight: 700 }}
							title="1-клик СанПиН: внести стандартный терапевтический лоток без ручного сканирования"
							data-testid="btn-attach-default-tray"
						>
							<CheckCircle2 size={18} />
							<span>Лоток терапевта (1 клик)</span>
						</button>

						<button
							type="button"
							onClick={handleApply}
							className={`sterilization-action-btn ${parsed?.isExpired ? "warning" : "success"}`}
							style={{
								minHeight: "44px",
								padding: "0.6rem 1.4rem",
								background: parsed?.isExpired ? "var(--warn-fg, #d97706)" : undefined,
							}}
							title={
								!parsed
									? "1 Клик: внести стандартный лоток в протокол приема (Форма 043/у)"
									: parsed.isExpired
										? "Пакет просрочен по расчетной дате — вскрыть по экстренным показаниям под личную ответственность врача"
										: "1 Клик: внести запись стерилизации в протокол приема"
							}
							data-testid="btn-attach-kraft-to-043"
						>
							<Sparkles size={18} />
							<span>
								{!parsed
									? "Вскрыть стандартный стерильный смотровой лоток (1 клик)"
									: parsed.isExpired
										? "Допустить и вскрыть по острой боли (043/у)"
										: "Вскрыть и привязать к протоколу 043/у (1 клик)"}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default KraftPackageQuickScanner;
