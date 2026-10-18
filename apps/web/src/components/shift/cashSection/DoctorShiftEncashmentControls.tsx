import React, { useState } from "react";
import { CheckCircle2, Lock, Wallet } from "lucide-react";
import { money } from "../../../AppHelpers";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import { showToast } from "../../GlobalToast";
import { DoctorShiftEncashmentPresets } from "./DoctorShiftEncashmentPresets";

export interface DoctorShiftEncashmentControlsProps {
	readonly cashRub: number;
	readonly effectiveTotalRub: number;
}

export const DoctorShiftEncashmentControls: React.FC<DoctorShiftEncashmentControlsProps> = ({
	cashRub,
	effectiveTotalRub,
}) => {
	const [encashmentAmount, setEncashmentAmount] = useState<number>(cashRub);
	const [encashmentCompleted, setEncashmentCompleted] = useState<boolean>(false);
	const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

	const handleExecuteEncashment = () => {
		if (encashmentAmount <= 0) {
			showToast("Сумма инкассации должна быть больше 0 ₽", "warning");
			return;
		}

		StaffActionAuditService.logShiftClose({
			cashRegisterId: "main_cashier",
			shiftNumber: new Date().toLocaleDateString("ru-RU"),
			totalRevenueKopecks: Math.round(effectiveTotalRub * 100),
			closingCashKopecks: Math.round(encashmentAmount * 100),
		});

		setEncashmentCompleted(true);
		showToast(
			`Инкассация ${encashmentAmount.toLocaleString("ru-RU")} ₽ зафиксирована в кассовом журнале`,
			"info",
		);
	};

	return (
		<div style={{ paddingTop: "12px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "10px" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Wallet size={15} className="text-teal-600" />
					<span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
						Инкассация наличной выручки в сейф / банк:
					</span>
					<strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--teal-dark)" }}>
						{money(encashmentAmount)}
					</strong>
				</div>

				<DoctorShiftEncashmentPresets
					cashRub={cashRub}
					encashmentAmount={encashmentAmount}
					isCustomMode={isCustomMode}
					onFullEncashment={() => { setEncashmentAmount(cashRub); setIsCustomMode(false); }}
					onKeepFloat={(amt) => { setEncashmentAmount(Math.max(0, cashRub - amt)); setIsCustomMode(false); }}
					onToggleCustomMode={() => setIsCustomMode((v) => !v)}
					onChangeAmount={setEncashmentAmount}
				/>
			</div>

			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", paddingTop: "6px", borderTop: "1px solid var(--line)" }}>
				<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
					Остаток в денежном ящике на утро: <strong style={{ color: "var(--ink)" }}>{money(Math.max(0, cashRub - encashmentAmount))}</strong>
				</span>

				<button
					type="button"
					onClick={handleExecuteEncashment}
					className={`primary-button ${encashmentCompleted ? "secondary-button" : ""}`}
					style={{ fontSize: "13px", padding: "0 16px", minHeight: "36px", height: "36px", display: "inline-flex", alignItems: "center", gap: "6px" }}
					data-testid="btn-execute-encashment"
				>
					{encashmentCompleted ? (
						<>
							<CheckCircle2 size={14} className="text-emerald-600" />
							<span>Инкассация зафиксирована</span>
						</>
					) : (
						<>
							<Lock size={14} />
							<span>Провести инкассацию {money(encashmentAmount)}</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};
