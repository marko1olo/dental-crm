/**
 * ReportsComplianceLaunchers — ЕГИСЗ РЭМД, восстановление слотов и гарантийные письма ДМС (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal })),
);
const SmartSlotRecoveryPopover = lazyWithRetry(() =>
	import("../../../../schedule/SmartSlotRecoveryPopover").then((m) => ({ default: m.SmartSlotRecoveryPopover })),
);
const DmsGuaranteeLetterModal = lazyWithRetry(() =>
	import("../../../../insurance/DmsGuaranteeLetterModal").then((m) => ({ default: m.DmsGuaranteeLetterModal })),
);

export function renderReportsComplianceLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isEgiszRemdModalOpen, setIsEgiszRemdModalOpen, isSmartSlotRecoveryDemoOpen, setIsSmartSlotRecoveryDemoOpen, isDmsDirectModalOpen, setIsDmsDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

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

	if (isSmartSlotRecoveryDemoOpen) {
		const start = new Date();
		start.setHours(start.getHours() + 2, 0, 0, 0);
		const end = new Date(start);
		end.setMinutes(end.getMinutes() + 45);

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка подбора слота..." />}>
				<div className="w-screen h-screen flex items-center justify-center bg-[var(--paper-soft)] p-4">
					<SmartSlotRecoveryPopover
						isOpen={true}
						onClose={() => {
							setIsSmartSlotRecoveryDemoOpen?.(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("smart_slot");
							u.searchParams.delete("recovery");
							window.history.replaceState({}, "", u.pathname + (u.search || ""));
						}}
						slot={{
							appointmentId: "demo-cancelled-slot-1",
							startsAt: start.toISOString(),
							endsAt: end.toISOString(),
							doctorId: "doc-1",
							doctorName: "Д-р Смирнов А.П.",
							chairId: "chair-1",
							chairName: "Кресло №1 (Терапия)",
							freedBecause: "Отмена пациентом за 2 часа (ОРВИ)",
							patientName: "Алексеев Владимир Сергеевич",
						}}
						clinicName="Стоматология DENTE"
					/>
				</div>
			</Suspense>
		);
	}

	if (isDmsDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка гарантийного письма ДМС..." />}>
				<DmsGuaranteeLetterModal
					isOpen={true}
					onClose={() => {
						setIsDmsDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("dms");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("dms") ? "" : u.hash));
					}}
					patient={{
						id: "demo_dms_patient",
						fullName: "Соколова Анна Викторовна",
						birthDate: "1990-04-15",
						policyNumber: "СГЗ-2026-998811",
						insuranceCompany: "АО «СОГАЗ»",
					}}
				/>
			</Suspense>
		);
	}

	return null;
}
