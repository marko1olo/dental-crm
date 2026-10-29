/**
 * VisiographHotFolderToast.tsx — Канонический эргономичный Toast захвата снимков из хотфолдера.
 *
 * Архитектурные стандарты:
 * - Мандат 8e: Автономия врача у кресла (0 блокировок).
 * - Мандат 8n: Суверенитет соло-врача и небольшой клиники (1-3 кресла).
 * - Мандат 8am: Ровно ОДНА Primary CTA кнопка (#0d9488) на видимый контекст.
 * - Мандат 8b: Sweet Spot ~150–220 строк.
 * - Apple HIG: Touch Target >= 44x44px, безопасные отступы, чистый русский язык.
 */

import React, { useState } from "react";
import { Check, Eye, HardDrive, X, Zap, CreditCard } from "lucide-react";
import { useVisiographHotFolder } from "../../hooks/useVisiographHotFolder";

export interface VisiographHotFolderToastProps {
	readonly className?: string;
	readonly onLinked?: (tooth: string) => void;
	readonly onOpenedViewer?: () => void;
}

export const VisiographHotFolderToast: React.FC<VisiographHotFolderToastProps> = ({
	className = "",
	onLinked,
	onOpenedViewer,
}) => {
	const {
		currentScan,
		queuedCount,
		activeTooth,
		linkToTooth,
		openInViewer,
		dismissToast,
	} = useVisiographHotFolder();

	const [isBilled, setIsBilled] = useState<boolean>(false);

	if (!currentScan) {
		return null;
	}

	const targetTooth = currentScan.detectedTooth || activeTooth;

	const handleConfirmLink = () => {
		linkToTooth(targetTooth);
		if (onLinked) onLinked(targetTooth);
	};

	const handleOpenViewer = () => {
		openInViewer();
		if (onOpenedViewer) onOpenedViewer();
	};

	// 1-Клик добавление снимка в кассовый чек
	const handleAddToInvoice = () => {
		setIsBilled(true);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:add-service-to-cashbox", {
					detail: {
						title: `Прицельный снимок визиографа (зуб ${targetTooth})`,
						amountRub: 450,
						amountKopecks: 45000,
						tooth: targetTooth,
						modality: "rvg",
					},
				}),
			);
		}
	};

	return (
		<aside
			role="alert"
			aria-live="polite"
			data-testid="visiograph-incoming-toast"
			className={`fixed bottom-28 sm:bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${className}`}
			style={{
				background: "var(--paper-strong)",
				border: "1px solid var(--line)",
				color: "var(--ink)",
				width: "420px",
				maxWidth: "calc(100vw - 32px)",
				boxShadow: "0 16px 36px rgba(0, 0, 0, 0.24), 0 2px 8px rgba(0, 0, 0, 0.08)",
			}}
		>
			{/* Верхняя строка: Телеметрия сенсора / Хотфолдера и закрытие */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<div
						className="flex h-5 w-5 items-center justify-center rounded-md"
						style={{
							background: "rgba(13, 148, 136, 0.12)",
							color: "var(--teal, #0d9488)",
						}}
					>
						<Zap className="h-3.5 w-3.5" />
					</div>
					<span className="text-[12px] font-semibold tracking-tight truncate">
						{currentScan.brandName}
					</span>
					{queuedCount > 0 && (
						<span
							className="rounded-full px-1.5 py-0.2 text-[10px] font-semibold tracking-wide whitespace-nowrap"
							style={{
								background: "rgba(13, 148, 136, 0.15)",
								color: "var(--teal, #0d9488)",
								border: "1px solid rgba(13, 148, 136, 0.3)",
							}}
						>
							+{queuedCount} новых
						</span>
					)}
					<span className="text-[10px] text-[var(--muted)] truncate">
						(доза 0.02 мЗв)
					</span>
				</div>

				<button
					type="button"
					onClick={dismissToast}
					title="Отклонить снимок (Esc)"
					aria-label="Закрыть уведомление"
					className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
					data-testid="btn-dismiss-toast"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Контентная область: Миниатюра + Метаданные файла */}
			<div className="flex items-center gap-3">
				<div
					className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg"
					style={{
						background: "#0f172a",
						border: "1px solid var(--line)",
					}}
				>
					{currentScan.thumbnailUrl ? (
						<img
							src={currentScan.thumbnailUrl}
							alt={currentScan.fileName}
							className="h-full w-full object-cover"
							onError={(e) => {
								e.currentTarget.style.display = "none";
							}}
						/>
					) : (
						<HardDrive className="h-6 w-6 text-slate-400" />
					)}
					<span
						className="absolute bottom-0.5 right-0.5 rounded px-1 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider text-white"
						style={{ background: "rgba(0, 0, 0, 0.65)" }}
					>
						{currentScan.fileType.replace(".", "") || "RVG"}
					</span>
				</div>

				<div className="flex flex-col min-w-0 flex-1">
					<div
						className="truncate text-[13px] font-medium leading-snug"
						title={currentScan.fileName}
					>
						{currentScan.fileName}
					</div>
					<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] leading-relaxed">
						<span>{currentScan.formattedSize}</span>
						<span>•</span>
						<span className="truncate">{currentScan.folderPath}</span>
					</div>
				</div>
			</div>

			{/* Панель действий: Вторичные кнопки 32px + Ровно 1 Primary CTA (#0d9488) */}
			<div className="flex items-center gap-1.5 pt-1">
				{/* Единственная Primary CTA кнопка (#0d9488): Привязать к приёму */}
				<button
					type="button"
					onClick={handleConfirmLink}
					data-testid="btn-link-to-tooth"
					className="flex flex-1 items-center justify-center gap-1 rounded-lg font-semibold text-[11px] sm:text-[12px] px-2 sm:px-3 whitespace-nowrap text-white hover:brightness-105 active:scale-95 transition-all shadow-xs"
					style={{
						height: "32px",
						minHeight: "32px",
						background: "var(--teal)",
						color: "#ffffff",
					}}
				>
					<Check className="h-3.5 w-3.5 stroke-[2.5]" />
					<span>Привязать к зубу {targetTooth}</span>
					<kbd
						className="ml-1 hidden sm:inline rounded px-1 py-0.5 text-[10px] font-mono opacity-80"
						style={{ background: "rgba(0, 0, 0, 0.22)" }}
					>
						↵
					</kbd>
				</button>

				{/* Вторичное действие: Открыть вьювер */}
				<button
					type="button"
					onClick={handleOpenViewer}
					data-testid="btn-open-in-viewer"
					className="flex items-center justify-center gap-1 rounded-lg text-[11px] sm:text-[12px] font-medium px-2 sm:px-2.5 transition-colors border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] whitespace-nowrap"
					style={{ height: "32px", minHeight: "32px" }}
					title="Открыть снимок во вьюере для детальной обработки"
				>
					<Eye className="h-3.5 w-3.5 text-[var(--muted)]" />
					<span>Во вьюере</span>
				</button>

				{/* Вторичное действие: Добавить в чек кассы */}
				<button
					type="button"
					onClick={handleAddToInvoice}
					disabled={isBilled}
					data-testid="btn-toast-add-bill"
					className="flex items-center justify-center gap-1 rounded-lg text-[11px] sm:text-[12px] font-medium px-2 transition-colors border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] whitespace-nowrap"
					style={{ height: "32px", minHeight: "32px" }}
					title="Добавить услугу снимка в кассовый чек"
				>
					<CreditCard className="h-3.5 w-3.5 text-[var(--muted)]" />
					<span>{isBilled ? "✓ В чеке" : "+ Чек"}</span>
				</button>
			</div>
		</aside>
	);
};

// Экспортируем канонический алиас для полной обратной совместимости
export const VisiographIncomingToast = VisiographHotFolderToast;
