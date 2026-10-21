import type React from "react";
import { OdontogramToolbar } from "./OdontogramToolbar";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";

export interface OdontogramToolbarBridgeProps {
	readonly hideModeSwitcher?: boolean | undefined;
	readonly toolbarProps: OdontogramToolbarProps;
}

export const OdontogramToolbarBridge: React.FC<
	OdontogramToolbarBridgeProps
> = ({ hideModeSwitcher, toolbarProps }) => {
	if (hideModeSwitcher) return null;
	return <OdontogramToolbar {...toolbarProps} />;
};
