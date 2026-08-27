import { calculateAapEfpStagingAndGrading, } from "./grading.js";
import { calculatePerioIndices } from "./math.js";
import { calculatePsrSextants, formatPsrSextantsSummary } from "./psr.js";
/**
 * Generates an exhaustive, structured clinical diary text for Form 043/u (Форма 043/у)
 * with complete 6-point charting, AAP/EFP 2018 staging/grading, and treatment plan.
 */
export function generateComprehensivePerio043Text(teeth, summary, options) {
    const currentSummary = summary ?? calculatePerioIndices(teeth);
    const psr = calculatePsrSextants(teeth);
    const psrSummary = formatPsrSextantsSummary(psr);
    const diagnosis = calculateAapEfpStagingAndGrading(teeth, currentSummary, options);
    let overallRisk = "low";
    if (currentSummary.fmbsPercent > 30 || currentSummary.deepPocketsCount >= 4) {
        overallRisk = "high";
    }
    else if (currentSummary.fmbsPercent > 10 || currentSummary.moderatePocketsCount > 0) {
        overallRisk = "moderate";
    }
    const riskLabels = {
        low: "Низкий (благоприятный прогноз, поддерживающая терапия)",
        moderate: "Умеренный (требуется активная пародонтальная терапия SRP)",
        high: "Высокий (высокий риск прогрессирования и потери зубов)",
    };
    const lines = [];
    lines.push("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (ФОРМА 043/у)");
    lines.push("────────────────────────────────────────────────────────────");
    if (options?.doctorName) {
        lines.push(`Лечащий врач: ${options.doctorName}`);
    }
    lines.push("1. Скрининг пародонта PSR/CPITN (по 6 секстантам ВОЗ):");
    lines.push(`   ${psrSummary}`);
    lines.push("   (S1: 17-14, S2: 13-23, S3: 24-27, S4: 37-34, S5: 33-43, S6: 44-47; * — подвижность/фуркация)");
    lines.push("");
    lines.push("2. Клинические индексы и данные 6-точечного зондирования (Florida Probe):");
    lines.push(`   • Индекс кровоточивости десны FMBS (BOP): ${currentSummary.fmbsPercent}% (норма: ≤ 10%)`);
    lines.push(`   • Индекс зубного налёта FMPS (Plaque): ${currentSummary.fmpsPercent}% (норма: ≤ 20%)`);
    lines.push(`   • Максимальная глубина карманов (PD): ${currentSummary.maxPocketDepthMm} мм (средняя: ${currentSummary.meanPocketDepthMm} мм)`);
    lines.push(`   • Максимальная клиническая потеря прикрепления (CAL): ${currentSummary.maxCalMm} мм (средняя: ${currentSummary.meanCalMm} мм)`);
    lines.push(`   • Пародонтальные карманы ≥ 5 мм: ${currentSummary.deepPocketsCount} участков`);
    if (currentSummary.sitesWithSuppurationCount > 0) {
        lines.push(`   • Нагноение из карманов (Suppuration): ${currentSummary.sitesWithSuppurationCount} участков (активная экссудация)`);
    }
    if (currentSummary.teethWithFurcationCount > 0) {
        lines.push(`   • Зубы с вовлечением фуркации корней (I-IV класс): ${currentSummary.teethWithFurcationCount} шт.`);
    }
    if (currentSummary.teethWithMobilityCount > 0) {
        lines.push(`   • Зубы с патологической подвижностью (I-III степень): ${currentSummary.teethWithMobilityCount} шт.`);
    }
    lines.push("");
    lines.push("3. Оценка риска пародонтита:");
    lines.push(`   • Интегральный статус риска: ${riskLabels[overallRisk]}`);
    lines.push(`   • Риск-профиль: BOP ${currentSummary.fmbsPercent}% | Глубокие карманы ≥5мм: ${currentSummary.deepPocketsCount}`);
    lines.push("");
    lines.push("4. Клинический диагноз (МКБ-10 / Классификация AAP/EFP 2018):");
    lines.push(`   ${diagnosis.icd10Code} — ${diagnosis.diagnosisNameRu}`);
    lines.push(`   Характеристика: ${diagnosis.stageDescriptionRu}`);
    lines.push("");
    lines.push("5. Рекомендованный план лечения и пародонтальной терапии:");
    lines.push("   • Профессиональная гигиена полости рта (ультразвуковой скейлинг + полировка AirFlow).");
    if (currentSummary.deepPocketsCount > 0 || currentSummary.maxPocketDepthMm >= 4) {
        lines.push("   • Поддесневой скейлинг и сглаживание корней (Scaling & Root Planing / SRP) по секстантам под инфильтрационной анестезией.");
        lines.push("   • Вектор-терапия / ультразвуковая антисептическая обработка пародонтальных карманов.");
    }
    if (currentSummary.sitesWithSuppurationCount > 0) {
        lines.push("   • Местное медикаментозное орошение и системная антибактериальная терапия по показаниям.");
    }
    if (currentSummary.teethWithMobilityCount > 0) {
        lines.push("   • Шинирование подвижных зубов стекловолоконной лентой (Ribbond / GrandTEC).");
    }
    lines.push("   • Обучение контролируемой индивидуальной гигиене полости рта (межзубные ёршики, монопучковая щетка, ирригатор).");
    lines.push("   • Диспансерный пародонтологический ре-осмотр и ре-оценка (Re-evaluation) через 6-8 недель.");
    if (options?.customNotes) {
        lines.push("");
        lines.push(`Особые отметки врача: ${options.customNotes}`);
    }
    return lines.join("\n");
}
