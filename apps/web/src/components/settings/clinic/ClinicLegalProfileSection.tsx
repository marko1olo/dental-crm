import { Building2, Search, ShieldCheck } from "lucide-react";
import type React from "react";
import type { ChangeEvent } from "react";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

interface ClinicLegalProfileSectionProps {
	clinicProfileDraft: any;
	updateClinicProfileDraft: (field: string, value: string) => void;
	lookupClinicPublicProfile: () => void;
	isClinicPublicLookupLoading: boolean;
	legalMissingFields: string[];
	uiLanguage: string;
	setUiLanguage: (lang: string) => void;
	normalizeUiLanguageInput: (input: string) => string;
	typedUiLanguageOptions: Array<{ value: string; label: string }>;
	clinicProfileSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
	saveClinicProfileFromDraft: () => void;
}

export const ClinicLegalProfileSection: React.FC<ClinicLegalProfileSectionProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	lookupClinicPublicProfile,
	isClinicPublicLookupLoading,
	legalMissingFields,
	uiLanguage,
	setUiLanguage,
	normalizeUiLanguageInput,
	typedUiLanguageOptions,
	clinicProfileSaveState,
	saveClinicProfileFromDraft,
}) => {
	return (
		<section
			className="clinic-section-card"
			aria-label="Юридический профиль клиники"
		>
			<div className="clinic-section-header">
				<div className="clinic-section-icon">
					<Building2 size={24} />
				</div>
				<div className="clinic-section-title">
					<h3>Профиль и реквизиты</h3>
					<p>Основные данные, контакты и информация для документов</p>
				</div>
				<div className="clinic-mode-status">
					<span
						className={`status-pill ${legalMissingFields.length === 0 ? "status-confirmed" : "status-cancelled"}`}
					>
						{legalMissingFields.length === 0
							? "100% Заполнено"
							: `Не заполнено: ${legalMissingFields.length}`}
					</span>
				</div>
			</div>

			<div className="clinic-form-grid">
				<div className="clinic-form-group">
					<label>Название клиники (для расписания)</label>
					<input
						value={clinicProfileDraft?.clinicName ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("clinicName", event.target.value)
						}
						placeholder="Стоматология Улыбка"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Юридическое лицо (для договоров)</label>
					<input
						value={clinicProfileDraft?.legalName ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("legalName", event.target.value)
						}
						placeholder="ООО «Стоматология»"
					/>
				</div>
				<div className="clinic-form-group">
					<label>ИНН</label>
					<div style={{ display: "flex", gap: "8px" }}>
						<input
							inputMode="numeric"
							value={clinicProfileDraft?.inn ?? ""}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft(
									"inn",
									event.target.value.replace(/[^\d]/g, "").slice(0, 12),
								)
							}
							placeholder="ИНН"
						/>
						<button
							className="secondary-button"
							type="button"
							style={{ padding: "0 12px" }}
							onClick={() => void lookupClinicPublicProfile()}
							disabled={
								isClinicPublicLookupLoading || !clinicProfileDraft?.inn
							}
							title="Заполнить реквизиты по ИНН"
						>
							{isClinicPublicLookupLoading ? "..." : <Search size={18} />}
						</button>
					</div>
				</div>
				<div className="clinic-form-group">
					<label>КПП</label>
					<input
						inputMode="numeric"
						value={clinicProfileDraft?.kpp ?? ""}
						onChange={(event: InputChangeEvent) =>
							updateClinicProfileDraft(
								"kpp",
								event.target.value.replace(/[^\d]/g, "").slice(0, 9),
							)
						}
						placeholder="Для ИП оставить пустым"
					/>
				</div>
				<div className="clinic-form-group">
					<label>ОГРН / ОГРНИП</label>
					<input
						inputMode="numeric"
						value={clinicProfileDraft?.ogrn ?? ""}
						onChange={(event: InputChangeEvent) =>
							updateClinicProfileDraft(
								"ogrn",
								event.target.value.replace(/[^\d]/g, "").slice(0, 15),
							)
						}
						placeholder="ОГРН"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Юридический адрес</label>
					<input
						value={clinicProfileDraft?.address ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("address", event.target.value)
						}
						placeholder="г. Москва, ул. Примерная, д. 1"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Телефон для пациентов</label>
					<input
						value={clinicProfileDraft?.phone ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("phone", event.target.value)
						}
						placeholder="+7 (999) 123-45-67"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Email</label>
					<input
						value={clinicProfileDraft?.email ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("email", event.target.value)
						}
						placeholder="info@clinic.ru"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Номер лицензии</label>
					<input
						value={clinicProfileDraft?.medicalLicenseNumber ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft(
								"medicalLicenseNumber",
								event.target.value,
							)
						}
						placeholder="ЛО-12-34-567890"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Дата лицензии</label>
					<input
						value={clinicProfileDraft?.medicalLicenseIssuedAt ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft(
								"medicalLicenseIssuedAt",
								event.target.value,
							)
						}
						placeholder="01.01.2023"
					/>
				</div>
				<div className="clinic-form-group full-width">
					<label>Кем выдана лицензия</label>
					<input
						value={clinicProfileDraft?.medicalLicenseIssuer ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft(
								"medicalLicenseIssuer",
								event.target.value,
							)
						}
						placeholder="Департамент здравоохранения г. Москвы"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Подписант (ФИО)</label>
					<input
						value={clinicProfileDraft?.signatoryName ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("signatoryName", event.target.value)
						}
						placeholder="Иванов Иван Иванович"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Должность подписанта (в род. падеже)</label>
					<input
						value={clinicProfileDraft?.signatoryTitle ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("signatoryTitle", event.target.value)
						}
						placeholder="генерального директора"
					/>
				</div>
				<div className="clinic-form-group full-width">
					<label>Банковские реквизиты</label>
					<textarea
						value={clinicProfileDraft?.bankDetails ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("bankDetails", event.target.value)
						}
						placeholder="р/с 40702810..., БИК 044525225, ПАО СБЕРБАНК"
					/>
				</div>

				<div className="clinic-form-group">
					<label>Часовой пояс</label>
					<input
						value={clinicProfileDraft?.timezone ?? ""}
						onChange={(event: TextInputChangeEvent) =>
							updateClinicProfileDraft("timezone", event.target.value)
						}
						placeholder="Europe/Moscow"
					/>
				</div>
				<div className="clinic-form-group">
					<label>Язык интерфейса</label>
					<select
						value={uiLanguage}
						onChange={(event: SelectChangeEvent) =>
							setUiLanguage(normalizeUiLanguageInput(event.target.value))
						}
					>
						{typedUiLanguageOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderTop: "1px solid var(--line)",
					paddingTop: "20px",
					marginTop: "12px",
				}}
			>
				<span className={`save-state save-state-${clinicProfileSaveState}`}>
					{clinicProfileSaveState === "saved"
						? "✓ Все изменения сохранены"
						: clinicProfileSaveState === "error"
							? "⚠ Проверьте правильность полей"
							: "✏️ Есть несохраненные изменения"}
				</span>
				<button
					className="primary-button"
					type="button"
					onClick={() => void saveClinicProfileFromDraft()}
					disabled={clinicProfileSaveState === "saving"}
				>
					<ShieldCheck size={16} style={{ marginRight: "8px" }} />
					{clinicProfileSaveState === "saving"
						? "Сохраняю…"
						: "Сохранить профиль клиники"}
				</button>
			</div>
		</section>
	);
};
