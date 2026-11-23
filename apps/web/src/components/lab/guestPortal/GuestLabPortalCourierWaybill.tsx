import React from "react";
import { FileText, Printer, Truck } from "lucide-react";
import type { LabOrderData } from "./guestPortalTypes.js";
import { getLabPortalStatusLabel } from "./guestPortalTypes.js";
import { formatGostOrderNumber, generateBarcodeSvg, generateQrCodeSvg } from "../labMath.js";
import { MATERIAL_LABELS } from "../guestLabPortalHelpers.js";

export interface GuestLabPortalCourierWaybillProps {
	readonly order: LabOrderData;
	readonly showWaybill: boolean;
	readonly onToggleWaybill: () => void;
}

export function GuestLabPortalCourierWaybill({
	order,
	showWaybill,
	onToggleWaybill,
}: GuestLabPortalCourierWaybillProps): React.JSX.Element {
	const statusLabel = getLabPortalStatusLabel(order.status);
	const orderNumberDisplay = formatGostOrderNumber(order.id);
	const materialDisplay = order.material ? (MATERIAL_LABELS[order.material] ?? order.material) : "—";
	const dueDateDisplay = order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : "По согласованию";
	const createdDisplay = order.createdAt ? new Date(order.createdAt).toLocaleDateString("ru-RU") : "—";

	return (
		<>
			<div className="mb-4 flex justify-between items-center flex-wrap gap-2">
				<button
					type="button"
					data-testid="toggle-courier-waybill-btn"
					onClick={onToggleWaybill}
					className={`min-h-[44px] h-11 px-4 text-xs font-semibold rounded-xl border inline-flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
						showWaybill
							? "border-[var(--primary)] text-[var(--primary)] bg-[var(--paper-soft)]"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<FileText size={16} />
					<span>{showWaybill ? "Скрыть накладную курьера" : "Накладная курьеру (QR + Штрихкод)"}</span>
				</button>

				{showWaybill && (
					<button
						type="button"
						data-testid="courier-waybill-print-btn"
						onClick={() => window.print()}
						className="min-h-[44px] h-11 px-4 text-xs font-semibold rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] inline-flex items-center gap-2 shadow-sm cursor-pointer transition-colors shrink-0"
					>
						<Printer size={16} />
						<span>Распечатать накладную</span>
					</button>
				)}
			</div>

			{showWaybill && (
				<div data-testid="courier-waybill-card" className="border-2 border-dashed border-[var(--primary)]/50 rounded-2xl p-5 bg-[var(--paper)] mb-4 text-left shadow-xs">
					<div className="flex justify-between items-start mb-4 border-b border-[var(--line)] pb-3 flex-wrap gap-2.5">
						<div>
							<div className="flex items-center gap-1.5 text-[var(--primary)] font-bold text-xs">
								<Truck size={16} /><span>Курьерская накладная передачи в клинику</span>
							</div>
							<h4 className="m-0 mt-1 text-lg font-bold text-[var(--ink)] tracking-tight">{orderNumberDisplay}</h4>
							<p className="m-0 mt-0.5 text-xs text-[var(--ink-muted)]">
								Заказ № {(order.id ?? "").substring(0, 8).toUpperCase()} · Пациент: <strong className="text-[var(--ink)]">{order.patientFullName || "Пациент не указан"}</strong>
							</p>
						</div>
						<span className="px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--primary)] font-bold text-[11px]">
							{statusLabel}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
						<div className="flex flex-col gap-1.5">
							<div className="text-xs text-[var(--ink-muted)]">Штрихкод для сканера регистратуры (Code 128):</div>
							<div data-testid="courier-waybill-barcode" className="guest-portal-code-plate" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(orderNumberDisplay) }} />
						</div>
						<div className="flex flex-col gap-1.5 items-start">
							<div className="text-xs text-[var(--ink-muted)]">QR-код для быстрой отметки курьера/приёмки:</div>
							<div data-testid="courier-waybill-qr" className="guest-portal-code-plate" dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(`DENTE-ZTL-ORDER:${order.id}:${order.patientFullName || ""}:${order.toothFdi || ""}`) }} />
						</div>
					</div>

					<div className="text-xs text-[var(--ink-muted)] border-t border-[var(--line)] pt-2.5 flex justify-between flex-wrap gap-2">
						<div>Зуб (FDI): <strong className="text-[var(--ink)]">{order.toothFdi || "—"}</strong> · Материал: <strong className="text-[var(--ink)]">{materialDisplay}</strong> · Цвет: <strong className="text-[var(--ink)]">{order.colorVita || "—"}</strong></div>
						<div>Срок сдачи: <strong className="text-[var(--ink)]">{dueDateDisplay}</strong> · Создан: {createdDisplay}</div>
					</div>
				</div>
			)}
		</>
	);
}
