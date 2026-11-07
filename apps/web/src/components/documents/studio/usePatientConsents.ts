/**
 * apps/web/src/components/documents/studio/usePatientConsents.ts
 *
 * Хук реактивной синхронизации согласий пациента из PostgreSQL 18 через Fastify API (Мандаты 8e, 8n).
 */

import { useState, useEffect, useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export function usePatientConsents(isOpen: boolean, patientId?: string) {
	const [patientConsentsMap, setPatientConsentsMap] = useState<Record<string, { grantedAt: string }>>({});

	useEffect(() => {
		if (!isOpen || !patientId) return;
		let isMounted = true;

		void fetch(`/api/patients/${encodeURIComponent(patientId)}/consents`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data: { consents?: Array<{ kind?: string; grantedAt?: string }> } | null) => {
				if (!isMounted || !data?.consents) return;
				const map: Record<string, { grantedAt: string }> = {};
				for (const item of data.consents) {
					if (item.kind && item.grantedAt) {
						map[item.kind] = { grantedAt: item.grantedAt };
					}
				}
				setPatientConsentsMap(map);
			})
			.catch(() => {
				/* offline fallback */
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, patientId]);

	const recordConsentLocally = useCallback((key: string, grantedAtIso: string) => {
		setPatientConsentsMap((prev) => ({
			...prev,
			[key]: { grantedAt: grantedAtIso },
		}));
	}, []);

	return { patientConsentsMap, recordConsentLocally };
}
