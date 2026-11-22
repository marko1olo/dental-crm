/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUSSIAN FIO DECLENSION ENGINE (СКЛОНЕНИЕ ФИО ПО ПАДЕЖАМ ДЛЯ ДОКУМЕНТОВ)
 * Deterministic lightweight Russian name declension for contracts & consents.
 * Supports Nominative (Именительный), Genitive (Родительный), Dative (Дательный).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type GrammaticalCaseRu = "nominative" | "genitive" | "dative";

export interface FioDeclensionResult {
	nominative: string; // Именительный (кто? что?) — Иванов Иван Иванович
	genitive: string;   // Родительный (кого? чего?) — Иванова Ивана Ивановича
	dative: string;     // Дательный (кому? чему?) — Иванову Ивану Ивановичу
}

const MALE_NAMES_ENDING_A = new Set([
	"никита",
	"илья",
	"данила",
	"данил",
	"лука",
	"фома",
	"кузьма",
	"савва",
]);

/**
 * Определение пола по компонентам ФИО.
 */
export function detectGenderFromFio(
	surname: string,
	firstName: string,
	patronymic: string,
	hint?: "male" | "female",
): "male" | "female" {
	if (hint === "male" || hint === "female") return hint;

	const pLower = (patronymic || "").trim().toLowerCase();
	if (pLower.endsWith("ич")) return "male";
	if (pLower.endsWith("на")) return "female";

	const sLower = (surname || "").trim().toLowerCase();
	if (
		sLower.endsWith("ов") ||
		sLower.endsWith("ев") ||
		sLower.endsWith("ёв") ||
		sLower.endsWith("ин") ||
		sLower.endsWith("ын") ||
		sLower.endsWith("ский") ||
		sLower.endsWith("цкий") ||
		sLower.endsWith("ый") ||
		sLower.endsWith("ой")
	) {
		return "male";
	}
	if (
		sLower.endsWith("ова") ||
		sLower.endsWith("ева") ||
		sLower.endsWith("ёва") ||
		sLower.endsWith("ина") ||
		sLower.endsWith("ына") ||
		sLower.endsWith("ская") ||
		sLower.endsWith("цкая") ||
		sLower.endsWith("ая") ||
		sLower.endsWith("яя")
	) {
		return "female";
	}

	const fLower = (firstName || "").trim().toLowerCase();
	if (fLower === "любовь") return "female";
	if (MALE_NAMES_ENDING_A.has(fLower)) return "male";
	if (fLower.endsWith("а") || fLower.endsWith("я")) return "female";

	return "male";
}

/**
 * Склонение фамилии.
 */
export function declineSurnameRu(
	surname: string,
	gender: "male" | "female",
	c: "genitive" | "dative",
): string {
	if (!surname) return "";
	const s = surname.trim();
	const sLower = s.toLowerCase();

	// Несклоняемые фамилии (на -ко, -енко, -их, -ых, гласные кроме -а/-я)
	if (
		sLower.endsWith("ко") ||
		sLower.endsWith("енко") ||
		sLower.endsWith("их") ||
		sLower.endsWith("ых") ||
		sLower.endsWith("о") ||
		sLower.endsWith("е") ||
		sLower.endsWith("э") ||
		sLower.endsWith("и") ||
		sLower.endsWith("у") ||
		sLower.endsWith("ю")
	) {
		return s;
	}

	if (gender === "male") {
		// Иванов, Смирнов, Кузнецов, Пушкин
		if (
			sLower.endsWith("ов") ||
			sLower.endsWith("ев") ||
			sLower.endsWith("ёв") ||
			sLower.endsWith("ин") ||
			sLower.endsWith("ын")
		) {
			return c === "genitive" ? `${s}а` : `${s}у`;
		}

		// Достоевский, Троицкий
		if (sLower.endsWith("ский")) {
			const base = s.slice(0, -4);
			return c === "genitive" ? `${base}ского` : `${base}скому`;
		}
		if (sLower.endsWith("цкий")) {
			const base = s.slice(0, -4);
			return c === "genitive" ? `${base}цкого` : `${base}цкому`;
		}

		// Белый, Толстой
		if (sLower.endsWith("ый")) {
			const base = s.slice(0, -2);
			return c === "genitive" ? `${base}ого` : `${base}ому`;
		}
		if (sLower.endsWith("ой")) {
			const base = s.slice(0, -2);
			return c === "genitive" ? `${base}ого` : `${base}ому`;
		}
		if (sLower.endsWith("ий")) {
			const base = s.slice(0, -2);
			return c === "genitive" ? `${base}его` : `${base}ему`;
		}

		// Мягкий знак: Врубель -> Врубеля / Врубелю
		if (sLower.endsWith("ь")) {
			const base = s.slice(0, -1);
			return c === "genitive" ? `${base}я` : `${base}ю`;
		}

		// Мужские фамилии на согласный (Шмидт, Миллер, Блок)
		if (/[бвгджзклмнпрстфхцчшщ]$/i.test(sLower)) {
			return c === "genitive" ? `${s}а` : `${s}у`;
		}
	} else {
		// Женские фамилии
		// Иванова, Смирнова, Кузнецова, Пушкина
		if (
			sLower.endsWith("ова") ||
			sLower.endsWith("ева") ||
			sLower.endsWith("ёва") ||
			sLower.endsWith("ина") ||
			sLower.endsWith("ына")
		) {
			const base = s.slice(0, -1);
			return `${base}ой`;
		}

		// Достоевская, Троицкая
		if (sLower.endsWith("ская")) {
			const base = s.slice(0, -4);
			return `${base}ской`;
		}
		if (sLower.endsWith("цкая")) {
			const base = s.slice(0, -4);
			return `${base}цкой`;
		}

		// Белая, Толстая
		if (sLower.endsWith("ая")) {
			const base = s.slice(0, -2);
			return `${base}ой`;
		}
		if (sLower.endsWith("яя")) {
			const base = s.slice(0, -2);
			return `${base}ей`;
		}

		// Женские фамилии на согласный (Шмидт, Миллер) НЕ склоняются
		if (/[бвгджзклмнпрстфхцчшщ]$/i.test(sLower)) {
			return s;
		}
	}

	return s;
}

/**
 * Склонение имени.
 */
export function declineFirstNameRu(
	firstName: string,
	gender: "male" | "female",
	c: "genitive" | "dative",
): string {
	if (!firstName) return "";
	const f = firstName.trim();
	const fLower = f.toLowerCase();

	if (fLower === "любовь") {
		return "Любови";
	}

	if (gender === "male") {
		// Мужские имена на -й (Сергей, Андрей, Алексей, Дмитрий)
		if (fLower.endsWith("й")) {
			const base = f.slice(0, -1);
			return c === "genitive" ? `${base}я` : `${base}ю`;
		}
		// Мужские имена на -ь (Игорь)
		if (fLower.endsWith("ь")) {
			const base = f.slice(0, -1);
			return c === "genitive" ? `${base}я` : `${base}ю`;
		}
		// Мужские имена на -ия / -ья (Илья)
		if (fLower === "илья") {
			return c === "genitive" ? "Ильи" : "Илье";
		}
		// Мужские имена на -а (Никита, Лука, Данила)
		if (fLower.endsWith("а")) {
			const base = f.slice(0, -1);
			const lastLetter = fLower.charAt(fLower.length - 2);
			const isVelar = ["г", "к", "х", "ж", "ч", "ш", "щ"].includes(lastLetter);
			return c === "genitive" ? `${base}${isVelar ? "и" : "ы"}` : `${base}е`;
		}
		// Мужские имена на согласный (Иван, Петр, Михаил, Александр)
		if (/[бвгджзклмнпрстфхцчшщ]$/i.test(fLower)) {
			return c === "genitive" ? `${f}а` : `${f}у`;
		}
	} else {
		// Женские имена на -ия (Мария, Анастасия, Юлия)
		if (fLower.endsWith("ия")) {
			const base = f.slice(0, -2);
			return `${base}ии`;
		}
		// Женские имена на -я (Дарья, Татьяна, Софья)
		if (fLower.endsWith("я")) {
			const base = f.slice(0, -1);
			return c === "genitive" ? `${base}и` : `${base}е`;
		}
		// Женские имена на -а (Ольга, Анна, Елена)
		if (fLower.endsWith("а")) {
			const base = f.slice(0, -1);
			const lastLetter = fLower.charAt(fLower.length - 2);
			const isVelar = ["г", "к", "х", "ж", "ч", "ш", "щ"].includes(lastLetter);
			return c === "genitive" ? `${base}${isVelar ? "и" : "ы"}` : `${base}е`;
		}
	}

	return f;
}

/**
 * Склонение отчества.
 */
export function declinePatronymicRu(
	patronymic: string,
	gender: "male" | "female",
	c: "genitive" | "dative",
): string {
	if (!patronymic) return "";
	const p = patronymic.trim();
	const pLower = p.toLowerCase();

	if (gender === "male" || pLower.endsWith("ич")) {
		return c === "genitive" ? `${p}а` : `${p}у`;
	}

	if (pLower.endsWith("на")) {
		const base = p.slice(0, -1);
		return c === "genitive" ? `${base}ы` : `${base}е`;
	}

	return p;
}

/**
 * Полное склонение ФИО в Родительный и Дательный падежи.
 */
export function declineFioRu(
	fullName: string,
	genderHint?: "male" | "female",
): FioDeclensionResult {
	if (!fullName || typeof fullName !== "string") {
		return { nominative: "", genitive: "", dative: "" };
	}

	const trimmed = fullName.trim();
	if (!trimmed) {
		return { nominative: "", genitive: "", dative: "" };
	}

	const parts = trimmed.split(/\s+/).filter(Boolean);
	const surname = parts[0] || "";
	const firstName = parts[1] || "";
	const patronymic = parts[2] || "";

	const gender = detectGenderFromFio(surname, firstName, patronymic, genderHint);

	const genSurname = declineSurnameRu(surname, gender, "genitive");
	const genFirstName = declineFirstNameRu(firstName, gender, "genitive");
	const genPatronymic = declinePatronymicRu(patronymic, gender, "genitive");

	const datSurname = declineSurnameRu(surname, gender, "dative");
	const datFirstName = declineFirstNameRu(firstName, gender, "dative");
	const datPatronymic = declinePatronymicRu(patronymic, gender, "dative");

	const genitive = [genSurname, genFirstName, genPatronymic].filter(Boolean).join(" ");
	const dative = [datSurname, datFirstName, datPatronymic].filter(Boolean).join(" ");

	return {
		nominative: trimmed,
		genitive: genitive || trimmed,
		dative: dative || trimmed,
	};
}

/**
 * Получить ФИО в родительном падеже (кого? чего?).
 */
export function declineFioGenitiveRu(
	fullName: string,
	genderHint?: "male" | "female",
): string {
	return declineFioRu(fullName, genderHint).genitive;
}

/**
 * Получить ФИО в дательном падеже (кому? чему?).
 */
export function declineFioDativeRu(
	fullName: string,
	genderHint?: "male" | "female",
): string {
	return declineFioRu(fullName, genderHint).dative;
}
