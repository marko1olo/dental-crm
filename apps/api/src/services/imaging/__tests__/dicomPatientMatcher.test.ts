import test from "node:test";
import assert from "node:assert/strict";
import {
	transliterateRuToEn,
	transliterateEnToRu,
	levenshteinDistance,
	stringSimilarity,
	diceBigramSimilarity,
	matchWordsFuzzy,
	parseDateFromString,
	parseTomographFolderHint,
	compareFioTokens,
	evaluateBirthDateBonus,
	scorePatientCandidate,
	matchStudyToPatients,
	type PatientCandidateItem,
} from "../dicomPatientMatcher.js";

test("DICOM Transliteration (GOST 7.79 / MVD)", () => {
	assert.equal(transliterateRuToEn("Иванов"), "ivanov");
	assert.equal(transliterateRuToEn("Щукин"), "shchukin");
	assert.equal(transliterateRuToEn("Юрьев"), "yurev");

	// Обратная транслитерация
	const ruFromEn = transliterateEnToRu("ivanov");
	assert.equal(ruFromEn, "иванов");
});

test("DICOM Date Parsing across Tomograph formats", () => {
	// ISO
	assert.deepEqual(parseDateFromString("1985-12-14"), { fullIso: "1985-12-14", year: 1985 });
	// DD.MM.YYYY
	assert.deepEqual(parseDateFromString("14.12.1985"), { fullIso: "1985-12-14", year: 1985 });
	// Compact YYYYMMDD
	assert.deepEqual(parseDateFromString("19851214"), { fullIso: "1985-12-14", year: 1985 });
	// Compact DDMMYYYY
	assert.deepEqual(parseDateFromString("14121985"), { fullIso: "1985-12-14", year: 1985 });
	// Year only
	assert.deepEqual(parseDateFromString("1985"), { fullIso: null, year: 1985 });
});

test("Tomograph folder name hint extraction", () => {
	// 1. Vatech EzDent-i
	const vatech = parseTomographFolderHint("D:\\CT_Export\\Иванов_И_И_19851214_CT");
	assert.equal(vatech.detectedManufacturer, null); // "CT_Export" has no brand keyword
	assert.equal(vatech.modalityHint, "CT");
	assert.equal(vatech.extractedBirthDate, "1985-12-14");
	assert.equal(vatech.extractedName, "Иванов И И");

	const vatech2 = parseTomographFolderHint("C:\\Ez3D-i\\Export\\EzDent-i_Export_20261002_001_Ivanov_Ivan");
	assert.equal(vatech2.detectedManufacturer, "Vatech EzDent-i");
	assert.equal(vatech2.extractedName, "Ivanov Ivan");

	// 2. Planmeca Romexis
	const romexis = parseTomographFolderHint("C:\\Romexis\\Studies\\Romexis_109283_Kuznetsov_A_V");
	assert.equal(romexis.detectedManufacturer, "Planmeca Romexis");
	assert.equal(romexis.extractedPatientId, "109283");
	assert.equal(romexis.extractedName, "Kuznetsov A V");

	// 3. Dentsply Sirona Sidexis
	const sidexis = parseTomographFolderHint("SIDEXIS_PAT_003849_Petrov_Petr_19910520");
	assert.equal(sidexis.detectedManufacturer, "Dentsply Sirona Sidexis");
	assert.equal(sidexis.extractedPatientId, "003849");
	assert.equal(sidexis.extractedBirthDate, "1991-05-20");
	assert.equal(sidexis.extractedName, "Petrov Petr");
});

test("compareFioTokens with transliteration, permutations and initials", () => {
	// Точное совпадение
	assert.equal(compareFioTokens("Иванов Иван", "Иванов Иван"), 100);

	// Перестановка слов (Имя Фамилия vs Фамилия Имя)
	assert.equal(compareFioTokens("Иван Иванов", "Иванов Иван"), 100);

	// Кириллица vs Латиница (EzDent-i export)
	assert.equal(compareFioTokens("IVANOV IVAN", "Иванов Иван"), 100);

	// С инициалами: "Иванов И.И." vs "Иванов Иван Иванович"
	const initialsScore = compareFioTokens("Иванов И И", "Иванов Иван Иванович");
	assert.ok(initialsScore >= 80, `Initials score should be >= 80%, got ${initialsScore}%`);

	// Только фамилия: "Иванов" vs "Иванов Сергей Павлович"
	const singleSurname = compareFioTokens("Иванов", "Иванов Сергей Павлович");
	assert.ok(singleSurname <= 75, `Single surname must be capped at 75%, got ${singleSurname}%`);
});

test("evaluateBirthDateBonus rewards matches and heavily penalizes conflicts", () => {
	// Точное совпадение
	const matchExact = evaluateBirthDateBonus("1985-12-14", "1985-12-14");
	assert.equal(matchExact.bonus, 30);
	assert.equal(matchExact.conflict, false);

	// Совпадение года
	const matchYear = evaluateBirthDateBonus("1985", "1985-05-20");
	assert.equal(matchYear.bonus, 15);
	assert.equal(matchYear.conflict, false);

	// Конфликт (разница > 1 года)
	const conflict = evaluateBirthDateBonus("1985-12-14", "1960-03-25");
	assert.equal(conflict.bonus, -45);
	assert.equal(conflict.conflict, true);
});

test("scorePatientCandidate categorizes into confidence brackets", () => {
	const clinicPatient: PatientCandidateItem = {
		id: "b450dc57-6950-48e0-a78b-d7d812345678",
		fullName: "Иванов Иван Иванович",
		birthDate: "1985-12-14",
	};

	// 1. Прямой PatientID = 100% auto_bound
	const directId = scorePatientCandidate(
		{ patientId: "b450dc57-6950-48e0-a78b-d7d812345678" },
		clinicPatient,
	);
	assert.equal(directId.confidence, 100);
	assert.equal(directId.status, "auto_bound");

	// 2. ФИО + точная дата рождения = auto_bound (>85%)
	const fullMatch = scorePatientCandidate(
		{
			patientName: "Ivanov Ivan",
			birthDate: "1985-12-14",
		},
		clinicPatient,
	);
	assert.ok(fullMatch.confidence > 85, `Full match confidence should be > 85%, got ${fullMatch.confidence}%`);
	assert.equal(fullMatch.status, "auto_bound");

	// 3. Только ФИО без даты рождения = pending_review (60-85%)
	const fioOnly = scorePatientCandidate(
		{
			patientName: "Иванов Иван",
		},
		clinicPatient,
	);
	assert.ok(fioOnly.confidence >= 60 && fioOnly.confidence <= 85, `FIO only should be pending_review (60-85%), got ${fioOnly.confidence}%`);
	assert.equal(fioOnly.status, "pending_review");

	// 4. Однофамилец с конфликтом года рождения = unassigned (<60%)
	const birthConflict = scorePatientCandidate(
		{
			patientName: "Иванов Иван",
			birthDate: "1955-01-01",
		},
		clinicPatient,
	);
	assert.ok(birthConflict.confidence < 60, `Birth conflict must drop below 60%, got ${birthConflict.confidence}%`);
	assert.equal(birthConflict.status, "unassigned");
});

test("matchStudyToPatients disambiguates multiple candidates", () => {
	const patients: PatientCandidateItem[] = [
		{ id: "1", fullName: "Петров Петр Сергеевич", birthDate: "1990-05-10" },
		{ id: "2", fullName: "Петров Петр Алексеевич", birthDate: "1990-11-20" },
		{ id: "3", fullName: "Сидоров Алексей Михайлович", birthDate: "1982-01-01" },
	];

	// Запрос "Петров Петр" без года рождения: оба Петрова имеют одинаковый скор ФИО
	// Система обязана перевести в pending_review из-за неоднозначности (ambiguous)
	const result = matchStudyToPatients(
		{ patientName: "Petrov Petr" },
		patients,
	);

	assert.equal(result.status, "pending_review");
	assert.ok(result.candidates.length >= 2);
	assert.ok(result.matchDetails.includes("подтверждение"));
});
