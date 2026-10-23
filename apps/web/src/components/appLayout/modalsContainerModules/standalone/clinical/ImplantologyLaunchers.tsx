/**
 * ImplantologyLaunchers — Имплантологические и КЛКТ лаунчеры (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import { parseCbctStudioRoute } from "../../../../../utils/runtimeRouter";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";

const ImplantPassportModal = lazyWithRetry(() =>
	import("../../../../implants/ImplantPassportModal").then((m) => ({ default: m.ImplantPassportModal })),
);
const CbctTunerPlayground = lazyWithRetry(() =>
	import("../../../../radiology/tuner/CbctTunerPlayground").then((m) => ({ default: m.CbctTunerPlayground })),
);
const CbctStandaloneStudioView = lazyWithRetry(() =>
	import("../../../../radiology/CbctStandaloneStudioView").then((m) => ({ default: m.CbctStandaloneStudioView })),
);
const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../../../radiology/CbctMprImplantStudioModal").then((m) => ({ default: m.CbctMprImplantStudioModal })),
);
const CtSelectorModal = lazyWithRetry(() =>
	import("../../../../radiology/CtSelectorModal").then((m) => ({ default: m.CtSelectorModal })),
);

export function renderImplantologyLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isCbctTunerOpen, setIsCbctTunerOpen, isCbctDirectModalOpen, setIsCbctDirectModalOpen, isCtSelectorDirectModalOpen, setIsCtSelectorDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (s.includes("implant_passport") || s.includes("passport") || s.includes("implants") || h.includes("implant_passport") || h.includes("implants")) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка паспорта имплантации..." />}>
				<ImplantPassportModal
					isOpen={true}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("implant_passport");
						u.searchParams.delete("passport");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("passport") ? "" : u.hash));
					}}
					patientName="Ковалёв Роман Станиславович"
					patientId="PAT-2026-088"
					doctorName="Д-р Воронов А. В."
					doctorId="DOC-01"
					initialTooth={46}
				/>
			</Suspense>
		);
	}

	if (isCbctTunerOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка тюнера КЛКТ..." />}>
				<CbctTunerPlayground
					isOpen={true}
					onClose={() => {
						setIsCbctTunerOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("cbct");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("cbct") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	const studioRoute = parseCbctStudioRoute();
	if (studioRoute.isCbctStudio) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка 3D КЛКТ Студии..." />}>
				<CbctStandaloneStudioView studyId={studioRoute.studyId} patientId={studioRoute.patientId} patientName={studioRoute.patientName} initialStudioMode={studioRoute.mode as any} autoLoadDemo={studioRoute.isDemo} />
			</Suspense>
		);
	}

	if (isCbctDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка 3D КЛКТ Захарова..." />}>
				<CbctMprImplantStudioModal
					isOpen={true}
					onClose={() => {
						setIsCbctDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("cbct");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("cbct") ? "" : u.hash));
					}}
					patientName="Захаров Иван Дмитриевич (312 срезов КЛКТ)"
					patientId="demo_cbct_patient"
					autoLoadDemo={true}
				/>
			</Suspense>
		);
	}

	if (isCtSelectorDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка КТ-селектора..." />}>
				<CtSelectorModal
					isOpen={true}
					onClose={() => {
						setIsCtSelectorDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("ct-selector");
						u.searchParams.delete("ct");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("ct-selector") ? "" : u.hash));
					}}
					patientName="Захаров Иван Дмитриевич"
					patientId="demo_cbct_patient"
					cardNumber="CR-8472"
				/>
			</Suspense>
		);
	}

	return null;
}
