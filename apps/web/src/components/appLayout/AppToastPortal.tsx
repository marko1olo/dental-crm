import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import type { AppToastPortalProps } from "./types";

const VoiceAssistantUI = lazyWithRetry(() =>
	import("../VoiceAssistantUI").then((module) => ({
		default: module.VoiceAssistantUI,
	})),
);
const Omnibar = lazyWithRetry(() =>
	import("../Omnibar").then((module) => ({
		default: module.Omnibar,
	})),
);
const ClinicalGuidanceHost = lazyWithRetry(() =>
	import("../guidance/ClinicalGuidanceHost").then((module) => ({
		default: module.ClinicalGuidanceHost,
	})),
);
import { A2hsPromptModal } from "../../pwa/A2hsPromptModal";
import { ChairsideErgonomicsHost } from "../chairside/ChairsideErgonomicsHost";

const VisiographIncomingToast = lazyWithRetry(() =>
	import("../radiology/VisiographIncomingToast").then((module) => ({
		default: module.VisiographIncomingToast,
	})),
);

const VoiceChairsideHudBar = lazyWithRetry(() =>
	import("../odontogram/VoiceChairsideHudBar").then((module) => ({
		default: module.VoiceChairsideHudBar,
	})),
);

export function AppToastPortal(props: AppToastPortalProps) {
	const { setCurrentView, setQuery, setScheduleDateFilter } = props;

	return (
		<>
			<ChairsideErgonomicsHost />
			<Suspense fallback={null}>
				<VoiceAssistantUI
					onNavigate={(view) => {
						setCurrentView(view);
						if (typeof window !== "undefined") {
							window.location.hash = view;
						}
					}}
					onSearchQuery={(q) => {
						setQuery(q);
					}}
					onDateChange={(date) => {
						setScheduleDateFilter(date);
					}}
				/>
			</Suspense>
			<Suspense fallback={null}>
				<Omnibar />
			</Suspense>
			<Suspense fallback={null}>
				<ClinicalGuidanceHost />
			</Suspense>
			<Suspense fallback={null}>
				<A2hsPromptModal />
			</Suspense>
			<Suspense fallback={null}>
				<VisiographIncomingToast />
			</Suspense>
			<Suspense fallback={null}>
				<VoiceChairsideHudBar />
			</Suspense>
		</>
	);
}
