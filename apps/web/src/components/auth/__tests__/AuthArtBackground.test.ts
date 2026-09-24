import assert from "node:assert";
import { describe, it } from "node:test";
import type { AuthArtItem } from "../authArtSelector";
import { selectAuthArt } from "../authArtSelector";

/**
 * БЫЛО: файл писался под vitest, а vitest в проекте не установлен — ни в
 * корне, ни в одном из пакетов. Прогон падал на
 * ERR_MODULE_NOT_FOUND ещё до первого утверждения, то есть этот тест не
 * выполнялся ни разу. Переписан на node:test и node:assert, как остальные
 * двадцать один тестовый файл веб-пакета. Проверяемые утверждения те же.
 */
describe("selectAuthArt", () => {
	const mockManifest: AuthArtItem[] = [
		{
			pack: "nature",
			slot: "morning",
			avif: "a1",
			webp: "w1",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
		{
			pack: "nature",
			slot: "morning",
			avif: "a2",
			webp: "w2",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
		{
			pack: "nature",
			slot: "day",
			avif: "a3",
			webp: "w3",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
		{
			pack: "dental-epic",
			slot: "day",
			avif: "a4",
			webp: "w4",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
		{
			pack: "abstract",
			slot: "morning",
			avif: "a5",
			webp: "w5",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
		{
			pack: "anime",
			slot: "evening",
			avif: "a6",
			webp: "w6",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
		{
			pack: "anime",
			slot: "evening",
			avif: "a7",
			webp: "w7",
			lqip: "",
			dominantColor: "",
			width: 1,
			height: 1,
		},
	];

	it("ничего не выбирает при включённой экономии трафика", () => {
		const result = selectAuthArt(mockManifest, {
			pack: "nature",
			slot: "morning",
			saveData: true,
			reducedMotion: false,
		});
		assert.equal(result, null);
	});

	it("ничего не выбирает, если такого набора нет", () => {
		const result = selectAuthArt(mockManifest, {
			pack: "cyberpunk",
			slot: "morning",
			saveData: false,
			reducedMotion: false,
		});
		assert.equal(result, null);
	});

	it("берёт из нужного времени суток, когда там не меньше двух картинок", () => {
		const result = selectAuthArt(mockManifest, {
			pack: "nature",
			slot: "morning",
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.equal(result?.slot, "morning");
		assert.equal(result?.pack, "nature");
	});

	it("расширяет выбор до всего набора, если во времени суток меньше двух картинок", () => {
		// В dental-epic всего одна картинка, и она на день. Запрос ночи должен
		// расшириться до всего набора, то есть вернуть ту же дневную.
		const result = selectAuthArt(mockManifest, {
			pack: "dental-epic",
			slot: "night",
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.equal(result?.pack, "dental-epic");
		assert.equal(result?.slot, "day");
	});

	it("при одной картинке во времени суток выбирает из всего набора", () => {
		const result = selectAuthArt(mockManifest, {
			pack: "nature",
			slot: "day",
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.equal(result?.pack, "nature");
		// Выбор случайный, поэтому проверяем принадлежность набору, а не
		// конкретный элемент: сгодится любая из трёх картинок nature.
		assert.ok(
			mockManifest.some(
				(item) => item.pack === "nature" && item.avif === result?.avif,
			),
			`вернулась картинка вне набора nature: ${result?.avif}`,
		);
	});

	it("пустой манифест не приводит к исключению", () => {
		const result = selectAuthArt([], {
			pack: "nature",
			slot: "morning",
			saveData: false,
			reducedMotion: false,
		});
		assert.equal(result, null);
	});

	it("при pack = 'all' выбирает элемент из всех подходящих по слоту", () => {
		// В mockManifest есть утренние картинки в nature и abstract (всего 3 шт >= 2)
		const result = selectAuthArt(mockManifest, {
			pack: "all",
			slot: "morning",
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.equal(result?.slot, "morning");
		assert.ok(
			result?.pack === "nature" || result?.pack === "abstract",
			`вернулся элемент с неожиданным паком: ${result?.pack}`,
		);
	});

	it("при pack = 'all' мягко расширяет выборку на весь манифест, если в слоте < 2 элементов", () => {
		// В mockManifest для night 0 картинок, поэтому выбор должен расшириться до всего манифеста
		const result = selectAuthArt(mockManifest, {
			pack: "all",
			slot: "night",
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.ok(
			mockManifest.some((item) => item.avif === result?.avif),
			"результат должен принадлежать манифесту",
		);
	});

	it("корректно выбирает пак anime при запросе 'anime'", () => {
		const result = selectAuthArt(mockManifest, {
			pack: "anime",
			slot: "evening",
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.equal(result?.pack, "anime");
		assert.equal(result?.slot, "evening");
	});

	it("мягкий фоллбэк: если в слоте 0 элементов, экран никогда не остаётся пустым", () => {
		const result = selectAuthArt(mockManifest, {
			pack: "abstract",
			slot: "night", // в abstract только morning
			saveData: false,
			reducedMotion: false,
		});
		assert.notEqual(result, null);
		assert.equal(result?.pack, "abstract");
		assert.equal(result?.slot, "morning");
	});
});
