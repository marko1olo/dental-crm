import type React from "react";
import { Check, ShieldCheck } from "lucide-react";
import type { AdminOverrideMetadata } from "../planPriceValidationEngine.js";

interface AdminDrawerProps {
	readonly adminOverride: AdminOverrideMetadata;
	readonly onRevokeAdminOverride: () => void;
	readonly onAuthorizeDoctorAutonomy: () => void;
	readonly adminReasonInput: string;
	readonly onAdminReasonChange: (val: string) => void;
	readonly adminPinInput: string;
	readonly onAdminPinChange: (val: string) => void;
}

export const PriceValidatorAdminDrawer: React.FC<AdminDrawerProps> = ({
	adminOverride,
	onRevokeAdminOverride,
	onAuthorizeDoctorAutonomy,
	adminReasonInput,
	onAdminReasonChange,
	adminPinInput,
	onAdminPinChange,
}) => {
	return (
		<div className="price-validator-admin-box">
			<div className="price-validator-admin-header">
				<span><ShieldCheck size={16} /> Автономия лечащего врача / Подтверждение цен</span>
				{adminOverride.isAuthorized && (
					<button type="button" className="pv-res-btn" onClick={onRevokeAdminOverride}>
						Сбросить согласование
					</button>
				)}
			</div>
			<div className="price-validator-admin-inputs">
				<button
					type="button"
					className="price-validator-btn-brand"
					onClick={onAuthorizeDoctorAutonomy}
					data-testid="btn-doctor-autonomy-approve"
					style={{ background: "var(--pv-ok)", borderColor: "var(--pv-ok)" }}
				>
					<Check size={16} /> Подтвердить (без PIN-кода)
				</button>
				<input
					type="text"
					className="price-validator-input"
					placeholder="Основание / Причина фиксации"
					value={adminReasonInput}
					onChange={(e) => onAdminReasonChange(e.target.value)}
				/>
				<input
					type="password"
					className="price-validator-input"
					placeholder="PIN-код (необязательно)"
					value={adminPinInput}
					onChange={(e) => onAdminPinChange(e.target.value)}
				/>
			</div>
		</div>
	);
};
