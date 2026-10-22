import type { PopularSterilizerBrandPreset } from "@dental/shared";
import React from "react";
import { SterilizerBrandPresetsBar } from "./SterilizerBrandPresetsBar.js";
import { SterilizerIdentityFields } from "./SterilizerIdentityFields.js";
import { SterilizerTechnicalSpecsFields } from "./SterilizerTechnicalSpecsFields.js";
import type { SterilizerFormData } from "./types.js";

export interface SterilizerPassportCardProps {
	readonly formData: SterilizerFormData;
	readonly onFieldChange: <K extends keyof SterilizerFormData>(field: K, value: SterilizerFormData[K]) => void;
	readonly selectedPresetId: string | null;
	readonly onApplyPreset: (preset: PopularSterilizerBrandPreset) => void;
	readonly isEditing: boolean;
}

export function SterilizerPassportCard({
	formData,
	onFieldChange,
	selectedPresetId,
	onApplyPreset,
	isEditing,
}: SterilizerPassportCardProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			{!isEditing && (
				<SterilizerBrandPresetsBar
					selectedPresetId={selectedPresetId}
					onApplyPreset={onApplyPreset}
				/>
			)}

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
				<SterilizerIdentityFields
					formData={formData}
					onFieldChange={onFieldChange}
				/>

				<SterilizerTechnicalSpecsFields
					formData={formData}
					onFieldChange={onFieldChange}
				/>
			</div>
		</div>
	);
}
