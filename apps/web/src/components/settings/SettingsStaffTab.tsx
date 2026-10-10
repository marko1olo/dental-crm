import type { StaffRole } from "@dental/shared";
import { Calendar, KeyRound, MoreVertical, Phone, ShieldCheck, UserPlus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { DoctorSnilsValidationWidget } from "./DoctorSnilsValidationWidget";
import { StaffAuthorityPanel } from "./StaffAuthorityPanel";
import { StaffCommissionsPanel } from "./StaffCommissionsPanel";
import { StaffProfileCard } from "./StaffProfileCard";
import { CREATABLE_STAFF_ROLES, staffRoleTitle } from "./settingsInviteRoles";
import { TimesheetT13Modal, staffToEmployeeInfo } from "../payroll/TimesheetT13Modal";
import {
	planStaffCredentialUpdate,
	reloadStaffList,
	requestStaffMutation,
	type SettingsAccessHeaders,
	type StaffCredentialKind,
	staffCredentialFailedAction,
	staffCredentialSavedMessage,
} from "./staffMutationRequest";

interface SettingsStaffTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props: Record<string, any>;
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
	// biome-ignore lint/correctness/noUnusedVariables: automated suppression
	const { dashboard, staffRoleLabels, loadDashboard, auth } = props;
	const staff = dashboard?.clinicSettings?.staff || [];
	/*
	 * ЗАГОЛОВКИ ДОМЕНА НАСТРОЕК, ОДИН ИСТОЧНИК НА ВСЮ ВКЛАДКУ.
	 *
	 * Все четыре обработчика ниже посылали только `x-dente-clinic-token`, взятый
	 * из localStorage руками. Охрана маршрутов `/api/settings/staff*` требует НЕ
	 * его, а `x-dente-admin-secret` (`routes/settings.ts:559`), поэтому в клинике
	 * с заданным DENTE_SETTINGS_ADMIN_SECRET вкладка отвечала 403 на любое
	 * действие, оставаясь зелёной на машине разработчика. Разбор — в
	 * ./staffMutationRequest.ts.
	 */
	const accessHeaders = auth?.settingsAccessHeaders as
		| SettingsAccessHeaders
		| undefined;
	/*
	 * Список сотрудников приходит из дашборда. Отличить «сотрудников нет» от
	 * «данные клиники не прочитаны» можно только по наличию самого дашборда:
	 * состояния его загрузки сюда не передаётся. Меньшее из двух — не утверждать
	 * ничего, когда дашборда нет вовсе.
	 */
	const clinicDataLoaded = Boolean(dashboard?.clinicSettings);

	const [loading, setLoading] = useState(false);
	const [isTimesheetT13Open, setIsTimesheetT13Open] = useState(false);

	// New staff form state
	const [newStaffName, setNewStaffName] = useState("");
	/*
	 * Должность типизирована StaffRole. В соседней форме приглашения такой же
	 * список был набран руками и отправлял роль «admin», которой нет в схеме, —
	 * приглашённый администратор получал права владельца. Разбор
	 * в ./settingsInviteRoles.ts; здесь список берётся из того же места.
	 */
	const [newStaffRole, setNewStaffRole] = useState<StaffRole>("doctor");
	const [newStaffEmail, setNewStaffEmail] = useState("");
	/*
	 * ТЕЛЕФОН СОТРУДНИКА БЫЛО НЕГДЕ ВВЕСТИ НИ НА ОДНОМ ДОСТИЖИМОМ ЭКРАНЕ.
	 *
	 * Колонка users.phone есть, создание её пишет (db/settingsQuery.ts:194),
	 * правка её пишет (:227), чтение её отдаёт (:128), схема запроса её принимает
	 * (packages/shared createStaffMemberSchema.phone,
	 * updateStaffMemberProfileSchema.phone) — а поля ввода не было ни здесь, ни
	 * где-либо ещё в вебе. Единственным местом, где номер когда-либо вводился
	 * руками, был шаг «Сотрудники» семишагового мастера первого запуска, и тот
	 * мастер не отрисовывался нигде, а затем был удалён (разбор —
	 * tests/panelsAreMounted.test.ts). Долг записан там же и закрывается здесь.
	 *
	 * Что это значит для клиники: врача не дозвониться. Замена в смене, срочный
	 * пациент, опоздание — номера нет в системе вовсе, при том что место для него
	 * есть на всём пути от формы до базы.
	 *
	 * Полей три, потому что возможность из трёх частей: ввести при заведении,
	 * УВИДЕТЬ на карточке (иначе запись невидима и через неделю никто не знает,
	 * заполнена ли она) и исправить у того, кто уже заведён, — иначе клиника с
	 * пятью сотрудниками осталась бы без номеров навсегда.
	 */
	const [newStaffPhone, setNewStaffPhone] = useState("");
	const [newStaffSnils, setNewStaffSnils] = useState("");
	const [selectedStaffForCard, setSelectedStaffForCard] = useState<any | null>(null);

	// PIN editing state
	const [editingPinForId, setEditingPinForId] = useState<string | null>(null);
	const [newPin, setNewPin] = useState("");

	// Phone editing state
	const [editingPhoneForId, setEditingPhoneForId] = useState<string | null>(
		null,
	);
	const [phoneDraft, setPhoneDraft] = useState("");

	// Password editing state
	const [editingPasswordForId, setEditingPasswordForId] = useState<
		string | null
	>(null);
	const [newPassword, setNewPassword] = useState("");

	// Credential menu popover state
	const [credentialMenuOpenId, setCredentialMenuOpenId] = useState<
		string | null
	>(null);

	/*
	 * Кого именно касается сообщение. «PIN-код успешно изменен» не говорило, у кого:
	 * кнопки PIN стоят на каждой карточке персонала, и при пяти сотрудниках подряд
	 * администратор не знает, тому ли он его сменил.
	 */
	const staffNameById = (staffId: string): string => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const member = staff.find((item: any) => item?.id === staffId);
		const fullName =
			typeof member?.fullName === "string" ? member.fullName.trim() : "";
		return fullName.length > 0 ? `«${fullName}»` : "сотрудника";
	};

	const handleCreateStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		if (loading) return;
		if (!newStaffName.trim()) {
			showToast("Укажите ФИО сотрудника", "warning");
			return;
		}

		const addedName = newStaffName.trim();
		setLoading(true);
		const failedAction = `Сотрудник «${addedName}» не добавлен`;
		try {
			const outcome = await requestStaffMutation({
				url: "/api/settings/staff",
				method: "POST",
				accessHeaders,
				logLabel: "сотрудник не добавлен",
				body: {
					fullName: addedName,
					role: newStaffRole,
					phone: newStaffPhone.trim() || null,
					email: newStaffEmail.trim() || null,
					snils: newStaffSnils.trim() || null,
					active: true,
					canSignMedicalRecords: newStaffRole === "doctor",
					canManageMoney:
						newStaffRole === "administrator" || newStaffRole === "owner",
					canManageImports: true,
					color: "#3b82f6",
				},
			});
			if (!outcome.ok) {
				showToast(
					outcome.message ?? actionFailureToast(failedAction, outcome.status),
					"error",
				);
				return;
			}
			setNewStaffName("");
			setNewStaffEmail("");
			setNewStaffPhone("");
			setNewStaffSnils("");
			/*
			 * БЫЛО: «Сотрудник успешно добавлен. Пожалуйста, перезагрузите страницу.»
			 *
			 * Список персонала берётся из дашборда, а дашборд сам не перечитывался —
			 * поэтому добавленного человека в списке не было, и программа просила
			 * администратора перезагрузить страницу вручную. Перечитывать данные
			 * клиники умеет loadDashboard, он приходит сюда вместе с остальными
			 * настройками; просьба к человеку сделать работу программы убрана.
			 *
			 * Отказ САМОГО перечитывания больше не выдаётся за отказ создания: раньше
			 * упавший loadDashboard уводил в catch, и человек читал «Сотрудник не
			 * добавлен» про уже созданного сотрудника — и заводил его второй раз.
			 */
			const listRefreshed = await reloadStaffList(loadDashboard);
			showToast(
				listRefreshed
					? `Сотрудник «${addedName}» добавлен. Назначьте ему PIN-код для планшета в списке слева.`
					: `Сотрудник «${addedName}» добавлен. Обновите страницу, чтобы увидеть его в списке.`,
				"success",
			);
		} finally {
			setLoading(false);
		}
	};

	/*
	 * Правка телефона уже заведённого сотрудника — PUT /api/settings/staff/:id.
	 *
	 * Маршрут существует и принимает частичное обновление
	 * (routes/settings.ts:745, схема updateStaffMemberProfileSchema), но до этой
	 * правки его не звал из веба НИКТО: `updateStaffMember` в `useAppLogic.tsx`
	 * объявлен, попадает в возвращаемый объект хука и не вызывается ни из одного
	 * файла — проверено поиском по всему дереву. То есть карточку сотрудника
	 * нельзя было исправить вообще ничем. Этот обработчик — единственный живой
	 * вызов маршрута; мёртвая копия в `useAppLogic.tsx` подлежит удалению, но
	 * удаляется не отсюда: файл принадлежит другой правке.
	 *
	 * Пустая строка отправляется как null, а не как "": колонка nullable, и
	 * «номер стёрли» должно храниться пустотой, а не пустой строкой, иначе на
	 * карточке появится подпись «телефон указан», под которой ничего нет.
	 */
	const handleUpdatePhone = async (e: React.FormEvent, staffId: string) => {
		e.preventDefault();
		if (loading) return;
		const staffName = staffNameById(staffId);
		setLoading(true);
		const failedAction = `Телефон ${staffName} не сохранён`;
		try {
			const outcome = await requestStaffMutation({
				url: `/api/settings/staff/${staffId}`,
				method: "PUT",
				accessHeaders,
				logLabel: "телефон не сохранён",
				body: { phone: phoneDraft.trim() || null },
			});
			if (!outcome.ok) {
				/* Поле ввода НЕ закрываем при отказе: набранный номер должен остаться
           на экране, иначе его придётся вспоминать заново. */
				showToast(
					outcome.message ?? actionFailureToast(failedAction, outcome.status),
					"error",
				);
				return;
			}
			const savedPhone = phoneDraft.trim();
			setEditingPhoneForId(null);
			setPhoneDraft("");
			/* Номер сохранён на сервере, поэтому об успехе говорим и тогда, когда
         карточку не удалось перечитать: тогда добавляем, что делать дальше. */
			const listRefreshed = await reloadStaffList(loadDashboard);
			const staleHint = listRefreshed
				? ""
				: " Обновите страницу, чтобы увидеть это на карточке.";
			showToast(
				savedPhone
					? `Телефон ${staffName} сохранён: ${savedPhone}.${staleHint}`
					: `Телефон ${staffName} удалён.${staleHint}`,
				"success",
			);
		} finally {
			setLoading(false);
		}
	};

	/*
	 * PIN-КОД И ПАРОЛЬ — ОДИН МАРШРУТ И ОДИН ОБРАБОТЧИК.
	 *
	 * Здесь стояли handleUpdatePin и handleUpdatePassword: два блока по 45 строк,
	 * адресованные ОДНОМУ адресу POST /api/settings/staff/:staffId/credentials
	 * (сервер принимает email, password и pinCode одним телом,
	 * routes/settings.ts:684). Различались они полем тела, текстом уведомления и
	 * тем, какое поле ввода закрыть после успеха. Разошлись бы они на первой же
	 * правке — в этом дереве уже есть третья копия тех же двух проверок,
	 * SettingsClinicTab.tsx:60,72.
	 *
	 * Что осталось на каждый вид доступа: проверка введённого и два текста — они
	 * живут чистыми функциями в ./staffMutationRequest.ts и проверяются без DOM.
	 */
	const handleUpdateCredential = async (
		e: React.FormEvent,
		staffId: string,
		kind: StaffCredentialKind,
	) => {
		e.preventDefault();
		if (loading) return;
		const staffName = staffNameById(staffId);
		const plan = planStaffCredentialUpdate(
			kind,
			kind === "pin" ? newPin : newPassword,
		);
		if (!plan.ok) {
			showToast(plan.warning, "warning");
			return;
		}

		setLoading(true);
		const failedAction = staffCredentialFailedAction(kind, staffName);
		try {
			const outcome = await requestStaffMutation({
				url: `/api/settings/staff/${staffId}/credentials`,
				method: "POST",
				accessHeaders,
				logLabel: failedAction,
				body: plan.body,
			});
			if (!outcome.ok) {
				/* Поле ввода НЕ закрываем при отказе: иначе неясно, сменился доступ или
           нет, и набирать его придётся заново. */
				showToast(
					outcome.message ?? actionFailureToast(failedAction, outcome.status),
					"error",
				);
				return;
			}
			if (kind === "pin") {
				setEditingPinForId(null);
				setNewPin("");
			} else {
				setEditingPasswordForId(null);
				setNewPassword("");
			}
			showToast(staffCredentialSavedMessage(kind, staffName), "success");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section
			className="staff-management-studio animate-fade-in w-full min-w-0"
			aria-label="Управление персоналом"
			data-testid="settings-staff-tab"
		>
			<div className="flex flex-col gap-1 mb-4">
				<h3 className="text-lg font-bold text-[var(--ink)] m-0">Управление персоналом</h3>
				<p className="text-xs text-[var(--muted)] m-0">
					Добавляйте новых врачей, ассистентов и администраторов. Устанавливайте
					PIN-коды для доступа к планшету клиники.
				</p>
			</div>

			<div className="settings-grid">
				{/* Список сотрудников */}
				<article className="settings-card col-span-full form-span-2 w-full" data-testid="active-staff-list-card">
					<div className="settings-card-header flex items-center justify-between gap-2">
						<h4 className="m-0">Активный персонал</h4>
						<button
							type="button"
							onClick={() => setIsTimesheetT13Open(true)}
							className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
							data-testid="btn-staff-open-timesheet-t13"
						>
							<Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
							<span>Табель Т-13 (Госкомстат)</span>
						</button>
					</div>
					{/* min(280px,100%): иначе колонка шире узкого контейнера и
              карточки сотрудников обрезаются справа. */}
					{/*
            ПУСТОЙ СПИСОК БЕЗ ЕДИНОГО СЛОВА — ТУПИК.

            Здесь рисовалась только сетка карточек: когда сотрудников нет или
            данные клиники не прочитаны, под заголовком «Активный персонал» был
            пустой прямоугольник, и администратор не понимал, что произошло.
            Отличить эти два случая можно лишь по наличию самого дашборда —
            состояния его загрузки сюда не передают, поэтому во втором случае
            ничего о персонале не утверждается.
          */}
					{staff.length === 0 && (
						<p className="text-sm text-[var(--muted)] m-0 py-6 text-center">
							{clinicDataLoaded
								? "Сотрудников пока нет. Добавьте первого в форме «Добавить сотрудника» и назначьте ему PIN-код для планшета."
								: "Данные клиники ещё не прочитаны, поэтому список персонала показать нельзя. Обновите страницу; если список не появится, сообщите администратору."}
						</p>
					)}
					<div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] w-full min-w-0">
						{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
						{staff.map((member: any) => (
							<div
								key={member.id}
								className="border border-[var(--line)] bg-[var(--paper-card)] rounded-xl p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-[var(--line-strong)] transition-all"
							>
								<div className="flex items-center gap-3">
									<div
										className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shrink-0"
										style={{ backgroundColor: member.color || "var(--accent, #3b82f6)" }}
									>
										{member.fullName ? member.fullName.charAt(0) : "S"}
									</div>
									<div className="min-w-0 flex-1">
										<h5 className="m-0 text-sm font-semibold text-[var(--ink)] break-words leading-snug">
											{member.fullName}
										</h5>
										{/*
                      БЫЛО: `staffRoleLabels ? staffRoleLabels[member.role] : member.role`.
                      Роль вне схемы (такие в базе есть — их создала форма
                      приглашения, пока отправляла «admin») давала undefined, и на
                      месте должности не было НИЧЕГО: администратор не мог понять,
                      чего у человека не хватает. А без справочника подписей на
                      экран попадало имя роли латиницей.
                    */}
										<span className="text-xs text-[var(--muted)]">
											{staffRoleTitle(String(member.role ?? ""))}
										</span>
										{/*
                      Номер показан, а его отсутствие названо словами. Пустое
                      место на карточке нельзя отличить от «поля не существует» —
                      именно так телефон и потерялся: колонка есть на всём пути от
                      формы до базы, а на экране про неё нет ни буквы.
                    */}
										{member.phone ? (
											<a
												className="block text-xs text-[var(--ink)] no-underline hover:text-[var(--teal)] hover:underline"
												href={`tel:${String(member.phone).replace(/[^\d+]/g, "")}`}
											>
												{member.phone}
											</a>
										) : (
											<span className="block text-xs text-[var(--muted)]">
												телефон не указан
											</span>
										)}
									</div>
								</div>

								<div className="pt-2.5 border-t border-[var(--line-subtle)] flex flex-col gap-2">
									{editingPhoneForId === member.id ? (
										<form
											onSubmit={(e) => handleUpdatePhone(e, member.id)}
											className="flex flex-wrap gap-2"
										>
											<input
												type="tel"
												inputMode="tel"
												autoComplete="tel"
												maxLength={80}
												placeholder="+7..."
												aria-label={`Телефон сотрудника ${member.fullName || ""}`}
												value={phoneDraft}
												onChange={(e) => setPhoneDraft(e.target.value)}
												className="min-w-[7rem] flex-1 h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
											/>
											<button
												type="submit"
												className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 transition-opacity cursor-pointer"
												disabled={loading}
											>
												ОК
											</button>
											<button
												type="button"
												className="h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
												onClick={() => setEditingPhoneForId(null)}
											>
												Отмена
											</button>
										</form>
									) : editingPinForId === member.id ? (
										<form
											onSubmit={(e) =>
												handleUpdateCredential(e, member.id, "pin")
											}
											className="flex gap-2"
										>
											<input
												type="password"
												maxLength={4}
												placeholder="PIN"
												value={newPin}
												onChange={(e) => setNewPin(e.target.value)}
												className="w-20 text-center h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
											/>
											<button
												type="submit"
												className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 transition-opacity cursor-pointer"
												disabled={loading}
											>
												ОК
											</button>
											<button
												type="button"
												className="h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
												onClick={() => setEditingPinForId(null)}
											>
												Отмена
											</button>
										</form>
									) : editingPasswordForId === member.id ? (
										<form
											onSubmit={(e) =>
												handleUpdateCredential(e, member.id, "password")
											}
											className="flex gap-2"
										>
											<input
												type="password"
												placeholder="Пароль"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												className="w-full h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
											/>
											<button
												type="submit"
												className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 transition-opacity cursor-pointer"
												disabled={loading}
											>
												ОК
											</button>
											<button
												type="button"
												className="h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
												onClick={() => setEditingPasswordForId(null)}
											>
												Отмена
											</button>
										</form>
									) : (
										<div className="flex items-center gap-2">
											<button
												type="button"
												className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-[var(--on-teal)] text-[var(--teal)] text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
												onClick={() => setSelectedStaffForCard(member)}
												title="Открыть расширенную карточку сотрудника (СНИЛС, ИНН, медкнижка, ставки ЗП, безопасность)"
											>
												<UserPlus size={14} /> Карточка
											</button>
											<button
												type="button"
												className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
												onClick={() => {
													setEditingPhoneForId(member.id);
													setEditingPinForId(null);
													setEditingPasswordForId(null);
													setPhoneDraft(
														typeof member.phone === "string"
															? member.phone
															: "",
													);
													setCredentialMenuOpenId(null);
												}}
												title="Указать или исправить телефон сотрудника"
											>
												<Phone size={14} /> Телефон
											</button>
											<div className="relative">
												<button
													type="button"
													className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
													onClick={() =>
														setCredentialMenuOpenId(
															credentialMenuOpenId === member.id ? null : member.id,
														)
													}
													title="Доступы (PIN, Пароль)"
													aria-label="Меню доступов"
													aria-expanded={credentialMenuOpenId === member.id}
												>
													<MoreVertical size={14} />
												</button>
												{credentialMenuOpenId === member.id && (
													<div className="absolute right-0 bottom-full mb-1 w-36 py-1 bg-[var(--paper-card)] rounded-xl shadow-lg border border-[var(--line)] z-10 flex flex-col text-xs">
														<button
															type="button"
															className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer transition-colors"
															onClick={() => {
																setEditingPinForId(member.id);
																setEditingPasswordForId(null);
																setEditingPhoneForId(null);
																setNewPin("");
																setCredentialMenuOpenId(null);
															}}
														>
															<KeyRound size={13} className="text-[var(--muted)]" />
															<span>PIN-код</span>
														</button>
														<button
															type="button"
															className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer transition-colors"
															onClick={() => {
																setEditingPasswordForId(member.id);
																setEditingPinForId(null);
																setEditingPhoneForId(null);
																setNewPassword("");
																setCredentialMenuOpenId(null);
															}}
														>
															<ShieldCheck size={13} className="text-[var(--muted)]" />
															<span>Пароль</span>
														</button>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</article>

				{/* Форма добавления сотрудника */}
				<article className="settings-card">
					<div className="settings-card-header">
						<h4>
							<UserPlus size={18} /> Добавить сотрудника
						</h4>
					</div>
					<form onSubmit={handleCreateStaff} className="settings-card-body">
						<label>
							ФИО
							<input
								type="text"
								placeholder="Иванов Иван Иванович"
								value={newStaffName}
								onChange={(e) => setNewStaffName(e.target.value)}
								required
							/>
						</label>

						<label>
							Должность
							{/*
                Список выведен из общего списка ролей, а не набран здесь. Значения
                в этой форме были верные — но ровно такой же рукописный список в
                соседней форме приглашения отправлял роль, которой нет в схеме, и
                это стоило прав доступа. Второй рукописный список тех же ролей —
                вопрос времени, а не вопрос внимательности.
              */}
							<select
								value={newStaffRole}
								onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
							>
								{CREATABLE_STAFF_ROLES.map((role) => (
									<option key={role} value={role}>
										{staffRoleTitle(role)}
									</option>
								))}
							</select>
						</label>

						<label>
							Телефон
							<input
								type="tel"
								inputMode="tel"
								autoComplete="tel"
								maxLength={80}
								placeholder="+7..."
								value={newStaffPhone}
								onChange={(e) => setNewStaffPhone(e.target.value)}
							/>
						</label>

						<label>
							Email (логин для личного доступа)
							<input
								type="email"
								placeholder="doctor@clinic.com"
								value={newStaffEmail}
								onChange={(e) => setNewStaffEmail(e.target.value)}
							/>
						</label>

						{newStaffRole === "doctor" ? (
							<DoctorSnilsValidationWidget
								initialSnils={newStaffSnils}
								onValidSnils={(formatted) => setNewStaffSnils(formatted)}
							/>
						) : null}

						<div className="form-actions">
							<button
								className="primary-button"
								type="submit"
								disabled={loading}
							>
								<ShieldCheck size={16} /> Создать сотрудника
							</button>
						</div>
					</form>
				</article>
				<StaffCommissionsPanel />
				<StaffAuthorityPanel />
			</div>

			{selectedStaffForCard && (
				<StaffProfileCard
					staffMember={selectedStaffForCard}
					callerRole={auth?.user?.role || "owner"}
					isOpen={Boolean(selectedStaffForCard)}
					onClose={() => setSelectedStaffForCard(null)}
					onSaved={async () => {
						await reloadStaffList(loadDashboard);
						setSelectedStaffForCard(null);
					}}
				/>
			)}

			{isTimesheetT13Open && (
				<TimesheetT13Modal
					isOpen={isTimesheetT13Open}
					onClose={() => setIsTimesheetT13Open(false)}
					clinicName={dashboard?.clinicSettings?.name || dashboard?.clinicName}
					employees={staffToEmployeeInfo(staff)}
				/>
			)}
		</section>
	);
}
