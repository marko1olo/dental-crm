import type React from "react";
import type {
	PlanPricePolicyPresetId,
	PriceLockResolutionPolicy,
} from "./planPriceValidationPresets.js";
import type {
	AdminOverrideMetadata,
	PlanPriceValidationReport,
} from "./planPriceValidationEngine.js";
import { PriceValidatorPricesBanners } from "./pricesTab/PriceValidatorPricesBanners.js";
import { PriceValidatorPricesTableRow } from "./pricesTab/PriceValidatorPricesTableRow.js";
import { PriceValidatorPricesToolbar } from "./pricesTab/PriceValidatorPricesToolbar.js";

export interface PriceValidatorPricesTabProps {
	readonly report: PlanPriceValidationReport;
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
	readonly onItemResolutionChange: (
		itemId: string,
		resolution: PriceLockResolutionPolicy,
	) => void;
}

export const PriceValidatorPricesTab: React.FC<PriceValidatorPricesTabProps> = ({
	report,
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
	onItemResolutionChange,
}) => {
	return (
		<>
			<PriceValidatorPricesToolbar
				selectedPresetId={selectedPresetId}
				onPresetChange={onPresetChange}
				onBatchLockOriginal={onBatchLockOriginal}
				onBatchUpdateToCurrent={onBatchUpdateToCurrent}
				showAdminDrawer={showAdminDrawer}
				onToggleAdminDrawer={onToggleAdminDrawer}
				adminOverride={adminOverride}
				onRevokeAdminOverride={onRevokeAdminOverride}
				onAuthorizeDoctorAutonomy={onAuthorizeDoctorAutonomy}
				adminReasonInput={adminReasonInput}
				onAdminReasonChange={onAdminReasonChange}
				adminPinInput={adminPinInput}
				onAdminPinChange={onAdminPinChange}
			/>

			<PriceValidatorPricesBanners report={report} />

			<div className="price-validator-table-container">
				<table className="price-validator-table">
					<thead>
						<tr>
							<th style={{ width: "5%" }}># / Зуб</th>
							<th style={{ width: "12%" }}>Код услуги</th>
							<th style={{ width: "30%" }}>Услуга</th>
							<th style={{ width: "6%" }}>Кол-во</th>
							<th style={{ width: "12%" }}>Цена в плане</th>
							<th style={{ width: "12%" }}>Текущий прайс</th>
							<th style={{ width: "13%" }}>Разница</th>
							<th style={{ width: "10%" }}>Решение</th>
						</tr>
					</thead>
					<tbody>
						{report.items.map((item, idx) => (
							<PriceValidatorPricesTableRow
								key={item.itemId}
								item={item}
								index={idx}
								onItemResolutionChange={onItemResolutionChange}
							/>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
};

export default PriceValidatorPricesTab;
