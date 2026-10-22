import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { expect } from "./messageDeliveryTestFixtures";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("MessageDeliveryConsole Source Code Invariants (Mandate 8e)", () => {
	it("5. source code audit: textarea #enqueue-body has no disabled property", () => {
		const enqueuePath = fs.existsSync(path.resolve(__dirname, "../deliveryConsole/DeliveryEnqueueForm.tsx"))
			? path.resolve(__dirname, "../deliveryConsole/DeliveryEnqueueForm.tsx")
			: path.resolve(__dirname, "../MessageDeliveryConsole.tsx");
		const sourceCode = fs.readFileSync(enqueuePath, "utf-8");

		const textareaMatch = sourceCode.match(/<textarea[\s\S]*?id="enqueue-body"[\s\S]*?\/>/);
		expect(textareaMatch).toBeTruthy();
		if (textareaMatch) {
			expect(textareaMatch[0]).not.toContain("disabled");
		}
	});

	it("6. source code audit: outbox enqueue button and template save button are not blocked by empty inputs or background sync (Mandate 8e)", () => {
		const enqueuePath = fs.existsSync(path.resolve(__dirname, "../deliveryConsole/DeliveryEnqueueForm.tsx"))
			? path.resolve(__dirname, "../deliveryConsole/DeliveryEnqueueForm.tsx")
			: path.resolve(__dirname, "../MessageDeliveryConsole.tsx");
		const templatePath = fs.existsSync(path.resolve(__dirname, "../deliveryConsole/DeliveryTemplatesSection.tsx"))
			? path.resolve(__dirname, "../deliveryConsole/DeliveryTemplatesSection.tsx")
			: path.resolve(__dirname, "../MessageDeliveryConsole.tsx");
		const enqueueCode = fs.readFileSync(enqueuePath, "utf-8");
		const templateCode = fs.readFileSync(templatePath, "utf-8");

		expect(enqueueCode).not.toContain("disabled={!enqueueCanSubmit || !enqueueRecipient");
		expect(enqueueCode).toContain("disabled={enqueueBusy}");
		expect(templateCode).not.toContain("disabled={busy || !draftTitle.trim() || !draftBody.trim()}");
		expect(templateCode).toContain("disabled={busy}\n\t\t\t\t\tonClick={() => void saveTemplate()}");
	});
});
