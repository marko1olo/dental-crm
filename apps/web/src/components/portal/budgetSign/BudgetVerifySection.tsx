import React from "react";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import type { BudgetPortalData } from "./budgetSignTypes";

export interface BudgetVerifySectionProps {
	readonly budget: BudgetPortalData;
	readonly verifyFactor: string;
	readonly setVerifyFactor: (val: string) => void;
	readonly isVerifying: boolean;
	readonly verifyError: string | null;
	readonly onSubmit: (e?: React.FormEvent) => void;
}

export const BudgetVerifySection: React.FC<BudgetVerifySectionProps> = ({
	budget,
	verifyFactor,
	setVerifyFactor,
	isVerifying,
	verifyError,
	onSubmit,
}) => {
	const isPhoneAuth = budget.authMethod === "phone_last4";

	return (
		<div className="patient-budget-verify-box">
			<div className="patient-budget-card-title">
				<Lock size={16} />
				Подтверждение доступа
			</div>
			<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
				{isPhoneAuth
					? "Для просмотра полного плана лечения введите последние 4 цифры вашего номера телефона:"
					: "Укажите дату рождения (ДД.ММ.ГГГГ):"}
			</p>
			<form onSubmit={onSubmit}>
				<div className="patient-budget-verify-input-group">
					<input
						type="text"
						className="patient-budget-verify-input"
						placeholder={isPhoneAuth ? "••••" : "ДД.ММ.ГГГГ"}
						maxLength={isPhoneAuth ? 4 : 10}
						inputMode={isPhoneAuth ? "numeric" : "text"}
						value={verifyFactor}
						onChange={(e) => setVerifyFactor(e.target.value)}
						autoFocus
					/>
					<button
						type="submit"
						className="patient-budget-verify-btn"
						data-testid="patient-budget-verify-submit-btn"
					>
						<ShieldCheck size={16} />
						{isVerifying ? "Проверка..." : "Войти"}
					</button>
				</div>
			</form>
			{verifyError && (
				<div className="patient-budget-error-msg" data-testid="patient-budget-verify-error">
					<AlertCircle size={14} />
					{verifyError}
				</div>
			)}
		</div>
	);
};
