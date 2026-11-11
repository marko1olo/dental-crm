import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import type { AppToastPortalProps } from "./types";
import { A2hsPromptModal } from "../../pwa/A2hsPromptModal";
import { ChairsideErgonomicsHost } from "../chairside/ChairsideErgonomicsHost";

const ClinicalGuidanceHost = lazyWithRetry(() =>
	import("../guidance/ClinicalGuidanceHost").then((module) => ({
		default: module.ClinicalGuidanceHost,
	})),
);

const VisiographIncomingToast = lazyWithRetry(() =>
	import("../radiology/VisiographIncomingToast").then((module) => ({
		default: module.VisiographIncomingToast,
	})),
);

export function AppToastPortal(_props: AppToastPortalProps) {
	return (
		<>
			<ChairsideErgonomicsHost />
			<Suspense fallback={null}>
				<ClinicalGuidanceHost />
			</Suspense>
			<Suspense fallback={null}>
				<A2hsPromptModal />
			</Suspense>
			<Suspense fallback={null}>
				<VisiographIncomingToast />
			</Suspense>
		</>
	);
}
