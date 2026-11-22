/**
 * apps/web/src/components/settings/clinicTabModules/ClinicGeneralInfoSection.tsx
 *
 * Clinic account header, scale preset synchronization, and general info.
 * Mandates 8b, 8c, 8d, 8e, 8n: Solo doctor focus, desktop density, <= 500 lines.
 */

import React from "react";
import type { ClinicMode } from "@dental/shared";
import { SovereignScalePresetsCard } from "../../onboarding/SovereignScalePresetsCard";
import type { ClinicCapabilities } from "../../../hooks/useClinicCapabilities";

export interface ClinicGeneralInfoSectionProps {
	dashboard?: {
		clinicSettings?: {
			profile?: {
				clinicName?: string;
				legalName?: string;
				address?: string;
				timezone?: string;
				mode?: ClinicMode | string;
			};
		};
		[key: string]: unknown;
	} | null | undefined;
	clinicProfileDraft: Record<string, unknown>;
	capabilities: ClinicCapabilities;
	changeClinicMode?: ((mode: ClinicMode) => void) | undefined;
	hideScalePresets?: boolean | undefined;
}

export const ClinicGeneralInfoSection: React.FC<ClinicGeneralInfoSectionProps> = ({
	dashboard,
	clinicProfileDraft,
	capabilities,
	changeClinicMode,
	hideScalePresets = true,
}) => {
	const presetDefaultClinicName =
		capabilities.scalePreset === "solo_doctor"
			? "Автономный кабинет врача DENTE"
			: capabilities.scalePreset === "network_center"
				? "Многопрофильный центр и сеть DENTE"
				: "Стоматологическая клиника DENTE (1–3 кресла)";

	const clinicDraftName = typeof clinicProfileDraft?.clinicName === "string" ? clinicProfileDraft.clinicName : "";
	const clinicDraftLegal = typeof clinicProfileDraft?.legalName === "string" ? clinicProfileDraft.legalName : "";
	const clinicDraftAddress = typeof clinicProfileDraft?.address === "string" ? clinicProfileDraft.address : "";
	const clinicDraftTimezone = typeof clinicProfileDraft?.timezone === "string" ? clinicProfileDraft.timezone : "";

	const rawClinicName =
		dashboard?.clinicSettings?.profile?.clinicName ||
		clinicDraftName ||
		"";

	const isDefaultPresetName =
		!rawClinicName ||
		rawClinicName === "Автономный кабинет врача DENTE" ||
		rawClinicName === "Стоматологическая клиника DENTE (1–3 кресла)" ||
		rawClinicName === "Многопрофильный центр и сеть DENTE" ||
		rawClinicName === "Клиника DENTE";

	const synchronizedClinicName = isDefaultPresetName
		? presetDefaultClinicName
		: rawClinicName;

	const displayedLegalName =
		dashboard?.clinicSettings?.profile?.legalName ||
		clinicDraftLegal ||
		(capabilities.scalePreset === "solo_doctor"
			? "ИП Врач-стоматолог"
			: "ООО «Стоматология ДЕНТЕ»");

	const displayedAddress =
		dashboard?.clinicSettings?.profile?.address ||
		clinicDraftAddress ||
		"г. Москва, ул. Клиническая, д. 1";

	const rawTimezone =
		dashboard?.clinicSettings?.profile?.timezone ||
		clinicDraftTimezone;

	const displayedTimezone =
		rawTimezone === "Europe/Moscow" || !rawTimezone
			? "Москва (МСК, UTC+3)"
			: rawTimezone;

	return (
		<div className="space-y-4">
			{/* 0. Scale Sovereignty Presets (Solo Doctor, 1-3 Chairs, Network) */}
			{!hideScalePresets && (
				<SovereignScalePresetsCard
					compactMode={true}
					hideHeader={false}
					onPresetApplied={(presetId) => {
						const targetMode: ClinicMode =
							presetId === "solo_doctor"
								? "solo_doctor"
								: presetId === "standard_clinic"
									? "small_clinic"
									: "network_clinic";
						if (typeof changeClinicMode === "function") {
							changeClinicMode(targetMode);
						}
					}}
				/>
			)}

			{/* Clinic Account Header */}
			<div className="clinic-config-head flex flex-col sm:flex-row items-start justify-between gap-4 w-full p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="min-w-0 max-w-full">
					<p className="eyebrow text-xs font-bold text-[var(--muted)]">Аккаунт клиники</p>
					<h2 className="text-xl sm:text-2xl font-bold leading-tight break-words text-[var(--ink)] m-0 mt-0.5">
						{synchronizedClinicName}
					</h2>
					<p className="text-xs sm:text-sm text-[var(--muted)] leading-normal break-words mt-1 m-0">
						{displayedLegalName} · {displayedAddress} · {displayedTimezone}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
						{capabilities.scalePreset === "solo_doctor"
							? "Частный кабинет"
							: capabilities.scalePreset === "network_center"
								? "Сеть филиалов"
								: "Стандартная клиника"}
					</span>
				</div>
			</div>
		</div>
	);
};

export default ClinicGeneralInfoSection;
