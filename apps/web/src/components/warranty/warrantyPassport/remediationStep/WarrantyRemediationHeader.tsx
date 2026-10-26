import { Check, CheckCircle2, ShieldCheck } from "lucide-react";
import type React from "react";

export interface WarrantyRemediationHeaderProps {
	remediationSuccessNotice: string | null;
}

export const WarrantyRemediationHeader: React.FC<WarrantyRemediationHeaderProps> = ({
	remediationSuccessNotice,
}) => {
	return (
		<>
			<div className="warranty-remediation-statutory-box">
				<div className="warranty-statutory-head">
					<div className="warranty-statutory-icon-box">
						<ShieldCheck size={22} />
					</div>
					<div>
						<h4>Гарантийная переделка у кресла (0 ₽)</h4>
						<p>Гарантия качества клиники • Врачебная автономия • 100% скидка без блокировки счёта</p>
					</div>
				</div>
				<div className="warranty-statutory-features">
					<div className="statutory-feat-pill">
						<Check size={14} style={{ color: "var(--ok-fg)" }} />
						<span>Пациент платит: <strong>0 ₽ (Гарантия 100%)</strong></span>
					</div>
					<div className="statutory-feat-pill">
						<Check size={14} style={{ color: "var(--ok-fg)" }} />
						<span>Материалы: <strong>Автоматическое списание со склада</strong></span>
					</div>
					<div className="statutory-feat-pill">
						<Check size={14} style={{ color: "var(--ok-fg)" }} />
						<span>Решение врача: <strong>В 1 клик без блокировки счёта</strong></span>
					</div>
				</div>
			</div>

			{remediationSuccessNotice && (
				<div className="warranty-success-alert">
					<CheckCircle2 size={18} />
					<span>{remediationSuccessNotice}</span>
				</div>
			)}
		</>
	);
};
