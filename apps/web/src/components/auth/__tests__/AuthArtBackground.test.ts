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
			pack: "anime",
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
});
