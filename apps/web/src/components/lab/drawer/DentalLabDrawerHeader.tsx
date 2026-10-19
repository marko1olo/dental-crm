import React from "react";
import { Layers, X, CheckCircle2 } from "lucide-react";
import { generateBarcodeSvg, generateQrCodeSvg } from "../labBarcodeQr";

export interface DentalLabDrawerHeaderProps {
	readonly isEditing: boolean;
	readonly orderNumber?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly currentStatus?: string | undefined;
	readonly onMarkReadyInClinic?: (() => void) | undefined;
	readonly onClose: () => void;
}

export const DentalLabDrawerHeader: React.FC<DentalLabDrawerHeaderProps> = ({
	isEditing,
	orderNumber,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	currentStatus,
	onMarkReadyInClinic,
	onClose,
}) => {
	const code128Svg = React.useMemo(() => {
		return generateBarcodeSvg(orderNumber || "ZTL-NEW", 180, 36);
	}, [orderNumber]);

	const qrSvg = React.useMemo(() => {
		return generateQrCodeSvg(orderNumber || "ZTL-NEW", 36);
	}, [orderNumber]);

	const isAlreadyReady = currentStatus === "ready_in_clinic" || currentStatus === "delivered_to_patient";

	return (
		<div className="border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			{/* Верхняя строка: заголовок и крестик закрытия */}
			<div className="flex items-center justify-between px-4 py-3 gap-2">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
							{isEditing ? `Наряд-заказ № ${orderNumber || "ЗТЛ"}` : "Новый наряд-заказ в лабораторию"}
						</h3>
						<span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
							Ортопедия
						</span>
						{isAlreadyReady && (
							<span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
								В клинике
							</span>
						)}
					</div>
					{(treatmentPlanId || stageNumber != null || stageTitle) && (
						<div className="mt-1 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
							<Layers size={12} className="shrink-0" />
							<span className="truncate" data-testid="drawer-treatment-stage-chip">
								План лечения: Этап {stageNumber ?? 3} · {stageTitle || "Ортопедический этап"}
							</span>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:border-[var(--teal)] flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs"
					data-testid="drawer-close-btn"
					aria-label="Закрыть шторку"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Нижняя панель: Штрихкод Code128, QR-код и 1-клик кнопка приёма курьера */}
			<div className="px-4 pb-2.5 pt-0.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line,#cbd5e1)]/50 bg-[var(--paper,#ffffff)]/60">
				<div className="flex items-center gap-2">
					<div
						className="bg-white p-1 rounded border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 flex items-center"
						dangerouslySetInnerHTML={{ __html: code128Svg }}
						data-testid="lab-order-barcode-preview"
						title={`Code128 Barcode: ${orderNumber || "ZTL-NEW"}`}
					/>
					<div
						className="bg-white p-1 rounded border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 flex items-center"
						dangerouslySetInnerHTML={{ __html: qrSvg }}
						data-testid="lab-order-qrcode-preview"
						title={`QR Code: ${orderNumber || "ZTL-NEW"}`}
					/>
				</div>

				{onMarkReadyInClinic && (
					<button
						type="button"
						onClick={onMarkReadyInClinic}
						data-testid="btn-mark-ready-in-clinic"
						className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer ${
							isAlreadyReady
								? "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400"
								: "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
						}`}
					>
						<CheckCircle2 className="w-4 h-4 text-white" />
						<span>{isAlreadyReady ? "Уже в клинике" : "Работа в клинике (Принято)"}</span>
					</button>
				)}
			</div>
		</div>
	);
};

