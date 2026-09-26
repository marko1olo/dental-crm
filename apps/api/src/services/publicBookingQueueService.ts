import { randomUUID } from "node:crypto";
import { and, eq, gt, lt, notInArray, or } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import { appointments, chairs, patients, users } from "../db/schema.js";
import { wsBroker } from "./websocketBroker.js";

export type BookingStatus =
	| "CONFIRMED"
	| "PENDING_RESERVATION"
	| "BUMPED_OFFER_PENDING"
	| "BUMPED_CONFIRMED"
	| "REJECTED_CONFLICT"
	| "CANCELLED";

export interface BookingRequestInput {
	organizationId: string;
	doctorId: string;
	patientName: string;
	patientPhone: string;
	startsAt: string; // ISO 8601
	endsAt: string; // ISO 8601
	comment?: string;
	chairId?: string;
	serviceName?: string;
	source?: "widget" | "telegram" | "tilda" | "wordpress" | "site";
}

export interface BookingReceipt {
	bookingId: string;
	referenceNumber: string;
	organizationId: string;
	doctorId: string;
	patientName: string;
	patientPhone: string;
	startsAt: string;
	endsAt: string;
	status: BookingStatus;
	isNightMode: boolean;
	message: string;
	morningConfirmTime?: string;
	softHoldExpiresAt?: string;
	appointmentId?: string;
	discountPercent?: number;
	discountNote?: string;
	createdAt: string;
}

export interface GracefulBumpSlotOption {
	startsAt: string;
	endsAt: string;
	label: string;
}

export interface GracefulBumpOffer {
	bookingId: string;
	originalStartsAt: string;
	originalEndsAt: string;
	recommendedSlots: GracefulBumpSlotOption[];
	discountPercent: number;
	discountNote: string;
	notificationPayload: {
		recipientPhone: string;
		channel: "sms" | "whatsapp";
		messageText: string;
		oneClickConfirmUrl: string;
	};
}

export interface HoldingQueueItem {
	id: string;
	referenceNumber: string;
	organizationId: string;
	doctorId: string;
	chairId?: string | null | undefined;
	patientName: string;
	patientPhone: string;
	startsAt: string;
	endsAt: string;
	comment?: string | undefined;
	serviceName?: string | undefined;
	status: BookingStatus;
	isNightMode: boolean;
	createdAt: string;
	softHoldExpiresAt: string;
	appointmentId?: string | null | undefined;
	bumpOffer?: GracefulBumpOffer | null | undefined;
	appliedDiscountPercent?: number | undefined;
}

const holdingQueueStore = new Map<string, HoldingQueueItem>();
const clinicOnlineOverrides = new Map<string, boolean>();
const inMemoryAppointmentsStore = new Map<
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

export const DEFAULT_MORNING_CONFIRM_TIME = "08:30";
export const DEFAULT_CLINIC_OPEN_HOUR = 8.5; // 08:30
export const DEFAULT_CLINIC_CLOSE_HOUR = 21.0; // 21:00
export const DEFAULT_BUMP_DISCOUNT_PERCENT = 10;

function formatReferenceNumber(): string {
	return `BKG-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function normalizePhoneDigits(phone: string): string {
	const digits = String(phone ?? "").replace(/\D/g, "");
	const national = digits.startsWith("8") && digits.length === 11 ? `7${digits.slice(1)}` : digits;
	return national.length > 10 ? national.slice(-10) : national;
}

export class PublicBookingQueueService {
	public setClinicOnlineOverride(organizationId: string, isOnline: boolean | null): void {
		if (isOnline === null) {
			clinicOnlineOverrides.delete(organizationId);
		} else {
			clinicOnlineOverrides.set(organizationId, isOnline);
		}
	}

	public async isClinicOnline(organizationId: string, now: Date = new Date()): Promise<boolean> {
		if (clinicOnlineOverrides.has(organizationId)) {
			return Boolean(clinicOnlineOverrides.get(organizationId));
		}
		const currentHour = now.getUTCHours() + 3;
		const normalizedHour = ((currentHour + 24) % 24) + now.getUTCMinutes() / 60;
		return normalizedHour >= DEFAULT_CLINIC_OPEN_HOUR && normalizedHour < DEFAULT_CLINIC_CLOSE_HOUR;
	}

	public async submitBooking(
		input: BookingRequestInput,
		options: { now?: Date; useDb?: boolean } = {},
	): Promise<BookingReceipt> {
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

	private async executeDaytimeDirectBooking(
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
					return {
						bookingId,
						referenceNumber,
						organizationId: input.organizationId,
						doctorId: input.doctorId,
						patientName: input.patientName,
						patientPhone: input.patientPhone,
						startsAt: input.startsAt,
						endsAt: input.endsAt,
						status: "REJECTED_CONFLICT",
						isNightMode: false,
						message: "Выбранное время уже занято. Обновите список слотов.",
						createdAt: new Date().toISOString(),
					};
				}

				if (txResult.appointment) {
					wsBroker.broadcastToOrganization(input.organizationId, {
						type: "APPOINTMENT_CREATED",
						payload: { appointmentId: txResult.appointment.id, startsAt: txResult.appointment.startsAt },
					});
					return {
						bookingId,
						referenceNumber,
						organizationId: input.organizationId,
						doctorId: input.doctorId,
						patientName: input.patientName,
						patientPhone: input.patientPhone,
						startsAt: input.startsAt,
						endsAt: input.endsAt,
						status: "CONFIRMED",
						isNightMode: false,
						message: "Запись успешно подтверждена!",
						appointmentId: txResult.appointment.id,
						createdAt: new Date().toISOString(),
					};
				}
			} catch (err) {
				console.warn("[publicBookingQueue] DB transaction error, falling back to in-memory store:", (err as Error).message);
			}
		}

		// In-Memory store handling
		const orgAppointments = inMemoryAppointmentsStore.get(input.organizationId) ?? [];
		const isTaken = orgAppointments.some(
			(a) =>
				a.doctorId === input.doctorId &&
				a.status !== "cancelled" &&
				startDate.getTime() < a.endsAt.getTime() &&
				endDate.getTime() > a.startsAt.getTime(),
		);

		if (isTaken) {
			return {
				bookingId,
				referenceNumber,
				organizationId: input.organizationId,
				doctorId: input.doctorId,
				patientName: input.patientName,
				patientPhone: input.patientPhone,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
				status: "REJECTED_CONFLICT",
				isNightMode: false,
				message: "Выбранное время уже занято. Обновите список слотов.",
				createdAt: new Date().toISOString(),
			};
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
			comment: input.comment,
		});
		inMemoryAppointmentsStore.set(input.organizationId, orgAppointments);

		return {
			bookingId,
			referenceNumber,
			organizationId: input.organizationId,
			doctorId: input.doctorId,
			patientName: input.patientName,
			patientPhone: input.patientPhone,
			startsAt: input.startsAt,
			endsAt: input.endsAt,
			status: "CONFIRMED",
			isNightMode: false,
			message: "Запись успешно подтверждена!",
			appointmentId,
			createdAt: new Date().toISOString(),
		};
	}

	private async executeNighttimeSoftHold(
		input: BookingRequestInput,
		startDate: Date,
		endDate: Date,
		now: Date,
	): Promise<BookingReceipt> {
		const bookingId = randomUUID();
		const referenceNumber = formatReferenceNumber();
		const morningConfirmTime = DEFAULT_MORNING_CONFIRM_TIME;

		const existingHold = Array.from(holdingQueueStore.values()).find(
			(item) =>
				item.organizationId === input.organizationId &&
				item.doctorId === input.doctorId &&
				item.status === "PENDING_RESERVATION" &&
				new Date(item.softHoldExpiresAt).getTime() > now.getTime() &&
				startDate.getTime() < new Date(item.endsAt).getTime() &&
				endDate.getTime() > new Date(item.startsAt).getTime(),
		);

		if (existingHold) {
			return {
				bookingId,
				referenceNumber,
				organizationId: input.organizationId,
				doctorId: input.doctorId,
				patientName: input.patientName,
				patientPhone: input.patientPhone,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
				status: "REJECTED_CONFLICT",
				isNightMode: true,
				message: "Этот временной интервал уже предварительно удерживается другой ночной заявкой.",
				createdAt: now.toISOString(),
			};
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
			comment: input.comment,
			serviceName: input.serviceName,
			status: "PENDING_RESERVATION",
			isNightMode: true,
			createdAt: now.toISOString(),
			softHoldExpiresAt,
			appointmentId: null,
			bumpOffer: null,
		};
		holdingQueueStore.set(bookingId, queueItem);

		return {
			bookingId,
			referenceNumber,
			organizationId: input.organizationId,
			doctorId: input.doctorId,
			patientName: input.patientName,
			patientPhone: input.patientPhone,
			startsAt: input.startsAt,
			endsAt: input.endsAt,
			status: "PENDING_RESERVATION",
			isNightMode: true,
			message: receiptMessage,
			morningConfirmTime,
			softHoldExpiresAt,
			createdAt: now.toISOString(),
		};
	}

	public async processHoldingQueue(
		organizationId: string,
		options: {
			useDb?: boolean;
			availableAdjacentSlotsFinder?: (doctorId: string, startsAt: Date) => Promise<GracefulBumpSlotOption[]> | GracefulBumpSlotOption[];
		} = {},
	): Promise<{ processed: number; confirmed: number; bumped: number; items: HoldingQueueItem[] }> {
		const pendingItems = Array.from(holdingQueueStore.values()).filter(
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
					comment: item.comment,
					chairId: item.chairId ?? undefined,
					serviceName: item.serviceName,
				},
				startDate,
				endDate,
				options,
			);

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
			holdingQueueStore.set(item.id, item);
		}

		return {
			processed: pendingItems.length,
			confirmed: confirmedCount,
			bumped: bumpedCount,
			items: pendingItems,
		};
	}

	private generateDefaultAdjacentSlots(startDate: Date, endDate: Date): GracefulBumpSlotOption[] {
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
		const item = holdingQueueStore.get(bookingId);
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
				chairId: item.chairId ?? undefined,
				serviceName: item.serviceName,
			},
			new Date(chosenSlot.startsAt),
			new Date(chosenSlot.endsAt),
			options,
		);

		if (directResult.status === "CONFIRMED") {
			item.status = "BUMPED_CONFIRMED";
			item.startsAt = chosenSlot.startsAt;
			item.endsAt = chosenSlot.endsAt;
			item.appointmentId = directResult.appointmentId;
			holdingQueueStore.set(item.id, item);

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
		let items = Array.from(holdingQueueStore.values());
		if (organizationId) items = items.filter((it) => it.organizationId === organizationId);
		if (status) items = items.filter((it) => it.status === status);
		return items;
	}

	public getHoldingQueueItem(bookingId: string): HoldingQueueItem | undefined {
		return holdingQueueStore.get(bookingId);
	}

	public clearHoldingQueue(organizationId?: string): void {
		if (!organizationId) {
			holdingQueueStore.clear();
			clinicOnlineOverrides.clear();
			inMemoryAppointmentsStore.clear();
		} else {
			for (const [id, item] of holdingQueueStore.entries()) {
				if (item.organizationId === organizationId) holdingQueueStore.delete(id);
			}
			clinicOnlineOverrides.delete(organizationId);
			inMemoryAppointmentsStore.delete(organizationId);
		}
	}
}

export const publicBookingQueueService = new PublicBookingQueueService();
