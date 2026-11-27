import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import { CampaignPanel } from "../CampaignPanel";
import { describeDispatchReport } from "../deliveryReportNotice";
import { summarizeJournal } from "../journalDigest";
import { mockAppContext } from "./messageDeliveryTestFixtures";

(globalThis as { React?: typeof React }).React = React;

describe("Red Team Inquisition: Mandate 8i — CRM != Reality Simulator", () => {
	it("1. Rendered MessageDeliveryConsole and CampaignPanel contain zero fake simulator phrases or disabled locks", () => {
		const consoleHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole)),
		);
		const campaignHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(CampaignPanel)),
		);
		for (const html of [consoleHtml, campaignHtml]) {
			assert.equal(html.includes("fakeSimulation"), false);
			assert.equal(html.includes("spamScore"), false);
			assert.equal(html.includes("mockDispatch"), false);
		}
	});

	it("2. Real queue states and direct channel logging supported", () => {
		const report = describeDispatchReport({
			claimed: 3, sent: 3, retried: 0, failed: 0, suppressed: 0,
			notConfigured: 0, deferred: 0, releasedStuck: 0, awaitingRetry: 0, awaitingSchedule: 0,
		});
		assert.equal(report.kind, "done");
		assert.match(report.text, /Отправлено: 3 сообщения/);

		const digest = summarizeJournal([
			{ direction: "outbound", status: "delivered" },
			{ direction: "inbound", status: "delivered" },
		]);
		assert.equal(digest.phase, "ready");
		assert.equal(digest.total, 2);
		assert.equal(digest.undelivered, 0);
	});
});

describe("Red Team Inquisition: Mandate 8d pt 7 — Zero Cartoon Emojis", () => {
	it("1. Zero raw cartoon emojis in rendered delivery console, campaign panel, and digest outputs", () => {
		const consoleHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole)),
		);
		const campaignHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(CampaignPanel)),
		);
		const report = describeDispatchReport({
			claimed: 1, sent: 1, retried: 0, failed: 0, suppressed: 0,
			notConfigured: 0, deferred: 0, releasedStuck: 0, awaitingRetry: 0, awaitingSchedule: 0,
		});
		const digest = summarizeJournal([{ direction: "outbound", status: "delivered" }]);
		const emojiRegex = /\p{Extended_Pictographic}/u;

		assert.equal(emojiRegex.test(consoleHtml), false, "MessageDeliveryConsole markup must be free of cartoon emojis");
		assert.equal(emojiRegex.test(campaignHtml), false, "CampaignPanel markup must be free of cartoon emojis");
		assert.equal(emojiRegex.test(report.text), false, "Dispatch report must be free of cartoon emojis");
		assert.equal(emojiRegex.test(digest.headline ?? ""), false);
	});
});

describe("Red Team Inquisition: Mandate 8d pt 3 & pt 6 — Anti-Matryoshka & Desktop Density", () => {
	it("1. Max modal depth = 1: rendered communications panels do not nest dialogs or layered card-body wrappers", () => {
		const consoleHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole)),
		);
		const campaignHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(CampaignPanel)),
		);
		for (const html of [consoleHtml, campaignHtml]) {
			const modalCount = (html.match(/<dialog\b/g) || []).length;
			assert.ok(modalCount <= 1, "Communications panels must not nest <dialog> elements");
			assert.equal(html.includes("card-body card"), false);
		}
	});

	it("2. Desktop Density First: No hardcoded min-height:44px inline style bloat in CampaignPanel markup", () => {
		const campaignHtml = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(CampaignPanel)),
		);
		assert.equal(campaignHtml.includes("min-height:44px"), false);
	});
});
