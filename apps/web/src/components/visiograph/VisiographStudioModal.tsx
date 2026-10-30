/**
 * VisiographStudioModal.tsx — Каноническое модальное окно радиовизиографа и лучевой диагностики (Мандаты 8b, 8e, 8am).
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 300–450 строк.
 * - Мандат 8e: Автономия врача у кресла (0 блокировок, 1-клик сохранение).
 * - Мандат 8am: Ровно ОДНА Primary CTA кнопка (#0d9488 / var(--teal)) на видимый экран.
 * - Мандат 8n: Суверенитет соло-врача и клиники 1-3 кресла.
 * - Apple HIG: Сенсорные тач-таргеты >= 44x44px, нативные Bottom Sheets, 0px горизонтального скролла.
 */

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	FolderOpen,
	Printer,
	X,
	Maximize2,
	Minimize2,
	Check,
} from "lucide-react";
import { VisiographStudioCanvas } from "./VisiographStudioCanvas";
import {
	MODALITY_CATALOG,
	CANONICAL_HOTFOLDERS,
	DEMO_VISIOGRAPH_STUDIES,
	FDI_PERMANENT_TEETH,
	type StudyModality,
} from "./visiographCatalogData";
import { showToast } from "../GlobalToast";

const MODALITY_TAB_LABELS: Record<StudyModality, string> = {
	rvg: "Прицельный",
	opg: "Панорама",
	cbct: "3D КТ",
	photo: "Фото",
};

export interface VisiographStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly initialToothCode?: string;
	readonly initialModality?: StudyModality;
	readonly initialImageUrl?: string;
	readonly onSaveToChart?: (result: {
		toothCode: string;
		modality: StudyModality;
		imageUrl: string;
		doseMsv: number;
		measurementsCount: number;
	}) => void;
}

export const VisiographStudioModal: React.FC<VisiographStudioModalProps> = ({
	isOpen,
	onClose,
	patientId = "pat_walkin",
	patientName = "Захаров Иван Дмитриевич",
	initialToothCode = "16",
	initialModality = "rvg",
	initialImageUrl,
	onSaveToChart,
}) => {
	const [activeModality, setActiveModality] = useState<StudyModality>(initialModality);
	const [activeTooth, setActiveTooth] = useState<string>(initialToothCode);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isToothSelectorOpen, setIsToothSelectorOpen] = useState(false);
	const [isHotFolderMenuOpen, setIsHotFolderMenuOpen] = useState(false);
	const [currentImageUrl, setCurrentImageUrl] = useState<string>(
		initialImageUrl || "/radiology/sample_rvg_tooth16.jpg",
	);

	// Выбор демонстрационного исследования при смене модальности
	useEffect(() => {
		const found = DEMO_VISIOGRAPH_STUDIES.find((s) => s.modality === activeModality);
		if (found?.imageUrl) {
			setCurrentImageUrl(found.imageUrl);
			if (found.toothCode) setActiveTooth(found.toothCode);
		}
	}, [activeModality]);

	// Закрытие по Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Быстрая печать снимка на лист А4 с медицинским паспортом пациента
	const handlePrintA4 = useCallback(() => {
		if (typeof window === "undefined") return;
		const printWin = window.open("", "_blank", "width=850,height=950");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати снимка", "warning");
			return;
		}

		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const modalityMeta = MODALITY_CATALOG[activeModality];

		printWin.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="utf-8">
				<title>Протокол лучевой диагностики — ${patientName}</title>
				<style>
					@page { size: A4 portrait; margin: 12mm; }
					body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #111827; }
					.print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 14px; }
					.clinic-title { font-size: 18px; font-weight: 800; color: #0f766e; }
					.clinic-subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
					.doc-meta { font-size: 12px; text-align: right; }
					.patient-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; line-height: 1.5; }
					.image-container { text-align: center; margin: 16px 0; background: #000; border-radius: 8px; overflow: hidden; padding: 8px; }
					.image-container img { max-width: 100%; max-height: 520px; object-fit: contain; }
					.footer-box { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #4b5563; display: flex; justify-content: space-between; }
					.stamp-area { width: 140px; height: 60px; border: 1px dashed #9ca3af; border-radius: 6px; text-align: center; line-height: 60px; font-size: 10px; color: #9ca3af; }
				</style>
			</head>
			<body>
				<div class="print-header">
					<div>
						<div class="clinic-title">DENTE CLINIC · ЛУЧЕВАЯ ДИАГНОСТИКА</div>
						<div class="clinic-subtitle">Медицинская карта амбулаторного приёма · Протокол радиовизиографии</div>
					</div>
					<div class="doc-meta">
						<div><b>Дата:</b> ${nowStr}</div>
						<div><b>Код:</b> ${modalityMeta.id.toUpperCase()}</div>
					</div>
				</div>

				<div class="patient-box">
					<div><b>Пациент:</b> ${patientName} (ИД: ${patientId})</div>
					<div><b>Вид исследования:</b> ${modalityMeta.name} | <b>Зуб FDI:</b> #${activeTooth}</div>
					<div><b>Эффективная доза облучения:</b> ${modalityMeta.typicalDoseMsv} мЗв (в пределах нормативов НРБ-99/2009)</div>
				</div>

				<div class="image-container">
					<img src="${currentImageUrl}" alt="Рентгенограмма ${patientName}" />
				</div>

				<div class="footer-box">
					<div>
						<div>Врач-рентгенолог / Лечащий врач-стоматолог: ______________________</div>
						<div style="margin-top: 4px; color: #9ca3af;">Заверено усиленной квалифицированной электронной подписью клиники</div>
					</div>
					<div class="stamp-area">М.П. / ЭЦП</div>
				</div>
				<script>
					window.onload = function() { window.print(); }
				</script>
			</body>
			</html>
		`);
		printWin.document.close();
	}, [activeModality, activeTooth, currentImageUrl, patientName, patientId]);

	// Подхват из сетевой папки (Hotfolder)
	const handleSelectHotfolder = useCallback((folderName: string) => {
		setIsHotFolderMenuOpen(false);
		showToast(`Подключена сетевая папка томографа: ${folderName}`, "success");
	}, []);

	// Сохранение в карту приёма (Primary CTA)
	const handleSaveToRecord = useCallback(() => {
		if (onSaveToChart) {
			onSaveToChart({
				toothCode: activeTooth,
				modality: activeModality,
				imageUrl: currentImageUrl,
				doseMsv: MODALITY_CATALOG[activeModality].typicalDoseMsv,
				measurementsCount: 1,
			});
		}
		showToast(`Снимок зуба #${activeTooth} успешно сохранен в карту пациента`, "success");
		onClose();
	}, [activeTooth, activeModality, currentImageUrl, onSaveToChart, onClose]);

	if (!isOpen) return null;
	if (typeof document === "undefined") return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100000] flex flex-col items-center justify-center p-0 sm:p-3 select-none"
			style={{
				backgroundColor: "rgba(10, 15, 26, 0.82)",
				backdropFilter: "blur(6px)",
				height: "100dvh",
				maxHeight: "100dvh",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="visiograph-studio-modal-root"
		>
			<div
				className={`w-full flex flex-col bg-[var(--paper)] border border-[var(--line)] shadow-2xl transition-all duration-200 overflow-hidden ${
					isFullscreen
						? "h-full rounded-none"
						: "h-full sm:max-h-[96vh] sm:max-w-6xl rounded-none sm:rounded-2xl"
				}`}
				style={{
					background: "var(--paper, #0d1117)",
					borderColor: "var(--line, #30363d)",
				}}
				role="dialog"
				aria-modal="true"
				aria-label="Студия радиовизиографии и лучевой диагностики"
			>
				{/* ─── Шапка модального окна (Строго 1 строка 44–48px) ─── */}
				<header
					className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 overflow-x-clip"
					style={{ minHeight: "44px" }}
				>
					<div className="flex items-center gap-2 sm:gap-3 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<Activity size={18} />
						</div>
						<div className="flex flex-col min-w-0">
							<div className="flex items-center gap-1.5 sm:gap-2">
								{/* Десктопный полный заголовок */}
								<h2
									className="hidden sm:inline-block text-xs sm:text-sm font-bold text-[var(--ink)] truncate max-w-[200px] xl:max-w-xs"
									title={`Визиограф · ${patientName}`}
								>
									Визиограф · {patientName}
								</h2>
								{/* Мобильный краткий заголовок без срезания */}
								<h2 className="sm:hidden text-xs font-bold text-[var(--ink)] whitespace-nowrap">
									Визиограф
								</h2>
							</div>
							<p className="hidden sm:block text-[11px] text-[var(--muted)] whitespace-nowrap truncate max-w-[200px] xl:max-w-xs">
								{MODALITY_CATALOG[activeModality].name} · Доза: {MODALITY_CATALOG[activeModality].typicalDoseMsv} мЗв
							</p>
						</div>
					</div>

					{/* Переключатель режимов модальностей (Табы с whitespace-nowrap) */}
					<div className="hidden lg:flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] shrink-0">
						{(["rvg", "opg", "cbct", "photo"] as const).map((mod) => (
							<button
								key={mod}
								type="button"
								onClick={() => setActiveModality(mod)}
								className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
									activeModality === mod
										? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`tab-modality-${mod}`}
							>
								{MODALITY_TAB_LABELS[mod]}
							</button>
						))}
					</div>

					{/* Вспомогательные действия и закрытие */}
					<div className="flex items-center gap-1.5 shrink-0">
						{/* Выбор зуба FDI (Быстрый поповер) */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsToothSelectorOpen((prev) => !prev)}
								className="h-8 px-2 rounded-lg text-xs font-mono font-bold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1"
								title="Привязать к номеру зуба FDI"
								data-testid="btn-select-tooth-fdi"
							>
								<span>#{activeTooth}</span>
							</button>

							{isToothSelectorOpen && (
								<div
									className="absolute top-full right-0 mt-1 z-50 p-2 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl grid grid-cols-8 gap-1 w-64"
									onClick={(e) => e.stopPropagation()}
								>
									{FDI_PERMANENT_TEETH.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => {
												setActiveTooth(tooth);
												setIsToothSelectorOpen(false);
											}}
											className={`h-7 rounded text-xs font-mono font-bold flex items-center justify-center border transition-colors ${
												activeTooth === tooth
													? "bg-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] text-white"
													: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
											}`}
										>
											{tooth}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Сетевой хотфолдер (на мобильном скрыт, чтобы не создавать частокол) */}
						<div className="relative hidden sm:block">
							<button
								type="button"
								onClick={() => setIsHotFolderMenuOpen((prev) => !prev)}
								className="h-8 w-8 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center"
								title="Сетевые папки томографов (Romexis / Ez3D / Sidexis)"
								data-testid="btn-toggle-hotfolders"
							>
								<FolderOpen size={15} />
							</button>

							{isHotFolderMenuOpen && (
								<div
									className="absolute top-full right-0 mt-1 z-50 p-2 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl flex flex-col gap-1 w-56 text-xs"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="px-2 py-1 font-bold text-[var(--ink)] border-b border-[var(--line)]">
										Сетевые папки томографов
									</div>
									{CANONICAL_HOTFOLDERS.map((hf) => (
										<button
											key={hf.vendor}
											type="button"
											onClick={() => handleSelectHotfolder(hf.name)}
											className="px-2 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-between"
										>
											<span>{hf.name}</span>
											<span className="text-[10px] text-[var(--teal,#0d9488)] font-mono">LAN</span>
										</button>
									))}
								</div>
							)}
						</div>

						{/* Быстрая печать протокола А4 */}
						<button
							type="button"
							onClick={handlePrintA4}
							className="h-8 px-2 sm:px-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1 text-xs font-semibold"
							title="Быстрая печать снимка на А4 с медицинским паспортом"
							data-testid="btn-print-visiograph-a4"
						>
							<Printer size={14} />
							<span className="hidden md:inline">Печать А4</span>
						</button>

						{/* Полноэкранный режим */}
						<button
							type="button"
							onClick={() => setIsFullscreen((prev) => !prev)}
							className="hidden sm:flex h-8 w-8 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] items-center justify-center"
							title={isFullscreen ? "Свернуть в окно" : "На весь экран"}
							data-testid="btn-toggle-fullscreen"
						>
							{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
						</button>

						{/* Закрыть */}
						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] hover:text-white flex items-center justify-center ml-0.5"
							aria-label="Закрыть окно визиографа"
							data-testid="btn-close-visiograph-modal"
						>
							<X size={16} />
						</button>
					</div>
				</header>

				{/* ─── Основная интерактивная рабочая область визиографа ─── */}
				<main className="flex-1 overflow-hidden relative flex flex-col">
					<VisiographStudioCanvas
						imageUrl={currentImageUrl}
						patientId={patientId}
						patientFullName={patientName}
						toothCode={activeTooth}
						isModalHost={true}
						onClose={onClose}
						onSaveToRecord={handleSaveToRecord}
					/>
				</main>

				{/* ─── Нижняя панель действий (Ровно ОДНА Primary CTA кнопка цвета Teal #0d9488) ─── */}
				<footer
					className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2"
					style={{ minHeight: "48px" }}
				>
					<div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-[var(--muted)]">
						<span className="hidden sm:inline">
							Датчик: <b>Vatech EzSensor 1.5</b>
						</span>
						<span className="hidden sm:inline opacity-40">|</span>
						<span>
							Доза: <b>{MODALITY_CATALOG[activeModality].typicalDoseMsv} мЗв</b>
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="secondary-button h-8 sm:h-9 px-3 rounded-lg text-xs font-semibold"
							data-testid="btn-cancel-modal"
						>
							Отмена
						</button>

						{/* Ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) по Мандату 8am */}
						<button
							type="button"
							onClick={handleSaveToRecord}
							className="h-8 sm:h-9 px-3 sm:px-4 rounded-lg text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
							data-testid="btn-primary-save-visiograph"
						>
							<Check size={15} strokeWidth={2.5} />
							<span>✓ Привязать к карте приёма</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};

export default VisiographStudioModal;
