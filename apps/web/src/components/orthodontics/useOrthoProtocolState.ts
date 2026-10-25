import type { OrthodonticVisitProtocolWidgetProps } from "./orthoProtocolTypes";
import { useApplianceState } from "./protocolState/useApplianceState";
import { useDiagnosticsState } from "./protocolState/useDiagnosticsState";
import { useAlignerTrackerState } from "./protocolState/useAlignerTrackerState";

export function useOrthoProtocolState(props: OrthodonticVisitProtocolWidgetProps) {
	const appliance = useApplianceState();
	const diagnostics = useDiagnosticsState();
	const aligner = useAlignerTrackerState(props);

	return {
		...appliance,
		...diagnostics,
		...aligner,
	};
}
