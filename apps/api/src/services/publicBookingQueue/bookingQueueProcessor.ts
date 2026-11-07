import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, gt, ilike, lt, notInArray, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { appointments, chairs, patients, users } from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import { bookingVerificationEngine, type BookingVerificationEngine } from "./bookingVerificationEngine.js";
import { slotHoldLockEngine, type SlotHoldLockEngine } from "./slotHoldLockEngine.js";
import {
	DEFAULT_BUMP_DISCOUNT_PERCENT,
	DEFAULT_CLINIC_CLOSE_HOUR,
	DEFAULT_CLINIC_OPEN_HOUR,
	DEFAULT_MORNING_CONFIRM_TIME,
	type BookingReceipt,
	type BookingRequestInput,
	type BookingStatus,
	type GracefulBumpSlotOption,
	type HoldingQueueItem,
	formatReferenceNumber,
	makeReceipt,
	normalizePhoneDigits,
} from "./types.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureValidUuid(raw: string): string {
	if (UUID_REGEX.test(raw)) return raw;
	const hash = createHash("sha256").update(raw).digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class BookingQueueProcessor {
	private clinicOnlineOverrides = new Map<string, boolean>();

	constructor(
		private lockEngine: SlotHoldLockEngine = slotHoldLockEngine,
		private verificationEngine: BookingVerificationEngine = bookingVerificationEngine,
	) {}

	public setClinicOnlineOverride(organizationId: string, isOnline: boolean | null): void {
		if (isOnline === null) {
			this.clinicOnlineOverrides.delete(organizationId);
		} else {
			this.clinicOnlineOverrides.set(organizationId, isOnline);
		}
	}

	public async isClinicOnline(organizationId: string, now: Date = new Date()): Promise<boolean> {
		if (this.clinicOnlineOverrides.has(organizationId)) {
			return Boolean(this.clinicOnlineOverrides.get(organizationId));
		}
		const currentHour = now.getUTCHours() + 3;
		const normalizedHour = ((currentHour + 24) % 24) + now.getUTCMinutes() / 60;
		return normalizedHour >= DEFAULT_CLINIC_OPEN_HOUR && normalizedHour < DEFAULT_CLINIC_CLOSE_HOUR;
	}

	public async submitBooking(
		input: BookingRequestInput,
		options: { now?: Date; useDb?: boolean } = {},
	): Promise<BookingReceipt> {
		if (input.verificationCode) {
			const check = this.verificationEngine.verifyPhoneOtp(input.patientPhone, input.verificationCode);
			if (!check.valid) {
				throw new Error(check.error || "Ошибка верификации телефона");
			}
		}

		const now = options.now ?? new Date();
		const isOnline = await this.isClinicOnline(input.organizationId, now);
		const startDate = new Date(input.startsAt);
		const endDate = new Date(input.endsAt);

		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			throw new Error("Некорректный формат времени приёма");
		}
		if (endDate.getTime() <= startDate.getTime()) {
			throw new Error("Время окончания должно быть позже начала");
		}

		if (isOnline) {
			return this.executeDaytimeDirectBooking(input, startDate, endDate, options);
		}
		return this.executeNighttimeSoftHold(input, startDate, endDate, now);
	}

	public async executeDaytimeDirectBooking(
		input: BookingRequestInput,
		startDate: Date,
		endDate: Date,
		_options: { useDb?: boolean } = {},
	): Promise<BookingReceipt> {
		const referenceNumber = formatReferenceNumber();
		const bookingId = randomUUID();
		const orgId = ensureValidUuid(input.organizationId);
		const docId = ensureValidUuid(input.doctorId);

		try {
			const txResult = await withTenantCtx(orgId, async (tx) => {
				const [doctor] = await tx
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.id, docId), eq(users.organizationId, orgId), eq(users.isActive, true)))
					.limit(1)
					.for("update");

				if (!doctor) return { error: "Врач не найден или не принимает в этой клинике" };

				let resolvedChairId = input.chairId ? ensureValidUuid(input.chairId) : null;
				if (!resolvedChairId) {
					const availableChairs = await tx
						.select({ id: chairs.id })
						.from(chairs)
						.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
						.orderBy(asc(chairs.id))
						.for("update");

					for (const chair of availableChairs) {
						const [occupied] = await tx
							.select({ id: appointments.id })
							.from(appointments)
							.where(
								and(
									eq(appointments.organizationId, orgId),
									eq(appointments.chairId, chair.id),
									lt(appointments.startsAt, endDate),
									gt(appointments.endsAt, startDate),
									notInArray(appointments.status, ["cancelled", "no_show"]),
								),
							)
							.limit(1);

						if (!occupied) {
							resolvedChairId = chair.id;
							break;
						}
					}
				}

				const phoneDigits = normalizePhoneDigits(input.patientPhone);
				const [existingPatient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), or(eq(patients.phone, input.patientPhone), eq(patients.phone, phoneDigits))))
					.limit(1)
					.for("update");

				let patientId = existingPatient?.id;
				if (!patientId) {
					const [newPatient] = await tx
						.insert(patients)
						.values({
							organizationId: orgId,
							fullName: input.patientName,
							phone: input.patientPhone,
							status: "active",
						})
						.returning({ id: patients.id });
					patientId = newPatient?.id;
				}

				const conditions = [
					eq(appointments.organizationId, orgId),
					lt(appointments.startsAt, endDate),
					gt(appointments.endsAt, startDate),
					notInArray(appointments.status, ["cancelled", "no_show"]),
				];
				const resourceConditions = [eq(appointments.doctorUserId, docId)];
				if (patientId) resourceConditions.push(eq(appointments.patientId, patientId));
				if (resolvedChairId) resourceConditions.push(eq(appointments.chairId, resolvedChairId));

				const [overlap] = await tx
					.select({
						id: appointments.id,
						comment: appointments.comment,
						status: appointments.status,
					})
					.from(appointments)
					.where(and(...conditions, or(...resourceConditions)))
					.limit(1);

				if (overlap) {
					if (overlap.comment?.includes("[night_hold:pending_confirmation]")) {
						// Очный/дневной прием клиники вытесняет ночной soft hold (Мандаты 8b, 8e, 8n)
						const ref = extractReferenceNumber(overlap.comment) || `BKG-${overlap.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
						const recommendedSlots = this.generateDefaultAdjacentSlots(startDate, endDate);
						const discountPercent = DEFAULT_BUMP_DISCOUNT_PERCENT;
						const discountNote = `Приоритетная скидка ${discountPercent}% за перенос слота`;
						const oneClickConfirmUrl = `/booking/confirm-bump?id=${overlap.id}&ref=${ref}`;
						const firstSlotLabel = recommendedSlots[0]?.label ?? "соседнее время";
						const messageText = `Здравствуйте! Слот на ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, "0")} занят. Мы подобрали приоритетный слот ${firstSlotLabel} со скидкой ${discountPercent}%. Подтвердите в 1 клик: ${oneClickConfirmUrl}`;
						const bumpOffer = {
							bookingId: overlap.id,
							originalStartsAt: startDate.toISOString(),
							originalEndsAt: endDate.toISOString(),
							recommendedSlots,
							discountPercent,
							discountNote,
							notificationPayload: {
								recipientPhone: "",
								channel: "sms" as const,
								messageText,
								oneClickConfirmUrl,
							},
						};
						const bumpedComment = `${overlap.comment.replace("[night_hold:pending_confirmation]", "[BUMPED_OFFER_PENDING]")} [bump_offer:${encodeURIComponent(JSON.stringify(bumpOffer))}]`;

						await tx
							.update(appointments)
							.set({
								status: "cancelled",
								comment: bumpedComment,
							})
							.where(eq(appointments.id, overlap.id));
					} else {
						return { conflict: true as const };
					}
				}

				const [created] = await tx
					.insert(appointments)
					.values({
						organizationId: orgId,
						patientId: patientId ?? null,
						doctorUserId: docId,
						chairId: resolvedChairId,
						status: "planned",
						startsAt: startDate,
						endsAt: endDate,
						reason: input.serviceName ?? "Онлайн-запись через виджет",
						comment: input.comment ? `[Онлайн-запись] ${input.comment}` : "Онлайн-запись через виджет на сайте",
					})
					.returning();

				return { conflict: false as const, appointment: created };
			});

			if ("error" in txResult) throw new Error(txResult.error);
			if (txResult.conflict) {
				return makeReceipt(input, bookingId, referenceNumber, "REJECTED_CONFLICT", false, "Выбранное время уже занято. Обновите список слотов.");
			}

			if (txResult.appointment) {
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_CREATED",
					payload: { appointmentId: txResult.appointment.id, startsAt: txResult.appointment.startsAt },
				});
				return makeReceipt(input, bookingId, referenceNumber, "CONFIRMED", false, "Запись успешно подтверждена!", {
					appointmentId: txResult.appointment.id,
				});
			}
			throw new Error("Не удалось создать запись приёма");
		} catch (err) {
			console.error("[publicBookingQueue] [POR-03] DB transaction failure during direct booking:", (err as Error).message);
			return makeReceipt(
				input,
				bookingId,
				referenceNumber,
				"REJECTED_ERROR",
				false,
				`Ошибка базы данных клиники при фиксации записи: ${(err as Error).message}`,
			);
		}
	}

	public async executeNighttimeSoftHold(
		input: BookingRequestInput,
		startDate: Date,
		endDate: Date,
		now: Date,
	): Promise<BookingReceipt> {
		const bookingId = randomUUID();
		const referenceNumber = formatReferenceNumber();
		const morningConfirmTime = DEFAULT_MORNING_CONFIRM_TIME;
		const orgId = ensureValidUuid(input.organizationId);
		const docId = ensureValidUuid(input.doctorId);

		// Fast slot lock mutex (microsecond race guard)
		const lockAcquired = this.lockEngine.tryAcquireSoftSlotLock(
			orgId,
			docId,
			startDate,
			endDate,
			bookingId,
		);

		if (!lockAcquired) {
			return makeReceipt(
				input,
				bookingId,
				referenceNumber,
				"REJECTED_CONFLICT",
				true,
				"Этот временной интервал уже предварительно удерживается другой ночной заявкой.",
				{ createdAt: now.toISOString() },
			);
		}

		const softHoldExpiresAt = new Date(now.getTime() + 14 * 60 * 60_000).toISOString();
		const timeHours = String(startDate.getHours()).padStart(2, "0");
		const timeMinutes = String(startDate.getMinutes()).padStart(2, "0");
		const formattedTime = `${timeHours}:${timeMinutes}`;
		const receiptMessage = `Заявка принята! За вами зафиксировано время ${formattedTime}. Администратор подтвердит запись в ${morningConfirmTime}.`;

		try {
			const txResult = await withTenantCtx(orgId, async (tx) => {
				const [doctor] = await tx
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.id, docId), eq(users.organizationId, orgId), eq(users.isActive, true)))
					.limit(1)
					.for("update");

				if (!doctor) return { error: "Врач не найден или не принимает в этой клинике" };

				let resolvedChairId = input.chairId ? ensureValidUuid(input.chairId) : null;
				if (!resolvedChairId) {
					const availableChairs = await tx
						.select({ id: chairs.id })
						.from(chairs)
						.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
						.orderBy(asc(chairs.id))
						.for("update");

					for (const chair of availableChairs) {
						const [occupied] = await tx
							.select({ id: appointments.id })
							.from(appointments)
							.where(
								and(
									eq(appointments.organizationId, orgId),
									eq(appointments.chairId, chair.id),
									lt(appointments.startsAt, endDate),
									gt(appointments.endsAt, startDate),
									notInArray(appointments.status, ["cancelled", "no_show"]),
								),
							)
							.limit(1);

						if (!occupied) {
							resolvedChairId = chair.id;
							break;
						}
					}
				}

				const phoneDigits = normalizePhoneDigits(input.patientPhone);
				const [existingPatient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), or(eq(patients.phone, input.patientPhone), eq(patients.phone, phoneDigits))))
					.limit(1)
					.for("update");

				let patientId = existingPatient?.id;
				if (!patientId) {
					const [newPatient] = await tx
						.insert(patients)
						.values({
							organizationId: orgId,
							fullName: input.patientName,
							phone: input.patientPhone,
							status: "active",
						})
						.returning({ id: patients.id });
					patientId = newPatient?.id;
				}

				const conditions = [
					eq(appointments.organizationId, orgId),
					lt(appointments.startsAt, endDate),
					gt(appointments.endsAt, startDate),
					notInArray(appointments.status, ["cancelled", "no_show"]),
				];
				const resourceConditions = [eq(appointments.doctorUserId, docId)];
				if (patientId) resourceConditions.push(eq(appointments.patientId, patientId));
				if (resolvedChairId) resourceConditions.push(eq(appointments.chairId, resolvedChairId));

				const [overlap] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(and(...conditions, or(...resourceConditions)))
					.limit(1);

				if (overlap) return { conflict: true as const };

				const nightComment = `[night_hold] [night_hold:pending_confirmation] [ref:${referenceNumber}] [expires:${softHoldExpiresAt}] ${input.comment ? `[Онлайн-запись] ${input.comment}` : "Онлайн-запись через виджет (ночной буфер)"}`.trim();

				const [created] = await tx
					.insert(appointments)
					.values({
						organizationId: orgId,
						patientId: patientId ?? null,
						doctorUserId: docId,
						chairId: resolvedChairId,
						status: "planned",
						startsAt: startDate,
						endsAt: endDate,
						reason: input.serviceName ? `[night_hold] ${input.serviceName}` : "[night_hold] Ночное удержание слота",
						comment: nightComment,
					})
					.returning();

				return { conflict: false as const, appointment: created };
			});

			if ("error" in txResult) {
				this.lockEngine.releaseSoftSlotLock(orgId, docId, startDate);
				throw new Error(txResult.error);
			}

			if (txResult.conflict) {
				this.lockEngine.releaseSoftSlotLock(orgId, docId, startDate);
				return makeReceipt(
					input,
					bookingId,
					referenceNumber,
					"REJECTED_CONFLICT",
					true,
					"Этот временной интервал уже предварительно удерживается другой ночной заявкой.",
					{ createdAt: now.toISOString() },
				);
			}

			if (txResult.appointment) {
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_CREATED",
					payload: {
						appointmentId: txResult.appointment.id,
						startsAt: txResult.appointment.startsAt,
						isNightHold: true,
						referenceNumber,
					},
				});

				return makeReceipt(
					input,
					txResult.appointment.id,
					referenceNumber,
					"PENDING_RESERVATION",
					true,
					receiptMessage,
					{
						morningConfirmTime,
						softHoldExpiresAt,
						createdAt: now.toISOString(),
						appointmentId: txResult.appointment.id,
					},
				);
			}
			throw new Error("Не удалось зафиксировать ночное удержание");
		} catch (err) {
			this.lockEngine.releaseSoftSlotLock(orgId, docId, startDate);
			console.error("[publicBookingQueue] [POR-03] DB transaction failure during nighttime soft hold:", (err as Error).message);
			return makeReceipt(
				input,
				bookingId,
				referenceNumber,
				"REJECTED_ERROR",
				true,
				`Ошибка фиксации ночной заявки в базе: ${(err as Error).message}`,
			);
		}
	}

	public async processHoldingQueue(
		organizationId: string,
		options: {
			availableAdjacentSlotsFinder?: (doctorId: string, startsAt: Date) => Promise<GracefulBumpSlotOption[]> | GracefulBumpSlotOption[];
		} = {},
	): Promise<{ processed: number; confirmed: number; bumped: number; items: HoldingQueueItem[] }> {
		const orgId = ensureValidUuid(organizationId);

		const pendingRows = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						ilike(appointments.comment, "%[night_hold%"),
						or(
							and(
								eq(appointments.status, "planned"),
								ilike(appointments.comment, "%[night_hold:pending_confirmation]%"),
							),
							ilike(appointments.comment, "%[BUMPED_OFFER_PENDING]%"),
						),
					),
				);
		});

		let confirmedCount = 0;
		let bumpedCount = 0;
		const items: HoldingQueueItem[] = [];

		for (const row of pendingRows) {
			const ref = extractReferenceNumber(row.comment) || `BKG-${row.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
			const expiresAt = extractExpiresAt(row.comment) || new Date(Date.now() + 14 * 60 * 60_000).toISOString();

			this.lockEngine.releaseSoftSlotLock(orgId, row.doctorUserId ?? "", row.startsAt);

			if (row.comment?.includes("[BUMPED_OFFER_PENDING]")) {
				bumpedCount++;
				const bumpOffer = extractBumpOffer(row.comment);
				items.push({
					id: row.id,
					referenceNumber: ref,
					organizationId: orgId,
					doctorId: row.doctorUserId ?? "",
					chairId: row.chairId ?? null,
					patientName: "Пациент",
					patientPhone: "",
					startsAt: row.startsAt.toISOString(),
					endsAt: row.endsAt.toISOString(),
					status: "BUMPED_OFFER_PENDING",
					isNightMode: true,
					createdAt: row.startsAt.toISOString(),
					softHoldExpiresAt: expiresAt,
					appointmentId: row.id,
					bumpOffer,
					appliedDiscountPercent: DEFAULT_BUMP_DISCOUNT_PERCENT,
					comment: row.comment,
				});
				continue;
			}

			// Check for conflicts with existing daytime direct bookings
			const hasConflict = await withTenantCtx(orgId, async (tx) => {
				const [overlap] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, orgId),
							eq(appointments.doctorUserId, row.doctorUserId),
							notInArray(appointments.id, [row.id]),
							lt(appointments.startsAt, row.endsAt),
							gt(appointments.endsAt, row.startsAt),
							notInArray(appointments.status, ["cancelled", "no_show"]),
						),
					)
					.limit(1);
				return Boolean(overlap);
			});

			if (!hasConflict) {
				const updatedComment = (row.comment ?? "").replace("[night_hold:pending_confirmation]", "[Онлайн-запись подтверждена]");
				await withTenantCtx(orgId, async (tx) => {
					await tx
						.update(appointments)
						.set({ comment: updatedComment })
						.where(and(eq(appointments.organizationId, orgId), eq(appointments.id, row.id)));
				});

				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: { appointmentId: row.id, status: "confirmed" },
				});

				confirmedCount++;
				items.push({
					id: row.id,
					referenceNumber: ref,
					organizationId: orgId,
					doctorId: row.doctorUserId ?? "",
					chairId: row.chairId ?? null,
					patientName: "Пациент",
					patientPhone: "",
					startsAt: row.startsAt.toISOString(),
					endsAt: row.endsAt.toISOString(),
					status: "CONFIRMED",
					isNightMode: true,
					createdAt: row.startsAt.toISOString(),
					softHoldExpiresAt: expiresAt,
					appointmentId: row.id,
					comment: updatedComment,
				});
			} else {
				const recommendedSlots = options.availableAdjacentSlotsFinder
					? await options.availableAdjacentSlotsFinder(row.doctorUserId ?? "", row.startsAt)
					: this.generateDefaultAdjacentSlots(row.startsAt, row.endsAt);

				const discountPercent = DEFAULT_BUMP_DISCOUNT_PERCENT;
				const discountNote = `Приоритетная скидка ${discountPercent}% за перенос слота`;
				const oneClickConfirmUrl = `/booking/confirm-bump?id=${row.id}&ref=${ref}`;
				const firstSlotLabel = recommendedSlots[0]?.label ?? "соседнее время";
				const messageText = `Здравствуйте! Слот на ${row.startsAt.getHours()}:${String(row.startsAt.getMinutes()).padStart(2, "0")} занят. Мы подобрали приоритетный слот ${firstSlotLabel} со скидкой ${discountPercent}%. Подтвердите в 1 клик: ${oneClickConfirmUrl}`;

				const bumpOffer = {
					bookingId: row.id,
					originalStartsAt: row.startsAt.toISOString(),
					originalEndsAt: row.endsAt.toISOString(),
					recommendedSlots,
					discountPercent,
					discountNote,
					notificationPayload: {
						recipientPhone: "",
						channel: "sms" as const,
						messageText,
						oneClickConfirmUrl,
					},
				};

				const bumpedComment = `${(row.comment ?? "").replace("[night_hold:pending_confirmation]", "[BUMPED_OFFER_PENDING]")} [bump_offer:${encodeURIComponent(JSON.stringify(bumpOffer))}]`;

				await withTenantCtx(orgId, async (tx) => {
					await tx
						.update(appointments)
						.set({ status: "cancelled", comment: bumpedComment })
						.where(and(eq(appointments.organizationId, orgId), eq(appointments.id, row.id)));
				});

				bumpedCount++;
				items.push({
					id: row.id,
					referenceNumber: ref,
					organizationId: orgId,
					doctorId: row.doctorUserId ?? "",
					chairId: row.chairId ?? null,
					patientName: "Пациент",
					patientPhone: "",
					startsAt: row.startsAt.toISOString(),
					endsAt: row.endsAt.toISOString(),
					status: "BUMPED_OFFER_PENDING",
					isNightMode: true,
					createdAt: row.startsAt.toISOString(),
					softHoldExpiresAt: expiresAt,
					appointmentId: row.id,
					bumpOffer,
					appliedDiscountPercent: discountPercent,
					comment: bumpedComment,
				});
			}
		}

		return {
			processed: pendingRows.length,
			confirmed: confirmedCount,
			bumped: bumpedCount,
			items,
		};
	}

	public generateDefaultAdjacentSlots(startDate: Date, endDate: Date): GracefulBumpSlotOption[] {
		const durationMs = endDate.getTime() - startDate.getTime();
		const slotPlus30 = new Date(startDate.getTime() + 30 * 60_000);
		const slotMinus30 = new Date(startDate.getTime() - 30 * 60_000);
		const slotPlus60 = new Date(startDate.getTime() + 60 * 60_000);

		return [
			{
				startsAt: slotPlus30.toISOString(),
				endsAt: new Date(slotPlus30.getTime() + durationMs).toISOString(),
				label: `${slotPlus30.getHours()}:${String(slotPlus30.getMinutes()).padStart(2, "0")} (+30 мин)`,
			},
			{
				startsAt: slotMinus30.toISOString(),
				endsAt: new Date(slotMinus30.getTime() + durationMs).toISOString(),
				label: `${slotMinus30.getHours()}:${String(slotMinus30.getMinutes()).padStart(2, "0")} (-30 мин)`,
			},
			{
				startsAt: slotPlus60.toISOString(),
				endsAt: new Date(slotPlus60.getTime() + durationMs).toISOString(),
				label: `${slotPlus60.getHours()}:${String(slotPlus60.getMinutes()).padStart(2, "0")} (+1 час)`,
			},
		];
	}

	public async acceptBumpedSlot(
		organizationId: string,
		bookingId: string,
		chosenSlot: { startsAt: string; endsAt: string },
	): Promise<BookingReceipt> {
		const orgId = ensureValidUuid(organizationId);
		const apptId = ensureValidUuid(bookingId);

		const [item] = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(appointments)
				.where(and(eq(appointments.organizationId, orgId), eq(appointments.id, apptId)))
				.limit(1);
		});

		if (!item) {
			throw new Error("Заявка в очереди не найдена");
		}
		if (!item.comment?.includes("[BUMPED_OFFER_PENDING]")) {
			throw new Error("Для данной заявки нет активного предложения о переносе");
		}

		const discount = DEFAULT_BUMP_DISCOUNT_PERCENT;
		const ref = extractReferenceNumber(item.comment) || `BKG-${item.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

		const start = new Date(chosenSlot.startsAt);
		const end = new Date(chosenSlot.endsAt);

		await withTenantCtx(orgId, async (tx) => {
			await tx
				.update(appointments)
				.set({
					startsAt: start,
					endsAt: end,
					status: "planned",
					comment: `[Перенос Graceful Bump: скидка ${discount}%] ${item.comment?.replace("[BUMPED_OFFER_PENDING]", "[BUMPED_CONFIRMED]") ?? ""}`,
				})
				.where(and(eq(appointments.organizationId, orgId), eq(appointments.id, apptId)));
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "APPOINTMENT_UPDATED",
			payload: { appointmentId: apptId, startsAt: start.toISOString() },
		});

		return {
			bookingId: apptId,
			referenceNumber: ref,
			organizationId: orgId,
			doctorId: item.doctorUserId ?? "",
			patientName: "Пациент",
			patientPhone: "",
			startsAt: chosenSlot.startsAt,
			endsAt: chosenSlot.endsAt,
			status: "BUMPED_CONFIRMED",
			isNightMode: true,
			discountPercent: discount,
			discountNote: `Приоритетная скидка ${discount}% за перенос подтверждена`,
			message: `Перенос успешно зафиксирован! Ждём вас со скидкой ${discount}%.`,
			createdAt: new Date().toISOString(),
			appointmentId: apptId,
		};
	}

	public async getHoldingQueue(organizationId?: string, status?: BookingStatus): Promise<HoldingQueueItem[]> {
		if (!organizationId) return [];
		const orgId = ensureValidUuid(organizationId);

		const rows = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select({
					appointment: appointments,
					patient: patients,
				})
				.from(appointments)
				.leftJoin(patients, eq(patients.id, appointments.patientId))
				.where(
					and(
						eq(appointments.organizationId, orgId),
						ilike(appointments.comment, "%[night_hold%"),
						or(
							notInArray(appointments.status, ["cancelled", "no_show"]),
							ilike(appointments.comment, "%[BUMPED_OFFER_PENDING]%"),
							ilike(appointments.comment, "%[BUMPED_CONFIRMED]%"),
						),
					),
				);
		});

		const items: HoldingQueueItem[] = rows.map(({ appointment, patient }) => {
			const ref = extractReferenceNumber(appointment.comment) || `BKG-${appointment.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
			const expiresAt = extractExpiresAt(appointment.comment) || new Date(Date.now() + 14 * 60 * 60_000).toISOString();
			let derivedStatus: BookingStatus = "PENDING_RESERVATION";
			if (appointment.comment?.includes("[BUMPED_OFFER_PENDING]")) derivedStatus = "BUMPED_OFFER_PENDING";
			else if (appointment.comment?.includes("[BUMPED_CONFIRMED]")) derivedStatus = "BUMPED_CONFIRMED";
			else if (appointment.comment?.includes("[Онлайн-запись подтверждена]") || appointment.status === "confirmed") derivedStatus = "CONFIRMED";

			return {
				id: appointment.id,
				referenceNumber: ref,
				organizationId: orgId,
				doctorId: appointment.doctorUserId ?? "",
				chairId: appointment.chairId ?? null,
				patientName: patient?.fullName ?? "Пациент",
				patientPhone: patient?.phone ?? "",
				startsAt: appointment.startsAt.toISOString(),
				endsAt: appointment.endsAt.toISOString(),
				status: derivedStatus,
				isNightMode: true,
				createdAt: appointment.startsAt.toISOString(),
				softHoldExpiresAt: expiresAt,
				appointmentId: appointment.id,
				comment: appointment.comment ?? undefined,
			};
		});

		if (status) return items.filter((it) => it.status === status);
		return items;
	}

	public async getHoldingQueueItem(bookingId: string): Promise<HoldingQueueItem | undefined> {
		const apptId = ensureValidUuid(bookingId);
		const row = await withSuperuserBypass(async (tx) => {
			const [found] = await tx
				.select({
					appointment: appointments,
					patient: patients,
				})
				.from(appointments)
				.leftJoin(patients, eq(patients.id, appointments.patientId))
				.where(eq(appointments.id, apptId))
				.limit(1);
			return found;
		});

		if (!row) return undefined;
		const { appointment, patient } = row;
		const ref = extractReferenceNumber(appointment.comment) || `BKG-${appointment.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
		const expiresAt = extractExpiresAt(appointment.comment) || new Date(Date.now() + 14 * 60 * 60_000).toISOString();

		let derivedStatus: BookingStatus = "PENDING_RESERVATION";
		if (appointment.comment?.includes("[BUMPED_OFFER_PENDING]")) derivedStatus = "BUMPED_OFFER_PENDING";
		else if (appointment.comment?.includes("[BUMPED_CONFIRMED]")) derivedStatus = "BUMPED_CONFIRMED";
		else if (appointment.comment?.includes("[Онлайн-запись подтверждена]") || appointment.status === "confirmed") derivedStatus = "CONFIRMED";

		const bumpOffer = extractBumpOffer(appointment.comment);

		return {
			id: appointment.id,
			referenceNumber: ref,
			organizationId: appointment.organizationId,
			doctorId: appointment.doctorUserId ?? "",
			chairId: appointment.chairId ?? null,
			patientName: patient?.fullName ?? "Пациент",
			patientPhone: patient?.phone ?? "",
			startsAt: appointment.startsAt.toISOString(),
			endsAt: appointment.endsAt.toISOString(),
			status: derivedStatus,
			isNightMode: true,
			createdAt: appointment.startsAt.toISOString(),
			softHoldExpiresAt: expiresAt,
			appointmentId: appointment.id,
			comment: appointment.comment ?? undefined,
			bumpOffer,
			appliedDiscountPercent: bumpOffer ? DEFAULT_BUMP_DISCOUNT_PERCENT : undefined,
		};
	}

	public async clearHoldingQueue(organizationId?: string): Promise<void> {
		if (!organizationId) {
			this.clinicOnlineOverrides.clear();
			return;
		}
		const orgId = ensureValidUuid(organizationId);
		this.clinicOnlineOverrides.delete(organizationId);
		this.lockEngine.clearLocks(orgId);

		await withTenantCtx(orgId, async (tx) => {
			await tx
				.delete(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						or(
							ilike(appointments.comment, "%[night_hold%"),
							ilike(appointments.comment, "%[Онлайн-запись%"),
						),
					),
				);
		});
	}
}

function extractReferenceNumber(comment: string | null | undefined): string | null {
	if (!comment) return null;
	const match = comment.match(/\[ref:(BKG-[A-Z0-9]+)\]/i);
	return match ? match[1]! : null;
}

function extractExpiresAt(comment: string | null | undefined): string | null {
	if (!comment) return null;
	const match = comment.match(/\[expires:([^\]]+)\]/i);
	return match ? match[1]! : null;
}

function extractBumpOffer(comment: string | null | undefined): any | null {
	if (!comment) return null;
	const match = comment.match(/\[bump_offer:([^\]]+)\]/i);
	if (!match || !match[1]) return null;
	try {
		return JSON.parse(decodeURIComponent(match[1]));
	} catch {
		return null;
	}
}

export const bookingQueueProcessor = new BookingQueueProcessor();
