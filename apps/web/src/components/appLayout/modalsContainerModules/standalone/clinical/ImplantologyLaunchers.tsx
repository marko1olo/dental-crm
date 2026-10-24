/**
 * ImplantologyLaunchers — Имплантологические, КЛКТ и RVG лаунчеры (Мандат 8b, <= 120 строк).
 *
 * Паспорт имплантации, RVG и КТ-селектор ведутся по реальному ?patientId=
 * через честные хосты; вымышленные пациенты выжжены. КЛКТ-студия и тюнер
 * открываются по собственным маршрутам с параметрами из базы снимков.
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import { parseCbctStudioRoute } from "../../../../../utils/runtimeRouter";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";
import {
	StandaloneCtSelectorHost,
	StandaloneImplantPassportHost,
	StandaloneRvgHost,
} from "./StandaloneImplantologyHosts";

const CbctTunerPlayground = lazyWithRetry(() =>
	import("../../../../radiology/tuner/CbctTunerPlayground").then((m) => ({ default: m.CbctTunerPlayground })),
);
const CbctStandaloneStudioView = lazyWithRetry(() =>
	import("../../../../radiology/CbctStandaloneStudioView").then((m) => ({ default: m.CbctStandaloneStudioView })),
);
const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../../../radiology/CbctMprImplantStudioModal").then((m) => ({ default: m.CbctMprImplantStudioModal })),
);

export function renderImplantologyLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isCbctTunerOpen, setIsCbctTunerOpen, isCbctDirectModalOpen, setIsCbctDirectModalOpen, isCtSelectorDirectModalOpen, setIsCtSelectorDirectModalOpen } = props;
	if (typeof window === "undefined") return null;

	if (hasUrlToken(["implant_passport", "implant-passport", "implants"])) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка паспорта имплантации..." />}>
				<StandaloneImplantPassportHost onClose={() => clearUrlTokens(["implant_passport", "passport", "implants"])} />
			</Suspense>
		);
	}

	if (hasUrlToken(["rvg", "radiology"])) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка радиовизиографа RVG..." />}>
				<StandaloneRvgHost onClose={() => clearUrlTokens(["rvg", "radiology"], ["rvg", "radiology"])} />
			</Suspense>
		);
	}

	if (isCbctTunerOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка тюнера КЛКТ..." />}>
				<CbctTunerPlayground isOpen={true} onClose={() => { setIsCbctTunerOpen?.(false); clearUrlTokens(["cbct"]); }} />
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
			<Suspense fallback={<AppLoadingState message="Загрузка 3D КЛКТ Студии..." />}>
				<CbctMprImplantStudioModal
					isOpen={true}
					onClose={() => { setIsCbctDirectModalOpen?.(false); clearUrlTokens(["cbct"]); }}
				/>
			</Suspense>
		);
	}

	if (isCtSelectorDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка КТ-селектора..." />}>
				<StandaloneCtSelectorHost onClose={() => { setIsCtSelectorDirectModalOpen?.(false); clearUrlTokens(["ct-selector", "ct"]); }} />
			</Suspense>
		);
	}

	return null;
}
