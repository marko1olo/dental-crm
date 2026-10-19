/**
 * demoShiftShowcase.ts — Realistic Demo Shift Showcase Preset.
 *
 * Implements Mandate 8wy (Honest Production vs Demo Showcase Mode):
 * In demo showcase mode (?demo=true), provides 3 realistic completed visits of the day:
 * 1. Иванов Иван Сергеевич — Эндодонтическое лечение пульпита 16 зуба (28 500 ₽, оплата картой через POS-терминал).
 * 2. Петров Алексей Михайлович — Комплексная гигиена полости рта и фторирование (25 000 ₽, оплата наличными).
 * 3. Сидорова Елена Владимировна — Керамическая коронка E-max 21 зуба (25 000 ₽, оплата по СБП QR-коду).
 *
 * Total revenue: 78 500 ₽.
 * Breakdown: Cash 25 000 ₽, Card 28 500 ₽, SBP 25 000 ₽, Deposit 0 ₽.
 * All visits completed, medical records (EMR) signed.
 */

export interface DemoShiftAppointment {
	id: string;
	patientId: string;
	patientName: string;
	patientPhone: string;
	startsAt: string;
	endsAt: string;
	status: string;
	appointmentStatus: string;
	reason: string;
	serviceTitle: string;
	priceRub: number;
	costRub: number;
	paymentMethod: "card" | "cash" | "sbp" | "deposit";
	isPaid: boolean;
	cabinetName: string;
	room: string;
	doctorId: string;
	doctorName: string;
}

export interface DemoShiftPayment {
	id: string;
	appointmentId: string;
	patientId: string;
	amountRub: number;
	method: "card" | "cash" | "sbp" | "deposit";
	paymentMethod: "card" | "cash" | "sbp" | "deposit";
	status: "paid";
	paidAt: string;
	createdAt: string;
}

export function getDemoShiftAppointments(todayIso: string): DemoShiftAppointment[] {
	return [
		{
			id: "demo-app-ivanov",
			patientId: "demo-pat-ivanov",
			patientName: "Иванов Иван Сергеевич",
			patientPhone: "+7 (916) 123-45-67",
			startsAt: `${todayIso}T09:30:00.000Z`,
			endsAt: `${todayIso}T11:00:00.000Z`,
			status: "completed",
			appointmentStatus: "completed",
			reason: "Лечение пульпита 16 зуба",
			serviceTitle: "Эндодонтическое лечение пульпита 16 зуба",
			priceRub: 28500,
			costRub: 28500,
			paymentMethod: "card",
			isPaid: true,
			cabinetName: "Кабинет №1",
			room: "Кабинет №1",
			doctorId: "demo-doc-smirnova",
			doctorName: "Д-р Смирнова Е.В.",
		},
		{
			id: "demo-app-petrov",
			patientId: "demo-pat-petrov",
			patientName: "Петров Алексей Михайлович",
			patientPhone: "+7 (925) 987-65-43",
			startsAt: `${todayIso}T11:30:00.000Z`,
			endsAt: `${todayIso}T12:30:00.000Z`,
			status: "completed",
			appointmentStatus: "completed",
			reason: "Комплексная гигиена и фторирование",
			serviceTitle: "Комплексная профессиональная гигиена и AirFlow",
			priceRub: 25000,
			costRub: 25000,
			paymentMethod: "cash",
			isPaid: true,
			cabinetName: "Кабинет №1",
			room: "Кабинет №1",
			doctorId: "demo-doc-smirnova",
			doctorName: "Д-р Смирнова Е.В.",
		},
		{
			id: "demo-app-sidorova",
			patientId: "demo-pat-sidorova",
			patientName: "Сидорова Елена Владимировна",
			patientPhone: "+7 (903) 555-77-88",
			startsAt: `${todayIso}T14:00:00.000Z`,
			endsAt: `${todayIso}T15:30:00.000Z`,
			status: "completed",
			appointmentStatus: "completed",
			reason: "Керамическая коронка E-max 21",
			serviceTitle: "Препарирование и фиксация керамической коронки E-max 21",
			priceRub: 25000,
			costRub: 25000,
			paymentMethod: "sbp",
			isPaid: true,
			cabinetName: "Кабинет №1",
			room: "Кабинет №1",
			doctorId: "demo-doc-smirnova",
			doctorName: "Д-р Смирнова Е.В.",
		},
	];
}

export function getDemoShiftPayments(todayIso: string): DemoShiftPayment[] {
	return [
		{
			id: "demo-pay-1",
			appointmentId: "demo-app-ivanov",
			patientId: "demo-pat-ivanov",
			amountRub: 28500,
			method: "card",
			paymentMethod: "card",
			status: "paid",
			paidAt: `${todayIso}T11:05:00.000Z`,
			createdAt: `${todayIso}T11:05:00.000Z`,
		},
		{
			id: "demo-pay-2",
			appointmentId: "demo-app-petrov",
			patientId: "demo-pat-petrov",
			amountRub: 25000,
			method: "cash",
			paymentMethod: "cash",
			status: "paid",
			paidAt: `${todayIso}T12:35:00.000Z`,
			createdAt: `${todayIso}T12:35:00.000Z`,
		},
		{
			id: "demo-pay-3",
			appointmentId: "demo-app-sidorova",
			patientId: "demo-pat-sidorova",
			amountRub: 25000,
			method: "sbp",
			paymentMethod: "sbp",
			status: "paid",
			paidAt: `${todayIso}T15:35:00.000Z`,
			createdAt: `${todayIso}T15:35:00.000Z`,
		},
	];
}

export function getDemoShiftPatients(): Array<{ id: string; fullName: string; phone: string; allergies?: string[] }> {
	return [
		{
			id: "demo-pat-ivanov",
			fullName: "Иванов Иван Сергеевич",
			phone: "+7 (916) 123-45-67",
			allergies: [],
		},
		{
			id: "demo-pat-petrov",
			fullName: "Петров Алексей Михайлович",
			phone: "+7 (925) 987-65-43",
			allergies: [],
		},
		{
			id: "demo-pat-sidorova",
			fullName: "Сидорова Елена Владимировна",
			phone: "+7 (903) 555-77-88",
			allergies: [],
		},
	];
}
