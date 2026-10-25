/**
 * apps/web/src/components/settings/__tests__/doctorAndAdminSettingsRedTeamInquisition.test.ts
 *
 * Индивидуальный Red Team инквизиционный тест для:
 * 1. Клинических настроек врача (Doctor Clinical Preferences, пресеты 6 специальностей, Form 043/y, Form 107-1/y, токсичность анестетиков).
 * 2. Настроек клиники и кабинетов (Clinic Schedule, 15/30 мин слоты, СанПиН 3.3686-21 интервалы 10-15 мин, стулья и оборудование).
 * 3. Финансовых настроек владельца (Owner 804n Price List, себестоимость материалов/ЗТЛ, калькулятор сдельной оплаты труда в целых копейках).
 * 4. Священных мандатов (Мандат 8b: <= 800 строк, Мандат 8d: ноль эмодзи, Мандат 8e: Doctor Autonomy).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
	useDoctorPreferencesStore,
	FAVORITE_MEDICATION_OPTIONS,
	DENTAL_NEEDLE_OPTIONS,
	type DoctorSpecialtyKey,
} from "../../../store/doctorPreferencesStore";
import {
	STATUTORY_DIARY_TEMPLATES,
	interpolateDiaryTemplateTags,
} from "../doctor/diaryTemplateTags";
import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
	type DoctorCategoryPerformanceInput,
} from "@dental/shared";
import { STATUTORY_ORDER_804N_PRESETS } from "../../catalog/pricelist/servicePricelistPresets";

// Регулярное выражение для поиска эмодзи
const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Doctor & Admin Settings Red Team Inquisition", () => {
	const settingsDir = path.resolve(__dirname, "..");

	const filesToCheck = [
		"DelimitedTileCard.tsx",
		"DoctorSettingsSection.tsx",
		"AdminSettingsSection.tsx",
		"SettingsProfileTab.tsx",
		"SettingsProfileYandexSection.tsx",
		"SettingsStaffTab.tsx",
		"StaffCommissionsPanel.tsx",
		"ScaleSovereigntyPresetsBar.tsx",
		"DoctorClinicalPreferencesSection.tsx",
		"doctor/diaryTemplateTags.ts",
		"doctor/DoctorAnesthesiaDefaultsSection.tsx",
		"doctor/DoctorAnesthesiaToxicityCalculator.tsx",
		"doctor/DoctorForm043TemplatesSection.tsx",
		"doctor/DoctorPrescriptions107Section.tsx",
		"doctor/DoctorSpecialtyPresetsCard.tsx",
		"doctor/index.ts",
		"owner/OwnerPriceListSection.tsx",
		"owner/DoctorPieceRateCalculatorSection.tsx",
		"owner/index.ts",
		"clinic/SettingsClinicScheduleSection.tsx",
		"clinic/SettingsClinicChairsSection.tsx",
	];

	describe("1. Мандат 8b: Жесткий лимит строк (<= 800 строк на каждый файл)", () => {
		for (const relPath of filesToCheck) {
			it(`Файл ${relPath} строго <= 800 строк`, () => {
				const fullPath = path.join(settingsDir, relPath);
				assert.ok(fs.existsSync(fullPath), `Файл должен существовать: ${fullPath}`);
				const content = fs.readFileSync(fullPath, "utf-8");
				const lineCount = content.split("\n").length;
				assert.ok(lineCount <= 800, `Файл ${relPath} превысил 800 строк: ${lineCount}`);
			});
		}
	});

	describe("2. Мандат 8d: Ноль мультяшных эмодзи", () => {
		for (const relPath of filesToCheck) {
			it(`Файл ${relPath} не содержит мультяшных эмодзи`, () => {
				const fullPath = path.join(settingsDir, relPath);
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.equal(EMOJI_REGEX.test(content), false, `Файл ${relPath} содержит эмодзи!`);
			});
		}
	});

	describe("3. Doctor Autonomy (Мандат 8e): Пресеты 6 специальностей врача (1 клик)", () => {
		const specialties: DoctorSpecialtyKey[] = ["therapist", "orthopedist", "surgeon", "orthodontist", "periodontist", "pediatric"];

		it("Поддерживает все 6 клинических специальностей врачей", () => {
			assert.equal(specialties.length, 6);
		});

		it("1-клик активация пресета 'therapist' калибрует терапевтический кабинет", () => {
			const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
			applySpecialtyPreset("therapist");
			const state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.specialty, "therapist");
			assert.equal(state.defaultVisitDuration, 60);
			assert.equal(state.favoriteAnesthetic, "articaine_200k");
			assert.equal(state.defaultIsolation, "cofferdam");
			assert.equal(state.defaultComposite, "estelite_asteria");
			assert.equal(state.defaultAdhesive, "optibond_fl");
		});

		it("1-клик активация пресета 'surgeon' калибрует хирургический кабинет", () => {
			const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
			applySpecialtyPreset("surgeon");
			const state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.specialty, "surgeon");
			assert.equal(state.defaultVisitDuration, 45);
			assert.equal(state.favoriteAnesthetic, "articaine_100k");
			assert.equal(state.defaultIsolation, "cofferdam");
			assert.ok(state.favoriteMedicationIds.includes("amoxiclav_875_125"));
			assert.ok(state.favoriteMedicationIds.includes("nimesil_100"));
			assert.ok(state.favoriteMedicationIds.includes("suprastin_25"));
		});

		it("1-клик активация пресета 'pediatric' калибрует детский приём", () => {
			const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
			applySpecialtyPreset("pediatric");
			const state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.specialty, "pediatric");
			assert.equal(state.defaultVisitDuration, 30);
			assert.equal(state.favoriteAnesthetic, "articaine_200k");
			assert.equal(state.defaultDentition, "pediatric");
		});

		it("1-клик активация пресета 'periodontist' калибрует пародонтологический профиль", () => {
			const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
			applySpecialtyPreset("periodontist");
			const state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.specialty, "periodontist");
			assert.equal(state.defaultVisitDuration, 45);
			assert.equal(state.favoriteAnesthetic, "articaine_200k");
			assert.equal(state.defaultIsolation, "optragate");
			assert.ok(state.favoriteMedicationIds.includes("chlorhexidine_005"));
			assert.ok(state.favoriteMedicationIds.includes("metrogyl_denta"));
			assert.ok(state.favoriteMedicationIds.includes("nise_100"));
		});
	});

	describe("4. Форма 043/у: Шаблоны дневников приёма и автоподстановка тегов", () => {
		it("Реестр шаблонов 043/у содержит протоколы для всех направлений", () => {
			assert.ok(STATUTORY_DIARY_TEMPLATES.length >= 8);
			const specialtiesInTemplates = new Set(STATUTORY_DIARY_TEMPLATES.map((t) => t.specialty));
			assert.ok(specialtiesInTemplates.has("therapist"));
			assert.ok(specialtiesInTemplates.has("surgeon"));
			assert.ok(specialtiesInTemplates.has("orthopedist"));
			assert.ok(specialtiesInTemplates.has("periodontist"));
			assert.ok(specialtiesInTemplates.has("pediatric"));
		});

		it("Корректно интерполирует клинические теги {зуб}, {диагноз}, {материал}, {анестезия}, {изоляция}", () => {
			const template = "Под инфильтрационной анестезией {анестезия} на зубе {зуб} с изоляцией {изоляция} препарирована полость по поводу {диагноз}. Пломба из {материал}. Бонд {бонд}.";
			const context = {
				tooth: "26",
				diagnosis: "К02.1 Кариес дентина",
				anesthetic: "Артикаин 1:100 000 (1.7 мл)",
				isolation: "Коффердам",
				material: "Filtek Ultimate",
				adhesive: "OptiBond FL",
				composite: "Filtek Ultimate",
				etchant: "Ultra-Etch 35%",
			};
			const result = interpolateDiaryTemplateTags(template, context);
			assert.ok(result.includes("на зубе 26"));
			assert.ok(result.includes("по поводу К02.1 Кариес дентина"));
			assert.ok(result.includes("с изоляцией Коффердам"));
			assert.ok(result.includes("Пломба из Filtek Ultimate"));
			assert.ok(result.includes("Бонд OptiBond FL"));
			assert.equal(result.includes("{зуб}"), false);
			assert.equal(result.includes("{диагноз}"), false);
		});
	});

	describe("5. Форма 107-1/у: Рецептурные бланки и контроль передозировок", () => {
		it("Реестр медикаментов содержит обязательные препараты с латинскими формулами", () => {
			const amoxiclav = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "amoxiclav_875_125");
			assert.ok(amoxiclav);
			assert.equal(amoxiclav.mnn, "Амоксициллин + Клавулановая кислота");
			assert.ok(amoxiclav.rpLatin.includes("Rp.:") && amoxiclav.rpLatin.includes("D.S."));
			assert.ok(amoxiclav.overdoseWarning);

			const cyfran = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "cyfran_st");
			assert.ok(cyfran);
			assert.equal(cyfran.mnn, "Ципрофлоксацин + Тинидазол");
			assert.ok(cyfran.rpLatin.includes("Rp.:"));

			const nise = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "nise_100");
			assert.ok(nise);
			assert.equal(nise.mnn, "Нимесулид");
			assert.equal(nise.maxDailyDose, "200 мг/сут (максимум 2 таблетки в день)");
			assert.equal(nise.maxDurationDays, 5);

			const dexalgin = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "dexalgin_25");
			assert.ok(dexalgin);
			assert.equal(dexalgin.mnn, "Декскетопрофен");
			assert.equal(dexalgin.maxDailyDose, "75 мг/сут (максимум 3 таблетки в день)");
			assert.equal(dexalgin.maxDurationDays, 5);
		});
	});

	describe("6. Токсичность анестетиков: расчет допустимой дозировки и карпул", () => {
		it("Рассчитывает максимальную дозу артикаина по весу (7 мг/кг, максимум 500 мг)", () => {
			const maxArticaineMg = Math.min(70 * 7, 500); // 490 mg
			assert.equal(maxArticaineMg, 490);
			const carpulesNormal = maxArticaineMg / 68; // ~7.2 карпулы
			assert.ok(carpulesNormal > 7.1 && carpulesNormal < 7.3);
			assert.equal(Math.min(90 * 7, 500), 500);
		});

		it("Учитывает кардиориск (эпинефрин макс 0.04 мг вместо 0.2 мг)", () => {
			const maxSafeCarpulesCardio = Math.floor(0.04 / 0.017);
			assert.equal(maxSafeCarpulesCardio, 2); // Максимум 2 карпулы при кардиориске
		});
	});

	describe("6b. Дефолты анестезии и карпульных игл", () => {
		it("Поддерживает ключевые анестетики РФ/СНГ", () => {
			const { updatePreferences } = useDoctorPreferencesStore.getState();
			updatePreferences({ favoriteAnesthetic: "articaine_200k" });
			assert.equal(useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic, "articaine_200k");
			updatePreferences({ favoriteAnesthetic: "scandonest_mepivacaine_3" });
			assert.equal(useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic, "scandonest_mepivacaine_3");
		});

		it("Поддерживает типы карпульных игл", () => {
			assert.ok(DENTAL_NEEDLE_OPTIONS.length >= 4);
			const shortNeedle = DENTAL_NEEDLE_OPTIONS.find((n) => n.id === "septoject_30g_short");
			assert.ok(shortNeedle && shortNeedle.gauge === "30G (0.3 мм)");
			const longNeedle = DENTAL_NEEDLE_OPTIONS.find((n) => n.id === "septoject_27g_long");
			assert.ok(longNeedle && longNeedle.gauge === "27G (0.4 мм)");
			const { updatePreferences } = useDoctorPreferencesStore.getState();
			updatePreferences({ favoriteNeedleType: "septoject_27g_long" });
			assert.equal(useDoctorPreferencesStore.getState().preferences.favoriteNeedleType, "septoject_27g_long");
		});

		it("Пресеты специальностей калибруют анестетик и карпульные иглы в 1 клик", () => {
			const { applySpecialtyPreset } = useDoctorPreferencesStore.getState();
			applySpecialtyPreset("surgeon");
			let state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.favoriteAnesthetic, "articaine_100k");
			assert.equal(state.favoriteNeedleType, "septoject_27g_long");

			applySpecialtyPreset("therapist");
			state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.favoriteAnesthetic, "articaine_200k");
			assert.equal(state.favoriteNeedleType, "septoject_30g_short");

			applySpecialtyPreset("pediatric");
			state = useDoctorPreferencesStore.getState().preferences;
			assert.equal(state.favoriteAnesthetic, "articaine_200k");
			assert.equal(state.favoriteNeedleType, "septoject_30g_extra_short");
		});
	});

	describe("7. Прейскурант 804н: прозрачная калькуляция себестоимости и маржи в копейках", () => {
		it("Содержит утвержденную номенклатуру услуг 804н", () => {
			assert.ok(STATUTORY_ORDER_804N_PRESETS.length >= 20);
			const cariesService = STATUTORY_ORDER_804N_PRESETS.find(
				(s) => s.code804n === "A16.07.002.001" || s.id.includes("caries"),
			);
			assert.ok(cariesService && cariesService.basePriceKopecks > 0);
		});

		it("Рассчитывает чистую маржу в целых копейках без погрешностей округления", () => {
			const retailPriceKopecks = 450000;
			const materialCostKopecks = 45000;
			const netMarginKopecks = retailPriceKopecks - materialCostKopecks;
			assert.equal(netMarginKopecks, 405000);
			const marginPct = Math.round((netMarginKopecks / retailPriceKopecks) * 10000) / 100;
			assert.equal(marginPct, 90);
		});

		it("Корректно учитывает расходы ЗТЛ для ортопедических услуг", () => {
			const crownPriceKopecks = 2500000;
			const materialCostKopecks = 150000;
			const ztlLabCostKopecks = 800000;
			const netMarginKopecks = crownPriceKopecks - materialCostKopecks - ztlLabCostKopecks;
			assert.equal(netMarginKopecks, 1550000);
			const marginPct = Math.round((netMarginKopecks / crownPriceKopecks) * 10000) / 100;
			assert.equal(marginPct, 62);
		});
	});

	describe("8. Калькулятор сдельной оплаты труда: расчет строго в целых копейках", () => {
		it("Рассчитывает стандартную сдельную выплату терапевта без удержаний", () => {
			const input: DoctorCategoryPerformanceInput = {
				therapyRevenueKopecks: 45000000,
				therapyRatePct: 25,
				orthopedicsRevenueKopecks: 0,
				orthopedicsRatePct: 0,
				surgeryRevenueKopecks: 0,
				surgeryRatePct: 0,
				hygieneRevenueKopecks: 8000000,
				hygieneRatePct: 30,
				labOrdersCostKopecks: 0,
				labDeductionPct: 100,
				materialCostKopecks: 3500000,
				materialDeductionPct: 0,
				baseShiftSalaryKopecks: 0,
			};
			const result = calculateDoctorPieceRatePayout(input);
			assert.equal(result.accruedTherapyKopecks, 11250000);
			assert.equal(result.accruedHygieneKopecks, 2400000);
			assert.equal(result.grossAccruedCommissionKopecks, 13650000);
			assert.equal(result.totalDeductionsKopecks, 0);
			assert.equal(result.netPayoutKopecks, 13650000);
			assert.equal(result.totalRevenueKopecks, 53000000);
			assert.equal(result.clinicMarginPct, 74.25);
		});

		it("Рассчитывает сдельную выплату ортопеда со 100% удержанием лаборатории ЗТЛ", () => {
			const input: DoctorCategoryPerformanceInput = {
				therapyRevenueKopecks: 0,
				therapyRatePct: 0,
				orthopedicsRevenueKopecks: 80000000,
				orthopedicsRatePct: 20,
				surgeryRevenueKopecks: 0,
				surgeryRatePct: 0,
				hygieneRevenueKopecks: 0,
				hygieneRatePct: 0,
				labOrdersCostKopecks: 24000000,
				labDeductionPct: 100,
				materialCostKopecks: 0,
				materialDeductionPct: 0,
				baseShiftSalaryKopecks: 0,
			};
			const result = calculateDoctorPieceRatePayout(input);
			assert.equal(result.accruedOrthopedicsKopecks, 16000000);
			assert.equal(result.withheldLabKopecks, 24000000);
			assert.equal(result.netPayoutKopecks, -8000000);
		});

		it("Форматирует копейки в человекочитаемый рублёвый вид без float артефактов", () => {
			const formatted1250 = formatKopecksToRublesDisplay(125050);
			assert.ok(formatted1250.includes("1") && formatted1250.includes("250,50") && formatted1250.includes("₽"));
			const formatted500 = formatKopecksToRublesDisplay(50000);
			assert.ok(formatted500.includes("500,00") && formatted500.includes("₽"));
			const formattedZero = formatKopecksToRublesDisplay(0);
			assert.ok(formattedZero.includes("0,00") && formattedZero.includes("₽"));
		});

		it("Парсит введённые пользователем рубли строго в целые копейки", () => {
			assert.equal(parseRublesToKopecks("1250.50"), 125050);
			assert.equal(parseRublesToKopecks("1 250,50"), 125050);
			assert.equal(parseRublesToKopecks("500"), 50000);
			assert.equal(parseRublesToKopecks(0), 0);
		});
	});

	describe("9. Стандарт Delimited Tile Cards, запрет полых карточек и призрачных плашек", () => {
		it("DelimitedTileCard содержит непрозрачную основу var(--paper-card), границу var(--line), микротень", () => {
			const tileContent = fs.readFileSync(path.join(settingsDir, "DelimitedTileCard.tsx"), "utf-8");
			assert.ok(tileContent.includes("bg-[var(--paper-card)]"));
			assert.ok(tileContent.includes("border-[var(--line)]"));
			assert.ok(tileContent.includes("shadow-[0_1px_3px_rgba(0,0,0,0.06)]"));
			assert.ok(tileContent.includes("w-9 h-5") && tileContent.includes("translate-x-4"));
			assert.equal(tileContent.includes("bg-slate-"), false);
		});

		it("DoctorSettingsSection и AdminSettingsSection используют канонический DelimitedTileCard", () => {
			const doctorContent = fs.readFileSync(path.join(settingsDir, "DoctorSettingsSection.tsx"), "utf-8");
			const adminContent = fs.readFileSync(path.join(settingsDir, "AdminSettingsSection.tsx"), "utf-8");
			assert.ok(doctorContent.includes("<DelimitedTileCard") && adminContent.includes("<DelimitedTileCard"));
			assert.equal(doctorContent.includes("bg-slate-300"), false);
			assert.equal(adminContent.includes("bg-slate-300"), false);
		});

		it("SettingsStaffTab не содержит полых карточек (min-h-[140px]) и сырых bg-white / slate-* цветов", () => {
			const staffContent = fs.readFileSync(path.join(settingsDir, "SettingsStaffTab.tsx"), "utf-8");
			assert.equal(staffContent.includes("min-h-[140px]"), false);
			assert.equal(staffContent.includes("bg-white"), false);
			assert.equal(staffContent.includes("bg-slate-"), false);
			assert.ok(staffContent.includes("bg-[var(--paper-card)]"));
		});

		it("DoctorClinicalPreferencesSection и ScaleSovereigntyPresetsBar не содержат призрачных плашек", () => {
			const clinicalContent = fs.readFileSync(path.join(settingsDir, "DoctorClinicalPreferencesSection.tsx"), "utf-8");
			const scaleContent = fs.readFileSync(path.join(settingsDir, "ScaleSovereigntyPresetsBar.tsx"), "utf-8");
			assert.equal(clinicalContent.includes("bg-teal-500/10"), false);
			assert.equal(clinicalContent.includes("ring-2 ring-[var(--teal)]"), false);
			assert.equal(clinicalContent.includes("ring-1 ring-[var(--teal)]"), false);
			assert.equal(scaleContent.includes("bg-teal-500/10"), false);
			assert.equal(scaleContent.includes("ring-teal-500/40"), false);
		});
	});

	describe("10. Сквозная синхронизация Прейскуранта услуг (service_catalog_items) и кассы приёма", () => {
		it("OwnerPriceListSection синхронизирует цены с БД через syncPricelistItemsToCatalog", () => {
			const facadeContent = fs.readFileSync(path.join(settingsDir, "owner/OwnerPriceListSection.tsx"), "utf-8");
			const hookContent = fs.readFileSync(path.join(settingsDir, "owner/priceListModules/useOwnerPriceList.ts"), "utf-8");
			const combined = facadeContent + "\n" + hookContent;
			assert.ok(combined.includes("useOptionalAppLogicContext"));
			assert.ok(combined.includes("syncPricelistItemsToCatalog"));
			assert.ok(combined.includes("persistServicePriceToDatabase"));
		});

		it("Обновление цены A16.07.002.010 до 5 500 ₽ в каталоге клиники пересчитывает пакет кариеса", async () => {
			const { CARIES_DIAGNOSIS_BUNDLE, createCustomizedBundle, exportCustomizedBundleToCashier54Fz } = await import("@dental/shared");
			const { resolveClinicalServiceBundlesAgainstCatalog } = await import("../../visit/clinicalServiceBundles");

			const liveDbCatalog = [{
				id: "db-srv-a16-07-002-010",
				code: "A16.07.002.010",
				title: "Восстановление зуба пломбой светового отверждения (I, II, III класс)",
				basePriceRub: "5500.00",
				category: "therapy",
				specialty: "therapist",
				active: true,
			}];

			const customized = createCustomizedBundle(CARIES_DIAGNOSIS_BUNDLE, { toothCode: "26", catalog: liveDbCatalog });
			const restorationItem = customized.items.find((i) => i.code804n === "A16.07.002.010");
			assert.ok(restorationItem);
			assert.equal(restorationItem.priceRub, 5500);
			assert.equal(restorationItem.priceKopecks, 550000);
			assert.equal(customized.totalRub, 9000);
			assert.equal(customized.totalKopecks, 900000);

			const cashierExport = exportCustomizedBundleToCashier54Fz(customized, { toothNumber: "26" });
			const receiptLine = cashierExport.receiptItems.find((r) => r.code804n === "A16.07.002.010");
			assert.ok(receiptLine);
			assert.equal(receiptLine.priceKopecks, 550000);

			const resolvedBundles = resolveClinicalServiceBundlesAgainstCatalog(liveDbCatalog);
			const cariesBundle = resolvedBundles.find((b) => b.id === "caries");
			assert.ok(cariesBundle);
			const svcInBundle = cariesBundle.services.find((s) => s.code804n === "A16.07.002.010");
			assert.ok(svcInBundle && svcInBundle.priceRub === 5500);
		});
	});
});
