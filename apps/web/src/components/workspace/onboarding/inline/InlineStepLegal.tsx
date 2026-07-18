import React from "react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";
import { useSettingsLogic } from "../../../../hooks/domains/useSettingsLogic";

export function InlineStepLegal() {
	const appLogicBase = useAppLogicContext();
	const settingsLogic = useSettingsLogic({
		auth: appLogicBase.auth,
		setError: appLogicBase.setError,
		loadDashboard: appLogicBase.loadDashboard,
	});
	const mergedProps = Object.assign({}, appLogicBase, settingsLogic) as any;

	const {
		clinicProfileDraft,
		updateClinicProfileDraft,
		legalReadinessPercent,
		legalMissingFields,
	} = mergedProps;

	return (
		<div className="onboarding-panel">
			<div>
				<h3>Юридические данные для договоров и налоговых справок</h3>
				<p>
					Без этих полей приложение не должно выдавать финальные договоры,
					акты и налоговые документы как готовые.
				</p>
			</div>
			<div className="onboarding-form-grid">
				<label>
					Юридическое лицо
					<input
						value={clinicProfileDraft.legalName}
						onChange={(event) =>
							updateClinicProfileDraft("legalName", event.target.value)
						}
					/>
				</label>
				<label>
					ИНН
					<input
						value={clinicProfileDraft.inn}
						onChange={(event) =>
							updateClinicProfileDraft(
								"inn",
								event.target.value.replace(/[^\d]/g, "").slice(0, 12),
							)
						}
					/>
				</label>
				<label>
					КПП
					<input
						value={clinicProfileDraft.kpp}
						onChange={(event) =>
							updateClinicProfileDraft(
								"kpp",
								event.target.value.replace(/[^\d]/g, "").slice(0, 9),
							)
						}
					/>
				</label>
				<label>
					ОГРН / ОГРНИП
					<input
						value={clinicProfileDraft.ogrn}
						onChange={(event) =>
							updateClinicProfileDraft(
								"ogrn",
								event.target.value.replace(/[^\d]/g, "").slice(0, 15),
							)
						}
					/>
				</label>
				<label className="form-span-2">
					Адрес
					<input
						value={clinicProfileDraft.address}
						onChange={(event) =>
							updateClinicProfileDraft("address", event.target.value)
						}
					/>
				</label>
				<label>
					Номер лицензии
					<input
						value={clinicProfileDraft.medicalLicenseNumber}
						onChange={(event) =>
							updateClinicProfileDraft(
								"medicalLicenseNumber",
								event.target.value,
							)
						}
					/>
				</label>
				<label>
					Дата лицензии
					<input
						value={clinicProfileDraft.medicalLicenseIssuedAt}
						onChange={(event) =>
							updateClinicProfileDraft(
								"medicalLicenseIssuedAt",
								event.target.value,
							)
						}
					/>
				</label>
				<label className="form-span-2">
					Кем выдана лицензия
					<input
						value={clinicProfileDraft.medicalLicenseIssuer}
						onChange={(event) =>
							updateClinicProfileDraft(
								"medicalLicenseIssuer",
								event.target.value,
							)
						}
					/>
				</label>
			</div>
			<div className="clinic-legal-summary">
				<strong>{legalReadinessPercent}%</strong>
				<span>
					{legalMissingFields.length
						? `Не хватает: ${legalMissingFields.join(", ")}`
						: "Минимальные поля заполнены"}
				</span>
			</div>
		</div>
	);
}
