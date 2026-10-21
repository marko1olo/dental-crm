import type React from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { PlanPriceValidationReport } from "../planPriceValidationEngine.js";

interface BannersProps {
	readonly report: PlanPriceValidationReport;
}

export const PriceValidatorPricesBanners: React.FC<BannersProps> = ({ report }) => {
	const isWarn =
		report.overallStatus === "BLOCKED_ARCHIVED_SERVICE" ||
		report.overallStatus === "PENDING_ADMIN_OVERRIDE";

	return (
		<>
			{report.isPlanExpired && (
				<div
					className="price-validator-banner status-info"
					data-testid="validator-plan-expired-soft-banner"
					style={{
						background: "rgba(245, 158, 11, 0.08)",
						borderColor: "rgba(245, 158, 11, 0.3)",
						color: "var(--ink)",
						marginBottom: "0.75rem",
					}}
				>
					<Clock size={20} className="text-[var(--warn-fg,var(--warn,#d97706))] shrink-0" />
					<div>
						<strong>Мягкое предупреждение: срок составления сметы превысил 30 дней</strong>
						<div style={{ marginTop: 2, fontSize: "0.85rem" }}>
							Истечение 30 дней с момента составления плана лечения не блокирует оказание услуг, создание нарядов ЗТЛ или проведение оплаты. Цены зафиксированы по согласованию с лечащим врачом.
						</div>
					</div>
				</div>
			)}

			{report.validationMessages.length > 0 && (
				<div className={`price-validator-banner ${isWarn ? "status-warn" : "status-ok"}`}>
					{isWarn ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
					<div>
						<strong>
							{report.overallStatus === "BLOCKED_ARCHIVED_SERVICE"
								? "Архивная позиция в плане (разрешено врачом)"
								: report.overallStatus === "PENDING_ADMIN_OVERRIDE"
									? "Индивидуальная скидка согласована врачом"
									: "Проверка успешно завершена"}
						</strong>
						{report.validationMessages.map((msg, idx) => (
							<div key={idx} style={{ marginTop: 2 }}>{msg}</div>
						))}
					</div>
				</div>
			)}
		</>
	);
};
