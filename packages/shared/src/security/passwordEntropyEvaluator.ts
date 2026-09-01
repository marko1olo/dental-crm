/**
 * passwordEntropyEvaluator.ts — Оценка энтропии паролей сотрудников по Шеннону и комбинаторике.
 *
 * Стандарты безопасности 152-ФЗ, Приказ ФСТЭК № 21 и требования Минздрава РФ:
 * - Минимальная длина пароля медперсонала: 8 символов.
 * - Минимальная энтропия: H >= 50 бит для доступа к персональным данным пациентов и ЭМК.
 * - Запрет словарных паролей, клавиатурных дорожек и тривиальных повторов.
 */

import { z } from "zod";

export type PasswordStrengthLevel =
	| "critical"
	| "weak"
	| "medium"
	| "strong"
	| "military";

export interface PasswordEntropyResult {
	readonly passwordLength: number;
	readonly charsetPoolSize: number;
	readonly combinatorialEntropyBits: number;
	readonly shannonEntropyBits: number;
	readonly effectiveEntropyBits: number;
	readonly scorePercent: number; // 0..100
	readonly level: PasswordStrengthLevel;
	readonly labelRu: string;
	readonly colorHex: string;
	readonly isAcceptableForStaff: boolean; // H >= 50 bits & length >= 8 & not dictionary
	readonly isDictionaryMatch: boolean;
	readonly crackTimeEstimateRu: string;
	readonly recommendations: readonly string[];
	readonly hasLowercase: boolean;
	readonly hasUppercase: boolean;
	readonly hasDigits: boolean;
	readonly hasSpecialSymbols: boolean;
	readonly hasCyrillic: boolean;
}

const COMMON_DICTIONARY_PASSWORDS = new Set([
	"password",
	"123456",
	"12345678",
	"123456789",
	"qwerty",
	"admin",
	"doctor",
	"clinic",
	"dental",
	"dente",
	"secret",
	"master",
	"welcome",
	"111111",
	"000000",
	"123123",
	"654321",
	"qazwsx",
	"zxcvbn",
	"пароль",
	"стоматолог",
	"клиника",
	"врач123",
	"денте123",
	"админ123",
	"йцукен",
	"фывапрол",
	"ячсмить",
	"1234567890",
	"password123",
	"admin123",
	"doctor123",
	"dentist",
	"dentist123",
]);

const KEYBOARD_WALKS = [
	"qwertyuiop",
	"asdfghjkl",
	"zxcvbnm",
	"йцукенгшщзхъ",
	"фывапролджэ",
	"ячсмитьбю",
	"1234567890",
	"0987654321",
	"qazwsxedc",
	"1q2w3e4r",
];

/**
 * Расчет энтропии и оценка надежности пароля сотрудника
 */
export function evaluatePasswordEntropy(password: string): PasswordEntropyResult {
	const raw = String(password ?? "");
	const length = raw.length;

	if (length === 0) {
		return {
			passwordLength: 0,
			charsetPoolSize: 0,
			combinatorialEntropyBits: 0,
			shannonEntropyBits: 0,
			effectiveEntropyBits: 0,
			scorePercent: 0,
			level: "critical",
			labelRu: "Пароль не задан",
			colorHex: "#ef4444",
			isAcceptableForStaff: false,
			isDictionaryMatch: false,
			crackTimeEstimateRu: "Мгновенно",
			recommendations: [
				"Задайте пароль длиной от 8 символов",
				"Используйте строчные и заглавные буквы, цифры и спецсимволы",
			],
			hasLowercase: false,
			hasUppercase: false,
			hasDigits: false,
			hasSpecialSymbols: false,
			hasCyrillic: false,
		};
	}

	const hasLowercaseLat = /[a-z]/.test(raw);
	const hasUppercaseLat = /[A-Z]/.test(raw);
	const hasDigits = /[0-9]/.test(raw);
	const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?/~`'"\\/\s]/.test(raw);
	const hasLowercaseCyr = /[а-яё]/.test(raw);
	const hasUppercaseCyr = /[А-ЯЁ]/.test(raw);

	const hasLowercase = hasLowercaseLat || hasLowercaseCyr;
	const hasUppercase = hasUppercaseLat || hasUppercaseCyr;
	const hasCyrillic = hasLowercaseCyr || hasUppercaseCyr;

	let poolSize = 0;
	if (hasLowercaseLat) poolSize += 26;
	if (hasUppercaseLat) poolSize += 26;
	if (hasDigits) poolSize += 10;
	if (hasSpecial) poolSize += 33;
	if (hasLowercaseCyr) poolSize += 33;
	if (hasUppercaseCyr) poolSize += 33;
	if (poolSize === 0) poolSize = 10;

	// 1. Комбинаторная энтропия: L * log2(Pool)
	const combinatorialEntropy = Math.round(length * Math.log2(poolSize) * 100) / 100;

	// 2. Информационная энтропия Шеннона по частотности символов: -sum(p_i * log2(p_i)) * L
	const freqMap: Record<string, number> = {};
	for (const char of raw) {
		freqMap[char] = (freqMap[char] || 0) + 1;
	}
	let shannonPerChar = 0;
	for (const count of Object.values(freqMap)) {
		const p = count / length;
		shannonPerChar -= p * Math.log2(p);
	}
	const shannonEntropy = Math.round(shannonPerChar * length * 100) / 100;

	// 3. Проверка на словарные совпадения и клавиатурные дорожки
	const normalizedLower = raw.toLowerCase().trim();
	let isDictionaryMatch = COMMON_DICTIONARY_PASSWORDS.has(normalizedLower);
	for (const dictWord of COMMON_DICTIONARY_PASSWORDS) {
		if (normalizedLower.includes(dictWord) && normalizedLower.length <= dictWord.length + 3) {
			isDictionaryMatch = true;
			break;
		}
	}

	let keyboardWalkFound = false;
	for (const walk of KEYBOARD_WALKS) {
		for (let i = 0; i <= walk.length - 4; i++) {
			const sub = walk.substring(i, i + 4);
			const rev = sub.split("").reverse().join("");
			if (normalizedLower.includes(sub) || normalizedLower.includes(rev)) {
				keyboardWalkFound = true;
				break;
			}
		}
		if (keyboardWalkFound) break;
	}

	// 4. Расчет штрафов за повторы символов
	let maxConsecutiveRepeats = 1;
	let currentRepeats = 1;
	for (let i = 1; i < length; i++) {
		if (raw[i] === raw[i - 1]) {
			currentRepeats++;
			if (currentRepeats > maxConsecutiveRepeats) {
				maxConsecutiveRepeats = currentRepeats;
			}
		} else {
			currentRepeats = 1;
		}
	}

	let penaltyFactor = 1.0;
	if (length < 8) penaltyFactor *= 0.55;
	if (maxConsecutiveRepeats >= 3) {
		penaltyFactor *= Math.max(0.4, 1 - (maxConsecutiveRepeats / (length * 1.5)));
	}
	if (keyboardWalkFound) penaltyFactor *= 0.7;

	// 5. Итоговая эффективная энтропия
	let effectiveEntropy = Math.min(combinatorialEntropy, shannonEntropy * 1.3) * penaltyFactor;

	if (isDictionaryMatch) {
		effectiveEntropy = Math.min(effectiveEntropy, 14.5);
	}

	effectiveEntropy = Math.max(0, Math.round(effectiveEntropy * 10) / 10);

	// 6. Оценка уровня надежности
	let level: PasswordStrengthLevel = "critical";
	let labelRu = "Критически слабый";
	let colorHex = "#ef4444";

	if (isDictionaryMatch || effectiveEntropy < 30 || length < 6) {
		level = "critical";
		labelRu = isDictionaryMatch
			? "Критический: словарный пароль"
			: "Критически слабый";
		colorHex = "#ef4444";
	} else if (effectiveEntropy < 50 || length < 8) {
		level = "weak";
		labelRu = "Слабый (недостаточно для 152-ФЗ)";
		colorHex = "#f97316";
	} else if (effectiveEntropy < 65) {
		level = "medium";
		labelRu = "Средний (базовый уровень)";
		colorHex = "#eab308";
	} else if (effectiveEntropy < 85) {
		level = "strong";
		labelRu = "Надёжный (рекомендовано)";
		colorHex = "#3b82f6";
	} else {
		level = "military";
		labelRu = "Максимальный (Enterprise / ЭМК)";
		colorHex = "#10b981";
	}

	// 7. Оценка времени подбора (при 10 млрд хешей/сек)
	let crackTimeEstimateRu = "Мгновенно (< 0.1 сек)";
	if (isDictionaryMatch) {
		crackTimeEstimateRu = "Мгновенно (есть в словарях утечек)";
	} else if (effectiveEntropy < 28) {
		crackTimeEstimateRu = "Меньше 1 секунды";
	} else if (effectiveEntropy < 38) {
		crackTimeEstimateRu = "Несколько секунд";
	} else if (effectiveEntropy < 46) {
		crackTimeEstimateRu = "От нескольких минут до 2 часов";
	} else if (effectiveEntropy < 54) {
		crackTimeEstimateRu = "От 3 дней до 2 месяцев";
	} else if (effectiveEntropy < 65) {
		crackTimeEstimateRu = "От 1 года до 40 лет";
	} else if (effectiveEntropy < 80) {
		crackTimeEstimateRu = "Свыше 5 000 лет";
	} else {
		crackTimeEstimateRu = "Миллиарды лет (стойкость к брутфорсу)";
	}

	// 8. Рекомендации
	const recommendations: string[] = [];
	if (length < 8) {
		recommendations.push("Увеличьте длину пароля минимум до 8-12 символов");
	}
	if (!hasUppercase) {
		recommendations.push("Добавьте хотя бы одну заглавную букву (A-Z или А-Я)");
	}
	if (!hasLowercase) {
		recommendations.push("Добавьте строчные буквы (a-z или а-я)");
	}
	if (!hasDigits) {
		recommendations.push("Добавьте цифры (0-9)");
	}
	if (!hasSpecial) {
		recommendations.push("Добавьте специальные символы (!@#$%^&*...)");
	}
	if (isDictionaryMatch) {
		recommendations.push("Не используйте популярные слова или названия клиники");
	}
	if (keyboardWalkFound) {
		recommendations.push("Избегайте клавиатурных последовательностей (qwerty, 12345)");
	}
	if (maxConsecutiveRepeats >= 3) {
		recommendations.push("Уберите повторяющиеся подряд символы (напр. 'aaa', '111')");
	}

	// 9. Нормализованный процент 0..100 (100% при H >= 85 бит)
	const scorePercent = Math.min(100, Math.round((effectiveEntropy / 85) * 100));

	const isAcceptableForStaff =
		effectiveEntropy >= 50 && length >= 8 && !isDictionaryMatch;

	return {
		passwordLength: length,
		charsetPoolSize: poolSize,
		combinatorialEntropyBits: combinatorialEntropy,
		shannonEntropyBits: shannonEntropy,
		effectiveEntropyBits: effectiveEntropy,
		scorePercent,
		level,
		labelRu,
		colorHex,
		isAcceptableForStaff,
		isDictionaryMatch,
		crackTimeEstimateRu,
		recommendations,
		hasLowercase,
		hasUppercase,
		hasDigits,
		hasSpecialSymbols: hasSpecial,
		hasCyrillic,
	};
}

/**
 * Валидатор надежности пароля для Zod
 */
export const staffPasswordSchema = z
	.string()
	.min(8, "Пароль должен содержать не менее 8 символов")
	.max(256, "Пароль не должен превышать 256 символов")
	.refine(
		(pwd) => {
			const evaluation = evaluatePasswordEntropy(pwd);
			return evaluation.isAcceptableForStaff;
		},
		{
			message:
				"Пароль слишком слабый или содержит словарные слова. Требуется энтропия не менее 50 бит (заглавные, строчные, цифры, спецсимволы).",
		},
	);
