import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	FamilyBalanceShareWidget,
	DEFAULT_PRESET_FAMILY_WALLET,
	type FamilyGroupWalletData,
} from "../FamilyBalanceShareWidget.js";

describe("FamilyBalanceShareWidget (PWA Mobile Portal & Family Wallet)", () => {
	it("renders total family balance, discount badge, and owner header correctly", () => {
		const html = renderToString(
			<FamilyBalanceShareWidget data={DEFAULT_PRESET_FAMILY_WALLET} />,
		);

		// Group name & balance
		assert.ok(html.includes("Семья Ивановых"));
		assert.ok(html.includes("45") && html.includes("000"));
		assert.ok(html.includes("Скидка семьи 7%"));
		assert.ok(html.includes("Пополнить через СБП 0%"));
	});

	it("renders all family members with relationship labels and 323-FZ proxy badges", () => {
		const html = renderToString(
			<FamilyBalanceShareWidget data={DEFAULT_PRESET_FAMILY_WALLET} />,
		);

		// Members
		assert.ok(html.includes("Иванова Анна Сергеевна"));
		assert.ok(html.includes("Мама (Владелец счёта)"));
		assert.ok(html.includes("Владелец"));

		assert.ok(html.includes("Иванов Петр Николаевич"));
		assert.ok(html.includes("Папа"));

		assert.ok(html.includes("Иванов Михаил Петрович"));
		assert.ok(html.includes("Сын (Ребёнок)"));
		assert.ok(html.includes("7 лет"));
		assert.ok(html.includes("Законный представитель: Иванова А.С. (ст. 20, 54 323-ФЗ)"));

		assert.ok(html.includes("Иванова София Петровна"));
		assert.ok(html.includes("Дочь (Подросток)"));
		assert.ok(html.includes("12 лет"));
	});

	it("renders child auto-debit toggle switch and 323-FZ legal note", () => {
		const html = renderToString(
			<FamilyBalanceShareWidget data={DEFAULT_PRESET_FAMILY_WALLET} />,
		);

		assert.ok(html.includes("Оплачивать приёмы детей из семейного счёта"));
		assert.ok(html.includes("Автоматически списывать счета за лечение детей до 18 лет"));
		assert.ok(html.includes("Основание 323-ФЗ РФ (ст. 20, 54)"));
		assert.ok(html.includes("Законный представитель вправе распоряжаться семейным счётом"));
	});

	it("renders custom family group data with different balance and members", () => {
		const customData: FamilyGroupWalletData = {
			groupId: "fam-grp-custom",
			groupName: "Семья Кузнецовых",
			totalBalanceKopecks: 8200000, // 82 000 ₽
			totalBalanceRub: 82000,
			familyDiscountPercent: 10,
			ownerPatientId: "pat-999",
			ownerFullName: "Кузнецов Дмитрий Олегович",
			autoDebitChildrenEnabled: false,
			monthlySpentKopecks: 0,
			members: [
				{
					id: "pat-999",
					fullName: "Кузнецов Дмитрий Олегович",
					relationship: "owner",
					relationshipLabelRu: "Глава семьи",
					individualBalanceKopecks: 0,
					canSpendFamilyBalance: true,
					proxy323FzStatus: "not_required",
				},
				{
					id: "pat-1000",
					fullName: "Кузнецова Алина Дмитриевна",
					relationship: "child",
					relationshipLabelRu: "Дочь",
					ageYears: 5,
					isMinor: true,
					individualBalanceKopecks: 0,
					canSpendFamilyBalance: false,
					proxy323FzStatus: "active_legal_proxy",
					proxy323FzDetails: "Законный представитель: Кузнецов Д.О. (323-ФЗ)",
				},
			],
		};

		const html = renderToString(
			<FamilyBalanceShareWidget data={customData} />,
		);

		assert.ok(html.includes("Семья Кузнецовых"));
		assert.ok(html.includes("82") && html.includes("000"));
		assert.ok(html.includes("Скидка семьи 10%"));
		assert.ok(html.includes("Кузнецова Алина Дмитриевна"));
		assert.ok(html.includes("Запрещено"));
	});
});
