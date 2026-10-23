/**
 * OrthodonticsLaunchers — Ортодонтические лаунчеры (ТРГ, ОПТГ AI, фотопротокол) (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";

const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("../../../../orthodontics/CephalometricAnalysisModal").then((m) => ({ default: m.CephalometricAnalysisModal })),
);
const SmartOpgViewerModal = lazyWithRetry(() =>
	import("../../../../orthodontics/SmartOpgViewerModal").then((m) => ({ default: m.SmartOpgViewerModal })),
);
const OrthodonticPhotoProtocolModal = lazyWithRetry(() =>
	import("../../../../diagnostics/OrthodonticPhotoProtocolModal").then((m) => ({ default: m.OrthodonticPhotoProtocolModal })),
);

export function renderOrthodonticsLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isCephDirectModalOpen, setIsCephDirectModalOpen, isSmartOpgDirectModalOpen, setIsSmartOpgDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (isCephDirectModalOpen) {
		const tab = (new URLSearchParams(s).get("tab") as ("landmarks" | "metrics" | "report") | null) ?? "metrics";
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка цефалометрического анализа ТРГ..." />}>
				<CephalometricAnalysisModal
					isOpen={true}
					onClose={() => {
						setIsCephDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("ceph");
						u.searchParams.delete("trg");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("ceph") ? "" : u.hash));
					}}
					patientName="Смирнова Екатерина Андреевна (ТРГ боковая)"
					patientId="demo_ceph_patient"
					initialImageUrl="/radiology/sample_trg_cephalogram.jpg"
					initialTab={tab}
				/>
			</Suspense>
		);
	}

	if (isSmartOpgDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка панорамного анализа ОПТГ AI..." />}>
				<SmartOpgViewerModal
					isOpen={true}
					onClose={() => {
						setIsSmartOpgDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("opg");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("opg") ? "" : u.hash));
					}}
					patientName="Темур (Консультация ОПТГ)"
					patientId="demo_opg_patient"
				/>
			</Suspense>
		);
	}

	if (s.includes("ortho-photo") || s.includes("orthodontic-photo") || h.includes("ortho-photo") || h.includes("orthodontic-photo")) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка ортодонтического фотопротокола..." />}>
				<OrthodonticPhotoProtocolModal
					isOpen={true}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("ortho-photo");
						u.searchParams.delete("orthodontic-photo");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("ortho") ? "" : u.hash));
					}}
					patientName="Ковалев Дмитрий Сергеевич"
					doctorName="Д-р Смирнова Е. В."
					clinicName="DENTE Clinic"
				/>
			</Suspense>
		);
	}

	return null;
}
