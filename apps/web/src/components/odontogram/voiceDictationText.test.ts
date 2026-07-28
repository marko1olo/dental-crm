/*
 * voiceDictationText.test.ts — окно диктовки объясняет, почему оно молчит.
 *
 * Прежде ошибка распознавания уходила только в console.error, и врач видел
 * открытое окно без слов, без кнопок и без объяснения. Чаще всего причина —
 * запрет доступа к микрофону, то есть само по себе это никогда не заработает.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	VOICE_DICTATION_UNSUPPORTED_TEXT,
	voiceDictationErrorText,
} from "./voiceDictationText";

test("запрет микрофона объяснён, и сказано, где его разрешить", () => {
	const text = voiceDictationErrorText("not-allowed");
	assert.ok(text.includes("микрофон"), text);
	assert.ok(text.includes("браузера"), "не сказано, где разрешать");
	assert.equal(voiceDictationErrorText("service-not-allowed"), text);
});

test("у каждой известной причины свой следующий шаг", () => {
	const texts = [
		voiceDictationErrorText("not-allowed"),
		voiceDictationErrorText("audio-capture"),
		voiceDictationErrorText("no-speech"),
		voiceDictationErrorText("network"),
		voiceDictationErrorText("aborted"),
	];
	assert.equal(new Set(texts).size, texts.length, "две причины дают один текст");
});

test("незнакомый и отсутствующий код не показывают английское слово", () => {
	for (const code of ["bad-grammar", "", null, undefined, 500, {}]) {
		const text = voiceDictationErrorText(code);
		assert.ok(text.length > 0);
		assert.ok(!/[A-Za-z]/.test(text), `в тексте латиница: ${text}`);
	}
});

test("ни один текст ошибки не содержит латиницы и кода", () => {
	for (const code of [
		"not-allowed",
		"service-not-allowed",
		"audio-capture",
		"no-speech",
		"network",
		"aborted",
	]) {
		const text = voiceDictationErrorText(code);
		assert.ok(!text.includes(code), `код ${code} утёк в текст для человека`);
	}
});

test("текст про неподдерживаемый браузер не выглядит распознанной речью", () => {
	// БЫЛО: эта фраза записывалась в transcript, и её можно было отправить на
	// разбор как содержание приёма.
	assert.ok(VOICE_DICTATION_UNSUPPORTED_TEXT.includes("вручную"), "нет следующего шага");
	assert.ok(VOICE_DICTATION_UNSUPPORTED_TEXT.includes("не умеет распознавать речь"));
});
