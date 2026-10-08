import React from "react";
import { OmnichannelOperatorDeskView } from "./operatorDesk/OmnichannelOperatorDeskView";
import type { OmnichannelOperatorDeskProps } from "./operatorDesk/types";
import { useOmnichannelOperatorDesk } from "./operatorDesk/useOmnichannelOperatorDesk";

export type * from "./operatorDesk/types";
export * from "./operatorDesk/constants";
export * from "./operatorDesk/ChannelConversationList";
export * from "./operatorDesk/OperatorMessageStream";
export * from "./operatorDesk/QuickRepliesDrawer";
export * from "./operatorDesk/OperatorInputBar";
export * from "./operatorDesk/QuickBookingModal";
export * from "./operatorDesk/LinkPatientModal";
export * from "./operatorDesk/useOmnichannelOperatorDesk";
export * from "./operatorDesk/OmnichannelOperatorDeskView";

/**
 * OmnichannelOperatorDesk
 * Canonical facade for the multi-channel clinic operator desk (Telegram, VK, WhatsApp, MAX).
 * Decomposed into modular DAG layers in ./operatorDesk/ according to /decomposer constitution.
 */
export function OmnichannelOperatorDesk(props: OmnichannelOperatorDeskProps) {
	const desk = useOmnichannelOperatorDesk(props);
	return <OmnichannelOperatorDeskView {...props} desk={desk} />;
}

export default OmnichannelOperatorDesk;
