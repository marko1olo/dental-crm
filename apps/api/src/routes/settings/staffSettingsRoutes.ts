import {
	createStaffMemberSchema,
	evaluatePasswordEntropy,
	staffAuthorityStateSchema,
	staffMemberSchema,
	updateStaffAuthorityGrantsSchema,
	updateStaffWorkingHoursSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	createStaffMemberInDb,
	deactivateStaffMemberInDb,
	getClinicSettingsFromDb,
	listDoctorCommissionRatesInDb,
	setDoctorCommissionRateInDb,
	updateStaffCredentialsInDb,
	updateStaffMemberProfileInDb,
	updateStaffWorkingHoursInDb,
} from "../../db/settingsQuery.js";
import { grantStaffAuthorityInDb } from "../../db/staffAuthorityQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { requirePermission } from "../../security/permissions.js";
import { hashCredential } from "../../utils/cryptoHelper.js";
import {
	parseSettingsPayload,
	requireSettingsAccess,
	settingsDomainMessage,
	staffAuthorityMutationRejection,
	staffMutationRejection,
	staffWorkingHoursRejection,
} from "./helpers.js";
import {
	doctorCommissionNotFoundMessage,
	doctorCommissionRejectedMessage,
	doctorCommissionRouteValidationMessage,
	doctorCommissionValidationMessage,
	staffAuthorityEmptyUpdateMessage,
	staffAuthorityRouteValidationMessage,
	staffAuthoritySelfMessage,
	staffAuthorityUnverifiedMessage,
	staffAuthorityValidationMessage,
	staffCreateValidationMessage,
	staffCredentialsEmptyUpdateMessage,
	staffCredentialsValidationMessage,
	staffDeactivateNotFoundMessage,
	staffDeactivateRejectedMessage,
	staffDeactivateRouteValidationMessage,
	staffProfileEmptyUpdateMessage,
	staffProfileNotFoundMessage,
	staffProfileRejectedMessage,
	staffProfileRouteValidationMessage,
	staffProfileValidationMessage,
	staffWorkingHoursRouteValidationMessage,
	staffWorkingHoursValidationMessage,
	updateDoctorCommissionSchema,
	updateStaffCredentialsSchema,
	updateStaffMemberProfileSchema,
} from "./types.js";

export function registerStaffSettingsRoutes(app: FastifyInstance): void {
	app.post("/api/settings/staff", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(createStaffMemberSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffCreateValidationMessage,
			};
		}
		const created = await createStaffMemberInDb(orgId, input);
		reply.code(201);
		return staffMemberSchema.parse(created);
	});

	app.post(
		"/api/settings/staff/:staffId/credentials",
		async (request, reply) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const params = request.params as { staffId?: string };
			if (!params.staffId) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: "ID сотрудника обязателен.",
				};
			}

			const input = parseSettingsPayload(
				updateStaffCredentialsSchema,
				request.body,
			);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: staffCredentialsValidationMessage,
				};
			}
			const { email, password, pinCode } = input;
			if (!email && !password && !pinCode) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: staffCredentialsEmptyUpdateMessage,
				};
			}

			const updates: {
				email?: string;
				passwordHash?: string;
				pinCodeHash?: string;
				passwordEntropyBits?: number;
			} = {};
			if (email) updates.email = email.toLowerCase().trim();
			if (password) {
				const entropy = evaluatePasswordEntropy(password);
				if (!entropy.isAcceptableForStaff) {
					reply.code(400);
					return {
						error: "WeakPasswordError",
						message:
							"Пароль слишком слабый для сотрудника клиники. Требуется энтропия не менее 50 бит (заглавные, строчные, цифры, спецсимволы).",
					};
				}
				updates.passwordHash = await hashCredential(password);
				updates.passwordEntropyBits = entropy.effectiveEntropyBits;
			}
			if (pinCode) updates.pinCodeHash = await hashCredential(pinCode);

			try {
				await updateStaffCredentialsInDb(orgId, params.staffId, updates);
				/*
				 * ИМЕННО ЭТОТ ОТВЕТ ЧИТАЕТСЯ СРАЗУ. SettingsStaffTab.tsx после успеха
				 * перечитывает GET /api/dashboard. Пока здесь стоял
				 * `return reply.code(200).send({ ok: true })`, подтверждение уходило
				 * администратору ДО фиксации транзакции: сводка могла прийти со старыми
				 * доступами, а отказ на самом COMMIT оставил бы «сохранено» на экране при
				 * несменённом пароле сотрудника.
				 */
				reply.code(200);
				return { ok: true };
			} catch (_err: unknown) {
				reply.code(500);
				return {
					error: "InternalError",
					message: "Не удалось обновить доступы.",
				};
			}
		},
	);

	app.put(
		"/api/settings/staff/:staffId/working-hours",
		async (request, reply) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const params = request.params as { staffId?: string };
			if (!params.staffId) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: staffWorkingHoursRouteValidationMessage,
				};
			}
			const input = parseSettingsPayload(
				updateStaffWorkingHoursSchema,
				request.body,
			);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: staffWorkingHoursValidationMessage,
				};
			}
			try {
				await updateStaffWorkingHoursInDb(orgId, params.staffId, input);
				const settings = await getClinicSettingsFromDb(orgId);
				const updated = settings.staff.find((s) => s.id === params.staffId);
				if (!updated) throw new Error("Сотрудник не найден.");
				return staffMemberSchema.parse(updated);
			} catch (error) {
				return staffWorkingHoursRejection(reply, error);
			}
		},
	);

	/**
	 * Правка карточки сотрудника. Интерфейс зовет этот адрес из
	 * updateStaffMember (apps/web/src/useAppLogic.tsx): метод PUT, тело —
	 * частичный набор полей карточки. Маршрута не было вовсе, на сервере жили
	 * только вложенные /credentials и /working-hours, поэтому правка сотрудника
	 * из интерфейса отвечала 404.
	 *
	 * Организация берется из подписанного токена через requireSettingsAccess, а
	 * не из тела запроса, и каждый запрос к базе фильтруется по ней.
	 */
	app.put("/api/settings/staff/:staffId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffProfileRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload(
			updateStaffMemberProfileSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffProfileValidationMessage,
			};
		}
		// Пустое тело и тело из одних неизвестных полей неотличимы после разбора:
		// схема отбрасывает лишние ключи. Молча отвечать 200 на запрос, который
		// ничего не меняет, нельзя — оператор решит, что правка сохранена.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffProfileEmptyUpdateMessage,
			};
		}
		try {
			await updateStaffMemberProfileInDb(orgId, params.staffId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.staff.find((s) => s.id === params.staffId);
			if (!updated) throw new Error("Сотрудник не найден.");
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffMutationRejection(
				reply,
				error,
				staffProfileNotFoundMessage,
				staffProfileRejectedMessage,
				"StaffProfile",
			);
		}
	});

	/**
	 * Отключение сотрудника. Это НЕ физическое удаление: на users.id ссылаются
	 * приемы (doctor_user_id, assistant_user_id) и медицинские записи, поэтому
	 * строка сохраняется, а признак users.is_active становится false. Сотрудник
	 * возвращается в ответе с active: false, история лечения остается с автором.
	 */
	app.delete("/api/settings/staff/:staffId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffDeactivateRouteValidationMessage,
			};
		}
		try {
			await deactivateStaffMemberInDb(orgId, params.staffId);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.staff.find((s) => s.id === params.staffId);
			if (!updated) throw new Error("Сотрудник не найден.");
			return staffMemberSchema.parse(updated);
		} catch (error) {
			return staffMutationRejection(
				reply,
				error,
				staffDeactivateNotFoundMessage,
				staffDeactivateRejectedMessage,
				"StaffDeactivate",
			);
		}
	});

	/**
	 * Действующие ставки врачей. Отдельный адрес, а не поле в карточке
	 * сотрудника: ставка лежит в другой таблице (doctor_commissions), у неё своя
	 * дата начала действия и своя история отключённых строк, и втискивать её в
	 * staffMemberSchema значило бы показывать процент без даты, с которой он
	 * действует.
	 */
	app.get("/api/settings/staff/commissions", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const commissions = await listDoctorCommissionRatesInDb(orgId);
		return { commissions };
	});

	/**
	 * Назначение ставки врачу — процента от кассы, по которому клиника платит за
	 * лечение.
	 *
	 * До этого маршрута ставку не задавал ни один достижимый экран: писали её
	 * только недостижимый мастер первого запуска и routes/diary.ts, который при
	 * первом закрытии приёма молча вставляет 30 %. Экран выплат печатал «не
	 * задана», владелец шёл исправлять и не находил куда — и клиника платила по
	 * проценту, которого никто не согласовывал.
	 */
	app.put("/api/settings/staff/:staffId/commission", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: doctorCommissionRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload(
			updateDoctorCommissionSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: doctorCommissionValidationMessage,
			};
		}
		try {
			const saved = await setDoctorCommissionRateInDb(
				orgId,
				params.staffId,
				input.commissionPct,
			);
			return saved;
		} catch (error) {
			// Отключённое хранение — это не ошибка оператора: процент вводить некуда,
			// потому что ставки живут только в базе. Отвечать 409 «проверьте поля»
			// значило бы послать владельца искать опечатку там, где её нет.
			const message = settingsDomainMessage(error);
			if (message.includes("DENTAL_STATE_PERSISTENCE")) {
				reply.code(503);
				return {
					error: "DoctorCommissionStorageUnavailable",
					reason: "state_persistence_off",
					message,
				};
			}
			// Причина уходит в журнал сервера целиком: наружу идёт текст для
			// оператора, но без записи здесь отказ по ставке был бы неотличим от
			// опечатки в проценте, и разбирать его было бы нечем.
			console.error("[настройки] ставка врача не сохранена:", error);
			return staffMutationRejection(
				reply,
				error,
				doctorCommissionNotFoundMessage,
				doctorCommissionRejectedMessage,
				"DoctorCommission",
			);
		}
	});

	/**
	 * ПЕРСОНАЛЬНЫЕ ПОЛНОМОЧИЯ СОТРУДНИКА: подпись медицинской документации, касса,
	 * перенос данных. Первый и единственный адрес, которым их можно записать.
	 *
	 * ЧТО БЫЛО. Ни одного. Колонки `users.can_sign_medical_records`,
	 * `can_manage_money`, `can_manage_imports` существуют с миграции 0000
	 * (`boolean NOT NULL DEFAULT false`, проверено на живой базе), но
	 * `createStaffMemberSchema` их не объявляет, а `can_manage_imports` не был
	 * объявлен даже в модели drizzle. Вкладка «Настройки → Персонал» посылает все
	 * три флага в теле POST (`SettingsStaffTab.tsx:127-129`), zod отбрасывает
	 * незаявленные ключи молча, и форма закрывается как после успешного
	 * сохранения: выбор «кто допущен к кассе» не имел последствий ни разу.
	 *
	 * ПОЧЕМУ НЕ ДОБАВЛЕНЫ В `createStaffMemberSchema`, ГДЕ ИХ ЖДЁТ ФОРМА. Форма
	 * посылает `canManageImports: true` ЖЁСТКО, каждому создаваемому сотруднику
	 * (там литерал, а не выбор оператора). Принять это поле на создании значило бы
	 * выдавать право на перенос картотеки каждому новому ассистенту — молча, самим
	 * фактом приёма на работу. Форму правит другая сессия; сервер не обязан
	 * принимать поле, которое интерфейс заполняет неверно.
	 *
	 * СЕМАНТИКА — НАДБАВКА К РОЛИ (итог = роль ИЛИ надбавка), разобрана в
	 * `db/staffAuthorityQuery.ts`. Коротко: в живой базе `false` лежит во всех
	 * строках, включая владельца, поэтому `false` неотличим от «не настраивали» и
	 * читать его как запрет нельзя. Снять надбавку можно; опустить ниже роли —
	 * нельзя, и такой запрос отклоняется, а не сохраняется втихую.
	 *
	 * ОХРАНА ТРОЙНАЯ, И КАЖДЫЙ БАРЬЕР ЗАКРЫВАЕТ СВОЁ.
	 *  1. `requireSettingsAccess` — секрет периметра и клиника из подписанного
	 *     токена, как на всех соседних маршрутах настроек.
	 *  2. Проверенная клиника: непроверенная организация приходит из
	 *     dev-заголовка, то есть её называет сам отправитель запроса. На
	 *     работающем сервере её уже отбрасывает `security/identity.ts`, но
	 *     внутрипроцессный вызов (`app.inject`) под это правило не попадает —
	 *     выдача полномочий не должна быть достижима и оттуда.
	 *  3. `requirePermission(settings.write)` — ИМЕННО ЭТО ПРАВО, и это выбор:
	 *     • `settings.write` в матрице `ROLE_PERMISSIONS` есть только у владельца
	 *       клиники (и легаси-роли с полным доступом). Тот, кто раздаёт
	 *       полномочия, обязан быть тем, кто отвечает за клинику целиком.
	 *     • `finance.write` не годится: оно есть у администратора ресепшена, и
	 *       тогда доступ к кассе мог бы выдать другому человеку тот, кому саму
	 *       кассу доверили, но раздачу доступа — нет.
	 *     • `clinical.write` не годится по той же причине: его имеет каждый врач,
	 *       и право подписи ЭМК уходило бы ассистенту по решению врача.
	 *     • Проверка строгая (`requirePermission`, а не
	 *       `enforcePermissionWhenStaffKnown`): мягкая пропускает запрос без
	 *       токена сотрудника, то есть полномочие выдавалось бы БЕЗ ИМЕНИ. Здесь
	 *       это недопустимо, а сломать переходные сценарии нечем — маршрут новый.
	 *
	 * СЕБЕ НЕ ВЫДАЮТ. Сегодня это тождественно пустой правке: у роли с
	 * `settings.write` все три полномочия и так есть по роли, надбавка себе не
	 * добавляет ничего. Проверка стоит ради будущего: как только `settings.write`
	 * получит роль без `clinical.write`, без неё появился бы путь выдать себе
	 * право подписи медицинской документации.
	 */
	app.put("/api/settings/staff/:staffId/authority", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		if (!getRequestIdentity(request).verified) {
			reply.code(401);
			return {
				error: "VerifiedOrganizationRequired",
				message: staffAuthorityUnverifiedMessage,
			};
		}
		const granter = await requirePermission(request, reply, "settings.write");
		if (!granter) return;
		const params = request.params as { staffId?: string };
		if (!params.staffId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: staffAuthorityRouteValidationMessage,
			};
		}
		if (params.staffId === granter.userId) {
			reply.code(403);
			return {
				error: "StaffAuthoritySelfGrantRejected",
				reason: "self_grant",
				message: staffAuthoritySelfMessage,
			};
		}
		const input = parseSettingsPayload(
			updateStaffAuthorityGrantsSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffAuthorityValidationMessage,
			};
		}
		// Тело из одних неизвестных полей после разбора неотличимо от пустого: схема
		// отбрасывает лишние ключи. Ответить 200 на запрос, который ничего не менял,
		// значило бы повторить исходный дефект — теперь с подтверждением на экране.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: staffAuthorityEmptyUpdateMessage,
			};
		}
		try {
			/*
			 * Клиника берётся из личности выдающего, а не из возврата
			 * `requireSettingsAccess`: там есть запасные ветки (единственная
			 * организация в базе, отключённое хранение), и ни одна из них не должна
			 * определять клинику при выдаче полномочий. Разойтись эти два значения не
			 * могут — `requirePermission` требует организацию в токене, то есть ровно
			 * ту, которую вернул бы и первый барьер; личность в запросе разбирается
			 * один раз и кэшируется (`security/identity.ts`).
			 */
			const state = await grantStaffAuthorityInDb(
				granter.organizationId,
				params.staffId,
				input,
			);
			return staffAuthorityStateSchema.parse(state);
		} catch (error) {
			return staffAuthorityMutationRejection(reply, error);
		}
	});
}
