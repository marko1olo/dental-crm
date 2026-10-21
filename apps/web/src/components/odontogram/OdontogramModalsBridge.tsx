import type React from "react";
import {
	OdontogramViewModals,
	type OdontogramViewModalsProps,
} from "./OdontogramViewModals";

export interface OdontogramModalsBridgeProps {
	readonly modalsProps: OdontogramViewModalsProps;
}

export const OdontogramModalsBridge: React.FC<OdontogramModalsBridgeProps> = ({
	modalsProps,
}) => {
	return <OdontogramViewModals {...modalsProps} />;
};
