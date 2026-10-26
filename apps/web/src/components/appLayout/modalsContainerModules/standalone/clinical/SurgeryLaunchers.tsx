/**
 * SurgeryLaunchers — Хирургические лаунчеры (ИДС, экстренная помощь, фотопротокол) (Мандат 8b, <= 120 строк).
 *
 * ИДС и фотопротокол работают по реальному ?patientId= через честные хосты;
 * экстренная помощь открывается с пустой формой — врач вводит реальные данные.
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { EmergencyRescueModal } from "../../../../emergency/EmergencyRescueModal";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import { clearUrlTokens } from "../deepLinkUrl";
import {
	StandaloneConsentHost,
	StandalonePhotoProtocolHost,
	StandaloneSurgeryProtocolHost,
} from "./StandaloneSurgeryHosts";

export function renderSurgeryLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isConsentDirectModalOpen, setIsConsentDirectModalOpen, isEmergencyDirectModalOpen, setIsEmergencyDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const isConsent =
		Boolean(isConsentDirectModalOpen) ||
		s.includes("consent") ||
		s.includes("consents") ||
		h.includes("consent") ||
		h.includes("consents");

	if (isConsent) {
		return (
			<StandaloneConsentHost
				onClose={() => {
					setIsConsentDirectModalOpen?.(false);
					clearUrlTokens(["consent", "consents"]);
				}}
			/>
		);
	}

	const isEmergency =
		Boolean(isEmergencyDirectModalOpen) ||
		s.includes("emergency") ||
		s.includes("rescue") ||
		h.includes("emergency") ||
		h.includes("rescue");

	if (isEmergency) {
		return (
			<EmergencyRescueModal
				isOpen={true}
				onClose={() => {
					setIsEmergencyDirectModalOpen?.(false);
					clearUrlTokens(["emergency", "rescue"]);
				}}
			/>
		);
	}

	const isPhoto =
		!h.includes("ortho") &&
		!s.includes("ortho") &&
		(s.includes("photo-protocol") || s.includes("photo") || h.includes("photo-protocol") || h.includes("photo"));

	if (isPhoto) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка фотопротокола..." />}>
				<StandalonePhotoProtocolHost
					onClose={() => clearUrlTokens(["photo-protocol", "photo"])}
				/>
			</Suspense>
		);
	}

	const isSurgery =
		s.includes("surgery") ||
		s.includes("extraction") ||
		h.includes("surgery") ||
		h.includes("extraction");

	if (isSurgery) {
		return (
			<StandaloneSurgeryProtocolHost
				onClose={() => clearUrlTokens(["surgery", "extraction"])}
			/>
		);
	}

	return null;
}
