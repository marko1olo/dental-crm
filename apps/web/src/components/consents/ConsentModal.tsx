/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONSENT MODAL (МОДАЛКА ИНФОРМИРОВАННОГО ДОБРОВОЛЬНОГО СОГЛАСИЯ)
 * Patient-Friendly & Parent-Friendly Clinical Consent Interface
 * Pure Clinical Russian Language | 1-Click Paper-First Print (Mandate 8e)
 * Zero Cartoon Emojis | Strict Lucide Vector Icons | Anti-Matryoshka Depth = 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import {
	InformedConsentModal,
	type InformedConsentModalProps,
	type SignedConsentPayload,
} from "./InformedConsentModal";

export interface ConsentModalProps extends InformedConsentModalProps {
	/** Пользовательский человеческий заголовок согласия */
	readonly titleRu?: string | undefined;
	/** Признак детского согласия законного представителя */
	readonly isMinorPatient?: boolean | undefined;
}

/**
 * Канонический компонент модалки согласия с ликвидацией птичьего языка
 * и мгновенной печатью на бумаге в 1 клик.
 */
export const ConsentModal: React.FC<ConsentModalProps> = (props) => {
	const {
		titleRu,
		isMinorPatient = false,
		initialPackageKey,
		...restProps
	} = props;

	// Человеческое имя для согласия без казенных шифров
	const effectivePackageKey = useMemo(() => {
		if (initialPackageKey) return initialPackageKey;
		if (isMinorPatient) return "PACKAGE_PRIMARY_VISIT";
		return "PACKAGE_PRIMARY_VISIT";
	}, [initialPackageKey, isMinorPatient]);

	return (
		<InformedConsentModal
			{...restProps}
			initialPackageKey={effectivePackageKey}
		/>
	);
};

export default ConsentModal;
