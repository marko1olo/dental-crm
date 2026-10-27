/**
 * cephLandmarksGrammar.ts — Распознавание голосовых команд разметки ТРГ/цефалометрических ориентиров
 */

import type { CephLandmarkVoiceItem } from "../types";

export function extractCephLandmarksVoiceIntent(text: string): CephLandmarkVoiceItem[] {
	if (!text || typeof text !== "string") return [];
	const lower = text.toLowerCase().replace(/ё/g, "е").trim();

	const isCephContext =
		lower.includes("точка") || lower.includes("ориентир") ||
		lower.includes("трг") || lower.includes("цефалометр") ||
		lower.includes("штайнер") || lower.includes("твид") ||
		lower.includes("назион") || lower.includes("сэлла") ||
		lower.includes("селла") || lower.includes("седло") ||
		lower.includes("субспинале") || lower.includes("супраментале") ||
		lower.includes("погонион") || lower.includes("гнатион") ||
		lower.includes("ментон") || lower.includes("гонион") ||
		lower.includes("орбитале") || lower.includes("порион");

	if (!isCephContext) return [];

	const results: CephLandmarkVoiceItem[] = [];

	const LANDMARK_VOICE_RULES = [
		{ key: "S", nameRu: "Sella (Седло)", aliases: ["сэлла", "селла", "седло", "турецкое седло", "точка s", "точка с", "точка эс"] },
		{ key: "N", nameRu: "Nasion (Назион)", aliases: ["назион", "насион", "nasion", "носолобный шов", "точка n", "точка н", "точка эн"] },
		{ key: "A", nameRu: "Точка A (Субспинале)", aliases: ["субспинале", "subspinale", "точка а", "точка a", "апикальный базис верхней челюсти", "базис вч"] },
		{ key: "B", nameRu: "Точка B (Супраментале)", aliases: ["супраментале", "supramentale", "точка б", "точка в", "точка b", "апикальный базис нижней челюсти", "базис нч"] },
		{ key: "Pog", nameRu: "Pogonion (Погонион)", aliases: ["погонион", "pogonion", "точка погонион", "выступ подбородка"] },
		{ key: "Gn", nameRu: "Gnathion (Гнатион)", aliases: ["гнатион", "gnathion", "точка гнатион"] },
		{ key: "Me", nameRu: "Menton (Ментон)", aliases: ["ментон", "menton", "точка ментон", "низ симфиза"] },
		{ key: "Go", nameRu: "Gonion (Гонион)", aliases: ["гонион", "gonion", "точка гонион", "угол нижней челюсти", "угол челюсти"] },
		{ key: "Or", nameRu: "Orbitale (Орбитале)", aliases: ["орбитале", "orbitale", "точка орбитале", "край глазницы"] },
		{ key: "Po", nameRu: "Porion (Порион)", aliases: ["порион", "porion", "точка порион", "слуховой проход"] },
		{ key: "ANS", nameRu: "ANS (Передняя носовая ость)", aliases: ["ans", "пнс", "передняя носовая ость", "точка ans"] },
		{ key: "PNS", nameRu: "PNS (Задняя носовая ость)", aliases: ["pns", "знс", "задняя носовая ость", "точка pns"] },
		{ key: "U1t", nameRu: "U1 Tip (Край верхнего резца)", aliases: ["u1 tip", "u1tip", "режущий край верхнего резца", "край верхнего резца", "коронка верхнего резца"] },
		{ key: "U1a", nameRu: "U1 Apex (Корень верхнего резца)", aliases: ["u1 apex", "u1apex", "верхушка верхнего резца", "корень верхнего резца", "апекс верхнего резца"] },
		{ key: "L1t", nameRu: "L1 Tip (Край нижнего резца)", aliases: ["l1 tip", "l1tip", "режущий край нижнего резца", "край нижнего резца", "коронка нижнего резца"] },
		{ key: "L1a", nameRu: "L1 Apex (Корень нижнего резца)", aliases: ["l1 apex", "l1apex", "верхушка нижнего резца", "корень нижнего резца", "апекс нижнего резца"] },
	];

	for (const rule of LANDMARK_VOICE_RULES) {
		for (const alias of rule.aliases) {
			const regex = new RegExp(`(?:^|[^a-zа-я0-9])${alias}(?:$|[^a-zа-я0-9])`, "i");
			if (regex.test(lower)) {
				results.push({
					landmarkKey: rule.key,
					landmarkNameRu: rule.nameRu,
					action: lower.includes("сброс") || lower.includes("удалить") ? "clear" : "select",
				});
				break;
			}
		}
	}

	return results;
}
