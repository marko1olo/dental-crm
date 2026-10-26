import React from "react";
import { AlertCircle, QrCode, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import type { DentalHealthIndexResult, PatientCabinetSummary, PatientInvoiceItem } from "../../patientCabinetEngine";
import { formatRubles } from "../../patientCabinetEngine";
import type { PatientCabinetTab } from "../../modal/types.js";
import { OverviewReceptionQrBanner } from "./OverviewReceptionQrBanner";

export interface OverviewAlertsAndHealthProps {
	readonly summary: PatientCabinetSummary;
	readonly healthIndex: DentalHealthIndexResult;
	readonly firstUnpaid: PatientInvoiceItem | undefined;
	readonly onOpenReceptionQr: () => void;
	readonly onOpenTab: (tab: PatientCabinetTab) => void;
	readonly onOpenSbpForInvoice: (inv: PatientInvoiceItem) => void;
}

export const OverviewAlertsAndHealth: React.FC<OverviewAlertsAndHealthProps> = ({
	summary,
	healthIndex,
	firstUnpaid,
	onOpenReceptionQr,
	onOpenTab,
	onOpenSbpForInvoice,
}) => {
	return (
		<>
			<OverviewReceptionQrBanner onOpenReceptionQr={onOpenReceptionQr} />

			{summary.unpaidInvoicesCount > 0 && (
				<div className="pc-alert-banner warning" data-testid="unpaid-invoices-alert">
					<div className="pc-alert-body">
						<AlertCircle size={22} className="pc-icon-warning flex-shrink-0" />
						<div>
							<strong>У вас есть неоплаченный счет на сумму {formatRubles(summary.totalUnpaidAmountRub)}</strong>
							<p className="pc-alert-subtext">Оплатите счет моментально без комиссии через Систему Быстрых Платежей (СБП).</p>
						</div>
					</div>
					<button
						type="button"
						className="pc-btn-primary"
						onClick={() => {
							if (firstUnpaid) onOpenSbpForInvoice(firstUnpaid);
							else onOpenTab("invoices");
						}}
					>
						<QrCode size={16} />
						<span>Оплатить через СБП</span>
					</button>
				</div>
			)}

			{summary.pendingConsentsCount > 0 && (
				<div className="pc-alert-banner danger" data-testid="pending-consents-alert">
					<div className="pc-alert-body">
						<ShieldAlert size={22} className="pc-icon-danger flex-shrink-0" />
						<div>
							<strong>Ожидает подписи {summary.pendingConsentsCount} информированное согласие (ИДС)</strong>
							<p className="pc-alert-subtext">Подтвердите согласие на медицинское вмешательство по SMS (63-ФЗ ПЭП) прямо сейчас.</p>
						</div>
					</div>
					<button type="button" className="pc-btn-primary pc-danger-btn" onClick={() => onOpenTab("documents")}>
						<Smartphone size={16} />
						<span>Подписать по SMS</span>
					</button>
				</div>
			)}

			<div className="pc-card dental-health-index-card" data-testid="pc-overview-health-index">
				<div className="pc-card-header">
					<div className="pc-card-title">
						<ShieldCheck size={20} className="pc-icon-primary" />
						<div>
							<strong>Интерактивный индекс здоровья зубов</strong>
							<div className="pc-card-subtitle">{healthIndex.statusLabelRu} &bull; Формула FDI (32 зуба)</div>
						</div>
					</div>
					<span className="pc-status-badge paid pc-sanitation-badge">
						Здоровье зубов: {healthIndex.sanitationPercent}%
					</span>
				</div>
				<div className="pc-progress-bar-bg">
					<div
						className="pc-progress-bar-fill"
						style={{
							width: `${healthIndex.sanitationPercent}%`,
							backgroundColor: healthIndex.sanitationPercent >= 90 ? "var(--pc-success)" : "var(--pc-primary)",
						}}
					/>
				</div>
				<div className="pc-health-index-footer">
					<span>{healthIndex.formattedIndexRu}</span>
					<button type="button" className="pc-btn-secondary pc-btn-compact" onClick={() => onOpenTab("plans")}>
						Смотреть формулу
					</button>
				</div>
			</div>
		</>
	);
};
