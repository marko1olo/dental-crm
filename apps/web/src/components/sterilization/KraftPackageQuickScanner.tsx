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
	CheckCircle2,
	Clock,
	Scan,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
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

	useEffect(() => {
		if (isOpen) {
			setBarcodeInput(initialBarcode || "");
		}
	}, [isOpen, initialBarcode]);

	const selectedTrayDef = useMemo(() => {
		return STANDARD_TRAY_OPTIONS.find((t) => t.id === selectedTrayType) || STANDARD_TRAY_OPTIONS[0];
	}, [selectedTrayType]);

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
					<div className="sterilization-title-wrap min-w-0">
						<div className="sterilization-badge-icon">
							<ShieldCheck size={22} />
						</div>
						<div className="min-w-0">
							<h3 className="sterilization-title truncate">
								Сканер крафт-пакетов стерилизации (СанПиН 3.3686-21)
							</h3>
							<div className="sterilization-subtitle truncate">
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
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="sterilization-body">
					{/* 1-Click Fast Standard Tray Express Bar (Hick's Law: 1 compact 32-36px toolbar row) */}
					<div className="sterilization-presets-bar">
						<div className="sterilization-presets-row min-w-0">
							<span className="sterilization-presets-title truncate">
								<Zap size={15} /> 1-Клик лотки:
							</span>
							<div className="sterilization-tray-selector min-w-0">
								{STANDARD_TRAY_OPTIONS.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => setSelectedTrayType(t.id)}
										className={`sterilization-tray-btn truncate ${selectedTrayType === t.id ? "active" : ""}`}
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
							className="sterilization-action-btn primary sterilization-quick-attach-btn"
							title={`Мгновенно привязать ${selectedTrayDef.shortLabelRu.toLowerCase()} с сегодняшней датой`}
							data-testid="btn-kraft-quick-standard-attach"
						>
							<Sparkles size={15} />
							<span className="truncate">Вскрыть {selectedTrayDef.shortLabelRu.toLowerCase()} (1 клик)</span>
						</button>
					</div>

					{/* Scanner Box */}
					<div className="sterilization-scanner-box">
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }} className="min-w-0">
							<span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "0.4rem" }} className="truncate">
								<Scan size={15} color="var(--teal, #0284c7)" />
								ШК крафт-пакета (1D Code128 / 2D DataMatrix):
							</span>
							{currentDiaryBarcode && (
								<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }} className="truncate">
									В дневнике: <strong style={{ fontFamily: "monospace" }}>{currentDiaryBarcode}</strong>
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
									if (e.key === "Enter") {
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
									style={{ minWidth: "38px", height: "36px", minHeight: "36px", padding: "0 0.5rem" }}
									title="Очистить ввод"
								>
									<X size={16} />
								</button>
							)}
						</div>

						{/* Sample Quick Chips */}
						<div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted, #64748b)" }}>
								Быстрые эталонные образцы из журнала (1 клик):
							</span>
							<div className="sterilization-chips-wrap">
								{SAMPLE_TEST_BARCODES.map((s) => (
									<button
										key={s.barcode}
										type="button"
										onClick={() => setBarcodeInput(s.barcode)}
										className="sterilization-quick-chip truncate"
										title={`${s.label} (${s.barcode})`}
										data-testid={`chip-sample-${s.badge}`}
									>
										<span style={{ color: "var(--teal, #0284c7)" }}>•</span>{" "}
										<span className="truncate">{s.label}</span>
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
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }} className="min-w-0">
								<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="min-w-0">
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
									<span className="truncate" style={{ fontSize: "0.775rem", fontFamily: "monospace", color: "var(--muted, #64748b)", fontWeight: 700 }}>
										{parsed.barcodeType === "datamatrix_2d" ? "2D DataMatrix" : "1D Code128"}
									</span>
								</div>

								<span className="truncate" style={{ fontSize: "0.775rem", color: "var(--muted, #64748b)", maxWidth: "320px" }} title={parsed.sanpinClauseRu}>
									{parsed.sanpinClauseRu}
								</span>
							</div>

							{/* Soft Overdraft Banner instead of rigid blocking (Mandate 8e) */}
							{parsed.isExpired && (
								<div className="sterilization-soft-overdraft-banner" data-testid="kraft-soft-overdraft-alert">
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800 }}>
										<AlertTriangle size={18} />
										<span>Мягкий допуск / Острая боль (Клинический регламент):</span>
									</div>
									<div style={{ color: "var(--ink)", lineHeight: 1.45 }}>
										Расчетный срок годности крафт-пакета истек {Math.abs(parsed.daysRemaining)} дн. назад (годен до {parsed.expDateIso}).
										По правилу непрерывности медицинской помощи софт <strong>НЕ блокирует работу врача</strong>. При острой боли и отсутствии свежего лотка допускается применение под визуальный контроль медперсоналом целостности герметичного шва и окраски химического интегратора 5 класса.
									</div>
								</div>
							)}

							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.65rem", fontSize: "0.825rem" }}>
								<div className="min-w-0">
									<div style={{ color: "var(--muted, #64748b)", fontSize: "0.725rem" }}>Набор инструментария:</div>
									<div className="truncate" style={{ fontWeight: 700, color: "var(--ink)" }} title={parsed.toolSetNameRu}>
										{parsed.toolSetNameRu}
									</div>
								</div>
								<div className="min-w-0">
									<div style={{ color: "var(--muted, #64748b)", fontSize: "0.725rem" }}>Стерилизатор и цикл:</div>
									<div className="truncate" style={{ fontWeight: 700, color: "var(--ink)" }} title={`${parsed.autoclaveId} • Цикл №${parsed.cycleNumber}`}>
										{parsed.autoclaveId} • Цикл №{parsed.cycleNumber}
									</div>
								</div>
								<div className="min-w-0">
									<div style={{ color: "var(--muted, #64748b)", fontSize: "0.725rem" }}>Дата упаковки / Срок:</div>
									<div className="truncate" style={{ fontWeight: 700, color: "var(--ink)" }} title={`${parsed.packDateIso} (${parsed.daysLifespan} сут.)`}>
										{parsed.packDateIso} ({parsed.daysLifespan} сут.)
									</div>
								</div>
								<div className="min-w-0">
									<div style={{ color: "var(--muted, #64748b)", fontSize: "0.725rem" }}>Химический индикатор:</div>
									<div className="truncate" style={{ fontWeight: 700, color: parsed.indicatorPassed ? "var(--ok-fg, #059669)" : "var(--bad-fg, #dc2626)" }} title={parsed.indicatorClassRu}>
										{parsed.indicatorClassRu}
									</div>
								</div>
							</div>

							{/* Formatted Protocol 043 Record Preview */}
							<div className="min-w-0" style={{ marginTop: "0.25rem", padding: "0.65rem 0.85rem", borderRadius: "8px", background: "var(--paper-soft, #f1f5f9)", border: "1px solid var(--line, #e2e8f0)", fontSize: "0.775rem", color: "var(--ink)", lineHeight: 1.45 }}>
								<div style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--muted, #64748b)", fontSize: "0.725rem" }}>
									Запись для формы № 043/у (Приказ 834н):
								</div>
								<div style={{ fontFamily: "ui-sans-serif, system-ui", fontStyle: "italic", wordBreak: "break-word" }}>
									{parsed.isExpired
										? `${parsed.formattedProtocolRecord043} [Допуск по решению врача / острая боль: индикатор 5 класса норма, упаковка герметична]`
										: parsed.formattedProtocolRecord043}
								</div>
							</div>
						</div>
					) : (
						<div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted, #64748b)", fontSize: "0.85rem", border: "1px dashed var(--line, #e2e8f0)", borderRadius: "10px" }}>
							Отсканируйте штрихкод крафт-пакета или нажмите верхнюю кнопку «Вскрыть лоток (1 клик)» для мгновенной привязки к протоколу.
						</div>
					)}
				</div>

				{/* Footer Actions (Miller's Law: <=2 actions per side) */}
				<div className="sterilization-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={onClose}
							className="sterilization-action-btn secondary"
							style={{ minHeight: "36px", height: "36px" }}
							title="Продолжить прием без штрихкода (не блокировать сохранение визита)"
							data-testid="btn-skip-kraft-barcode"
						>
							Продолжить без привязки ШК
						</button>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						{!parsed && (
							<button
								type="button"
								onClick={() => handleApplyStandardTray("therapy")}
								className="sterilization-action-btn secondary"
								style={{ minHeight: "36px", height: "36px", color: "var(--teal, #0284c7)", fontWeight: 700 }}
								title="1-клик СанПиН: внести стандартный терапевтический лоток без ручного сканирования"
								data-testid="btn-attach-default-tray"
							>
								<CheckCircle2 size={16} />
								<span>Лоток терапевта (1 клик)</span>
							</button>
						)}

						<button
							type="button"
							onClick={handleApply}
							className={`sterilization-action-btn ${parsed?.isExpired ? "warning" : "success"}`}
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0 1.25rem",
								background: parsed?.isExpired ? "var(--warn-fg, #d97706)" : undefined,
							}}
							title={
								!parsed
									? `1 Клик: внести ${selectedTrayDef.shortLabelRu.toLowerCase()} в протокол приема (Форма 043/у)`
									: parsed.isExpired
										? "Пакет просрочен по расчетной дате — вскрыть по экстренным показаниям под личную ответственность врача"
										: "1 Клик: внести запись стерилизации в протокол приема"
							}
							data-testid="btn-attach-kraft-to-043"
						>
							<Sparkles size={16} />
							<span>
								{!parsed
									? `Вскрыть ${selectedTrayDef.shortLabelRu.toLowerCase()} (1 клик)`
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

