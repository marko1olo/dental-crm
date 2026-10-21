import React from "react";
import { Clock } from "lucide-react";

export interface ComparatorExpiredNoticeProps {
	effectivePlanAgeDays: number;
}

export const ComparatorExpiredNotice: React.FC<ComparatorExpiredNoticeProps> = ({
	effectivePlanAgeDays,
}) => {
	if (effectivePlanAgeDays <= 30) return null;

	return (
		<div
			style={{
				background: "rgba(245, 158, 11, 0.12)",
				borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
				color: "var(--amber, #d97706)",
				padding: "8px 20px",
				fontSize: "0.8125rem",
				fontWeight: 600,
				display: "flex",
				alignItems: "center",
				gap: "8px",
			}}
			data-testid="comparator-expired-unblocked-badge"
		>
			<Clock size={15} style={{ color: "var(--amber, #d97706)", flexShrink: 0 }} />
			<span>
				План составлен более 30 дней назад ({effectivePlanAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений.
			</span>
		</div>
	);
};
