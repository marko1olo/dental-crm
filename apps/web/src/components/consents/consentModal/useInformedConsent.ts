import { useConsentModalState } from "./useConsentModalState";
import { useConsentContextBuilder } from "./useConsentContextBuilder";
import { useConsentModalActions } from "./useConsentModalActions";
import type { InformedConsentModalProps } from "./types.js";

export function useInformedConsent(props: InformedConsentModalProps) {
	const state = useConsentModalState(props);
	const builder = useConsentContextBuilder(props, state);

	const isClosedOrSigned = !props.isDraft && Boolean(
		props.isSigned ||
		props.isLocked ||
		props.status === "signed" ||
		props.status === "closed" ||
		props.status === "completed" ||
		props.status === "approved" ||
		props.status === "issued"
	);

	const effectiveWatermark =
		props.watermarkText ||
		(isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ" : "ЧЕРНОВИК");

	const stampColor = effectiveWatermark.includes("ПОДПИСАНО")
		? "var(--ok-fg, #059669)"
		: "var(--muted, #64748b)";

	const actions = useConsentModalActions(
		props,
		state,
		builder,
		isClosedOrSigned,
		effectiveWatermark,
	);

	return {
		...state,
		...builder,
		...actions,
		isClosedOrSigned,
		effectiveWatermark,
		stampColor,
	};
}
