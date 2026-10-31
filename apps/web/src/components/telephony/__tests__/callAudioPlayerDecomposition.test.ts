import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

describe("CallAudioPlayer Red Team Invariant Verification", () => {
	const telephonyDir = fs.existsSync(
		path.resolve(process.cwd(), "apps/web/src/components/telephony"),
	)
		? path.resolve(process.cwd(), "apps/web/src/components/telephony")
		: path.resolve(process.cwd(), "src/components/telephony");

	const audioPlayerDir = path.join(telephonyDir, "audioPlayer");

	const filesToCheck = [
		path.join(telephonyDir, "CallAudioPlayer.tsx"),
		path.join(audioPlayerDir, "types.ts"),
		path.join(audioPlayerDir, "useCallAudioPlayerState.ts"),
		path.join(audioPlayerDir, "CallAudioPlaybackControls.tsx"),
		path.join(audioPlayerDir, "CallAudioWaveformBar.tsx"),
		path.join(audioPlayerDir, "CallAudioTranscriptView.tsx"),
		path.join(audioPlayerDir, "CallAudioEmptyState.tsx"),
	];

	test("Mandate 8b / 8zi: Strict sweet-spot file limits (all files under 200 lines)", () => {
		for (const file of filesToCheck) {
			assert.ok(fs.existsSync(file), `File must exist: ${file}`);
			const lineCount = fs.readFileSync(file, "utf-8").split("\n").length;
			assert.ok(
				lineCount <= 200,
				`File ${path.basename(file)} must not exceed 200 lines limit (current: ${lineCount})`,
			);
		}
	});

	test("Mandate 8ap: Zero competitor brand names in telephony audio player", () => {
		const forbiddenBrands = ["StomX", "DentalPRO", "IDENT", "iStom", "stomx", "dentalpro", "istom"];
		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf-8");
			for (const brand of forbiddenBrands) {
				assert.ok(
					!content.includes(brand),
					`Forbidden competitor brand "${brand}" found in ${path.basename(file)}`,
				);
			}
		}
	});

	test("Mandate 8x & 8ap: Zero bureaucratic legalese and statute numbers in UI labels", () => {
		const forbiddenStatutes = ["54-ФЗ", "54ФЗ", "152-ФЗ", "152ФЗ", "804н", "043/у", "043у"];
		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf-8");
			for (const statute of forbiddenStatutes) {
				assert.ok(
					!content.includes(statute),
					`Bureaucratic statute "${statute}" must not be hardcoded in ${path.basename(file)}`,
				);
			}
		}
	});

	test("Apple HIG & Ergonomics: Single Primary CTA, Touch Targets >= 44x44px and Speed chips", () => {
		const controlsContent = fs.readFileSync(
			path.join(audioPlayerDir, "CallAudioPlaybackControls.tsx"),
			"utf-8",
		);

		// Exactly one primary CTA button with teal accent
		assert.ok(
			controlsContent.includes("bg-[var(--teal,#0d9488)]"),
			"Primary CTA play/pause button must use teal brand accent",
		);
		assert.ok(
			controlsContent.includes("data-testid=\"call-audio-player-toggle\""),
			"Play toggle must be discoverable via testid",
		);

		// Touch target >= 44x44px on coarse pointers
		assert.ok(
			controlsContent.includes("min-h-[44px] min-w-[44px]"),
			"Controls must enforce Apple HIG >= 44x44px touch targets",
		);
		assert.ok(
			controlsContent.includes("touch-manipulation"),
			"Buttons must apply touch-action: manipulation to eliminate 300ms tap delay",
		);

		// Playback speeds
		assert.ok(
			controlsContent.includes("CALL_AUDIO_PLAYBACK_SPEEDS"),
			"Controls must import CALL_AUDIO_PLAYBACK_SPEEDS array",
		);
	});

	test("Transcript View: Symmetrical speaker labels and quick copy", () => {
		const transcriptContent = fs.readFileSync(
			path.join(audioPlayerDir, "CallAudioTranscriptView.tsx"),
			"utf-8",
		);
		const hookContent = fs.readFileSync(
			path.join(audioPlayerDir, "useCallAudioPlayerState.ts"),
			"utf-8",
		);

		assert.ok(
			transcriptContent.includes("data-testid=\"audio-transcript-toggle\""),
			"Transcript view must include toggle button",
		);
		assert.ok(
			transcriptContent.includes("Оператор") && transcriptContent.includes("Пациент"),
			"Transcript view must render clean clinical speaker designations",
		);
		assert.ok(
			transcriptContent.includes("onCopyTranscript"),
			"Transcript view must trigger onCopyTranscript handler",
		);
		assert.ok(
			hookContent.includes("navigator.clipboard?.writeText"),
			"Transcript copying state hook must use native clipboard API",
		);
	});
});
