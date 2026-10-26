import React from "react";
import { CalendarPlus, CheckCircle2, CreditCard, Heart, QrCode } from "lucide-react";
import type { PatientCabinetSummary, PatientInvoiceItem } from "../../patientCabinetEngine";
import type { PatientCabinetTab } from "../../modal/types.js";

export interface OverviewQuickActionsProps {
	readonly summary: PatientCabinetSummary;
	readonly firstUnpaid: PatientInvoiceItem | undefined;
	readonly onOpenBooking?: () => void;
	readonly onOpenSbpForInvoice: (inv: PatientInvoiceItem) => void;
	readonly onOpenTab: (tab: PatientCabinetTab) => void;
	readonly onOpenCareMemo: () => void;
	readonly onOpenReceptionQr: () => void;
}

export const OverviewQuickActions: React.FC<OverviewQuickActionsProps> = ({
	summary,
	firstUnpaid,
	onOpenBooking,
	onOpenSbpForInvoice,
	onOpenTab,
	onOpenCareMemo,
	onOpenReceptionQr,
}) => {
	return (
		<div className="pc-quick-actions-bar" aria-label="Быстрые действия">
			<button
				type="button"
				className="pc-quick-action-btn primary"
				onClick={onOpenBooking}
				data-testid="quick-action-book"
			>
				<CalendarPlus size={18} />
				<span>Записаться онлайн</span>
			</button>

			<button
				type="button"
				className="pc-quick-action-btn secondary"
				onClick={() => {
					if (firstUnpaid) {
						onOpenSbpForInvoice(firstUnpaid);
					} else {
						onOpenTab("invoices");
					}
				}}
				data-testid="quick-action-pay"
			>
				<CreditCard size={18} />
				<span>Оплатить счет</span>
				{summary.unpaidInvoicesCount > 0 && (
					<span className="pc-tab-counter">{summary.unpaidInvoicesCount}</span>
				)}
			</button>

			<button
				type="button"
				className="pc-quick-action-btn secondary"
				onClick={() => onOpenTab("plans")}
				data-testid="quick-action-plan"
			>
				<CheckCircle2 size={18} />
				<span>Мой план лечения</span>
			</button>

			<button
				type="button"
				className="pc-quick-action-btn secondary"
				onClick={onOpenCareMemo}
				data-testid="quick-action-care"
			>
				<Heart size={18} />
				<span>Памятка после приема</span>
			</button>

			<button
				type="button"
				className="pc-quick-action-btn accent"
				onClick={onOpenReceptionQr}
				data-testid="btn-show-reception-qr"
			>
				<QrCode size={18} />
				<span>Показать администратору</span>
			</button>
		</div>
	);
};
