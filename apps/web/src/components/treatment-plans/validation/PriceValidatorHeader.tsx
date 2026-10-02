/**
 * PriceValidatorHeader.tsx — Шапка модального окна валидации цен плана лечения (DENTE CRM).
 */

import type React from "react";
import { Award, Clock, ShieldCheck, X } from "lucide-react";
import type { TreatmentPlanValidationPayload } from "./planPriceValidationPresets";
import type { PlanPriceValidationReport } from "./planPriceValidationEngine";
import type { StarProtocolValidationSummary } from "./starProtocolValidationEngine";

export interface PriceValidatorHeaderProps {
	readonly planPayload: TreatmentPlanValidationPayload;
	readonly report: PlanPriceValidationReport;
	readonly starValidation: StarProtocolValidationSummary;
	readonly onClose?: (() => void) | undefined;
}

export const PriceValidatorHeader: React.FC<PriceValidatorHeaderProps> = ({
	planPayload,
	report,
	starValidation,
	onClose,
}) => {
	return (
		<header className="price-validator-header">
			<div className="price-validator-header-info">
				<div className="price-validator-icon-badge">
					<ShieldCheck size={26} />
				</div>
				<div>
					<div className="price-validator-title-row">
						<h2 className="price-validator-title">
							Валидатор цен и протоколов СтАР: {planPayload.planNumber}
						</h2>
						{report.isPlanExpired ? (
							<span
								className="pv-badge pv-badge-warn"
								data-testid="validator-expired-unblocked-badge"
								title="План составлен более 30 дней назад, цены могут быть скорректированы. Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются (согласовано врачом)."
							>
								<Clock size={12} /> План составлен более 30 дней назад, цены могут быть скорректированы
							</span>
						) : (
							<span className="pv-badge pv-badge-ok">
								<Clock size={12} /> Действителен (осталось {report.expiryDaysRemaining} дн.)
							</span>
						)}
						<span
							className={`pv-badge ${
								starValidation.overallStatus === "FULL_COMPLIANCE"
									? "pv-badge-ok"
									: starValidation.overallStatus === "COMPLIANT_WITH_RECOMMENDATIONS"
										? "pv-badge-warn"
										: "pv-badge-danger"
							}`}
						>
							<Award size={12} /> СтАР: {starValidation.complianceScorePercent}%
						</span>
					</div>
					<p className="price-validator-subtitle">
						Пациент: <strong>{planPayload.patientName}</strong> | Врач:{" "}
						{planPayload.doctorFullName}
					</p>
				</div>
			</div>
			{onClose ? (
				<button
					type="button"
					className="price-validator-close-btn"
					onClick={onClose}
					title="Закрыть валидатор"
					aria-label="Закрыть"
				>
					<X size={20} />
				</button>
			) : null}
		</header>
	);
};

export default PriceValidatorHeader;
