/**
 * apps/web/src/components/visit/billing/useVisitBillingDms.ts
 * DMS Guarantee Letter status and real-time attachment listener.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useState, useEffect } from "react";
import { kopecksToRubles } from "@dental/shared";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import { logger } from "../../../utils/logger.js";

export interface ActiveDmsLetterInfo {
	id: string;
	letterNumber: string;
	insurerName: string;
	availableCoverageRub: number;
}

export interface DmsLetterPayloadLike {
	id?: string | undefined;
	letterNumber?: string | undefined;
	insurerName?: string | undefined;
	patientId?: string | undefined;
	status?: string | undefined;
	maxCoverageRub?: number | undefined;
	usedAmountRub?: number | undefined;
	[key: string]: unknown;
}

export interface UseVisitBillingDmsParams {
	patientId?: string | undefined;
	dmsGuaranteeLetterId?: string | undefined;
	dmsGuaranteeLetterNumber?: string | undefined;
	dmsInsurerName?: string | undefined;
	availableDmsCoverageRub?: number | undefined;
	isDemo?: boolean | undefined;
}

export function useVisitBillingDms({
	patientId,
	dmsGuaranteeLetterId,
	dmsGuaranteeLetterNumber,
	dmsInsurerName,
	availableDmsCoverageRub,
	isDemo,
}: UseVisitBillingDmsParams) {
	const [activeDmsLetter, setActiveDmsLetter] = useState<ActiveDmsLetterInfo | null>(null);

	useEffect(() => {
		// Mandate 8zq: reset active letter on patient change to prevent cross-patient data leaks
		setActiveDmsLetter(null);

		if (!patientId || patientId === "pat-walkin") {
			return;
		}

		const handleLetterAttached = (e: Event) => {
			const customEvent = e as CustomEvent<{ letter?: DmsLetterPayloadLike; patientId?: string }>;
			const attached = customEvent.detail?.letter;
			// Strict patient matching: never accept pat-1 or pat-walkin or other patients' letters
			if (attached && attached.patientId === patientId) {
				let available = 0;
				if (typeof attached.remainingLimitKopecks === "number") {
					available = Math.max(0, kopecksToRubles(attached.remainingLimitKopecks));
				} else if (typeof attached.limitKopecks === "number") {
					const limit = attached.limitKopecks;
					const used = typeof attached.usedKopecks === "number" ? attached.usedKopecks : 0;
					available = Math.max(0, kopecksToRubles(limit - used));
				} else {
					const maxCov = Number(attached.maxCoverageRub || 0);
					const used = Number(attached.usedAmountRub || 0);
					available = Math.max(0, maxCov - used);
				}

				setActiveDmsLetter({
					id: attached.id || "dms-letter-live",
					letterNumber: attached.letterNumber || "ГП",
					insurerName: attached.insurerName || "ДМС",
					availableCoverageRub: available,
				});
			}
		};

		window.addEventListener("dente:dms-letter-attached", handleLetterAttached);
		return () => {
			window.removeEventListener("dente:dms-letter-attached", handleLetterAttached);
		};
	}, [patientId]);

	useEffect(() => {
		if (availableDmsCoverageRub !== undefined || !patientId || patientId === "pat-walkin" || isDemo) return;
		let isMounted = true;
		fetch(`/api/insurance/guarantee-letters?patientId=${encodeURIComponent(patientId)}&status=active`, {
			headers: getDenteAuthHeaders(),
		})
			.then((r) => (r.ok ? r.json() : []))
			.then((letters: unknown) => {
				if (!isMounted || !Array.isArray(letters) || letters.length === 0) return;
				const typedLetters = letters as DmsLetterPayloadLike[];
				const active = typedLetters.find((l) => l.status === "active") || typedLetters[0];
				if (active && active.id && active.letterNumber && active.insurerName) {
					let available = 0;
					if (typeof active.remainingLimitKopecks === "number") {
						available = Math.max(0, kopecksToRubles(active.remainingLimitKopecks));
					} else if (typeof active.limitKopecks === "number") {
						const limit = active.limitKopecks;
						const used = typeof active.usedKopecks === "number" ? active.usedKopecks : 0;
						available = Math.max(0, kopecksToRubles(limit - used));
					} else {
						const maxCov = Number(active.maxCoverageRub || 0);
						const used = Number(active.usedAmountRub || 0);
						available = Math.max(0, maxCov - used);
					}
					setActiveDmsLetter({
						id: active.id,
						letterNumber: active.letterNumber,
						insurerName: active.insurerName,
						availableCoverageRub: available,
					});
				}
			})
			.catch((err) => {
				logger.warn("[useVisitBillingDms] Failed to fetch guarantee letters:", err);
			});
		return () => { isMounted = false; };
	}, [patientId, availableDmsCoverageRub, isDemo]);

	const effectiveDmsId = dmsGuaranteeLetterId || activeDmsLetter?.id;
	const effectiveDmsNumber = dmsGuaranteeLetterNumber || activeDmsLetter?.letterNumber;
	const effectiveDmsInsurer = dmsInsurerName || activeDmsLetter?.insurerName;
	const effectiveDmsCoverage = availableDmsCoverageRub ?? activeDmsLetter?.availableCoverageRub ?? 0;

	return {
		activeDmsLetter,
		setActiveDmsLetter,
		effectiveDmsId,
		effectiveDmsNumber,
		effectiveDmsInsurer,
		effectiveDmsCoverage,
	};
}
