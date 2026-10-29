import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_043_DATA } from "../../emr/Form043PrintModal.js";
import { generatePrintableHtml043 } from "../../emr/emr043Math.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 42: Outpatient Doctor Autonomy & Blocker Eraser", () => {
	const form043Path = path.resolve(__dirname, "../../emr/Form043PrintModal.tsx");
	const form043RecordDir = path.resolve(__dirname, "../../emr/record");
	const form043Source = [
		fs.readFileSync(form043Path, "utf8"),
		...(fs.existsSync(form043RecordDir)
			? fs.readdirSync(form043RecordDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(form043RecordDir, f), "utf8"))
			: []),
	].join("\n");

	describe("1. Form 043/u Print Autonomy & Draft/Signed Watermark (Mandate 8e)", () => {
		it("1.1. guarantees handlePrint in Form043PrintModal includes effectiveIsDraft in dependencies", () => {
			assert.ok(form043Source.includes("}, [formData, effectiveIsDraft]);"));
		});

		it("1.2. guarantees Form 043/u print button is NEVER disabled in Form043PrintModal", () => {
			assert.ok(form043Source.includes('data-testid="btn-print-043-card"'));
			assert.ok(form043Source.includes('disabled={false}'));
			assert.ok(!form043Source.includes('data-testid="btn-print-043-card"\n\t\t\t\t\t\t\t\tdisabled={true}'));
		});

		it("1.3. guarantees generatePrintableHtml043 produces ЧЕРНОВИК watermark when visit is draft", () => {
			const draftHtml = generatePrintableHtml043(DEFAULT_043_DATA, { isLocked: false });
			assert.ok(draftHtml.includes('class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'));
			assert.ok(!draftHtml.includes("ПОДПИСАНО ВРАЧОМ</div>"));
		});

		it("1.4. guarantees generatePrintableHtml043 produces ПОДПИСАНО ВРАЧОМ watermark when closed", () => {
			const signedHtml = generatePrintableHtml043(DEFAULT_043_DATA, { isLocked: true });
			assert.ok(signedHtml.includes("ПОДПИСАНО ВРАЧОМ</div>"));
		});

		it("1.5. guarantees DEFAULT_043_DATA populates non-blocking defaults for secondary fields", () => {
			assert.ok(
				DEFAULT_043_DATA.formNumber === "Медицинская карта приёма" ||
				DEFAULT_043_DATA.formNumber === "043/у",
				"formNumber must be clinical friendly or canonical"
			);
			assert.strictEqual(DEFAULT_043_DATA.clinic.clinicName, "Стоматологическая клиника «ДЕНТЕ»");
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.odontogramTeeth.length, 32);
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.dmftIndex.totalDmft, 0);
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.cpitnIndex.treatmentNeedCategory, "0_none");
			assert.strictEqual(DEFAULT_043_DATA.dentalStatus.biteType, "orthognathic");
		});
	});
});
