export interface AppointmentSlot {
	id: string;
	doctorId: string;
	chairId: string;
	startsAt: Date;
	endsAt: Date;
	isHighIntensitySurgery?: boolean;
	isEmergency?: boolean;
}

export interface ChairUtilizationResult {
	chairId: string;
	operatingMinutes: number;
	bookedMinutes: number;
	utilizationRatePct: number;
	status: "underutilized" | "optimal" | "overloaded";
}

export interface DoctorFatigueAlert {
	doctorId: string;
	consecutiveMinutes: number;
	isFatigueWarningTriggered: boolean;
	message: string | null;
}

export interface EmergencyGapSlot {
	chairId: string;
	startsAt: Date;
	endsAt: Date;
	availableDurationMinutes: number;
}

export class ClinicCapacitySchedulerService {
	/**
	 * Расчет загрузки стоматологического кресла за рабочий день (%)
	 */
	public static calculateChairUtilization(
		chairId: string,
		operatingMinutes: number,
		bookedMinutes: number,
	): ChairUtilizationResult {
		const operating = Math.max(1, operatingMinutes);
		const booked = Math.max(0, bookedMinutes);
		const rate = Number(((booked / operating) * 100).toFixed(1));

		let status: "underutilized" | "optimal" | "overloaded" = "optimal";
		if (rate < 60) {
			status = "underutilized";
		} else if (rate > 90) {
			status = "overloaded";
		}

		return {
			chairId,
			operatingMinutes: operating,
			bookedMinutes: booked,
			utilizationRatePct: Math.min(100, rate),
			status,
		};
	}

	/**
	 * Защита врача от переутомления при длительных хирургических вмешательствах
	 * (Предупреждение при > 8 часов подряд без перерыва >= 30 минут)
	 */
	public static checkDoctorFatigue(
		doctorId: string,
		slots: readonly AppointmentSlot[],
	): DoctorFatigueAlert {
		const doctorSlots = slots
			.filter((s) => s.doctorId === doctorId)
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

		if (doctorSlots.length === 0) {
			return {
				doctorId,
				consecutiveMinutes: 0,
				isFatigueWarningTriggered: false,
				message: null,
			};
		}

		let maxConsecutiveMinutes = 0;
		let currentConsecutiveMinutes = 0;
		let lastEnd: Date | null = null;

		for (const slot of doctorSlots) {
			const slotDuration = (slot.endsAt.getTime() - slot.startsAt.getTime()) / (1000 * 60);

			if (lastEnd === null) {
				currentConsecutiveMinutes = slotDuration;
			} else {
				const breakMinutes = (slot.startsAt.getTime() - lastEnd.getTime()) / (1000 * 60);
				if (breakMinutes >= 30) {
					// Полноценный 30-минутный перерыв сбрасывает счетчик непрерывной нагрузки
					currentConsecutiveMinutes = slotDuration;
				} else {
					// Короткий перерыв или непрерывный прием
					currentConsecutiveMinutes += slotDuration;
				}
			}

			lastEnd = slot.endsAt;
			if (currentConsecutiveMinutes > maxConsecutiveMinutes) {
				maxConsecutiveMinutes = currentConsecutiveMinutes;
			}
		}

		const isFatigueWarningTriggered = maxConsecutiveMinutes >= 480; // 8 hours
		const message = isFatigueWarningTriggered
			? `Врач ${doctorId} ведет непрерывный прием ${Math.round(maxConsecutiveMinutes / 60)} ч. без обязательного перерыва (риск переутомления/ошибок).`
			: null;

		return {
			doctorId,
			consecutiveMinutes: maxConsecutiveMinutes,
			isFatigueWarningTriggered,
			message,
		};
	}

	/**
	 * Поиск свободных окон для пациентов с острой болью (от 30 минут)
	 */
	public static findEmergencySlots(
		chairId: string,
		dayStart: Date,
		dayEnd: Date,
		bookedSlots: readonly AppointmentSlot[],
		minDurationMinutes: number = 30,
	): EmergencyGapSlot[] {
		const chairBookings = bookedSlots
			.filter((s) => s.chairId === chairId)
			.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

		const emergencySlots: EmergencyGapSlot[] = [];
		let cursor = dayStart;

		for (const booking of chairBookings) {
			if (booking.startsAt > cursor) {
				const gapMinutes = (booking.startsAt.getTime() - cursor.getTime()) / (1000 * 60);
				if (gapMinutes >= minDurationMinutes) {
					emergencySlots.push({
						chairId,
						startsAt: new Date(cursor),
						endsAt: new Date(booking.startsAt),
						availableDurationMinutes: Math.round(gapMinutes),
					});
				}
			}
			if (booking.endsAt > cursor) {
				cursor = booking.endsAt;
			}
		}

		if (dayEnd > cursor) {
			const finalGapMinutes = (dayEnd.getTime() - cursor.getTime()) / (1000 * 60);
			if (finalGapMinutes >= minDurationMinutes) {
				emergencySlots.push({
					chairId,
					startsAt: new Date(cursor),
					endsAt: new Date(dayEnd),
					availableDurationMinutes: Math.round(finalGapMinutes),
				});
			}
		}

		return emergencySlots;
	}
}
