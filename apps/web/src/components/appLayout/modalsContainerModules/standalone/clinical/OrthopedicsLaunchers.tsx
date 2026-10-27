/**
 * OrthopedicsLaunchers — Ортопедические лаунчеры (презентация плана лечения и кокпит у кресла) (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import { isPatientPresentationRoute } from "../../../../photography/presentationSyncProtocol";
import { OrthopedicsChairsidePanel } from "../../../../orthopedics/OrthopedicsChairsidePanel";
import { DentalLabOrderModal } from "../../../../lab/DentalLabOrderModal";

const PatientPresentationStandaloneView = lazyWithRetry(() =>
	import("../../../../photography/PatientPresentationStandaloneView").then((m) => ({
		default: m.PatientPresentationStandaloneView,
	})),
);

export function renderOrthopedicsLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;

	const search = window.location.search || "";
	const hash = window.location.hash || "";

	if (
		search.includes("standalone=dental_lab") ||
		search.includes("standalone=lab_order") ||
		hash.includes("dental_lab") ||
		hash.includes("lab_order")
	) {
		return (
			<DentalLabOrderModal
				isOpen={true}
				onClose={() => {
					window.location.hash = "";
				}}
				patientName="Ковалев Дмитрий Сергеевич"
				doctorName="Д-р Смирнова Е. В. (Ортопед)"
				initialToothFdi="16"
			/>
		);
	}

	if (search.includes("standalone=orthopedics") || hash.includes("orthopedics")) {
		return (
			<main
				data-testid="orthopedics-standalone-workspace"
				className="min-h-screen p-3 sm:p-6 bg-[var(--paper)] text-[var(--ink)] max-w-6xl mx-auto"
			>
				<div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-2.5">
					<div>
						<h1 className="text-base sm:text-lg font-bold text-[var(--ink)]">
							Ортопедический протокол и лаборатория (ЗТЛ)
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Автономный рабочий стенд ортопедии у кресла (Мандаты 8e, 8n, 8am)
						</p>
					</div>
				</div>
				<OrthopedicsChairsidePanel
					patientName="Ковалев Дмитрий Сергеевич"
					doctorName="Д-р Смирнова Е. В."
					activeToothFdi="16"
					initialLabOrder={{
						id: "demo-lab-order-1",
						orderNumber: "ЗТЛ-402",
						workType: "Коронка ZrO2",
						toothFdi: "16",
						technicianName: "Смирнов А. В.",
						warrantyPassport: "ГП-ЗТЛ-402",
					}}
				/>
			</main>
		);
	}

	if (isPatientPresentationRoute()) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка экрана презентации..." />}>
				<PatientPresentationStandaloneView
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("view");
						u.searchParams.delete("presentation");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("presentation") ? "" : u.hash));
						window.location.reload();
					}}
				/>
			</Suspense>
		);
	}

	return null;
}
