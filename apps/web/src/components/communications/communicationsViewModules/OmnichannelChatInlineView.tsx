import React, { lazy, Suspense } from "react";

const OmnichannelOperatorDesk = lazy(() =>
	import("../../chat/OmnichannelOperatorDesk").then((m) => ({
		default: m.OmnichannelOperatorDesk,
	})),
);

/**
 * OmnichannelChatInlineView
 * Inline patient chat view for the Communications "omnichannel" tab (WhatsApp / Telegram / SMS).
 * Mandate 8b (<= 120 lines). Clean container delegating to canonical OmnichannelOperatorDesk.
 */
export function OmnichannelChatInlineView() {
	return (
		<div
			data-testid="omnichannel-inline-chat-view"
			className="h-full min-h-[580px] min-h-0 overflow-hidden flex flex-col w-full border border-[var(--line)] rounded-2xl bg-[var(--paper)]"
		>
			<Suspense fallback={null}>
				<OmnichannelOperatorDesk className="w-full h-full" />
			</Suspense>
		</div>
	);
}

export default OmnichannelChatInlineView;
