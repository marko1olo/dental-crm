/**
 * OrthodonticsLaunchers — Ортодонтические лаунчеры (ТРГ, ОПТГ AI, фотопротокол) (Мандат 8b, <= 120 строк).
 *
 * Анализы и фотопротокол ведутся по реальному ?patientId= из базы; имя —
 * GET /api/patients/:id. Вымышленные «Смирнова/Темур/Ковалев» и демо-идентификаторы выжжены.
 */

import React, { Suspense, useMemo } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("../../../../orthodontics/CephalometricAnalysisModal").then((m) => ({ default: m.CephalometricAnalysisModal })),
);
const SmartOpgViewerModal = lazyWithRetry(() =>
	import("../../../../orthodontics/SmartOpgViewerModal").then((m) => ({ default: m.SmartOpgViewerModal })),
);
const OrthodonticPhotoProtocolModal = lazyWithRetry(() =>
	import("../../../../diagnostics/OrthodonticPhotoProtocolModal").then((m) => ({ default: m.OrthodonticPhotoProtocolModal })),
);

const GUARD_MESSAGE =
	"Ортодонтические анализы ведутся по конкретному пациенту. Добавьте ?patientId= в ссылку или откройте раздел из карты пациента.";

function useOrthoGuard(testId: string, onClose: () => void): { patientId: string | null; patientName: string | null; guard: React.ReactElement | null } {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	let guard: React.ReactElement | null = null;
	if (!patientId) {
		guard = <StandaloneDeepLinkMissingState title="Пациент не указан" message={GUARD_MESSAGE} testId={testId} onClose={onClose} />;
	} else if (patientName === null) {
		guard = <AppLoadingState message="Загрузка карточки пациента..." />;
	}
	return { patientId, patientName, guard };
}

export function renderOrthodonticsLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isCephDirectModalOpen, setIsCephDirectModalOpen, isSmartOpgDirectModalOpen, setIsSmartOpgDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";

	if (isCephDirectModalOpen) {
		const tab = (new URLSearchParams(s).get("tab") as ("landmarks" | "metrics" | "report") | null) ?? "metrics";
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка цефалометрического анализа ТРГ..." />}>
				<StandaloneCephHost
					tab={tab}
					onClose={() => {
						setIsCephDirectModalOpen?.(false);
						clearUrlTokens(["ceph", "trg"]);
					}}
				/>
			</Suspense>
		);
	}

	if (isSmartOpgDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка панорамного анализа ОПТГ AI..." />}>
				<StandaloneOpgHost
					onClose={() => {
						setIsSmartOpgDirectModalOpen?.(false);
						clearUrlTokens(["opg"]);
					}}
				/>
			</Suspense>
		);
	}

	if (hasUrlToken(["ortho-photo", "orthodontic-photo"])) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка ортодонтического фотопротокола..." />}>
				<StandaloneOrthoPhotoHost onClose={() => clearUrlTokens(["ortho-photo", "orthodontic-photo"])} />
			</Suspense>
		);
	}

	return null;
}

function StandaloneCephHost({ tab, onClose }: { tab: "landmarks" | "metrics" | "report"; onClose: () => void }) {
	const { patientId, patientName, guard } = useOrthoGuard("standalone-ceph-missing-state", onClose);
	if (guard) return guard;
	return (
		<CephalometricAnalysisModal
			isOpen={true}
			onClose={onClose}
			patientId={patientId || undefined}
			patientName={patientName || undefined}
			initialTab={tab}
		/>
	);
}

function StandaloneOpgHost({ onClose }: { onClose: () => void }) {
	const { patientId, patientName, guard } = useOrthoGuard("standalone-opg-missing-state", onClose);
	if (guard) return guard;
	return (
		<SmartOpgViewerModal
			isOpen={true}
			onClose={onClose}
			patientId={patientId || undefined}
			patientName={patientName || undefined}
		/>
	);
}

function StandaloneOrthoPhotoHost({ onClose }: { onClose: () => void }) {
	const { patientId, patientName, guard } = useOrthoGuard("standalone-ortho-photo-missing-state", onClose);
	if (guard) return guard;
	return (
		<OrthodonticPhotoProtocolModal
			isOpen={true}
			onClose={onClose}
			patientId={patientId || undefined}
			patientName={patientName || undefined}
		/>
	);
}
