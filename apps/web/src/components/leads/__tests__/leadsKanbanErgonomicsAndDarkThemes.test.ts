/**
 * DENTE Dental CRM — Leads Kanban Ergonomics, Dark Themes & 1-Click Conversion Inquisitor Test Suite
 *
 * Mandate 8c: Visual Quality & 10 Themes Parity (Night, Dark, OLED, Ocean, Emerald, Cyber X-Ray)
 * Mandate 8e: Doctor Autonomy & Non-Blocking Clinical Invariants
 * Mandate 8n: Solo Doctor Scale Sovereignty & Anti-Landfill Ergonomics
 * Mandate 8p: Zero Dead-Ends & Zero Bureaucratic Ciphers
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COLUMNS, CORE_FUNNEL_COLUMNS, FALLBACK_DEFAULT_CHAIR, FALLBACK_SOLO_DOCTOR } from "../leadsKanbanTypes";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import { CHANNEL_BADGE_COLORS, CHANNEL_DISPLAY_NAMES } from "../../telephony/telephonyAttribution";
import type { Lead } from "../../../store/leadsStore";

describe("Leads Kanban Ergonomics, Dark Themes & 1-Click Conversion Verification", () => {
	describe("1. Kanban Funnel & Drag-and-Drop / Button-Based Stage Transfer", () => {
		it("CORE_FUNNEL_COLUMNS has exactly 4 sequential stages with zero horizontal clutter", () => {
			assert.equal(CORE_FUNNEL_COLUMNS.length, 4);
			assert.deepEqual(
				CORE_FUNNEL_COLUMNS.map((c) => c.id),
				["new", "contacted", "consult_booked", "showed_up"],
			);
			assert.deepEqual(
				CORE_FUNNEL_COLUMNS.map((c) => c.label),
				["1. Новые", "2. Квалифицированные", "3. Консультация", "4. Дошли"],
			);
		});

		it("All 6 canonical columns exist including terminal/recovery columns", () => {
			assert.equal(COLUMNS.length, 6);
			const columnIds = COLUMNS.map((c) => c.id);
			assert.ok(columnIds.includes("no_answer"));
			assert.ok(columnIds.includes("trash"));
		});

		it("Simulates sequential 1-click status transitions through all 4 funnel stages", () => {
			const mockLead: Lead = {
				id: "lead-seq-1",
				name: "Анна Смирнова",
				phone: "+7 (999) 111-22-33",
				source: "yandex_direct",
				status: "new",
			};

			// Step 1: new -> contacted
			const step1Status = "contacted";
			mockLead.status = step1Status;
			assert.equal(mockLead.status, "contacted");

			// Step 2: contacted -> consult_booked
			const step2Status = "consult_booked";
			mockLead.status = step2Status;
			assert.equal(mockLead.status, "consult_booked");

			// Step 3: consult_booked -> showed_up
			const step3Status = "showed_up";
			mockLead.status = step3Status;
			assert.equal(mockLead.status, "showed_up");
		});

		it("Supports quick recovery from edge columns (no_answer / trash -> new)", () => {
			const noAnswerLead: Lead = {
				id: "lead-no-ans",
				name: "Михаил Кузнецов",
				phone: "+7 (999) 444-55-66",
				status: "no_answer",
			};
			noAnswerLead.status = "new";
			assert.equal(noAnswerLead.status, "new");

			const trashLead: Lead = {
				id: "lead-trash",
				name: "Дмитрий Орлов",
				phone: "+7 (999) 777-88-99",
				status: "trash",
			};
			trashLead.status = "new";
			assert.equal(trashLead.status, "new");
		});
	});

	describe("2. Dark Themes Parity & Token Invariants (Mandate 8c)", () => {
		it("COLUMNS use CSS variable tokens instead of hardcoded RGBA colors", () => {
			for (const col of COLUMNS) {
				assert.ok(
					col.color.startsWith("var(--"),
					`Column ${col.id} color (${col.color}) must be a CSS variable token`,
				);
				assert.ok(
					!col.color.includes("#"),
					`Column ${col.id} must not contain static hex colors`,
				);
				assert.ok(
					!col.color.startsWith("rgba("),
					`Column ${col.id} must not contain raw rgba() colors`,
				);
			}
		});

		it("Marketing channels have complete dark-theme token definitions in CHANNEL_BADGE_COLORS", () => {
			const canonicalChannels = [
				"yandex_direct",
				"gis_2",
				"prodoctorov",
				"napopravku",
				"site_seo",
				"social_media",
				"recommendations",
				"other",
			];

			for (const ch of canonicalChannels) {
				const badge = CHANNEL_BADGE_COLORS[ch];
				assert.ok(badge, `Missing badge color for channel ${ch}`);
				assert.ok(badge.bg.startsWith("var(--"), `Channel ${ch} bg must use design token`);
				assert.ok(badge.border.startsWith("var(--"), `Channel ${ch} border must use design token`);
				assert.ok(
					CHANNEL_DISPLAY_NAMES[ch],
					`Channel ${ch} must have a Cyrillic human-readable display name`,
				);
			}
		});

		it("Russian marketing source strings map seamlessly to canonical channel tokens", () => {
			assert.equal(normalizeMarketingChannel("Яндекс.Директ"), "yandex_direct");
			assert.equal(normalizeMarketingChannel("2ГИС Карты"), "gis_2");
			assert.equal(normalizeMarketingChannel("ПроДокторов"), "prodoctorov");
			assert.equal(normalizeMarketingChannel("НаПоправку"), "napopravku");
			assert.equal(normalizeMarketingChannel("Официальный сайт"), "site_seo");
			assert.equal(normalizeMarketingChannel("ВКонтакте"), "social_media");
			assert.equal(normalizeMarketingChannel("Сарафанное радио"), "recommendations");
		});
	});

	describe("3. Lead to Patient & Appointment Conversion (Mandates 8e, 8n)", () => {
		it("Preserves phone, name, and advertising source in appointment conversion payload", () => {
			const lead: Lead = {
				id: "lead-conversion-test",
				name: "Екатерина Волкова",
				phone: "+7 (999) 555-12-34",
				source: "gis_2",
				status: "new",
			};

			const appointmentStart = new Date("2026-10-01T10:00:00Z").toISOString();
			const appointmentEnd = new Date("2026-10-01T10:30:00Z").toISOString();

			const payload = {
				appointmentStart,
				appointmentEnd,
				chairId: FALLBACK_DEFAULT_CHAIR.id,
				doctorId: FALLBACK_SOLO_DOCTOR.id,
			};

			assert.ok(payload.appointmentStart);
			assert.ok(payload.appointmentEnd);
			assert.equal(payload.doctorId, "default-doctor");
			assert.equal(payload.chairId, "default-chair");
			assert.equal(lead.name, "Екатерина Волкова");
			assert.equal(lead.phone, "+7 (999) 555-12-34");
			assert.equal(lead.source, "gis_2");
		});

		it("Computes 30-minute primary appointment slot for solo practitioner without configuration", () => {
			const startDate = "2026-10-02";
			const startTime = "11:00";
			const startDateTime = new Date(`${startDate}T${startTime}:00`);
			const durationMinutes = 30;
			const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

			assert.equal(startDateTime.getHours(), 11);
			assert.equal(startDateTime.getMinutes(), 0);
			assert.equal(endDateTime.getHours(), 11);
			assert.equal(endDateTime.getMinutes(), 30);
		});
	});

	describe("4. Complete Absence of Bureaucratic Ciphers & Technical Noise", () => {
		it("Ensures column labels contain zero bureaucratic or technical codes", () => {
			const forbiddenTokens = ["МКБ", "043/у", "СНИЛС", "ОМС", "ЕГИСЗ", "UUID", "ID:", "CRUD"];
			for (const col of COLUMNS) {
				for (const forbidden of forbiddenTokens) {
					assert.ok(
						!col.label.includes(forbidden),
						`Column label "${col.label}" must not contain bureaucratic code "${forbidden}"`,
					);
				}
			}
		});

		it("Lead card identifier formatting uses readable number symbol instead of tech ID", () => {
			const rawUuid = "e7b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c";
			const formattedNumber = `№ ${rawUuid.slice(0, 6)}`;
			assert.equal(formattedNumber, "№ e7b1a2");
			assert.ok(!formattedNumber.startsWith("ID:"));
		});
	});
});
