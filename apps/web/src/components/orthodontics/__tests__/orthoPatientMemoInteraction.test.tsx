import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthodonticVisitProtocolWidget } from "../OrthodonticVisitProtocolWidget.js";
import { copyTextToClipboard } from "../orthoProtocolPrintUtils.js";
import { formatOrthodonticPatientMemo } from "../orthoPatientMemo.js";

describe("Orthodontic Patient Memo Interactive Clipboard Action", () => {
	it("clicking ortho-copy-patient-memo-btn writes formatted patient memo to clipboard and dispatches success toast", async () => {
		let lastCopied = "";
		let lastToast: any = null;

		const oldNavDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
		const oldWin = (globalThis as any).window;

		Object.defineProperty(globalThis, "navigator", {
			value: {
				clipboard: {
					writeText: async (t: string) => { lastCopied = t; },
				},
			},
			configurable: true,
			writable: true,
		});

		(globalThis as any).window = {
			dispatchEvent: (ev: any) => {
				if (ev?.type === "dente-toast" && ev.detail) lastToast = ev.detail;
				return true;
			},
		};

		try {
			const memo = formatOrthodonticPatientMemo({
				patientName: "Петров Петр",
				clinicName: "Стоматология DENTE",
				clinicPhone: "+7 (495) 333-22-11",
				doctorName: "Врач Ортодонтов",
				bracketSystem: "damon_q2",
			});

			copyTextToClipboard(memo, "Памятка пациенту по эластикам и уходу скопирована для мессенджера");
			await new Promise((r) => setTimeout(r, 20));

			assert.ok(lastCopied.length > 0);
			assert.ok(lastCopied.includes("Ортодонтические рекомендации после приёма (клиника «Стоматология DENTE»):"));
			assert.ok(lastCopied.includes("Пациент: Петров Петр"));
			assert.ok(lastCopied.includes("Лечащий врач: Врач Ортодонтов"));
			assert.ok(lastCopied.includes("Памятка пациенту:"));
			assert.ok(lastCopied.includes("+7 (495) 333-22-11"));

			assert.ok(lastToast);
			assert.strictEqual(lastToast.type, "success");
			assert.strictEqual(lastToast.text, "Памятка пациенту по эластикам и уходу скопирована для мессенджера");
			assert.strictEqual(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(lastCopied), false);

			const html = renderToString(
				<OrthodonticVisitProtocolWidget
					isOpen={true}
					onClose={() => {}}
					patientId="pat-42"
					patientName="Петров Петр"
					clinicName="Стоматология DENTE"
					clinicPhone="+7 (495) 333-22-11"
					doctorName="Врач Ортодонтов"
				/>,
			);
			assert.ok(html.includes('data-testid="ortho-copy-patient-memo-btn"'));
		} finally {
			if (oldWin) (globalThis as any).window = oldWin; else delete (globalThis as any).window;
			if (oldNavDesc) Object.defineProperty(globalThis, "navigator", oldNavDesc);
		}
	});
});
