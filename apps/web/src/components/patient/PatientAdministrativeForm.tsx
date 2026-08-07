import type { PatientAdministrativeProfile } from "@dental/shared";
import type { ChangeEvent } from "react";
import { formatPhoneNumber } from "../../utils/inputSanitation";

/*
 * Реквизиты пациента: паспорт, ИНН, СНИЛС, представитель, получатель
 * документов, основание обработки персональных данных, удобное окно записи и
 * уровень лояльности.
 *
 * ЧТО БЫЛО НЕ ТАК. Этот файл лежал в дереве и не был подключён ни к одному
 * экрану, а карточка пациента (PatientsView.tsx) рисовала свою копию того же
 * блока — на пять полей короче. Пять полей существовали во всей остальной
 * цепочке (схема @dental/shared, колонка administrative_profile, черновик и
 * payload в AppHelpers, валидация запроса на сервере), но ввести их было
 * НЕЧЕМ:
 *   • «Кому выдавать документы» и «Основание обработки персональных данных»
 *     печатаются в юридические документы (apps/api/src/documents/renderDocument.ts),
 *     и без них в документ всегда уходила заглушка
 *     «пациент / законный представитель / доверенное лицо»;
 *   • «Удобно приходить с/до» читает движок предупреждений расписания
 *     (apps/api/src/sampleData.ts), поэтому предупреждение «прием вне удобного
 *     окна пациента» не срабатывало никогда;
 *   • хуже всего: валидатор реквизитов (AppHelpers.patientAdministrativeProfileDraftIssue)
 *     требует указывать начало и конец окна ПАРОЙ и при полупаре отключает
 *     кнопку «Сохранить реквизиты» и отложенное сохранение. Полупару создаёт
 *     сам сервер (нормализация обнуляет конец, если он не позже начала) и
 *     прогоняет по всем пациентам при загрузке состояния. Администратор видел
 *     «Укажите конец удобного времени приема», не мог ни указать конец, ни
 *     очистить начало, и терял возможность сохранить паспорт, ИНН, СНИЛС и
 *     представителя этого пациента через интерфейс.
 *
 * Подписи полей и плейсхолдеры взяты из карточки пациента, а не из этого
 * файла: за них есть отдельный гейт, и расхождение подписей — это не
 * декомпозиция, а тихая правка интерфейса.
 *
 * Типы черновика намеренно НЕ импортируются из PatientsView.tsx и
 * AppHelpers.tsx: любой из этих импортов замкнул бы цикл (PatientsView →
 * форма → PatientsView, AppHelpers → PatientsView → форма → AppHelpers).
 * Форма выводит форму черновика из общей схемы, поэтому разойтись с ней не
 * может: новое поле профиля автоматически появится и здесь.
 */

type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
};

type WeekdayOption = {
	label: string;
	value: number;
};

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

/*
 * Подписи уровней лояльности. Ключи — ровно enum общей схемы
 * (packages/shared: standard|silver|gold|platinum), и это не стилистика:
 * Record по этому же union не даёт ни выдумать лишний уровень, ни забыть
 * новый — оба случая ломают сборку здесь, а не расходятся с сервером молча.
 * Так уже ломалось: UI слал "none", которого в enum нет, и получал 400.
 */
const loyaltyTierLabels: Record<
	NonNullable<PatientAdministrativeProfile["loyaltyTier"]>,
	string
> = {
	standard: "Базовый",
	silver: "Серебро",
	gold: "Золото",
	platinum: "Платинум",
};

type PatientAdministrativeFormProps = {
	patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	updatePatientAdministrativeProfileDraft: (
		field: keyof PatientAdministrativeProfileDraft,
		value: string | number[],
	) => void;
	weekdayOptions: WeekdayOption[];
	normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
};

export function PatientAdministrativeForm({
	patientAdministrativeProfileDraft,
	updatePatientAdministrativeProfileDraft,
	weekdayOptions,
	normalizeOptionalWorkingDaysDraft,
}: PatientAdministrativeFormProps) {
	return (
		<div className="clinic-profile-form-grid patient-admin-form-grid">
			<label>
				Паспорт / Документ
				<input
					autoComplete="off"
					value={patientAdministrativeProfileDraft.identityDocument}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"identityDocument",
							event.target.value,
						)
					}
					placeholder="Паспорт РФ 0000 000000"
				/>
			</label>
			<label>
				ИНН пациента
				<input
					inputMode="numeric"
					autoComplete="off"
					pattern="[0-9]*"
					value={patientAdministrativeProfileDraft.taxpayerInn}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"taxpayerInn",
							event.target.value.replace(/[^\d]/g, "").slice(0, 12),
						)
					}
					placeholder="10 или 12 цифр"
				/>
			</label>
			<label>
				Адрес регистрации
				<input
					autoComplete="street-address"
					value={patientAdministrativeProfileDraft.registrationAddress}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"registrationAddress",
							event.target.value,
						)
					}
					placeholder="Индекс, город, улица, дом"
				/>
			</label>
			<label>
				Адрес проживания
				<input
					autoComplete="street-address"
					value={patientAdministrativeProfileDraft.residentialAddress}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"residentialAddress",
							event.target.value,
						)
					}
					placeholder="Если отличается"
				/>
			</label>
			<label>
				Полис ДМС / ОМС
				<input
					autoComplete="off"
					value={patientAdministrativeProfileDraft.insurancePolicyNumber}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"insurancePolicyNumber",
							event.target.value,
						)
					}
					placeholder="Номер полиса"
				/>
			</label>
			<label>
				СНИЛС
				<input
					inputMode="numeric"
					autoComplete="off"
					pattern="[0-9 -]*"
					value={patientAdministrativeProfileDraft.snils}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft("snils", event.target.value)
					}
					placeholder="000-000-000 00"
				/>
			</label>
			<label>
				ФИО представителя
				<input
					autoComplete="off"
					value={patientAdministrativeProfileDraft.legalRepresentativeFullName}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"legalRepresentativeFullName",
							event.target.value,
						)
					}
					placeholder="ФИО представителя"
				/>
			</label>
			<label>
				Кем приходится
				<input
					autoComplete="off"
					value={
						patientAdministrativeProfileDraft.legalRepresentativeRelationship
					}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"legalRepresentativeRelationship",
							event.target.value,
						)
					}
					placeholder="Родитель, опекун"
				/>
			</label>
			<label>
				Паспорт представителя
				{/* БЫЛО: плейсхолдер «Паспорт / сессия». Документ представителя — это
            паспорт или доверенность; «сессия» здесь ничего не значит и
            подсказывала оператору не то. */}
				<input
					autoComplete="off"
					value={
						patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument
					}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"legalRepresentativeIdentityDocument",
							event.target.value,
						)
					}
					placeholder="Паспорт / доверенность"
				/>
			</label>
			<label>
				Телефон представителя
				{/* Телефон представителя приводится к тому же виду, что и телефон
            пациента: по нему звонят и на него уходят напоминания, а разнобой
            форматов ломает поиск и рассылку. */}
				<input
					type="tel"
					inputMode="tel"
					autoComplete="tel"
					value={patientAdministrativeProfileDraft.legalRepresentativePhone}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"legalRepresentativePhone",
							formatPhoneNumber(event.target.value),
						)
					}
					placeholder="+7..."
				/>
			</label>
			<label className="form-span-2">
				Кому выдавать документы
				<input
					autoComplete="off"
					value={patientAdministrativeProfileDraft.preferredDocumentRecipient}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"preferredDocumentRecipient",
							event.target.value,
						)
					}
					placeholder="Пациенту лично / представителю / доверенному лицу"
				/>
			</label>
			<p className="field-note form-span-2">
				Получатель документов печатается в договоре, согласии и акте. Пока поле
				пустое, в документ уходит общая формулировка «пациент / законный
				представитель / доверенное лицо».
			</p>
			<label className="form-span-2">
				Основание обработки персональных данных
				<input
					autoComplete="off"
					value={patientAdministrativeProfileDraft.dataProcessingBasisNote}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"dataProcessingBasisNote",
							event.target.value,
						)
					}
					placeholder="Согласие пациента, согласие представителя, договор"
				/>
			</label>
			<p className="field-note form-span-2">
				Основание печатается в согласии на обработку персональных данных строкой
				«Основание/комментарий клиники».
			</p>
			<div className="form-span-2 patient-appointment-preferences">
				<span>Предпочитаемые дни приема</span>
				<fieldset
					className="weekday-toggle-row"
					aria-label="Предпочитаемые дни приема пациента"
				>
					{weekdayOptions.map((day) => {
						const weekdaySelected =
							patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(
								day.value,
							);
						return (
							<button
								aria-pressed={weekdaySelected}
								className={weekdaySelected ? "active" : ""}
								key={`patient-weekday-${day.value}`}
								type="button"
								onClick={() => {
									const currentDays =
										patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
									const nextDays = weekdaySelected
										? currentDays.filter(
												(selectedDay) => selectedDay !== day.value,
											)
										: [...currentDays, day.value];

									updatePatientAdministrativeProfileDraft(
										"preferredAppointmentWeekdays",
										normalizeOptionalWorkingDaysDraft(nextDays),
									);
								}}
							>
								{day.label}
							</button>
						);
					})}
				</fieldset>
			</div>
			<label>
				Удобно приходить с
				<input
					type="time"
					value={patientAdministrativeProfileDraft.preferredAppointmentStart}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"preferredAppointmentStart",
							event.target.value,
						)
					}
				/>
			</label>
			<label>
				Удобно приходить до
				<input
					type="time"
					value={patientAdministrativeProfileDraft.preferredAppointmentEnd}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"preferredAppointmentEnd",
							event.target.value,
						)
					}
				/>
			</label>
			<p className="field-note form-span-2">
				Удобное окно указывается парой: и начало, и конец. Пока заполнено одно
				поле, реквизиты не сохраняются — заполните второе или очистите первое.
				По этому окну расписание предупреждает, что запись стоит в неудобное для
				пациента время.
			</p>
			<label className="form-span-2">
				Комментарий к записи
				<input
					autoComplete="off"
					value={patientAdministrativeProfileDraft.preferredAppointmentNote}
					onChange={(event: TextFieldChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"preferredAppointmentNote",
							event.target.value,
						)
					}
					placeholder="Например: только утро, не звонить после 19:00, нужен сопровождающий"
				/>
			</label>
			<label>
				Уровень лояльности
				{/* Уровень уже редактировали значком с короной в шапке карточки
            (components/patients/PatientLoyaltyHeader.tsx), но НЕ здесь — при том
            что «Сохранить реквизиты» его пишет: buildPatientAdministrativeProfilePayload
            кладёт draft.loyaltyTier в тело PUT и приводит всё нераспознанное к
            "standard". То есть форма была невидимым владельцем поля: оператор не
            видел значения, которое сам же и отправлял, а на устаревшем черновике
            сохранение реквизитов возвращало уровень назад. Поле видимо — значит
            владелец один и он честный. */}
				<select
					value={patientAdministrativeProfileDraft.loyaltyTier}
					onChange={(event: SelectChangeEvent) =>
						updatePatientAdministrativeProfileDraft(
							"loyaltyTier",
							event.target.value,
						)
					}
				>
					{Object.entries(loyaltyTierLabels).map(([tier, label]) => (
						<option key={`patient-loyalty-${tier}`} value={tier}>
							{label}
						</option>
					))}
				</select>
			</label>
			<p className="field-note form-span-2">
				Уровень — пометка для сотрудников: скидку по нему программа не считает и
				в счёт не подставляет, назначайте её вручную при оплате. Тот же уровень
				показывает значок с короной в шапке карточки.
			</p>
		</div>
	);
}
