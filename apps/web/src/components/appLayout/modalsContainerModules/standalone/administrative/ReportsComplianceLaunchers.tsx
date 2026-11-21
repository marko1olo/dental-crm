/**
 * ReportsComplianceLaunchers — ЕГИСЗ РЭМД и гарантийные письма ДМС (Мандат 8b, <= 120 строк).
 *
 * ЕГИСЗ хаб работает без пациентов (реальный поток подписаний). Гарантийное
 * письмо ДМС оформляется по реальному ?patientId= из базы. Standalone-страница
 * «восстановления слота» с вбитым отменённым приёмом снесена: подбор слота —
 * функция живого расписания, а не витрина с выдуманным врачом и пациентом.
 */

import React, { Suspense, useMemo } from "react";
import { z } from "zod";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl } from "../useLauncherPatientDebt";
import { useDmsPatientLoader } from "./useDmsPatientLoader";

const egiszTabSchema = z
	.enum([
		"clinical",
		"tax_deduction",
		"preflight",
		"signature",
		"xml_preview",
		"journal",
		"xml",
		"signing",
	])
	.catch("signature");

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal })),
);
const DmsStudioModal = lazyWithRetry(() =>
	import("../../../../insurance/DmsStudioModal").then((m) => ({ default: m.DmsStudioModal })),
);

export function renderReportsComplianceLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isEgiszRemdModalOpen, setIsEgiszRemdModalOpen, isDmsDirectModalOpen, setIsDmsDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";

	if (isEgiszRemdModalOpen) {
		const tab = egiszTabSchema.parse(new URLSearchParams(s).get("tab"));
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

	if (!patientId && !patient) {
		// При отсутствии конкретного patientId в URL коллизия с deep-link #dms устраняется:
		// реестр гарантийных писем клиники беспрепятственно монтируется через DirectInsuranceLauncher (Мандаты 8aq & 8e)
		return null;
	}
	if (patient === undefined) return <AppLoadingState message="Загрузка карточки пациента..." />;

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка гарантийного письма ДМС..." />}>
			<DmsStudioModal
				isOpen={true}
				onClose={onClose}
				patient={patient ?? undefined}
				initialTab="policies"
			/>
		</Suspense>
	);
}
