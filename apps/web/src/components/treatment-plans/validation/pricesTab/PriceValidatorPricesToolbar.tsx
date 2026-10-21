import type React from "react";
import { Check, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import {
	PLAN_PRICE_POLICY_PRESETS,
	type PlanPricePolicyPresetId,
} from "../planPriceValidationPresets.js";
import type { AdminOverrideMetadata } from "../planPriceValidationEngine.js";
import { PriceValidatorAdminDrawer } from "./PriceValidatorAdminDrawer.js";

interface ToolbarProps {
	readonly selectedPresetId: PlanPricePolicyPresetId;
	readonly onPresetChange: (presetId: PlanPricePolicyPresetId) => void;
	readonly onBatchLockOriginal: () => void;
	readonly onBatchUpdateToCurrent: () => void;
	readonly showAdminDrawer: boolean;
	readonly onToggleAdminDrawer: () => void;
	readonly adminOverride: AdminOverrideMetadata;
	readonly onRevokeAdminOverride: () => void;
	readonly onAuthorizeDoctorAutonomy: () => void;
	readonly adminReasonInput: string;
	readonly onAdminReasonChange: (val: string) => void;
	readonly adminPinInput: string;
	readonly onAdminPinChange: (val: string) => void;
}

export const PriceValidatorPricesToolbar: React.FC<ToolbarProps> = ({
	selectedPresetId,
	onPresetChange,
	onBatchLockOriginal,
	onBatchUpdateToCurrent,
	showAdminDrawer,
	onToggleAdminDrawer,
	adminOverride,
	onRevokeAdminOverride,
	onAuthorizeDoctorAutonomy,
	adminReasonInput,
	onAdminReasonChange,
	adminPinInput,
	onAdminPinChange,
}) => {
	return (
		<>
			<div className="price-validator-toolbar">
				<div className="price-validator-policy-selector">
					<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--pv-text-muted)" }}>
						Политика фиксации:
					</span>
					<select
						className="price-validator-policy-select"
						value={selectedPresetId}
						onChange={(e) => onPresetChange(e.target.value as PlanPricePolicyPresetId)}
					>
						{Object.values(PLAN_PRICE_POLICY_PRESETS).map((p) => (
							<option key={p.id} value={p.id}>
								{p.title} (пороговый лимит {p.inflationThresholdPercent}%)
							</option>
						))}
					</select>
				</div>

				<div className="price-validator-batch-actions">
					<button
						type="button"
						className="price-validator-btn-secondary"
						onClick={onBatchLockOriginal}
						title="Зафиксировать оригинальные цены плана лечения"
					>
						<Lock size={15} /> Зафиксировать цены плана
					</button>
					<button
						type="button"
						className="price-validator-btn-secondary"
						onClick={onBatchUpdateToCurrent}
						title="Обновить все позиции до актуального прайса клиники"
					>
						<RefreshCw size={15} /> Обновить до прайса
					</button>
					<button
						type="button"
						className={`price-validator-btn-secondary ${adminOverride.isAuthorized ? "pv-badge-ok" : ""}`}
						onClick={onToggleAdminDrawer}
						title="Подтверждение цен плана лечащим врачом"
					>
						{adminOverride.isAuthorized ? <Check size={15} /> : <ShieldCheck size={15} />}{" "}
						{adminOverride.isAuthorized ? "Согласовано врачом" : "Подтвердить цены"}
					</button>
				</div>
			</div>

			{showAdminDrawer && (
				<PriceValidatorAdminDrawer
					adminOverride={adminOverride}
					onRevokeAdminOverride={onRevokeAdminOverride}
					onAuthorizeDoctorAutonomy={onAuthorizeDoctorAutonomy}
					adminReasonInput={adminReasonInput}
					onAdminReasonChange={onAdminReasonChange}
					adminPinInput={adminPinInput}
					onAdminPinChange={onAdminPinChange}
				/>
			)}
		</>
	);
};
