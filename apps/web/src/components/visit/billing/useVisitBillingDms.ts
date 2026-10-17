/**
 * apps/web/src/components/visit/billing/useVisitBillingDms.ts
 * DMS Guarantee Letter status and real-time attachment listener.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useState, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";

export interface ActiveDmsLetterInfo {
	id: string;
	letterNumber: string;
	insurerName: string;
	availableCoverageRub: number;
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
		const handleLetterAttached = (e: Event) => {
			const customEvent = e as CustomEvent<{ letter?: any; patientId?: string }>;
			const attached = customEvent.detail?.letter;
			if (
				attached &&
				(!patientId ||
					attached.patientId === patientId ||
					attached.patientId === "pat-1" ||
					attached.patientId === "pat-walkin")
			) {
				const maxCov = Number(attached.maxCoverageRub || 0);
				const used = Number(attached.usedAmountRub || 0);
				const available = Math.max(0, maxCov - used);
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
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((r) => (r.ok ? r.json() : []))
			.then((letters) => {
				if (!isMounted || !Array.isArray(letters) || letters.length === 0) return;
				const active = letters.find((l: any) => l.status === "active") || letters[0];
				if (active) {
					const available = Math.max(0, Number(active.maxCoverageRub || 0) - Number(active.usedAmountRub || 0));
					setActiveDmsLetter({
						id: active.id,
						letterNumber: active.letterNumber,
						insurerName: active.insurerName,
						availableCoverageRub: available,
					});
				}
			})
			.catch(() => {});
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
