import type React from "react";
import { OdontogramQuickBar } from "./OdontogramQuickBar";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";

export interface OdontogramToolbarBridgeProps {
	readonly hideModeSwitcher?: boolean | undefined;
	readonly toolbarProps: OdontogramToolbarProps;
}

export const OdontogramToolbarBridge: React.FC<
	OdontogramToolbarBridgeProps
> = ({ hideModeSwitcher, toolbarProps }) => {
	if (hideModeSwitcher) return null;
	return <OdontogramQuickBar {...toolbarProps} />;
};
