import type React from "react";
import { CheckCircle2 } from "lucide-react";
import { PriceValidatorFooter } from "../PriceValidatorFooter.js";
import { PriceValidatorHeader } from "../PriceValidatorHeader.js";
import { PriceValidatorMetricsGrid } from "../PriceValidatorMetricsGrid.js";
import { PriceValidatorPricesTab } from "../PriceValidatorPricesTab.js";
import { PriceValidatorStarTab } from "../PriceValidatorStarTab.js";
import { PriceValidatorSummaryTab } from "../PriceValidatorSummaryTab.js";
import { PriceValidatorTabBar } from "./PriceValidatorTabBar.js";

interface ModalViewProps {
	readonly planPayload: any;
	readonly report: any;
	readonly starValidation: any;
	readonly filteredStarChecks: readonly any[];
	readonly activeTab: any;
	readonly setActiveTab: any;
	readonly selectedPresetId: any;
	readonly setSelectedPresetId: any;
	readonly activePreset: any;
	readonly showAdminDrawer: boolean;
	readonly setShowAdminDrawer: (v: boolean) => void;
	readonly adminOverride: any;
	readonly adminReasonInput: string;
	readonly setAdminReasonInput: (v: string) => void;
	readonly adminPinInput: string;
	readonly setAdminPinInput: (v: string) => void;
	readonly statusNotice: string | null;
	readonly protocolSeverityFilter: any;
	readonly setProtocolSeverityFilter: any;
	readonly onClose?: (() => void) | undefined;
	readonly onItemResolutionChange: any;
	readonly onBatchLockOriginal: () => void;
	readonly onBatchUpdateToCurrent: () => void;
	readonly onRevokeAdminOverride: () => void;
	readonly onAuthorizeDoctorAutonomy: () => void;
	readonly onGenerateWorkOrder: () => void;
	readonly onGenerateCompletedAct: () => void;
}

export const PriceValidatorModalView: React.FC<ModalViewProps> = (props) => {
	return (
		<div className="price-validator-backdrop" role="dialog" aria-modal="true">
			<div className="price-validator-modal">
				<PriceValidatorHeader
					planPayload={props.planPayload}
					report={props.report}
					starValidation={props.starValidation}
					onClose={props.onClose}
				/>
				<PriceValidatorMetricsGrid report={props.report} />
				<PriceValidatorTabBar
					activeTab={props.activeTab}
					onTabChange={props.setActiveTab}
					starChecksCount={props.starValidation?.checks?.length ?? 0}
				/>
				<main className="price-validator-body">
					{props.statusNotice && (
						<div className="price-validator-banner status-ok">
							<CheckCircle2 size={18} />
							<div>{props.statusNotice}</div>
						</div>
					)}
					{props.activeTab === "prices" && (
						<PriceValidatorPricesTab
							report={props.report}
							selectedPresetId={props.selectedPresetId}
							onPresetChange={props.setSelectedPresetId}
							onBatchLockOriginal={props.onBatchLockOriginal}
							onBatchUpdateToCurrent={props.onBatchUpdateToCurrent}
							showAdminDrawer={props.showAdminDrawer}
							onToggleAdminDrawer={() => props.setShowAdminDrawer(!props.showAdminDrawer)}
							adminOverride={props.adminOverride}
							onRevokeAdminOverride={props.onRevokeAdminOverride}
							onAuthorizeDoctorAutonomy={props.onAuthorizeDoctorAutonomy}
							adminReasonInput={props.adminReasonInput}
							onAdminReasonChange={props.setAdminReasonInput}
							adminPinInput={props.adminPinInput}
							onAdminPinChange={props.setAdminPinInput}
							onItemResolutionChange={props.onItemResolutionChange}
						/>
					)}
					{props.activeTab === "star_protocols" && (
						<PriceValidatorStarTab
							starValidation={props.starValidation}
							filteredStarChecks={props.filteredStarChecks}
							protocolSeverityFilter={props.protocolSeverityFilter}
							onSeverityFilterChange={props.setProtocolSeverityFilter}
						/>
					)}
					{props.activeTab === "summary" && (
						<PriceValidatorSummaryTab
							report={props.report}
							starValidation={props.starValidation}
							activePreset={props.activePreset}
						/>
					)}
				</main>
				<PriceValidatorFooter
					report={props.report}
					onPrintProtocol={() => window.print()}
					onGenerateWorkOrder={props.onGenerateWorkOrder}
					onGenerateCompletedAct={props.onGenerateCompletedAct}
				/>
			</div>
		</div>
	);
};
