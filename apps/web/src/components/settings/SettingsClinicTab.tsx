import type {
	Chair,
	ClinicMode,
	DentalSpecialty,
	RoleQueue,
	StaffMember,
	StaffRole,
} from "@dental/shared";
import {
	CalendarDays,
	ExternalLink,
	KeyRound,
	Plus,
	Search,
	ShieldCheck,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import {
	planStaffCredentialUpdate,
	reloadStaffList,
	requestStaffMutation,
	type SettingsAccessHeaders,
} from "./staffMutationRequest";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
type WeekdayOption = { value: number; label: string };

/*
 * Подписи публичного поиска реквизитов. Компонент читал их из пропсов, но их
 * там не было и быть не могло: они объявлены как константы модуля в соседних
 * файлах настроек (SettingsAuditTab, SettingsImportsTab), а не приходят из
 * логики. Значит на экране вместо подписи печатался бы ключ вида
 * `not_configured`, а граница текста о том, что можно отправлять наружу,
 * не показывалась бы вовсе. Держим их здесь, рядом с местом применения.
 *
 * Дублирование этих словарей по файлам настроек вынесено долгом. Канонический
 * экспорт уже есть — SettingsViewHelpers.tsx:49, — но эти три файла его не
 * импортируют, а держат свои копии; на сегодня копии совпадают знак в знак.
 * Четвёртая копия ушла вместе с LegacyMigrationStudio.tsx: там словарь лежал под
 * именем с подчёркиванием, то есть был объявлен и не использовался.
 */
const clinicPublicLookupBoundaryText =
	"Публичный поиск получает только реквизиты клиники: ИНН, ОГРН, КПП, название, адрес или лицензию. Пациентов, снимки, базы и локальные пути сюда не отправлять.";

const clinicPublicLookupProviderStatusLabels: Record<string, string> = {
	ready: "профиль найден",
	not_configured: "онлайн-поиск не настроен",
	error: "онлайн-поиск не ответил",
	skipped_no_safe_query: "нужны реквизиты",
};

const clinicPublicLookupSuggestionSourceLabels: Record<string, string> = {
	dadata: "Сервис реквизитов",
	manual_public_targets: "Из введенных реквизитов",
};

/** Что реально ушло на сервер. Уведомление обязано перечислить именно это. */
type IssuedCredential = "email" | "password" | "pin";

const issuedCredentialLabels: Record<IssuedCredential, string> = {
	email: "логин",
	password: "пароль",
	pin: "PIN-код",
};

type StaffCredentialsSaveResult =
	/** `issued` непуст всегда: без единого поля запрос не отправляется вовсе. */
	| { readonly ok: true; readonly issued: readonly IssuedCredential[] }
	/** Отказ уже показан человеку здесь — вызывающей стороне добавлять нечего. */
	| { readonly ok: false };

/**
 * Сохранение доступов сотрудника: логин, пароль, PIN — ОДНИМ запросом.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО, И ЭТО НЕ «ДУБЛИРОВАНИЕ КОДА».
 *
 * Здесь стоял свой собственный `fetch` со своими руками собранными заголовками:
 * `Content-Type` плюс `x-dente-clinic-token` из localStorage. Охрана маршрутов
 * `/api/settings/*` требует НЕ токен кабинета, а `x-dente-admin-secret`
 * (`requireSettingsAccess`, routes/settings.ts:648; отказ 403 на :667; сам
 * маршрут закрыт ею на :774 — проверено 2026-07-29, номера строк гниют).
 * Пропускает запрос без секрета она ровно в одном случае: секрет на сервере НЕ
 * ЗАДАН И включена лазейка `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1` И
 * `NODE_ENV !== "production"` (:640-646).
 *
 * Общая обёртка `lib/apiAuthFetch.ts` секрет НЕ подставляет: она знает ровно два
 * заголовка — токен кабинета и токен сотрудника (:22-23, ставятся на :86-87).
 * Значит на машине разработчика кнопка «Сохранить доступы» зелёная, а в клинике
 * с заданным `DENTE_SETTINGS_ADMIN_SECRET` она отвечала 403 ВСЕГДА: ни логина,
 * ни пароля, ни PIN-кода сотруднику не выдать ни одному.
 *
 * Это была ТРЕТЬЯ реализация одного маршрута
 * `POST /api/settings/staff/:staffId/credentials`. Две другие — PIN и пароль во
 * вкладке «Сотрудники» — уже сведены в общий путь `./staffMutationRequest.ts`, и
 * там же, в :184, эта копия названа долгом. Теперь маршрут зовётся из одного
 * места, а заголовки берутся оттуда же, откуда их берут все остальные вкладки
 * настроек: `auth.settingsAccessHeaders`.
 *
 * ПОЧЕМУ ЗАПРОС ОСТАЛСЯ ОДИН, А НЕ РАСПАЛСЯ НА ТРИ. Сервер принимает `email`,
 * `password` и `pinCode` одним телом (routes/settings.ts:781-789), а форма ниже
 * даёт заполнить все три сразу. Три вызова по одному полю дали бы три запроса и
 * три уведомления на одно нажатие. Сами ПРАВИЛА проверки при этом взяты у общего
 * пути (`planStaffCredentialUpdate`), поэтому третьей копии «ровно 4 цифры» и
 * «не короче 6 знаков» в дереве больше нет.
 *
 * ПОЧЕМУ ОТКАЗ БОЛЬШЕ НЕ НАЗЫВАЕТСЯ «сервер не ответил». Прежний `catch`
 * печатал эту фразу и на обрыве связи, и на 403, и на 500 — то есть называл
 * причину, которой сервер не сообщал. Общий путь разводит «до сервера не дошли»
 * (`status === null`) и код ответа, а текст на каждый случай даёт
 * `actionFailureToast` из `lib/panelStateText.ts`.
 */
async function saveStaffCredentialsRequest(
	staffId: string,
	staffName: string,
	email: string,
	password: string,
	pin: string,
	accessHeaders: SettingsAccessHeaders | undefined,
): Promise<StaffCredentialsSaveResult> {
	const payload: { email?: string; password?: string; pinCode?: string } = {};
	const issued: IssuedCredential[] = [];

	const trimmedEmail = email.trim();
	if (trimmedEmail) {
		payload.email = trimmedEmail;
		issued.push("email");
	}
	if (password) {
		const plan = planStaffCredentialUpdate("password", password);
		if (!plan.ok) {
			showToast(plan.warning, "warning");
			return { ok: false };
		}
		Object.assign(payload, plan.body);
		issued.push("password");
	}
	if (pin) {
		const plan = planStaffCredentialUpdate("pin", pin);
		if (!plan.ok) {
			showToast(plan.warning, "warning");
			return { ok: false };
		}
		Object.assign(payload, plan.body);
		issued.push("pin");
	}
	if (issued.length === 0) {
		showToast("Заполните логин, пароль или PIN-код", "warning");
		return { ok: false };
	}

	const failedAction = `Доступы для ${staffName} не сохранены`;
	const outcome = await requestStaffMutation({
		url: `/api/settings/staff/${staffId}/credentials`,
		method: "POST",
		accessHeaders,
		logLabel: failedAction,
		body: payload,
	});
	if (!outcome.ok) {
		showToast(
			outcome.message ?? actionFailureToast(failedAction, outcome.status),
			"error",
		);
		return { ok: false };
	}
	return { ok: true, issued };
}

/**
 * Уведомление об успехе.
 *
 * БЫЛО «Доступы обновлены» — три умолчания в трёх словах. Не сказано, ЧТО
 * выдано (логин, пароль или PIN-код — а форма отправляет до трёх сразу), не
 * сказано, КОМУ (редактор доступов стоит на карточке каждого сотрудника, и при
 * пяти сотрудниках подряд администратор не знает, тому ли он сменил пароль), и
 * не сказано, что СТАРЫЙ доступ перестал работать — сотрудник придёт к планшету
 * со старым PIN-кодом и решит, что сломалась программа.
 *
 * Общие тексты `staffCredentialSavedMessage` сюда не подошли: они описывают
 * ровно ОДИН вид доступа, а этот запрос несёт до трёх. Согласование («его
 * больше не работает» против «их больше не работают») считается по числу
 * выданных секретов, а не подставляется в одну форму: ровно на таком
 * согласовании в этом дереве уже получали «Статус не загружены».
 */
function staffCredentialsSavedMessage(
	staffName: string,
	issued: readonly IssuedCredential[],
	listRefreshed: boolean,
): string {
	const listed = issued.map((item) => issuedCredentialLabels[item]).join(", ");
	const secretCount = issued.filter((item) => item !== "email").length;
	const replaced =
		secretCount === 0
			? ""
			: secretCount === 1
				? " Сообщите его сотруднику: старый больше не работает."
				: " Сообщите их сотруднику: старые больше не работают.";
	/* Логин виден на самой кнопке редактора, поэтому непрочитанный список данных
     клиники — это стоящая на экране неправда, а не мелкая задержка. */
	const staleHint = listRefreshed
		? ""
		: " Обновите страницу, чтобы увидеть это на карточке.";
	return `Для ${staffName} сохранено: ${listed}.${replaced}${staleHint}`;
}

/**
 * УБРАН МЁРТВЫЙ ШОВ ВНЕДРЕНИЯ. Здесь стоял необязательный проп
 * `saveCredentials`, а на вызове — `props.saveStaffCredentials ||
 * saveStaffCredentials`. Это тавтология: второе имя получено деструктуризацией
 * ИЗ ТОГО ЖЕ `props`, то есть выражение читало одно и то же свойство дважды.
 * Объявления `saveStaffCredentials` в дереве нет вовсе — поиск по `apps`,
 * `scripts` и `packages` даёт только вхождения внутри этого файла, — поэтому обе
 * половины всегда `undefined` и живым путём всегда был запрос выше. Шов, который
 * выглядит как выбор из двух источников, а не даёт ни одного, дороже
 * отсутствующего: следующий читатель ищет реализацию, которой нет.
 *
 * Взамен приходят две настоящие зависимости. `accessHeaders` — без него секрет
 * администратора настроек не уйдёт и сервер ответит 403. `loadDashboard` —
 * список персонала берётся из дашборда, а подпись кнопки ниже читает
 * `member.email`: без перечитывания выданный логин на экране не появится.
 */
function StaffCredentialsEditor({
	member,
	accessHeaders,
	loadDashboard,
}: {
	member: any;
	accessHeaders: SettingsAccessHeaders | undefined;
	loadDashboard: unknown;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [email, setEmail] = useState(member.email || "");
	const [password, setPassword] = useState("");
	const [pin, setPin] = useState("");
	const [saving, setSaving] = useState(false);

	/* Имя в кавычках, как во вкладке «Сотрудники»: подстановка идёт в середину
     предложения — Доступы для «Иванова» не сохранены. Без имени подставляется
     слово «сотрудника», а не пустое место: безымянная строка на экране выглядит
     как оборванный текст, и непонятно, кого именно касается отказ. */
	const staffName =
		typeof member?.fullName === "string" && member.fullName.trim()
			? `«${member.fullName.trim()}»`
			: "сотрудника";

	const handleSave = async () => {
		setSaving(true);
		try {
			const result = await saveStaffCredentialsRequest(
				member.id,
				staffName,
				email,
				password,
				pin,
				accessHeaders,
			);
			/* Отказ уже назван внутри запроса. Поля НЕ чистим и редактор НЕ закрываем:
         иначе набранный пароль придётся вспоминать заново. */
			if (!result.ok) return;
			setPassword("");
			setPin("");
			setIsOpen(false);
			/* Доступы на сервере уже изменены, поэтому об успехе говорим и тогда, когда
         данные клиники не удалось перечитать: отказ перечитывания меняет только
         подсказку, а не сам факт сохранения. */
			const listRefreshed = await reloadStaffList(loadDashboard);
			showToast(
				staffCredentialsSavedMessage(staffName, result.issued, listRefreshed),
				"success",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className="staff-credentials-editor"
			style={{
				marginTop: 12,
				padding: "12px",
				background: "rgba(0,0,0,0.02)",
				borderRadius: 6,
				border: "1px solid var(--slate-200, #e2e8f0)",
			}}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="secondary-button compact-button"
				style={{ display: "flex", gap: 6, alignItems: "center" }}
			>
				<KeyRound size={14} />
				{member.email
					? `Управление доступом (${member.email})`
					: "Выдать доступ (логин/пароль)"}
			</button>

			{isOpen && (
				<div
					style={{
						marginTop: 12,
						display: "flex",
						flexDirection: "column",
						gap: 8,
					}}
				>
					<label style={{ fontSize: 12 }}>
						Email (Логин)
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="email@example.com"
							style={{ width: "100%", marginTop: 4 }}
						/>
					</label>
					<div style={{ display: "flex", gap: 12 }}>
						<label style={{ fontSize: 12, flex: 1 }}>
							Новый пароль
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Оставьте пустым, чтобы не менять"
								style={{ width: "100%", marginTop: 4 }}
							/>
						</label>
						<label style={{ fontSize: 12, flex: 1 }}>
							Новый PIN (4 цифры)
							<input
								type="password"
								value={pin}
								onChange={(e) => setPin(e.target.value)}
								maxLength={4}
								placeholder="0000"
								style={{ width: "100%", marginTop: 4 }}
							/>
						</label>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							marginTop: 4,
						}}
					>
						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="primary-button compact-button"
						>
							{saving ? "Сохраняю..." : "Сохранить доступы"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export function SettingsClinicTab({
	props = {},
	settingsTab,
}: {
	props?: Record<string, any>;
	settingsTab?: string;
}) {
	const p = props || {};
	const {
		dashboard,
		/*
		 * `auth` и `loadDashboard` приходят тем же мешком пропсов, что и всё
		 * остальное: `SettingsView.tsx:1188` собирает `settingsProps` как
		 * `{...appLogic, ...settingsStore, ...derivations}`, а `auth` — ключ
		 * возвращаемого объекта `useAppLogic` (:13792 в `return` с :13771). Тот же
		 * путь используют `SettingsStaffTab.tsx:25` и `SettingsProtocolsTab.tsx:55`.
		 */
		auth,
		loadDashboard,
		changeClinicMode,
		clinicProfileDraft,
		clinicProfileSaveState,
		updateClinicProfileDraft,
		saveClinicProfileFromDraft,
		toggleClinicWorkingDay,
		uiLanguage,
		setUiLanguage,
		normalizeUiLanguageInput,
		lookupClinicPublicProfile,
		isClinicPublicLookupLoading,
		clinicPublicLookup,
		applyClinicLookupSuggestion,
		newStaffName,
		setNewStaffName,
		addStaffMember,
		deleteChair,
		newStaffReadyToCreate,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
		staffScheduleDrafts,
		staffScheduleDraftFromWorkingHours,
		staffScheduleSaveStates,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		updateStaffScheduleDraft,
		toggleStaffWorkingDay,
		updateStaffScheduleDay,
		saveStaffSchedule,
		newChairName,
		setNewChairName,
		addChair,
		newChairReadyToCreate,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleDirtyIds,
		chairScheduleSavingId,
		updateChairScheduleDraft,
		toggleChairWorkingDay,
		updateChairScheduleDay,
		saveChairSchedule,
		humanizeMigrationText,
		clinicLookupSuggestionFieldEntries,
		clinicPublicLookupFieldLabels,
		clinicPublicLookupWarningText,
		clinicLookupSuggestionApplySummary,
		legalReadinessPercent,
		legalMissingFields,
		weekdayOptions,
		uiLanguageOptions,
		clinicModeLabels,
		staffRoleLabels,
		specialtyLabels,
	} = p;

	if (settingsTab !== "clinic") return null;

	/*
	 * Один источник заголовков домена настроек на всю вкладку. `settingsAccessHeaders`
	 * отправляет СЕССИОННЫЙ секрет домена настроек плюс оба токена, каждый в своём
	 * заголовке; отсутствие помощника не молчит — общий путь пишет об этом в журнал
	 * разработчика (`staffMutationHeaders` в ./staffMutationRequest.ts).
	 */
	const accessHeaders = auth?.settingsAccessHeaders as
		| SettingsAccessHeaders
		| undefined;

	const typedClinicModes = Object.keys(clinicModeLabels || {}) as ClinicMode[];
	const typedModeHints = (dashboard?.clinicSettings?.modeHints ??
		[]) as string[];
	const typedRoleQueues = (dashboard?.shiftIntelligence?.roleQueues ??
		[]) as RoleQueue[];

	const typedWeekdayOptions = (weekdayOptions ?? []) as WeekdayOption[];
	const typedUiLanguageOptions = (uiLanguageOptions ?? []) as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const selectedUiLanguageOption = typedUiLanguageOptions.find(
		(o) => o.value === uiLanguage,
	) ||
		typedUiLanguageOptions[0] || { detail: "" };

	const typedClinicPublicLookupSuggestions =
		clinicPublicLookup?.suggestions ?? [];
	const typedClinicPublicLookupTargets =
		clinicPublicLookup?.publicLookupTargets ?? [];
	const typedStaffMembers = (dashboard?.clinicSettings?.staff ??
		[]) as StaffMember[];
	const typedChairs = (dashboard?.clinicSettings?.chairs ?? []) as Chair[];
	const staffCreationRoles: StaffRole[] = [
		"doctor",
		"administrator",
		"assistant",
		"manager",
	];

	return (
		<section className="clinic-config" aria-label="Аккаунт клиники и команда">
			<div className="clinic-config-head">
				<div>
					<p className="eyebrow">Аккаунт клиники</p>
					<h2>
						{dashboard?.clinicSettings?.profile?.clinicName ??
							"Демо Клиника DENTE"}
					</h2>
					<p>
						{dashboard?.clinicSettings?.profile?.legalName ??
							"ООО Демо Клиника"}{" "}
						· {dashboard?.clinicSettings?.profile?.address ?? ""} ·{" "}
						{dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow"}
					</p>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						alignItems: "flex-end",
					}}
				>
					<span>
						{dashboard?.clinicSettings?.profile?.mode
							? clinicModeLabels?.[dashboard.clinicSettings.profile.mode]?.title
							: "Стандартный"}
					</span>
				</div>
			</div>

			<div role="toolbar" className="mode-grid" aria-label="Режим продукта">
				{typedClinicModes.map((mode) => (
					<button
						className={`mode-card ${dashboard?.clinicSettings?.profile?.mode === mode ? "active" : ""}`}
						key={mode}
						type="button"
						aria-pressed={dashboard?.clinicSettings?.profile?.mode === mode}
						onClick={() => changeClinicMode(mode)}
					>
						<strong>{clinicModeLabels?.[mode]?.title}</strong>
						<span>{clinicModeLabels?.[mode]?.detail}</span>
					</button>
				))}
			</div>

			<div className="clinic-hints">
				{typedModeHints.map((hint) => (
					<span key={hint}>{hint}</span>
				))}
			</div>

			<div className="mode-readiness">
				<div>
					<p className="eyebrow">Готовность режима</p>
					<strong>
						{dashboard?.shiftIntelligence?.modeFit?.fitScore ?? 100}%
					</strong>
					<span>
						{dashboard?.shiftIntelligence?.modeFit?.lowFrictionNextStep ??
							"Готово"}
					</span>
				</div>
				<div>
					<p className="eyebrow">Открытые роли</p>
					{typedRoleQueues.map((queue) => (
						<span key={queue.role}>
							{staffRoleLabels?.[queue.role] ?? queue.role}: {queue.openItems}
						</span>
					))}
				</div>
			</div>

			<section
				className="clinic-legal-form"
				aria-label="Юридический профиль клиники"
			>
				<div className="clinic-legal-summary">
					<div>
						<p className="eyebrow">Настройки клиники</p>
						<h3>Основные данные и профиль для документов</h3>
					</div>
					<div className="legal-readiness-badge">
						<strong>{legalReadinessPercent}%</strong>
						<span>
							{(legalMissingFields ?? []).length
								? `Не заполнено: ${legalMissingFields.join(", ")}`
								: "Минимум заполнен"}
						</span>
					</div>
				</div>

				{/* === ОСНОВНЫЕ ПОЛЯ — всегда видны === */}
				<div className="clinic-profile-form-grid settings-essential-block">
					<label>
						Название клиники
						<input
							value={clinicProfileDraft.clinicName}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("clinicName", event.target.value)
							}
						/>
					</label>
					<label>
						Телефон
						<input
							value={clinicProfileDraft.phone}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("phone", event.target.value)
							}
						/>
					</label>
					<label className="form-span-2">
						Адрес
						<input
							value={clinicProfileDraft.address}
							onChange={(event: TextInputChangeEvent) =>
								updateClinicProfileDraft("address", event.target.value)
							}
						/>
					</label>
					<div className="form-span-2">
						<span
							className="field-label"
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Режим работы клиники
						</span>
						<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
							{[
								{
									value: "solo_doctor",
									label: "Частный кабинет (без ассистента)",
								},
								{
									value: "small_clinic",
									label: "Стандартный (с ассистентами)",
								},
							].map((option) => (
								<button
									key={option.value}
									type="button"
									className={`quick-chip ${clinicProfileDraft.mode === option.value ? "active" : ""}`}
									onClick={() => updateClinicProfileDraft("mode", option.value)}
									style={{
										background:
											clinicProfileDraft.mode === option.value
												? "var(--brand-500)"
												: "var(--surface-100, var(--paper-soft))",
										color:
											clinicProfileDraft.mode === option.value
												? "#fff"
												: "var(--ink)",
										padding: "8px 16px",
										borderRadius: "20px",
										border: "none",
										cursor: "pointer",
										fontSize: "14px",
										fontWeight: 500,
									}}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<label>
						Начало смены
						<input
							type="time"
							value={clinicProfileDraft.workdayStart}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("workdayStart", event.target.value)
							}
						/>
					</label>
					<label>
						Конец смены
						<input
							type="time"
							value={clinicProfileDraft.workdayEnd}
							onChange={(event: InputChangeEvent) =>
								updateClinicProfileDraft("workdayEnd", event.target.value)
							}
						/>
					</label>
					<fieldset
						className="weekday-toggle-row form-span-2"
						style={{ border: "none", padding: 0, margin: 0 }}
						aria-label="Рабочие дни клиники"
					>
						<span>Рабочие дни</span>
						{typedWeekdayOptions.map((day: any) => (
							<button
								className={
									clinicProfileDraft.workingDays.includes(day.value)
										? "active"
										: ""
								}
								key={day.value}
								type="button"
								aria-pressed={clinicProfileDraft.workingDays.includes(
									day.value,
								)}
								onClick={() => toggleClinicWorkingDay(day.value)}
							>
								{day.label}
							</button>
						))}
					</fieldset>
				</div>

				{/* === ДЛЯ ДОКУМЕНТОВ — collapsible === */}
				<details className="settings-advanced-block">
					<summary className="settings-advanced-toggle">
						<span className="settings-advanced-label">
							<span className="settings-advanced-icon">📋</span>
							Для договоров и налоговых документов
						</span>
						<span className="settings-advanced-hint">
							ИНН, лицензия, банк, подписант
						</span>
						<span className="settings-advanced-chevron">▼</span>
					</summary>
					<div className="clinic-profile-form-grid settings-advanced-form">
						<label>
							Юридическое лицо
							<input
								value={clinicProfileDraft.legalName}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("legalName", event.target.value)
								}
							/>
							<small className="field-note">
								ИП Иванова М.С. или ООО «Клиника»
							</small>
						</label>
						<label>
							ИНН
							<input
								inputMode="numeric"
								value={clinicProfileDraft.inn}
								onChange={(event: InputChangeEvent) =>
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
								inputMode="numeric"
								value={clinicProfileDraft.kpp}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"kpp",
										event.target.value.replace(/[^\d]/g, "").slice(0, 9),
									)
								}
							/>
							<small className="field-note">
								Только для ООО / АО. ИП оставить пустым.
							</small>
						</label>
						<label>
							ОГРН / ОГРНИП
							<input
								inputMode="numeric"
								value={clinicProfileDraft.ogrn}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"ogrn",
										event.target.value.replace(/[^\d]/g, "").slice(0, 15),
									)
								}
							/>
						</label>
						<label>
							Email
							<input
								value={clinicProfileDraft.email}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("email", event.target.value)
								}
							/>
						</label>
						<label>
							Сайт
							<input
								value={clinicProfileDraft.website}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("website", event.target.value)
								}
							/>
						</label>
						<label>
							Номер лицензии
							<input
								value={clinicProfileDraft.medicalLicenseNumber}
								onChange={(event: TextInputChangeEvent) =>
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
								onChange={(event: TextInputChangeEvent) =>
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
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft(
										"medicalLicenseIssuer",
										event.target.value,
									)
								}
							/>
						</label>
						<label>
							Подписант
							<input
								value={clinicProfileDraft.signatoryName}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("signatoryName", event.target.value)
								}
							/>
							<small className="field-note">
								ФИО того, кто подписывает договоры
							</small>
						</label>
						<label>
							Должность подписанта
							<input
								value={clinicProfileDraft.signatoryTitle}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("signatoryTitle", event.target.value)
								}
							/>
							<small className="field-note">
								Например: индивидуальный предприниматель
							</small>
						</label>
						<label className="form-span-2">
							Банковские реквизиты
							<textarea
								value={clinicProfileDraft.bankDetails}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("bankDetails", event.target.value)
								}
							/>
							<small className="field-note">
								р/с, БИК, банк — всё в одной строке или через запятую
							</small>
						</label>
						<label>
							Часовой пояс
							<input
								value={clinicProfileDraft.timezone}
								onChange={(event: TextInputChangeEvent) =>
									updateClinicProfileDraft("timezone", event.target.value)
								}
							/>
							<small className="field-note">Например: Europe/Moscow</small>
						</label>
						<label>
							Язык интерфейса
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
							<small className="field-note">
								{selectedUiLanguageOption.detail}
							</small>
						</label>
						<label>
							Минут на визит
							<input
								inputMode="numeric"
								value={clinicProfileDraft.defaultVisitMinutes}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"defaultVisitMinutes",
										event.target.value.replace(/[^\d]/g, "").slice(0, 3),
									)
								}
							/>
						</label>
						<label>
							Буфер между записями, мин
							<input
								inputMode="numeric"
								value={clinicProfileDraft.appointmentBufferMinutes}
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft(
										"appointmentBufferMinutes",
										event.target.value.replace(/[^\d]/g, "").slice(0, 3),
									)
								}
							/>
						</label>
						<label className="checkbox-line form-span-2">
							<input
								checked={clinicProfileDraft.egiszEnabled}
								type="checkbox"
								className="toggle-switch"
								onChange={(event: InputChangeEvent) =>
									updateClinicProfileDraft("egiszEnabled", event.target.checked)
								}
							/>
							ЕГИСЗ-адаптер включен
							<small className="field-note">
								Нужен только при подключении к федеральной системе ЕГИСЗ
							</small>
						</label>
					</div>
				</details>

				<div className="clinic-profile-actions">
					<button
						className="secondary-button"
						type="button"
						onClick={() => void lookupClinicPublicProfile()}
						disabled={isClinicPublicLookupLoading}
					>
						<Search aria-hidden="true" />{" "}
						{isClinicPublicLookupLoading
							? "Ищу реквизиты…"
							: "Найти реквизиты по ИНН"}
					</button>
					<button
						className="primary-button"
						type="button"
						onClick={() => void saveClinicProfileFromDraft()}
						disabled={clinicProfileSaveState === "saving"}
					>
						<ShieldCheck aria-hidden="true" />{" "}
						{clinicProfileSaveState === "saving" ? "Сохраняю…" : "Сохранить"}
					</button>
					<span className={`save-state save-state-${clinicProfileSaveState}`}>
						{clinicProfileSaveState === "saved"
							? "Сохранено"
							: clinicProfileSaveState === "error"
								? "Проверьте поля"
								: "Изменения не выдаются в документах до сохранения"}
					</span>
				</div>

				{clinicPublicLookup ? (
					<section
						className="clinic-public-lookup-result"
						data-testid="clinic-public-lookup-result"
						aria-label="Публичный поиск реквизитов клиники"
					>
						<div className="dicom-discovery-head">
							<strong>
								Публичный поиск:{" "}
								{clinicPublicLookupProviderStatusLabels[
									clinicPublicLookup.providerStatus
								] ??
									humanizeMigrationText(clinicPublicLookup.providerStatus)}{" "}
								· запрос {clinicPublicLookup.safeQuery || "не сформирован"}
							</strong>
							<span>
								{humanizeMigrationText(clinicPublicLookup.nextAction)}
							</span>
						</div>
						<small className="clinic-public-boundary">
							{clinicPublicLookupBoundaryText}
						</small>
						{clinicPublicLookup.suggestions.length ? (
							<div className="clinic-public-suggestions">
								{typedClinicPublicLookupSuggestions
									.slice(0, 4)
									.map((suggestion, index) => ({
										suggestion,
										suggestionId: `${suggestion.source}-${suggestion.confidence}-${index}`,
									}))
									.map(({ suggestion, suggestionId }) => (
										<article key={suggestionId}>
											<strong>
												{clinicPublicLookupSuggestionSourceLabels[
													suggestion.source
												] ?? humanizeMigrationText(suggestion.source)}{" "}
												· {Math.round(suggestion.confidence * 100)}%
											</strong>
											<p>
												{clinicLookupSuggestionFieldEntries(suggestion.fields)
													.map(
														([key, value]) =>
															`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
													)
													.join(" · ")}
											</p>
											{suggestion.warnings
												.slice(0, 2)
												.map((warning: string) => (
													<small key={warning}>
														{clinicPublicLookupWarningText(warning)}
													</small>
												))}
											<small className="clinic-public-apply-summary">
												{clinicLookupSuggestionApplySummary(suggestion.fields)}
											</small>
											<button
												className="text-button"
												type="button"
												disabled={
													!clinicLookupSuggestionFieldEntries(suggestion.fields)
														.length
												}
												onClick={() =>
													applyClinicLookupSuggestion(suggestion.fields)
												}
											>
												Подставить в профиль
											</button>
										</article>
									))}
							</div>
						) : null}
						{clinicPublicLookup.publicLookupTargets.length ? (
							<div className="clinic-public-targets">
								{typedClinicPublicLookupTargets.map((target) => (
									<a
										className="secondary-button"
										href={target.url}
										key={`${target.kind}:${target.title}`}
										target="_blank"
										rel="noreferrer noopener"
										aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
										title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
									>
										<ExternalLink aria-hidden="true" /> {target.title}
									</a>
								))}
							</div>
						) : null}
						{clinicPublicLookup.warnings.slice(0, 4).map((warning: string) => (
							<small key={warning}>
								{clinicPublicLookupWarningText(warning)}
							</small>
						))}
					</section>
				) : null}
			</section>

			<div className="clinic-config-grid">
				<article>
					<div className="panel-heading">
						<h3>Команда и права</h3>
						<span className="status-pill status-arrived">
							{dashboard.clinicSettings.staff.length}
						</span>
					</div>
					<div className="quick-create">
						<input
							aria-label="Новый сотрудник"
							placeholder="ФИО сотрудника"
							value={newStaffName}
							onChange={(event: TextInputChangeEvent) =>
								setNewStaffName(event.target.value)
							}
						/>
						<button
							aria-label="Добавить сотрудника"
							className="icon-button"
							type="button"
							onClick={() => addStaffMember(newStaffRole)}
							disabled={!newStaffReadyToCreate}
						>
							<Plus aria-hidden="true" />
						</button>
					</div>
					{!newStaffReadyToCreate ? (
						<p
							className="quick-create-guidance"
							role="status"
							aria-live="polite"
						>
							Введите ФИО сотрудника, затем выберите роль.
						</p>
					) : null}
					<div role="toolbar" className="role-picker" aria-label="Роль нового сотрудника">
						{staffCreationRoles.map((role) => (
							<button
								className={newStaffRole === role ? "active" : ""}
								key={role}
								type="button"
								aria-pressed={newStaffRole === role}
								onClick={() => setNewStaffRole(role)}
							>
								{staffRoleLabels[role]}
							</button>
						))}
					</div>
					{newStaffRole === "doctor" || newStaffRole === "assistant" ? (
						<div
							role="toolbar"
							className="specialty-strip staff-specialty-picker"
							aria-label="Специальность нового сотрудника"
						>
							{(Object.keys(specialtyLabels || {}) as DentalSpecialty[]).map(
								(specialty) => (
									<button
										className={newStaffSpecialty === specialty ? "active" : ""}
										key={specialty}
										type="button"
										aria-pressed={newStaffSpecialty === specialty}
										onClick={() => setNewStaffSpecialty(specialty)}
									>
										{specialtyLabels?.[specialty] ?? specialty}
									</button>
								),
							)}
						</div>
					) : null}

					<div className="staff-list">
						{typedStaffMembers.map((member) => {
							const scheduleDraft =
								staffScheduleDrafts[member.id] ??
								staffScheduleDraftFromWorkingHours(member.workingHours ?? null);
							const scheduleSaveState =
								staffScheduleSaveStates[member.id] ?? "saved";
							const scheduleDirty = staffScheduleDirtyIds.has(member.id);
							const scheduleSaving =
								staffScheduleSavingId === member.id ||
								scheduleSaveState === "saving";
							const scheduleSaveLabel = scheduleSaving
								? "Автосохранение"
								: scheduleSaveState === "error"
									? "Не сохранено"
									: scheduleDirty
										? "Ждет автосохранения"
										: "Сохранено";
							return (
								<div className="staff-row" key={member.id}>
									<span style={{ background: member.color }} />
									<div>
										<strong>{member.fullName}</strong>
										<p>
											{staffRoleLabels[member.role]} ·{" "}
											{member.specialties
												.map((item) => specialtyLabels[item])
												.join(", ")}
										</p>
									</div>
									<small>
										{member.canSignMedicalRecords
											? "ЭМК"
											: member.canManageImports
												? "Импорт"
												: "Доступ"}
									</small>
									<div className="staff-schedule-editor">
										<label>
											С
											<input
												type="time"
												value={scheduleDraft.start}
												onChange={(event: InputChangeEvent) =>
													updateStaffScheduleDraft(member.id, {
														start: event.target.value,
													})
												}
											/>
										</label>
										<label>
											До
											<input
												type="time"
												value={scheduleDraft.end}
												onChange={(event: InputChangeEvent) =>
													updateStaffScheduleDraft(member.id, {
														end: event.target.value,
													})
												}
											/>
										</label>
										<fieldset
											className="weekday-toggle-row staff-weekday-row"
											style={{ border: "none", padding: 0, margin: 0 }}
											aria-label={`Рабочие дни: ${member.fullName}`}
										>
											{typedWeekdayOptions.map((day: any) => (
												<button
													className={
														scheduleDraft.workingDays.includes(day.value)
															? "active"
															: ""
													}
													key={day.value}
													type="button"
													aria-pressed={scheduleDraft.workingDays.includes(
														day.value,
													)}
													onClick={() =>
														toggleStaffWorkingDay(member.id, day.value)
													}
												>
													{day.label}
												</button>
											))}
										</fieldset>
										<details className="settings-advanced-block schedule-advanced-block">
											<summary className="settings-advanced-toggle">
												<span className="settings-advanced-label">
													Индивидуальные часы по дням
												</span>
												<span className="settings-advanced-chevron">▼</span>
											</summary>
											<section
												className="staff-day-hours"
												aria-label={`Часы по дням: ${member.fullName}`}
											>
												{typedWeekdayOptions
													.filter((day) =>
														scheduleDraft.workingDays.includes(day.value),
													)
													.map((day: any) => {
														const dayHours = scheduleDraft.perDay[day.value];
														return (
															<div key={`hours-${member.id}-${day.value}`}>
																<span>{day.label}</span>
																<input
																	aria-label={`${day.label}, начало`}
																	type="time"
																	value={dayHours?.start ?? scheduleDraft.start}
																	onChange={(event: InputChangeEvent) =>
																		updateStaffScheduleDay(
																			member.id,
																			day.value,
																			{ start: event.target.value },
																		)
																	}
																/>
																<input
																	aria-label={`${day.label}, конец`}
																	type="time"
																	value={dayHours?.end ?? scheduleDraft.end}
																	onChange={(event: InputChangeEvent) =>
																		updateStaffScheduleDay(
																			member.id,
																			day.value,
																			{ end: event.target.value },
																		)
																	}
																/>
															</div>
														);
													})}
											</section>
										</details>
										<div className="staff-schedule-actions">
											<span
												className={`save-state save-state-${scheduleSaveState}`}
											>
												{scheduleSaveLabel}
											</span>
											<button
												className="secondary-button compact-button"
												type="button"
												onClick={() => void saveStaffSchedule(member.id)}
												disabled={scheduleSaving}
											>
												{scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
											</button>
										</div>
									</div>
									<StaffCredentialsEditor
										member={member}
										accessHeaders={accessHeaders}
										loadDashboard={loadDashboard}
									/>
								</div>
							);
						})}
					</div>
				</article>

				<article>
					<div className="panel-heading">
						<h3>Кресла и кабинеты</h3>
						<span className="status-pill status-confirmed">
							{dashboard.clinicSettings.chairs.length}
						</span>
					</div>
					<div className="quick-create">
						<input
							aria-label="Новое кресло"
							placeholder="Кресло / кабинет"
							value={newChairName}
							onChange={(event: TextInputChangeEvent) =>
								setNewChairName(event.target.value)
							}
						/>
						<button
							aria-label="Добавить кресло или кабинет"
							className="icon-button"
							type="button"
							onClick={addChair}
							disabled={!newChairReadyToCreate}
						>
							<Plus aria-hidden="true" />
						</button>
					</div>
					{!newChairReadyToCreate ? (
						<p
							className="quick-create-guidance"
							role="status"
							aria-live="polite"
						>
							Введите понятное название кресла или кабинета.
						</p>
					) : null}
					<div
						role="toolbar"
						className="role-picker equipment-picker"
						aria-label="Оборудование кресла"
					>
						<button
							className={newChairHasXraySensor ? "active" : ""}
							type="button"
							aria-pressed={newChairHasXraySensor}
							onClick={() =>
								setNewChairHasXraySensor((value: boolean) => !value)
							}
						>
							RVG
						</button>
						<button
							className={newChairHasMicroscope ? "active" : ""}
							type="button"
							aria-pressed={newChairHasMicroscope}
							onClick={() =>
								setNewChairHasMicroscope((value: boolean) => !value)
							}
						>
							Микроскоп
						</button>
						<button
							className={newChairHasSurgeryKit ? "active" : ""}
							type="button"
							aria-pressed={newChairHasSurgeryKit}
							onClick={() =>
								setNewChairHasSurgeryKit((value: boolean) => !value)
							}
						>
							Хирургия
						</button>
					</div>
					<div className="staff-list">
						{typedChairs.map((chair) => {
							const scheduleDraft =
								chairScheduleDrafts[chair.id] ??
								staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
							const scheduleSaveState =
								chairScheduleSaveStates[chair.id] ?? "saved";
							const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
							const scheduleSaving =
								chairScheduleSavingId === chair.id ||
								scheduleSaveState === "saving";
							const scheduleSaveLabel = scheduleSaving
								? "Автосохранение"
								: scheduleSaveState === "error"
									? "Не сохранено"
									: scheduleDirty
										? "Ждет автосохранения"
										: "Сохранено";
							return (
								<div className="staff-row" key={chair.id}>
									<CalendarDays aria-hidden="true" />
									<div>
										<strong>{chair.name}</strong>
										<p>
											{chair.room ?? "кабинет не указан"} ·{" "}
											{chair.specialization
												? specialtyLabels[chair.specialization]
												: "универсально"}
										</p>
									</div>
									<small>
										{chair.hasXraySensor
											? "RVG"
											: chair.hasMicroscope
												? "Микроскоп"
												: chair.hasSurgeryKit
													? "Хирургия"
													: "База"}
									</small>
									<div className="staff-schedule-editor">
										<label>
											С
											<input
												type="time"
												value={scheduleDraft.start}
												onChange={(event: InputChangeEvent) =>
													updateChairScheduleDraft(chair.id, {
														start: event.target.value,
													})
												}
												className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
											/>
										</label>
										<label>
											До
											<input
												type="time"
												value={scheduleDraft.end}
												onChange={(event: InputChangeEvent) =>
													updateChairScheduleDraft(chair.id, {
														end: event.target.value,
													})
												}
												className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
											/>
										</label>
										<fieldset
											className="weekday-toggle-row staff-weekday-row"
											style={{ border: "none", padding: 0, margin: 0 }}
											aria-label={`Рабочие дни кресла: ${chair.name}`}
										>
											{typedWeekdayOptions.map((day: any) => (
												<button
													className={`focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all hover:scale-[1.05] ${scheduleDraft.workingDays.includes(day.value) ? "active" : ""}`}
													key={day.value}
													type="button"
													aria-pressed={scheduleDraft.workingDays.includes(
														day.value,
													)}
													onClick={() =>
														toggleChairWorkingDay(chair.id, day.value)
													}
												>
													{day.label}
												</button>
											))}
										</fieldset>
										<details className="settings-advanced-block schedule-advanced-block">
											<summary className="settings-advanced-toggle">
												<span className="settings-advanced-label">
													Индивидуальные часы по дням
												</span>
												<span className="settings-advanced-chevron">▼</span>
											</summary>
											<section
												className="staff-day-hours"
												aria-label={`Часы по дням кресла: ${chair.name}`}
											>
												{typedWeekdayOptions
													.filter((day) =>
														scheduleDraft.workingDays.includes(day.value),
													)
													.map((day: any) => {
														const dayHours = scheduleDraft.perDay[day.value];
														return (
															<div key={`chair-hours-${chair.id}-${day.value}`}>
																<span>{day.label}</span>
																<input
																	aria-label={`${day.label}, начало кресла`}
																	type="time"
																	value={dayHours?.start ?? scheduleDraft.start}
																	onChange={(event: InputChangeEvent) =>
																		updateChairScheduleDay(
																			chair.id,
																			day.value,
																			{ start: event.target.value },
																		)
																	}
																/>
																<input
																	aria-label={`${day.label}, конец кресла`}
																	type="time"
																	value={dayHours?.end ?? scheduleDraft.end}
																	onChange={(event: InputChangeEvent) =>
																		updateChairScheduleDay(
																			chair.id,
																			day.value,
																			{ end: event.target.value },
																		)
																	}
																/>
															</div>
														);
													})}
											</section>
										</details>
										<div className="staff-schedule-actions">
											<span
												className={`save-state save-state-${scheduleSaveState}`}
											>
												{scheduleSaveLabel}
											</span>
											<button
												className="secondary-button compact-button"
												type="button"
												onClick={() => void saveChairSchedule(chair.id)}
												disabled={scheduleSaving}
											>
												{scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
											</button>
											{/*
                              До этой правки кресло нельзя было отключить ни из одного места веб-приложения:
                              deleteChair существовал в useAppLogic и не имел ни одного вызова, а дубликата,
                              в отличие от createStaffMember и updateStaffMember, никто не написал. Маршрут на
                              сервере при этом рабочий.

                              Написано «Отключить», а не «Удалить», и это не выбор формулировки. Маршрут DELETE
                              /api/settings/chairs/:chairId делает мягкую деактивацию: deactivateChairInDb
                              выполняет UPDATE chairs SET is_active = false, строка остаётся, и это сделано
                              намеренно — на chairs.id ссылаются приёмы через appointments.chair_id. Сервер
                              отвечает 200 с телом обновлённого кресла, а не 204, поэтому интерфейс, который
                              решит «строка исчезла», будет неправ. Проверки на занятые приёмы у маршрута нет и
                              не требуется: ничего не удаляется, внешние ключи остаются целыми.

                              ИСПРАВЛЕНО: первая версия этого предупреждения утверждала, что кресло «исчезнет
                              из расписания вместе с записанными приёмами». Это неправда, и текст был не просто
                              неточным, а вредным — он побуждал бы отменять и перезаписывать день приёмов, чтобы
                              избежать ущерба, которого не бывает. Проверено по коду: ScheduleView.tsx:798-800
                              фильтрует кресла по chair.active для РЯДА ЧИПОВ ФИЛЬТРА (quick-chip,
                              setScheduleChairFilterId), а не для колонок — сетки по креслам в приложении нет
                              вообще, chairId встречается в ScheduleView дважды. Приёмы рендерятся из
                              sortedAppointments, который фильтрует по выбранному чипу и активность кресла не
                              проверяет. Более того, useAppLogic сбрасывает scheduleChairFilterId, когда кресло
                              покидает активный набор, так что застрять в пустом фильтре тоже нельзя.

                              Настоящее последствие узкое и оно в тексте ниже: кресло пропадает из ВЫБОРЩИКОВ —
                              NewAppointmentForm.tsx:529 и AppointmentCard.tsx:307 оба строят список из
                              chairs.filter(chair => chair.active). Значит новые приёмы на него записать нельзя,
                              а у уже записанного приёма выборщик не покажет его текущее кресло среди вариантов.
                              Сам приём и его chairId остаются целы и видны в расписании.
                            */}
											<button
												className="secondary-button compact-button"
												type="button"
												onClick={() => {
													if (
														!window.confirm(
															`Отключить кресло «${chair.name}»? Новые приёмы на него записать будет нельзя, и в уже записанных приёмах оно пропадёт из списка выбора. Сами приёмы и расписание не изменятся.`,
														)
													) {
														return;
													}
													void deleteChair(chair.id);
												}}
											>
												Отключить
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</article>
			</div>
		</section>
	);
}
