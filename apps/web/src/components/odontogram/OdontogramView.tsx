import type React from "react";
import {
	OdontogramViewContainer,
	type OdontogramViewContainerProps,
	type OdontogramViewOption,
	ODONTOGRAM_VIEW_MODES,
} from "./OdontogramViewContainer";

export type OdontogramViewProps = OdontogramViewContainerProps;

/**
 * OdontogramView - Canonical multi-mode dental arch viewport (3D Anatomical, Compact 6-surface, GOST 043/u).
 * Re-exports the unified OdontogramViewContainer.
 */
export const OdontogramView: React.FC<OdontogramViewProps> = (props) => {
	return <OdontogramViewContainer {...props} />;
};

export default OdontogramView;
export {
	OdontogramViewContainer,
	type OdontogramViewContainerProps,
	type OdontogramViewOption,
	ODONTOGRAM_VIEW_MODES,
};
