import { randomUUID } from "node:crypto";
import { and, eq, gt, lt, notInArray, or } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
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

export class BookingQueueProcessor {
	private holdingQueueStore = new Map<string, HoldingQueueItem>();
	private clinicOnlineOverrides = new Map<string, boolean>();
	private inMemoryAppointmentsStore = new Map<
		string,
		Array<{
			id: string;
			organizationId: string;
			doctorId: string;
			chairId?: string | null | undefined;
			patientName?: string | undefined;
			startsAt: Date;
			endsAt: Date;
			status: string;
			comment?: string | undefined;
		}>
	>();

	constructor(
		private lockEngine: SlotHoldLockEngine = slotHoldLockEngine,
		private verificationEngine: BookingVerificationEngine = bookingVerificationEngine,
	) {
		this.lockEngine.setQueueOverlapChecker(
			(organizationId, doctorId, bookingId, candidateStart, candidateEnd, now) => {
				for (const item of this.holdingQueueStore.values()) {
					if (
						item.organizationId === organizationId &&
						item.doctorId === doctorId &&
						item.id !== bookingId &&
						item.status === "PENDING_RESERVATION" &&
						new Date(item.softHoldExpiresAt).getTime() > now &&
						candidateStart < new Date(item.endsAt).getTime() &&
						candidateEnd > new Date(item.startsAt).getTime()
					) {
						return true;
					}
				}
				return false;
			},
		);
	}

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
		options: { useDb?: boolean } = {},
	): Promise<BookingReceipt> {
		const referenceNumber = formatReferenceNumber();
		const bookingId = randomUUID();

		const canUseDb =
			options.useDb === true ||
			(options.useDb !== false &&
				Boolean(process.env.DATABASE_URL) &&
				process.env.DENTAL_STATE_PERSISTENCE !== "off" &&
				!input.organizationId.startsWith("org-test-"));

		if (canUseDb) {
			try {
				const txResult = await withTenantCtx(input.organizationId, async (tx) => {
					const [doctor] = await tx
						.select({ id: users.id })
						.from(users)
						.where(and(eq(users.id, input.doctorId), eq(users.organizationId, input.organizationId), eq(users.isActive, true)))
						.limit(1)
						.for("update");

					if (!doctor) return { error: "Врач не найден или не принимает в этой клинике" };

					let resolvedChairId = input.chairId ?? null;
					if (!resolvedChairId) {
						const availableChairs = await tx
							.select({ id: chairs.id })
							.from(chairs)
							.where(and(eq(chairs.organizationId, input.organizationId), eq(chairs.isActive, true)))
							.for("update");

						for (const chair of availableChairs) {
							const [occupied] = await tx
								.select({ id: appointments.id })
								.from(appointments)
								.where(
									and(
										eq(appointments.organizationId, input.organizationId),
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
						.where(and(eq(patients.organizationId, input.organizationId), or(eq(patients.phone, input.patientPhone), eq(patients.phone, phoneDigits))))
						.limit(1)
						.for("update");

					let patientId = existingPatient?.id;
					if (!patientId) {
						const [newPatient] = await tx
							.insert(patients)
							.values({ organizationId: input.organizationId, fullName: input.patientName, phone: input.patientPhone, status: "active" })
							.returning({ id: patients.id });
						patientId = newPatient?.id;
					}

					const conditions = [
						eq(appointments.organizationId, input.organizationId),
						lt(appointments.startsAt, endDate),
						gt(appointments.endsAt, startDate),
						notInArray(appointments.status, ["cancelled", "no_show"]),
					];
					const resourceConditions = [eq(appointments.doctorUserId, input.doctorId)];
					if (patientId) resourceConditions.push(eq(appointments.patientId, patientId));
					if (resolvedChairId) resourceConditions.push(eq(appointments.chairId, resolvedChairId));

					const [overlap] = await tx
						.select({ id: appointments.id })
						.from(appointments)
						.where(and(...conditions, or(...resourceConditions)))
						.limit(1);

					if (overlap) return { conflict: true as const };

					const [created] = await tx
						.insert(appointments)
						.values({
							organizationId: input.organizationId,
							patientId: patientId ?? null,
							doctorUserId: input.doctorId,
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
					wsBroker.broadcastToOrganization(input.organizationId, {
						type: "APPOINTMENT_CREATED",
						payload: { appointmentId: txResult.appointment.id, startsAt: txResult.appointment.startsAt },
					});
					return makeReceipt(input, bookingId, referenceNumber, "CONFIRMED", false, "Запись успешно подтверждена!", {
						appointmentId: txResult.appointment.id,
					});
				}
			} catch (err) {
				console.warn("[publicBookingQueue] DB transaction error, falling back to in-memory store:", (err as Error).message);
			}
		}

		// In-Memory store handling
		const orgAppointments = this.inMemoryAppointmentsStore.get(input.organizationId) ?? [];
		const isTaken = orgAppointments.some(
			(a) =>
				a.doctorId === input.doctorId &&
				a.status !== "cancelled" &&
				startDate.getTime() < a.endsAt.getTime() &&
				endDate.getTime() > a.startsAt.getTime(),
		);

		if (isTaken) {
			return makeReceipt(input, bookingId, referenceNumber, "REJECTED_CONFLICT", false, "Выбранное время уже занято. Обновите список слотов.");
		}

		const appointmentId = randomUUID();
		orgAppointments.push({
			id: appointmentId,
			organizationId: input.organizationId,
			doctorId: input.doctorId,
			chairId: input.chairId ?? null,
			patientName: input.patientName,
			startsAt: startDate,
			endsAt: endDate,
			status: "planned",
			comment: input.comment ?? undefined,
		});
		this.inMemoryAppointmentsStore.set(input.organizationId, orgAppointments);

		return makeReceipt(input, bookingId, referenceNumber, "CONFIRMED", false, "Запись успешно подтверждена!", {
			appointmentId,
		});
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

		// ATOMIC SLOT MUTEX LOCK: Prevents race condition between concurrent night bookings
		const lockAcquired = this.lockEngine.tryAcquireSoftSlotLock(
			input.organizationId,
			input.doctorId,
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

		const queueItem: HoldingQueueItem = {
			id: bookingId,
			referenceNumber,
			organizationId: input.organizationId,
			doctorId: input.doctorId,
			chairId: input.chairId ?? null,
			patientName: input.patientName,
			patientPhone: input.patientPhone,
			startsAt: input.startsAt,
			endsAt: input.endsAt,
			comment: input.comment ?? undefined,
			serviceName: input.serviceName ?? undefined,
			status: "PENDING_RESERVATION",
			isNightMode: true,
			createdAt: now.toISOString(),
			softHoldExpiresAt,
			appointmentId: null,
			bumpOffer: null,
		};
		this.holdingQueueStore.set(bookingId, queueItem);

		return makeReceipt(
			input,
			bookingId,
			referenceNumber,
			"PENDING_RESERVATION",
			true,
			receiptMessage,
			{ morningConfirmTime, softHoldExpiresAt, createdAt: now.toISOString() },
		);
	}

	public async processHoldingQueue(
		organizationId: string,
		options: {
			useDb?: boolean;
			availableAdjacentSlotsFinder?: (doctorId: string, startsAt: Date) => Promise<GracefulBumpSlotOption[]> | GracefulBumpSlotOption[];
		} = {},
	): Promise<{ processed: number; confirmed: number; bumped: number; items: HoldingQueueItem[] }> {
		const pendingItems = Array.from(this.holdingQueueStore.values()).filter(
			(item) => item.organizationId === organizationId && item.status === "PENDING_RESERVATION",
		);

		let confirmedCount = 0;
		let bumpedCount = 0;

		for (const item of pendingItems) {
			const startDate = new Date(item.startsAt);
			const endDate = new Date(item.endsAt);

			const directResult = await this.executeDaytimeDirectBooking(
				{
					organizationId: item.organizationId,
					doctorId: item.doctorId,
					patientName: item.patientName,
					patientPhone: item.patientPhone,
					startsAt: item.startsAt,
					endsAt: item.endsAt,
					...(item.comment ? { comment: item.comment } : {}),
					...(item.chairId ? { chairId: item.chairId } : {}),
					...(item.serviceName ? { serviceName: item.serviceName } : {}),
				},
				startDate,
				endDate,
				options,
			);

			// Release night soft hold lock regardless of outcome
			this.lockEngine.releaseSoftSlotLock(item.organizationId, item.doctorId, startDate);

			if (directResult.status === "CONFIRMED" && directResult.appointmentId) {
				item.status = "CONFIRMED";
				item.appointmentId = directResult.appointmentId;
				confirmedCount++;
			} else {
				const recommendedSlots = options.availableAdjacentSlotsFinder
					? await options.availableAdjacentSlotsFinder(item.doctorId, startDate)
					: this.generateDefaultAdjacentSlots(startDate, endDate);

				const discountPercent = DEFAULT_BUMP_DISCOUNT_PERCENT;
				const discountNote = `Приоритетная скидка ${discountPercent}% за перенос слота`;
				const oneClickConfirmUrl = `/booking/confirm-bump?id=${item.id}&ref=${item.referenceNumber}`;
				const firstSlotLabel = recommendedSlots[0]?.label ?? "соседнее время";
				const messageText = `Здравствуйте, ${item.patientName}! Слот на ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, "0")} занят. Мы подобрали приоритетный слот ${firstSlotLabel} со скидкой ${discountPercent}%. Подтвердите в 1 клик: ${oneClickConfirmUrl}`;

				item.status = "BUMPED_OFFER_PENDING";
				item.bumpOffer = {
					bookingId: item.id,
					originalStartsAt: item.startsAt,
					originalEndsAt: item.endsAt,
					recommendedSlots,
					discountPercent,
					discountNote,
					notificationPayload: {
						recipientPhone: item.patientPhone,
						channel: "whatsapp",
						messageText,
						oneClickConfirmUrl,
					},
				};
				item.appliedDiscountPercent = discountPercent;
				bumpedCount++;
			}
			this.holdingQueueStore.set(item.id, item);
		}

		return {
			processed: pendingItems.length,
			confirmed: confirmedCount,
			bumped: bumpedCount,
			items: pendingItems,
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
		options: { useDb?: boolean } = {},
	): Promise<BookingReceipt> {
		const item = this.holdingQueueStore.get(bookingId);
		if (!item || item.organizationId !== organizationId) {
			throw new Error("Заявка в очереди не найдена");
		}
		if (item.status !== "BUMPED_OFFER_PENDING") {
			throw new Error("Для данной заявки нет активного предложения о переносе");
		}

		const discount = item.appliedDiscountPercent ?? DEFAULT_BUMP_DISCOUNT_PERCENT;
		const directResult = await this.executeDaytimeDirectBooking(
			{
				organizationId,
				doctorId: item.doctorId,
				patientName: item.patientName,
				patientPhone: item.patientPhone,
				startsAt: chosenSlot.startsAt,
				endsAt: chosenSlot.endsAt,
				comment: `[Перенос Graceful Bump: скидка ${discount}%] ${item.comment ?? ""}`,
				...(item.chairId ? { chairId: item.chairId } : {}),
				...(item.serviceName ? { serviceName: item.serviceName } : {}),
			},
			new Date(chosenSlot.startsAt),
			new Date(chosenSlot.endsAt),
			options,
		);

		if (directResult.status === "CONFIRMED") {
			item.status = "BUMPED_CONFIRMED";
			item.startsAt = chosenSlot.startsAt;
			item.endsAt = chosenSlot.endsAt;
			item.appointmentId = directResult.appointmentId ?? undefined;
			this.holdingQueueStore.set(item.id, item);

			return {
				...directResult,
				bookingId: item.id,
				referenceNumber: item.referenceNumber,
				status: "BUMPED_CONFIRMED",
				discountPercent: discount,
				discountNote: `Приоритетная скидка ${discount}% за перенос подтверждена`,
				message: `Перенос успешно зафиксирован! Ждём вас со скидкой ${discount}%.`,
			};
		}
		return directResult;
	}

	public getHoldingQueue(organizationId?: string, status?: BookingStatus): HoldingQueueItem[] {
		let items = Array.from(this.holdingQueueStore.values());
		if (organizationId) items = items.filter((it) => it.organizationId === organizationId);
		if (status) items = items.filter((it) => it.status === status);
		return items;
	}

	public getHoldingQueueItem(bookingId: string): HoldingQueueItem | undefined {
		return this.holdingQueueStore.get(bookingId);
	}

	public clearHoldingQueue(organizationId?: string): void {
		if (!organizationId) {
			this.holdingQueueStore.clear();
			this.clinicOnlineOverrides.clear();
			this.inMemoryAppointmentsStore.clear();
		} else {
			for (const [id, item] of this.holdingQueueStore.entries()) {
				if (item.organizationId === organizationId) this.holdingQueueStore.delete(id);
			}
			this.clinicOnlineOverrides.delete(organizationId);
			this.inMemoryAppointmentsStore.delete(organizationId);
		}
	}
}

export const bookingQueueProcessor = new BookingQueueProcessor();
