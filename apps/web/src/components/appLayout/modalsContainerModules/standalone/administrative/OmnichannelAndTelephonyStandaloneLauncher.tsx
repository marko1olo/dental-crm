/**
 * OmnichannelAndTelephonyStandaloneLauncher.tsx — Автономный лаунчер омниканального чата и хаба сообщений.
 * Мандат 8b (<= 120 строк), Мандат 8aq (Монтирование в живой UI), Мандат 8e (Автономия персонала).
 * Канонический запуск телефонии вынесен строго в DirectTelephonyLauncher.tsx.
 */

import React from "react";
import { OmnichannelOperatorDesk } from "../../../../chat/OmnichannelOperatorDesk";

export function renderOmnichannelAndTelephonyLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const isOmnichannelHub =
		s.includes("omnichannel_hub") ||
		h.includes("omnichannel_hub") ||
		s.includes("messaging_hub") ||
		h.includes("messages") ||
		s.includes("messages");
	const isOmnichannel =
		s.includes("omnichannel") ||
		h.includes("omnichannel") ||
		s.includes("communications") ||
		h.includes("communications") ||
		s.includes("chat") ||
		h.includes("chat");

	if (!isOmnichannelHub && !isOmnichannel) return null;

	return (
		<div className="fixed inset-0 z-[99999] w-full h-screen min-h-screen p-2 sm:p-4 bg-[var(--paper)] text-[var(--ink)] box-border flex flex-col overflow-hidden">
			<OmnichannelOperatorDesk className="flex-1 w-full h-full" />
		</div>
	);
}

export const DirectOmnichannelStandaloneLauncher: React.FC = () =>
	renderOmnichannelAndTelephonyLauncher();
