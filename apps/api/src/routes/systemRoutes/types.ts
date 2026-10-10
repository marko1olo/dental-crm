import type {
	LocalBridgeKind,
	LocalBridgeReadinessItem,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePath,
	LocalBridgeUsePlan,
	LocalBridgeUsePlanStep,
	SpeechGatewayProvider,
	SpeechGatewayStatus,
} from "@dental/shared";

export type LocalBridgeDefinition = {
	kind: LocalBridgeKind;
	title: string;
	acceptedEnvVars: string[];
	defaultHealthPath: string;
	deriveHealthFromConfiguredPath?: boolean;
	role: string;
	workload: string;
	privacyBoundary: string;
	setupHint: string;
};

export class LocalBridgeUrlProtocolError extends Error {}

export type {
	LocalBridgeKind,
	LocalBridgeReadinessItem,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePath,
	LocalBridgeUsePlan,
	LocalBridgeUsePlanStep,
	SpeechGatewayProvider,
	SpeechGatewayStatus,
};
