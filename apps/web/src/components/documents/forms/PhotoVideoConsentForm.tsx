import type { PhotoVideoConsentMaterial } from "@dental/shared";
import React, { useMemo } from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { photoVideoConsentBlockersReview } from "../photoVideoConsentBlockers";
import type { DocumentSelectOption } from "./documentFormTypes";

export interface PhotoVideoConsentFormProps {
	/** Виды материалов: фото, видео, снимки — перечень приходит из справочника. */
	materialOptions: readonly DocumentSelectOption<PhotoVideoConsentMaterial>[];
	/** Переключение одного вида материала; список хранится в документе. */
	toggleMaterial: (material: PhotoVideoConsentMaterial) => void;
}

/**
 * Согласие на фото, видео и снимки: отдельное разрешение на каждый способ
 * использования. Вынесено из DocumentsView.tsx дословно.
 *
 * Сверху карточки — перечень невыполненных условий. Разбор и то, что видел
 * администратор до него (три отказа подряд на каждом новом согласии и
 * недействительная сама по себе отметка узнаваемой публикации), записаны в
 * photoVideoConsentBlockers.ts.
 */
export const PhotoVideoConsentForm = React.memo(function PhotoVideoConsentForm({
	materialOptions,
	toggleMaterial,
}: PhotoVideoConsentFormProps) {
	const photoVideoAnonymizationConfirmed = useDocumentStore(
		(state) => state.photoVideoAnonymizationConfirmed,
	);
	const setPhotoVideoAnonymizationConfirmed = useDocumentStore(
		(state) => state.setPhotoVideoAnonymizationConfirmed,
	);
	const photoVideoClinicalRecordUseConfirmed = useDocumentStore(
		(state) => state.photoVideoClinicalRecordUseConfirmed,
	);
	const setPhotoVideoClinicalRecordUseConfirmed = useDocumentStore(
		(state) => state.setPhotoVideoClinicalRecordUseConfirmed,
	);
	const photoVideoColleagueConsultationAllowed = useDocumentStore(
		(state) => state.photoVideoColleagueConsultationAllowed,
	);
	const setPhotoVideoColleagueConsultationAllowed = useDocumentStore(
		(state) => state.setPhotoVideoColleagueConsultationAllowed,
	);
	const photoVideoEducationUseAllowed = useDocumentStore(
		(state) => state.photoVideoEducationUseAllowed,
	);
	const setPhotoVideoEducationUseAllowed = useDocumentStore(
		(state) => state.setPhotoVideoEducationUseAllowed,
	);
	const photoVideoLabTransferAllowed = useDocumentStore(
		(state) => state.photoVideoLabTransferAllowed,
	);
	const setPhotoVideoLabTransferAllowed = useDocumentStore(
		(state) => state.setPhotoVideoLabTransferAllowed,
	);
	const photoVideoMarketingUseAllowed = useDocumentStore(
		(state) => state.photoVideoMarketingUseAllowed,
	);
	const setPhotoVideoMarketingUseAllowed = useDocumentStore(
		(state) => state.setPhotoVideoMarketingUseAllowed,
	);
	const photoVideoMaterials = useDocumentStore(
		(state) => state.photoVideoMaterials,
	);
	const photoVideoRecognizablePublicationAllowed = useDocumentStore(
		(state) => state.photoVideoRecognizablePublicationAllowed,
	);
	const setPhotoVideoRecognizablePublicationAllowed = useDocumentStore(
		(state) => state.setPhotoVideoRecognizablePublicationAllowed,
	);
	const photoVideoRevocationChannel = useDocumentStore(
		(state) => state.photoVideoRevocationChannel,
	);
	const setPhotoVideoRevocationChannel = useDocumentStore(
		(state) => state.setPhotoVideoRevocationChannel,
	);
	const photoVideoScopeNotes = useDocumentStore(
		(state) => state.photoVideoScopeNotes,
	);
	const setPhotoVideoScopeNotes = useDocumentStore(
		(state) => state.setPhotoVideoScopeNotes,
	);

	const review = useMemo(
		() =>
			photoVideoConsentBlockersReview({
				materials: photoVideoMaterials,
				clinicalRecordUseConfirmed: photoVideoClinicalRecordUseConfirmed,
				anonymizationConfirmed: photoVideoAnonymizationConfirmed,
				revocationChannel: photoVideoRevocationChannel,
				recognizablePublicationAllowed:
					photoVideoRecognizablePublicationAllowed,
				marketingUseAllowed: photoVideoMarketingUseAllowed,
				educationUseAllowed: photoVideoEducationUseAllowed,
			}),
		[
			photoVideoMaterials,
			photoVideoClinicalRecordUseConfirmed,
			photoVideoAnonymizationConfirmed,
			photoVideoRevocationChannel,
			photoVideoRecognizablePublicationAllowed,
			photoVideoMarketingUseAllowed,
			photoVideoEducationUseAllowed,
		],
	);

	return (
		<DocumentPayloadCard
			title="Фото, видео и снимки"
			description="Отдельные разрешения: карта, лаборатория, консилиум, обучение, маркетинг и узнаваемая публикация."
			notice={
				review.blockers.length > 0 ? (
					<div
						className="schedule-create-missing document-photo-video-blockers"
						role="status"
						aria-live="polite"
						style={{ marginTop: "12px" }}
					>
						<strong>
							Согласие на фото и видео не создастся: не выполнено{" "}
							{review.blockers.length} условий из {review.requiredCount}.
							Отметки ниже перемешаны: часть выбирает пациент, а эти обязательны
							для клиники:
						</strong>
						<ul>
							{review.blockers.map((blocker) => (
								<li key={blocker.field}>
									{blocker.label} — {blocker.hint}
								</li>
							))}
						</ul>
						<small>
							Все они в блоке «Ручная корректировка полей» ниже. Перечень
							пересчитывается сам, пока вы отмечаете.
						</small>
					</div>
				) : null}
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
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoClinicalRecordUseConfirmed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoClinicalRecordUseConfirmed(event.target.checked)
					}
				/>
				Фото, видео и снимки вносятся в медицинскую карту пациента
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoAnonymizationConfirmed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoAnonymizationConfirmed(event.target.checked)
					}
				/>
				Внешнее использование только после обезличивания, кроме отдельно
				разрешенной узнаваемой публикации
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoLabTransferAllowed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoLabTransferAllowed(event.target.checked)
					}
				/>
				Можно передавать в зуботехническую лабораторию
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoColleagueConsultationAllowed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoColleagueConsultationAllowed(event.target.checked)
					}
				/>
				Можно показывать коллегам для консультации
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoEducationUseAllowed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoEducationUseAllowed(event.target.checked)
					}
				/>
				Можно использовать в обучении и профессиональных разборах
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoMarketingUseAllowed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoMarketingUseAllowed(event.target.checked)
					}
				/>
				Можно использовать в маркетинге клиники
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoRecognizablePublicationAllowed}
					type="checkbox"
					onChange={(event) =>
						setPhotoVideoRecognizablePublicationAllowed(event.target.checked)
					}
				/>
				Разрешена узнаваемая публикация лица или улыбки
			</label>
			<label>
				Как пациент отзывает согласие
				<textarea
					value={photoVideoRevocationChannel}
					onChange={(event) =>
						setPhotoVideoRevocationChannel(event.target.value)
					}
					rows={2}
				/>
			</label>
			<label>
				Ограничения пациента
				<textarea
					value={photoVideoScopeNotes}
					onChange={(event) => setPhotoVideoScopeNotes(event.target.value)}
					rows={2}
				/>
			</label>
		</DocumentPayloadCard>
	);
});

PhotoVideoConsentForm.displayName = "PhotoVideoConsentForm";
