import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("Message Templates & Messengers Zero Cartoon Emoji Inquisition (Mandate 8d pt 7 & Anti-Bloat)", async (t) => {
	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	const templatesPath = path.resolve(
		srcDir,
		"components/settings/SettingsMessageTemplatesTab.tsx",
	);
	const messengersPath = path.resolve(
		srcDir,
		"components/settings/SettingsMessengersTab.tsx",
	);

	const templatesSource = fs.readFileSync(templatesPath, "utf-8");
	const messengersSource = fs.readFileSync(messengersPath, "utf-8");

	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

	await t.test(
		"1. SettingsMessageTemplatesTab file length strictly < 800 lines (Mandate Rule 1)",
		() => {
			const lineCount = templatesSource.split("\n").length;
			assert.ok(
				lineCount < 800,
				`SettingsMessageTemplatesTab.tsx must be < 800 lines, got ${lineCount}`,
			);
		},
	);

	await t.test(
		"2. SettingsMessageTemplatesTab contains 0 raw cartoon emojis (Mandate 8d pt 7)",
		() => {
			const lines = templatesSource.split("\n");
			for (const line of lines) {
				assert.ok(
					!emojiRegex.test(line),
					`Found cartoon emoji in SettingsMessageTemplatesTab.tsx: ${line.trim()}`,
				);
			}
		},
	);

	await t.test(
		"3. SettingsMessageTemplatesTab has 0 emoji bars or emoji pickers",
		() => {
			assert.ok(
				!templatesSource.includes("EMOJI_LIST"),
				"EMOJI_LIST must be completely eliminated",
			);
			assert.ok(
				!templatesSource.includes("emoji-bar"),
				"emoji-bar markup must be completely eliminated",
			);
			assert.ok(
				!templatesSource.includes("insertEmojiAtCursor"),
				"insertEmojiAtCursor helper must be eliminated",
			);
		},
	);

	await t.test(
		"4. SettingsMessageTemplatesTab uses vector Lucide icons for mockup preview",
		() => {
			assert.ok(
				templatesSource.includes("<Battery"),
				"Phone status bar must use Lucide Battery vector icon",
			);
			assert.ok(
				templatesSource.includes("<Building2") || templatesSource.includes("<MessageSquare"),
				"Phone avatar must use vector icon instead of cartoon tooth emoji",
			);
			assert.ok(
				templatesSource.includes("<CheckCheck"),
				"Double checkmark must use Lucide CheckCheck vector icon",
			);
		},
	);

	await t.test(
		"5. SettingsMessengersTab contains 0 raw cartoon emojis (Mandate 8d pt 7)",
		() => {
			const lines = messengersSource.split("\n");
			for (const [index, line] of lines.entries()) {
				assert.ok(
					!emojiRegex.test(line),
					`Found cartoon emoji on line ${index + 1} in SettingsMessengersTab.tsx: ${line.trim()}`,
				);
			}
		},
	);

	await t.test(
		"6. SettingsMessageTemplatesTab contains 1-click essential macro chips {patient_name}, {doctor_name}, {time}, {clinic_address}",
		() => {
			assert.ok(
				templatesSource.includes("{patient_name}"),
				"Template editor must include {patient_name} macro",
			);
			assert.ok(
				templatesSource.includes("{doctor_name}"),
				"Template editor must include {doctor_name} macro",
			);
			assert.ok(
				templatesSource.includes("{time}"),
				"Template editor must include {time} macro",
			);
			assert.ok(
				templatesSource.includes("{clinic_address}"),
				"Template editor must include {clinic_address} macro",
			);
		},
	);

	await t.test(
		"7. ReminderCadenceConfigPanel and PublicBookingLinkPanel strictly < 800 lines and 0 emojis",
		() => {
			const cadencePath = path.resolve(
				srcDir,
				"components/settings/ReminderCadenceConfigPanel.tsx",
			);
			const bookingPath = path.resolve(
				srcDir,
				"components/settings/PublicBookingLinkPanel.tsx",
			);
			const adminPath = path.resolve(
				srcDir,
				"components/settings/AdminSettingsSection.tsx",
			);

			const cadenceSource = fs.readFileSync(cadencePath, "utf-8");
			const bookingSource = fs.readFileSync(bookingPath, "utf-8");
			const adminSource = fs.readFileSync(adminPath, "utf-8");

			assert.ok(
				cadenceSource.split("\n").length < 800,
				"ReminderCadenceConfigPanel must be < 800 lines",
			);
			assert.ok(
				bookingSource.split("\n").length < 800,
				"PublicBookingLinkPanel must be < 800 lines",
			);
			assert.ok(
				adminSource.split("\n").length < 800,
				"AdminSettingsSection must be < 800 lines",
			);

			for (const [file, src] of [
				["cadence", cadenceSource],
				["booking", bookingSource],
				["admin", adminSource],
			]) {
				if (!src) continue;
				for (const line of src.split("\n")) {
					assert.ok(
						!emojiRegex.test(line),
						`Found cartoon emoji in ${file}: ${line.trim()}`,
					);
				}
			}
		},
	);
});
