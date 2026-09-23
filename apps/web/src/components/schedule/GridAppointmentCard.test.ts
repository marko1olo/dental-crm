import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDoctorSpecialtyTheme } from "./GridAppointmentCard";

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
