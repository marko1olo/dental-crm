export {
	HALLUCINATION_BLACKLIST,
	localSpeechProviders,
	providerAliases,
	providerLabels,
	SpeechAsyncJobTimeoutError,
	SpeechChunkPayloadError,
	wiredServerProviders,
	type AssemblyAiPollPayload,
	type AssemblyAiPollPolicy,
	type LocalSpeechBridgeProbeState,
	type LocalSpeechBridgeProbeStatus,
	type ProviderTranscript,
	type SpeechRemoteArtifactDeletion,
	type SpeechResolvedProvider,
} from "./types.js";

export {
	confidenceFromWhisperLogprob,
	countTranscriptWords,
	decodeBase64Audio,
	fileNameForMime,
	isHallucinatedTranscript,
	looksLikeTransientNetworkFailure,
	normalizeLanguage,
	publicSpeechProviderFailure,
	roundMetric,
	speechJsonBodyLimitBytes,
	speechProviderFailureReason,
	transientNetworkFailurePattern,
	uniqueNonEmpty,
} from "./audioBufferUtils.js";

export {
	cloudflareAccountId,
	envString,
	isLocalSpeechProvider,
	isPrivateBridgeHost,
	isWiredServerProvider,
	localBridgeRemoteAllowed,
	localBridgeUrlAllowed,
	localSpeechApiKey,
	localSpeechBridgeProbeWarning,
	localSpeechBridgeReady,
	localSpeechHealthUrl,
	localSpeechProbeTimeoutMs,
	localSpeechProbeTtlMs,
	localSpeechTimeoutMs,
	localSpeechTranscribeUrl,
	primeLocalSpeechBridgeProbe,
	providerConfigMissingEnvVars,
	providerConfigReady,
	redactedBridgeUrl,
	runLocalSpeechBridgeProbe,
} from "./localBridgeProbe.js";

export {
	anyProviderTranscriptionCurrentlyAvailable,
	configuredWiredProviders,
	fallbackLimit,
	getSpeechGatewayHealthReport,
	getSpeechGatewayStatus,
	getSpeechProviderRuntimeStatuses,
	normalizeSpeechChunkTimings,
	providerConnector,
	providerMinimumChunkMs,
	providerTranscriptionCurrentlyAvailable,
	resolveSpeechProvider,
	selectedProvider,
} from "./speechSessionManager.js";

export { buildSpeechRecordingStrategy } from "./recordingStrategy.js";
export { buildSpeechTranscriptionQuality } from "./transcriptionQuality.js";

export {
	assemblyAiBaseUrl,
	assemblyAiDeleteAttempts,
	assemblyAiDeleteTimeoutMs,
	assemblyAiPollPolicy,
	deleteAssemblyAiTranscript,
	isRecoverablePollFailure,
	reportAbandonedRemoteJob,
	reportRemoteArtifactDeletion,
	transcribeAssemblyAi,
	waitBetweenPolls,
} from "./assemblyAiClient.js";

export { transcribeLocalVoskBridge } from "./voskClient.js";

export {
	transcribeCloudflareWhisper,
	transcribeDeepgram,
	transcribeGeminiMultimodal,
	transcribeLocalWhisperBridge,
	transcribeOpenAiCompatible,
	transcribeSpeechChunk,
	transcribeWithProvider,
} from "./transcriptionEngine.js";

export {
	handleSpeechGatewayHealth,
	handleSpeechGatewayTranscribeChunk,
	handleSpeechProvidersRuntime,
	handleSpeechRecordingStrategy,
	handleSpeechStatus,
	registerSpeechGatewayRoutes,
} from "./speechRoutes.js";
