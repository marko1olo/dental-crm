import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ImplantPassportModal } from "../ImplantPassportModal";
// Канонический алиас после ликвидации дублирующего файла-клона (Мандат 8s)
const ImplantSurgeryProtocolModal = ImplantPassportModal;

describe("Implant Passport Modal & Protocol Views (Mandates 8e, 8x)", () => {
	it("4. ImplantPassportModal renders without certificate blocks and with soft overdraft", () => {
		const html = renderToString(
			<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} patientName="Сидоров А. В." />,
		);
		assert.ok(html.includes("implant-passport-modal"));
		assert.ok(html.includes("Протокол &amp; Паспорт имплантата") || html.includes("Паспорт имплантата"));
		assert.ok(html.includes("46"));
		assert.ok(html.includes("btn-system-Osstem"));
		assert.ok(html.includes("btn-system-Straumann"));
		assert.ok(html.includes("select-diameter"));
		assert.ok(html.includes("select-length"));
		assert.ok(html.includes("select-torque"));
		assert.ok(html.includes("btn-save-implant-passport"));
		assert.ok(!html.includes("disabled"));
	});

	it("5. ImplantPassportModal returns empty string when isOpen is false", () => {
		const html = renderToString(<ImplantPassportModal isOpen={false} onClose={() => {}} />);
		assert.equal(html, "");
	});

	it("7. ImplantPassportModal renders capType toggle buttons and min-h-[44px] touch targets", () => {
		const html = renderToString(
			<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={36} patientName="Иванов И. И." />,
		);
		assert.ok(html.includes("btn-cap-type-fdm"));
		assert.ok(html.includes("btn-cap-type-plug"));
		assert.ok(html.includes("min-h-[44px]") || html.includes("min-h-[48px]"));
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2702}-\u{2712}\u{2715}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Must not contain emojis");
	});

	it("9. ImplantPassportModal renders compact brand toolbar per Hick's Law", () => {
		const html = renderToString(<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} />);
		assert.ok(html.includes("implant-brand-toolbar"));
		assert.ok(html.includes("implant-system-pill"));
		assert.ok(html.includes('role="toolbar"'));
	});

	it("10. ImplantPassportModal enforces Miller's Law (<= 2 action buttons in footer)", () => {
		const html = renderToString(<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} />);
		assert.ok(html.includes("implant-passport-actions"));
		assert.ok(html.includes("Печать паспорта"));
		assert.ok(html.includes("✓ Зафиксировать протокол имплантации"));
		assert.ok(!html.includes("043/у"));
		const footerMatch = html.match(/<footer class="implant-passport-actions[^"]*"[^>]*>([\s\S]*?)<\/footer>/);
		assert.ok(footerMatch);
		const buttonCount = (String(footerMatch?.[1] ?? "").match(/<button/g) || []).length;
		assert.ok(buttonCount <= 2, `Footer must have at most 2 action buttons, found ${buttonCount}`);
	});

	it("16. ImplantPassportModal renders interactive tooth selector, LOT, SN and Ankylos", () => {
		const html = renderToString(<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} />);
		assert.ok(html.includes("btn-system-Ankylos"));
		assert.ok(html.includes("select-tooth-fdi"));
		assert.ok(html.includes("input-tooth-fdi"));
		assert.ok(html.includes("btn-quick-tooth-16"));
		assert.ok(html.includes("btn-quick-tooth-46"));
		assert.ok(html.includes("input-lot-number"));
		assert.ok(html.includes("input-serial-number"));
		assert.ok(html.includes("input-catalog-article"));
	});

	it("17. ImplantPassportModal renders primary stability controls and zero procedure ISQ simulation", () => {
		const html = renderToString(<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} />);
		assert.ok(html.includes("btn-quick-torque-35"));
		assert.ok(html.includes("select-torque"));
		assert.ok(html.includes("isq-stability-passive-badge"));
		assert.ok(!html.includes("slider-isq-day0"));
		assert.ok(!html.includes("input-isq-day0"));
	});

	it("32. ImplantSurgeryProtocolModal renders with full parity to ImplantPassportModal", () => {
		const html = renderToString(
			<ImplantSurgeryProtocolModal
				isOpen={true} onClose={() => {}} initialTooth={46} patientName="Ковалёв Р. С." doctorName="Д-р Воронов А. В."
			/>,
		);
		assert.ok(html.includes("implant-passport-modal"));
		assert.ok(html.includes("Ковалёв Р. С."));
		assert.ok(html.includes("Д-р Воронов А. В."));
		assert.ok(!html.includes("disabled"));
	});

	it("35. ImplantPassportModal renders post-op memo tab with 1-click WhatsApp and Telegram actions", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true} onClose={() => {}} initialTooth={46} initialTab="memo" patientName="Смирнов В. И."
			/>,
		);
		assert.ok(html.includes("implant-tab-memo"));
		assert.ok(html.includes("tab-content-memo"));
		assert.ok(html.includes("btn-memo-send-whatsapp"));
		assert.ok(html.includes("btn-memo-send-telegram"));
		assert.ok(html.includes("btn-memo-copy-text"));
		assert.ok(html.includes("btn-memo-print"));
		assert.ok(html.includes("15 минут") || html.includes("15 мин"));
		assert.ok(html.includes("хлоргексидин") || html.includes("хлоргексидина"));
		// Проверка запрета чужих CRM и птичьего языка (Мандаты 8ap, 8x)
		assert.ok(!html.includes("StomX") && !html.includes("DentalPRO") && !html.includes("IDENT") && !html.includes("iStom"));
		assert.ok(!html.includes("043/у") && !html.includes("804н") && !html.includes("257/у"));
	});
});
