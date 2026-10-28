import React from "react";
import { AlertTriangle, Check, ChevronRight, Clock, Phone } from "lucide-react";
import type { DentalLabOrderData } from "../labMath";
import { formatLabConstructionTitle } from "../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../labMath";
import { money } from "../../../AppHelpers";
import { formatMobileDeadlineAndTimer, getOrderStageIndex, MOBILE_LAB_STAGES } from "./mobileLabTimelineHelpers";

export interface MobileLabOrderCardProps {
	readonly order: DentalLabOrderData;
	readonly onSelect: (order: DentalLabOrderData) => void;
}

export function MobileLabOrderCard({ order, onSelect }: MobileLabOrderCardProps): React.JSX.Element {
	const orderNum = (order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "Наряд");
	const toothDisplay = order.toothFdi ? `Зуб ${order.toothFdi}` : order.selectedTeeth?.length ? `Зуб ${order.selectedTeeth.join(", ")}` : "Челюсть";
	const constructionDisplay = formatLabConstructionTitle(order.constructionType, order.material ?? undefined);
	const swatchBg = SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
	const labName = (order as any).labName || "Центральная CAD/CAM лаборатория";
	const techName = (order as any).technicianName || "Дежурный техник";
	const labPhone = (order as any).labPhone || (order as any).patientPhone || "+7 (999) 450-23-11";
	const stageIdx = getOrderStageIndex(order);
	const deadline = formatMobileDeadlineAndTimer(order);
	const isWarranty = (order as any).isWarrantyRework || order.status === "refitting" || order.priceRub === 0;

	const statusBadge = (() => {
		const st = (order.status || "").toLowerCase();
		if (["ready", "ready_in_clinic", "shipped"].includes(st)) {
			return { label: "Готово в клинике", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" };
		}
		if (["fitting", "refitting", "try_in"].includes(st)) {
			return { label: "Примерка", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" };
		}
		if (["completed", "delivered_to_patient"].includes(st)) {
			return { label: "Сдано", className: "bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30" };
		}
		return { label: "В работе", className: "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30" };
	})();

	return (
		<article className="mobile-lab-card" onClick={() => onSelect(order)} data-testid={`mobile-lab-order-card-${order.id}`}>
			<div className="mobile-lab-card-header">
				<div className="mobile-lab-patient-block">
					<div className="mobile-lab-patient-name" title={order.patientName}>{order.patientName || "Пациент"}</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="mobile-lab-order-id">{orderNum}</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadge.className}`}
							data-testid={`mobile-lab-status-badge-${order.id}`}
						>
							{statusBadge.label}
						</span>
					</div>
				</div>
				<div className="mobile-lab-fdi-chip">
					<span className="font-bold">{toothDisplay}</span>
					<span className="opacity-40">•</span>
					<span className="mobile-lab-fdi-construction">{constructionDisplay}</span>
				</div>
			</div>

			<div className="mobile-lab-contact-row">
				<div className="mobile-lab-info-block">
					<div className="mobile-lab-name-text">{labName}</div>
					<div className="mobile-lab-tech-text">{techName}</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[11px] font-bold">
						{order.colorVita ? (
							<>
								<span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: swatchBg }} />
								<span>{order.colorVita}</span>
							</>
						) : <span className="text-[var(--muted)]">—</span>}
					</div>
					<a href={`tel:${labPhone.replace(/[^\d+]/g, "")}`} onClick={(e) => e.stopPropagation()} className="mobile-lab-call-btn" title={`Позвонить технику: ${labPhone}`} data-testid={`mobile-lab-call-btn-${order.id}`}>
						<Phone size={17} />
					</a>
				</div>
			</div>

			<div className="mobile-lab-progress-track">
				<div className="mobile-lab-stage-connector">
					<div className="mobile-lab-stage-connector-fill" style={{ width: `${(stageIdx / 3) * 100}%` }} />
				</div>
				{MOBILE_LAB_STAGES.map((st, idx) => {
					const isDone = idx < stageIdx || (idx === 3 && stageIdx === 3);
					const isCurrent = idx === stageIdx && stageIdx !== 3;
					return (
						<div key={st.id} className={`mobile-lab-stage-item ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}>
							<div className="mobile-lab-stage-circle">
								{isDone ? <Check size={12} strokeWidth={3} /> : isCurrent ? <span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)]" /> : <span>{idx + 1}</span>}
							</div>
							<span className="mobile-lab-stage-label">{st.label}</span>
						</div>
					);
				})}
			</div>

			<div className="mobile-lab-footer-row">
				<div className={`mobile-lab-deadline-badge ${deadline.isUrgent ? "is-urgent" : deadline.isReady ? "is-ready" : ""}`}>
					{deadline.isUrgent ? <AlertTriangle size={13} className="shrink-0 text-rose-600" /> : <Clock size={13} className="shrink-0 text-[var(--teal,#0d9488)]" />}
					<span>{deadline.text}</span>
				</div>
				<div className="flex items-center gap-1.5 font-mono font-bold text-xs">
					{isWarranty ? <span className="text-emerald-600 dark:text-emerald-400">0 ₽ (Гарантия)</span> : order.priceRub != null ? <span className="text-[var(--ink)]">{money(order.priceRub)}</span> : <span className="text-[var(--muted)]">—</span>}
					<ChevronRight size={15} className="text-[var(--muted)] shrink-0" />
				</div>
			</div>
		</article>
	);
}
