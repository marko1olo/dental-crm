import type React from "react";
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
			<div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<button
					type="button"
					data-testid="toggle-courier-waybill-btn"
					onClick={onToggleWaybill}
					className="secondary-button"
					style={{
						minHeight: "44px",
						padding: "8px 14px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontWeight: 600,
						fontSize: "13px",
						borderRadius: "8px",
						background: showWaybill ? "var(--teal-soft)" : undefined,
						borderColor: showWaybill ? "var(--teal)" : undefined,
						color: showWaybill ? "var(--teal)" : undefined,
					}}
				>
					<FileText size={16} />
					<span>{showWaybill ? "Скрыть накладную курьера" : "Накладная курьеру (QR + Штрихкод)"}</span>
				</button>

				{showWaybill && (
					<button
						type="button"
						data-testid="courier-waybill-print-btn"
						onClick={() => window.print()}
						className="primary-button"
						style={{ minHeight: "44px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "13px", borderRadius: "8px" }}
					>
						<Printer size={16} />
						<span>Распечатать накладную</span>
					</button>
				)}
			</div>

			{showWaybill && (
				<div data-testid="courier-waybill-card" style={{ border: "2px dashed var(--teal)", borderRadius: "12px", padding: "20px", background: "var(--paper)", marginBottom: "16px", textAlign: "left" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--teal)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>
								<Truck size={16} /><span>Курьерская накладная передачи в клинику</span>
							</div>
							<h4 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: 800 }}>{orderNumberDisplay}</h4>
							<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
								Заказ № {(order.id ?? "").substring(0, 8).toUpperCase()} · Пациент: <strong>{order.patientFullName || "Пациент не указан"}</strong>
							</p>
						</div>
						<span style={{ padding: "4px 8px", borderRadius: "6px", background: "var(--teal-soft)", color: "var(--teal)", fontWeight: 700, fontSize: "11px" }}>
							{statusLabel}
						</span>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
						<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
							<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Штрихкод для сканера регистратуры (Code 128):</div>
							<div data-testid="courier-waybill-barcode" className="guest-portal-code-plate" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(orderNumberDisplay) }} />
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
							<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>QR-код для быстрой отметки курьера/приёмки:</div>
							<div data-testid="courier-waybill-qr" className="guest-portal-code-plate" dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(`DENTE-ZTL-ORDER:${order.id}:${order.patientFullName || ""}:${order.toothFdi || ""}`) }} />
						</div>
					</div>

					<div style={{ fontSize: "12px", color: "var(--text-secondary)", borderTop: "1px solid var(--line)", paddingTop: "10px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
						<div>Зуб (FDI): <strong>{order.toothFdi || "—"}</strong> · Материал: <strong>{materialDisplay}</strong> · Цвет: <strong>{order.colorVita || "—"}</strong></div>
						<div>Срок сдачи: <strong>{dueDateDisplay}</strong> · Создан: {createdDisplay}</div>
					</div>
				</div>
			)}
		</>
	);
}
