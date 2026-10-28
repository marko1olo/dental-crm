import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";

export const PhotoVideoPermissionsList: React.FC = React.memo(function PhotoVideoPermissionsList() {
	const {
		photoVideoClinicalRecordUseConfirmed, setPhotoVideoClinicalRecordUseConfirmed,
		photoVideoAnonymizationConfirmed, setPhotoVideoAnonymizationConfirmed,
		photoVideoLabTransferAllowed, setPhotoVideoLabTransferAllowed,
		photoVideoColleagueConsultationAllowed, setPhotoVideoColleagueConsultationAllowed,
		photoVideoEducationUseAllowed, setPhotoVideoEducationUseAllowed,
		photoVideoMarketingUseAllowed, setPhotoVideoMarketingUseAllowed,
		photoVideoRecognizablePublicationAllowed, setPhotoVideoRecognizablePublicationAllowed,
	} = useDocumentStore();

	return (
		<>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoClinicalRecordUseConfirmed}
					type="checkbox"
					onChange={(e) => setPhotoVideoClinicalRecordUseConfirmed(e.target.checked)}
				/>
				Фото, видео и снимки вносятся в медицинскую карту пациента
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoAnonymizationConfirmed}
					type="checkbox"
					onChange={(e) => setPhotoVideoAnonymizationConfirmed(e.target.checked)}
				/>
				Внешнее использование только после обезличивания, кроме отдельно разрешенной публикации
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoLabTransferAllowed}
					type="checkbox"
					onChange={(e) => setPhotoVideoLabTransferAllowed(e.target.checked)}
				/>
				Можно передавать в зуботехническую лабораторию
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoColleagueConsultationAllowed}
					type="checkbox"
					onChange={(e) => setPhotoVideoColleagueConsultationAllowed(e.target.checked)}
				/>
				Можно показывать коллегам для консультации
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoEducationUseAllowed}
					type="checkbox"
					onChange={(e) => setPhotoVideoEducationUseAllowed(e.target.checked)}
				/>
				Можно использовать в обучении и профессиональных разборах
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoMarketingUseAllowed}
					type="checkbox"
					onChange={(e) => setPhotoVideoMarketingUseAllowed(e.target.checked)}
				/>
				Можно использовать в маркетинге клиники
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={photoVideoRecognizablePublicationAllowed}
					type="checkbox"
					onChange={(e) => setPhotoVideoRecognizablePublicationAllowed(e.target.checked)}
				/>
				Разрешена узнаваемая публикация лица или улыбки
			</label>
		</>
	);
});
