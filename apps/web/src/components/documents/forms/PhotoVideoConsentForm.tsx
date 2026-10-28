import type { PhotoVideoConsentMaterial } from "@dental/shared";
import React, { useMemo } from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { photoVideoConsentGuidanceReview } from "../photoVideoConsentGuiding";
import type { DocumentSelectOption } from "./documentFormTypes";
import { PhotoVideoPermissionsList } from "./photoVideo/PhotoVideoPermissionsList";
import { PhotoVideoBlockersNotice } from "./photoVideo/PhotoVideoBlockersNotice";

export interface PhotoVideoConsentFormProps {
	materialOptions: readonly DocumentSelectOption<PhotoVideoConsentMaterial>[];
	toggleMaterial: (material: PhotoVideoConsentMaterial) => void;
}

export const PhotoVideoConsentForm = React.memo(function PhotoVideoConsentForm({
	materialOptions,
	toggleMaterial,
}: PhotoVideoConsentFormProps) {
	const {
		photoVideoAnonymizationConfirmed,
		photoVideoClinicalRecordUseConfirmed,
		photoVideoEducationUseAllowed,
		photoVideoMarketingUseAllowed,
		photoVideoMaterials,
		photoVideoRecognizablePublicationAllowed,
		photoVideoRevocationChannel, setPhotoVideoRevocationChannel,
		photoVideoScopeNotes, setPhotoVideoScopeNotes,
	} = useDocumentStore();

	const review = useMemo(
		() =>
			photoVideoConsentGuidanceReview({
				materials: photoVideoMaterials,
				clinicalRecordUseConfirmed: photoVideoClinicalRecordUseConfirmed,
				anonymizationConfirmed: photoVideoAnonymizationConfirmed,
				revocationChannel: photoVideoRevocationChannel,
				recognizablePublicationAllowed: photoVideoRecognizablePublicationAllowed,
				marketingUseAllowed: photoVideoMarketingUseAllowed,
				educationUseAllowed: photoVideoEducationUseAllowed,
			}),
		[
			photoVideoMaterials, photoVideoClinicalRecordUseConfirmed,
			photoVideoAnonymizationConfirmed, photoVideoRevocationChannel,
			photoVideoRecognizablePublicationAllowed, photoVideoMarketingUseAllowed,
			photoVideoEducationUseAllowed,
		],
	);

	return (
		<DocumentPayloadCard
			title="Фото, видео и снимки"
			description="Отдельные разрешения: карта, лаборатория, консилиум, обучение, маркетинг и публикация."
			notice={<PhotoVideoBlockersNotice review={review} />}
		>
			<div className="document-payload-row">
				{materialOptions.map((option) => (
					<label className="document-payload-checkbox" key={option.value}>
						<input
							checked={photoVideoMaterials.includes(option.value)}
							type="checkbox"
							onChange={() => toggleMaterial(option.value)}
						/>
						{option.label}
					</label>
				))}
			</div>

			<PhotoVideoPermissionsList />

			<label>
				Как пациент отзывает согласие
				<textarea
					value={photoVideoRevocationChannel}
					onChange={(e) => setPhotoVideoRevocationChannel(e.target.value)}
					rows={2}
				/>
			</label>
			<label>
				Ограничения пациента
				<textarea
					value={photoVideoScopeNotes}
					onChange={(e) => setPhotoVideoScopeNotes(e.target.value)}
					rows={2}
				/>
			</label>
		</DocumentPayloadCard>
	);
});

PhotoVideoConsentForm.displayName = "PhotoVideoConsentForm";
