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
const A2hsPromptModal = lazyWithRetry(() =>
	import("../../pwa/A2hsPromptModal").then((module) => ({
		default: module.A2hsPromptModal,
	})),
);

export function AppToastPortal(props: AppToastPortalProps) {
	const { setCurrentView, setQuery, setScheduleDateFilter } = props;

	return (
		<>
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
		</>
	);
}
