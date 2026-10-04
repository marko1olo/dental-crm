import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getDoctorSpecialtyTheme,
	resolveAppointmentLabStatus,
	resolveAppointmentClinicalBadges,
} from "./GridAppointmentCard";

describe("GridAppointmentCard — IDENT Doctor Specialty Color Coding (WCAG AAA)", () => {
	it("resolves therapy specialty to blue/indigo pastel classes", () => {
		const theme = getDoctorSpecialtyTheme("therapist");
		assert.ok(theme !== null, "Therapist theme should not be null");
		assert.equal(theme.specialtyKey, "therapist");
		assert.equal(theme.label, "Терапия");
		assert.ok(theme.cardBgClass.includes("indigo-500/10"), "Contains indigo bg class");
		assert.ok(theme.textClass.includes("text-indigo-900"), "Contains high-contrast text-indigo-900");
		assert.ok(theme.badgeClass.includes("text-indigo-800"), "Contains high-contrast text-indigo-800");

		const themeRu = getDoctorSpecialtyTheme("Терапевт");
		assert.ok(themeRu !== null);
		assert.equal(themeRu.specialtyKey, "therapist");
	});

	it("resolves orthopedics specialty to purple/violet pastel classes", () => {
		const theme = getDoctorSpecialtyTheme("orthopedist");
		assert.ok(theme !== null);
		assert.equal(theme.specialtyKey, "orthopedist");
		assert.equal(theme.label, "Ортопедия");
		assert.ok(theme.cardBgClass.includes("purple-500/10"));
		assert.ok(theme.textClass.includes("text-purple-900"));

		const themeRu = getDoctorSpecialtyTheme("Стоматолог-ортопед");
		assert.ok(themeRu !== null);
		assert.equal(themeRu.specialtyKey, "orthopedist");
	});

	it("resolves surgery and implantology to rose/burgundy pastel classes", () => {
		const themeSurg = getDoctorSpecialtyTheme("surgeon");
		assert.ok(themeSurg !== null);
		assert.equal(themeSurg.specialtyKey, "surgeon");
		assert.equal(themeSurg.label, "Хирургия");
		assert.ok(themeSurg.cardBgClass.includes("rose-500/10"));
		assert.ok(themeSurg.textClass.includes("text-rose-900"));

		const themeImpl = getDoctorSpecialtyTheme("Имплантолог");
		assert.ok(themeImpl !== null);
		assert.equal(themeImpl.specialtyKey, "surgeon");
	});

	it("resolves orthodontics to emerald/green pastel classes", () => {
		const theme = getDoctorSpecialtyTheme("orthodontist");
		assert.ok(theme !== null);
		assert.equal(theme.specialtyKey, "orthodontist");
		assert.equal(theme.label, "Ортодонтия");
		assert.ok(theme.cardBgClass.includes("emerald-500/10"));
		assert.ok(theme.textClass.includes("text-emerald-900"));

		const themeRu = getDoctorSpecialtyTheme("Ортодонт");
		assert.ok(themeRu !== null);
		assert.equal(themeRu.specialtyKey, "orthodontist");
	});

	it("resolves hygiene and periodontology to teal/cyan pastel classes", () => {
		const themeHyg = getDoctorSpecialtyTheme("hygienist");
		assert.ok(themeHyg !== null);
		assert.equal(themeHyg.specialtyKey, "hygienist");
		assert.equal(themeHyg.label, "Гигиена");
		assert.ok(themeHyg.cardBgClass.includes("teal-500/10"));
		assert.ok(themeHyg.textClass.includes("text-teal-900"));

		const themePer = getDoctorSpecialtyTheme("Пародонтолог");
		assert.ok(themePer !== null);
		assert.equal(themePer.specialtyKey, "hygienist");
	});

	it("resolves pediatric dentistry to amber pastel classes", () => {
		const theme = getDoctorSpecialtyTheme("pediatric");
		assert.ok(theme !== null);
		assert.equal(theme.specialtyKey, "pediatric");
		assert.equal(theme.label, "Детская");
		assert.ok(theme.cardBgClass.includes("amber-500/10"));
	});

	it("returns null for unrecognized or empty specialty", () => {
		assert.equal(getDoctorSpecialtyTheme(null), null);
		assert.equal(getDoctorSpecialtyTheme(undefined), null);
		assert.equal(getDoctorSpecialtyTheme(""), null);
		assert.equal(getDoctorSpecialtyTheme("unknown_specialty"), null);
	});
});

describe("GridAppointmentCard — Связка статуса наряда ЗТЛ с расписанием (ready_in_clinic / overdue / in_lab)", () => {
	const refDate = new Date("2026-10-15T12:00:00Z");

	it("resolves ready_in_clinic status with green badge (emerald)", () => {
		const appt: any = {
			id: "app-1",
			patientId: "pat-1",
			reason: "Примерка коронки",
			labOrder: {
				orderNumber: "ЗТЛ-771",
				status: "ready_in_clinic",
				workType: "Коронка e.MAX",
				colorVita: "A2",
			},
		};

		const labStatus = resolveAppointmentLabStatus(appt, undefined, refDate);
		assert.ok(labStatus);
		assert.equal(labStatus.state, "ready_in_clinic");
		assert.equal(labStatus.shortLabelRu, "В клинике");
		assert.ok(labStatus.badgeClass.includes("emerald"));

		const badges = resolveAppointmentClinicalBadges(appt, {}, 0, null, labStatus);
		const labBadge = badges.find((b) => b.id === "lab_order");
		assert.ok(labBadge, "Lab badge must be present in clinical badges strip");
		assert.equal(labBadge.labelRu, "В клинике");
		assert.ok(labBadge.badgeClass.includes("emerald"));
	});

	it("resolves overdue status with red badge (rose) and overdue days count", () => {
		const appt: any = {
			id: "app-2",
			patientId: "pat-2",
			reason: "Фиксация моста",
			labOrder: {
				orderNumber: "ЗТЛ-772",
				status: "in_progress",
				dueDate: "2026-10-11T00:00:00Z", // 4 days overdue relative to 2026-10-15
				workType: "Мостовидный протез ZrO2",
			},
		};

		const labStatus = resolveAppointmentLabStatus(appt, undefined, refDate);
		assert.ok(labStatus);
		assert.equal(labStatus.state, "overdue");
		assert.equal(labStatus.isOverdue, true);
		assert.equal(labStatus.daysOverdue, 4);
		assert.ok(labStatus.badgeClass.includes("rose"));

		const badges = resolveAppointmentClinicalBadges(appt, {}, 0, null, labStatus);
		const labBadge = badges.find((b) => b.id === "lab_order");
		assert.ok(labBadge);
		assert.equal(labBadge.labelRu, "ЗТЛ: +4д!");
		assert.ok(labBadge.badgeClass.includes("rose"));
	});

	it("resolves in_lab status with yellow badge (amber) when within deadline", () => {
		const appt: any = {
			id: "app-3",
			patientId: "pat-3",
			reason: "Консультация",
			labOrder: {
				orderNumber: "ЗТЛ-773",
				status: "in_progress",
				dueDate: "2026-10-25T00:00:00Z",
				workType: "Коронка цельнолитая",
			},
		};

		const labStatus = resolveAppointmentLabStatus(appt, undefined, refDate);
		assert.ok(labStatus);
		assert.equal(labStatus.state, "in_lab");
		assert.equal(labStatus.shortLabelRu, "В ЗТЛ");
		assert.ok(labStatus.badgeClass.includes("amber"));

		const badges = resolveAppointmentClinicalBadges(appt, {}, 0, null, labStatus);
		const labBadge = badges.find((b) => b.id === "lab_order");
		assert.ok(labBadge);
		assert.equal(labBadge.labelRu, "В ЗТЛ");
		assert.ok(labBadge.badgeClass.includes("amber"));
	});
});
