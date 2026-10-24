/**
 * ReportsComplianceLaunchers — ЕГИСЗ РЭМД и гарантийные письма ДМС (Мандат 8b, <= 120 строк).
 *
 * ЕГИСЗ хаб работает без пациентов (реальный поток подписаний). Гарантийное
 * письмо ДМС оформляется по реальному ?patientId= из базы. Standalone-страница
 * «восстановления слота» с вбитым отменённым приёмом снесена: подбор слота —
 * функция живого расписания, а не витрина с выдуманным врачом и пациентом.
 */

import React, { Suspense, useMemo } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl } from "../useLauncherPatientDebt";
import { useDmsPatientLoader } from "./useDmsPatientLoader";

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal })),
);
const DmsGuaranteeLetterModal = lazyWithRetry(() =>
	import("../../../../insurance/DmsGuaranteeLetterModal").then((m) => ({ default: m.DmsGuaranteeLetterModal })),
);

export function renderReportsComplianceLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isEgiszRemdModalOpen, setIsEgiszRemdModalOpen, isDmsDirectModalOpen, setIsDmsDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";

	if (isEgiszRemdModalOpen) {
		const tab = (new URLSearchParams(s).get("tab") as any) ?? "signature";
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка хаба ЕГИСЗ РЭМД..." />}>
				<EgiszRemdHubModal
					isOpen={true}
					initialDocType="cda_semd"
					initialTab={tab}
					onClose={() => {
						setIsEgiszRemdModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("egisz");
						u.searchParams.delete("remd");
						u.searchParams.delete("semd");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("egisz") || u.hash.includes("remd") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	if (isDmsDirectModalOpen) {
		return <StandaloneDmsHost onClose={() => {
			setIsDmsDirectModalOpen?.(false);
			const u = new URL(window.location.href);
			u.searchParams.delete("dms");
			window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("dms") ? "" : u.hash));
		}} />;
	}

	return null;
}

function StandaloneDmsHost({ onClose }: { onClose: () => void }) {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patient = useDmsPatientLoader(patientId);

	if (!patientId) {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Гарантийное письмо ДМС оформляется по конкретному пациенту. Откройте его из карты пациента или добавьте ?patientId= в ссылку."
				testId="standalone-dms-missing-state"
				onClose={onClose}
			/>
		);
	}
	if (patient === null) return <AppLoadingState message="Загрузка карточки пациента..." />;

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка гарантийного письма ДМС..." />}>
			<DmsGuaranteeLetterModal
				isOpen={true}
				onClose={onClose}
				patient={patient ?? undefined}
			/>
		</Suspense>
	);
}
