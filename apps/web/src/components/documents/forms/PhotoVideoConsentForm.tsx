import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PhotoVideoConsentForm({
	typedPhotoVideoMaterialOptions,
	togglePhotoVideoMaterial,
	activePatient,
}: any) {
	const {
		photoVideoLabTransferAllowed,
		setPhotoVideoLabTransferAllowed,
		photoVideoColleagueConsultationAllowed,
		setPhotoVideoColleagueConsultationAllowed,
		photoVideoEducationUseAllowed,
		setPhotoVideoEducationUseAllowed,
		photoVideoMarketingUseAllowed,
		setPhotoVideoMarketingUseAllowed,
		photoVideoRecognizablePublicationAllowed,
		setPhotoVideoRecognizablePublicationAllowed,
		photoVideoClinicalRecordUseConfirmed,
		setPhotoVideoClinicalRecordUseConfirmed,
		photoVideoAnonymizationConfirmed,
		setPhotoVideoAnonymizationConfirmed,
		photoVideoMaterials,
		photoVideoRevocationChannel,
		setPhotoVideoRevocationChannel,
		photoVideoScopeNotes,
		setPhotoVideoScopeNotes,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Фото, видео и снимки</h3>
				<p>
					Отдельные разрешения: карта, лаборатория, консилиум, обучение,
					маркетинг и узнаваемая публикация.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<div className="document-payload-row">
						{typedPhotoVideoMaterialOptions.map((option) => (
							<label className="document-payload-checkbox" key={option.value}>
								<input
									checked={photoVideoMaterials.includes(option.value)}
									type="checkbox"
									onChange={() => togglePhotoVideoMaterial(option.value)}
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
								setPhotoVideoRecognizablePublicationAllowed(
									event.target.checked,
								)
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
				</div>
			</details>
		</article>
	);
}
