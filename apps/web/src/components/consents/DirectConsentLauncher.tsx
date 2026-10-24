/**
 * @dental/web/components/consents/DirectConsentLauncher.tsx
 * Standalone consent host on LIVE patient data (Mandates 8b, 8z, <= 120 lines).
 * Прежняя версия подставляла захардкоженного «Ковалёва Р.С.» — подпись уходила
 * в вакуум без patientId. Теперь пациент грузится честно из API по ?patientId=;
 * без пациента — честное пустое состояние, никаких поддельных лиц.
 */

import React, { useCallback, useEffect, useState } from "react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { InformedConsentModal } from "./InformedConsentModal";
import type { InformedConsentPatientInfo } from "./consentModal/types";

interface LivePatientState {
	patient: InformedConsentPatientInfo | null;
	status: "loading" | "ready" | "empty";
}

async function fetchLivePatient(patientId: string): Promise<InformedConsentPatientInfo | null> {
	try {
		const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}`, {
			headers: getDenteAuthHeaders(),
		});
		if (!res.ok) return null;
		const p = (await res.json()) as {
			id?: string;
			fullName?: string | null;
			birthDate?: string | null;
			phone?: string | null;
			address?: string | null;
		};
		return {
			id: p.id ?? patientId,
			fullName: p.fullName ?? null,
			birthDate: p.birthDate ?? null,
			phone: p.phone ?? null,
			address: p.address ?? null,
		};
	} catch {
		return null;
	}
}

export const DirectConsentLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [live, setLive] = useState<LivePatientState>({ patient: null, status: "loading" });

	const closeAndCleanUrl = useCallback(() => {
		setIsOpen(false);
		if (typeof window === "undefined") return;
		const url = new URL(window.location.href);
		url.searchParams.delete("consent");
		url.searchParams.delete("consents");
		window.history.replaceState({}, "", url.pathname + (url.search || "") + (url.hash && !url.hash.includes("consent") ? url.hash : ""));
	}, []);

	useEffect(() => {
		let isMounted = true;
		const search = new URLSearchParams(window.location.search);
		const hashQuery = window.location.hash.includes("?")
			? new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf("?") + 1))
			: null;
		const targetPatientId = search.get("patientId") ?? hashQuery?.get("patientId") ?? null;
		const shouldOpen = search.has("consent") || search.has("consents") || (hashQuery?.has("consent") ?? false) || (hashQuery?.has("consents") ?? false);

		if (!shouldOpen && !targetPatientId) return;

		async function resolve() {
			if (!targetPatientId) {
				if (isMounted) {
					setLive({ patient: null, status: "empty" });
					setIsOpen(shouldOpen);
				}
				return;
			}
			const patient = await fetchLivePatient(targetPatientId);
			if (!isMounted) return;
			if (patient) {
				setLive({ patient, status: "ready" });
				setIsOpen(true);
			} else {
				setLive({ patient: null, status: "empty" });
				setIsOpen(shouldOpen);
			}
		}
		void resolve();
		return () => {
			isMounted = false;
		};
	}, []);

	if (!isOpen) return null;

	if (live.status !== "ready" || !live.patient) {
		return (
			<div className="consent-modal-overlay" role="dialog" aria-modal="true" onClick={closeAndCleanUrl}>
				<div className="consent-modal-container" onClick={(e) => e.stopPropagation()}>
					<div className="p-6 text-center space-y-2">
						<h3 className="text-base font-bold text-[var(--ink)]">Согласие недоступно</h3>
						<p className="text-sm text-[var(--muted)]">
							Откройте подписание согласия из карточки пациента или передайте ссылку
							с параметром patientId. Без реального пациента согласие не подписывается.
						</p>
						<button
							type="button"
							onClick={closeAndCleanUrl}
							className="primary-button min-h-[44px] px-4 rounded-xl bg-[var(--primary)] text-white text-sm font-bold cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<InformedConsentModal
			isOpen={isOpen}
			onClose={closeAndCleanUrl}
			initialMode="packages"
			initialPackageKey="PACKAGE_PRIMARY_VISIT"
			initialVerificationMethod="tablet_stylus"
			patient={live.patient}
			patientId={live.patient.id ?? undefined}
		/>
	);
};
