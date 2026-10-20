/**
 * apps/web/src/views/SterilizationView.tsx
 * Canonical facade for the Sterilization and SanPiN view.
 */

import React from "react";
import { SterilizationView as SterilizationViewComponent } from "./sterilization/SterilizationView";

export function SterilizationView() {
	return <SterilizationViewComponent />;
}

export { SterilizationViewComponent };
export default SterilizationView;
