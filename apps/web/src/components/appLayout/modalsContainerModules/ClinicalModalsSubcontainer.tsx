/**
 * ClinicalModalsSubcontainer — Подконтейнер клинических модальных окон (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { StandaloneConsentHost } from "./standalone/clinical/StandaloneSurgeryHosts";
import { ClinicalImagingModals } from "./ClinicalImagingModals";
import type { ClinicalModalsSubcontainerProps } from "./modalsContainerTypes";

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal })),
);

export function ClinicalModalsSubcontainer(props: ClinicalModalsSubcontainerProps) {
	const {
		isConsentDirectModalOpen,
		setIsConsentDirectModalOpen,
		isEgiszRemdModalOpen,
		setIsEgiszRemdModalOpen,
	} = props;

	return (
		<>
			<ClinicalImagingModals {...props} />

			{isConsentDirectModalOpen && (
				<StandaloneConsentHost
					onClose={() => {
						setIsConsentDirectModalOpen(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("consent");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("consent") ? "" : u.hash));
					}}
				/>
			)}

			{isEgiszRemdModalOpen && (
				<Suspense fallback={null}>
					<EgiszRemdHubModal
						isOpen={true}
						onClose={() => {
							setIsEgiszRemdModalOpen(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("egisz");
							u.searchParams.delete("remd");
							u.searchParams.delete("semd");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("egisz") && !u.hash.includes("remd") ? u.hash : ""));
						}}
						initialDocType="cda_semd"
						initialTab="signature"
					/>
				</Suspense>
			)}
		</>
	);
}
