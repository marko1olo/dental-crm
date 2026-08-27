/**
 * DENTE Dental CRM — Statutory Dental Loyalty, Cashback & Gift Certificate Engine
 *
 * Statutory 54-FZ Fiscal Receipt Split, Hamilton / Hare-Niemeyer Largest Remainder
 * Line-Item Discount Distribution, Luhn 16-Digit Certificate Serials, and Family Points Pooling.
 */
import { kopecksToRub, rubToKopecks, distributeDiscountProportionally, } from "../fiscal/kopecksArithmetic.js";
export const LOYALTY_TIER_PRESETS = [
    {
        id: "silver",
        nameRu: "Серебряный (Базовый)",
        cashbackPercent: 3,
        maxInvoiceCoveragePercent: 30,
        minLifetimeSpentKop: 0,
        minLifetimeSpentRub: 0,
        badgeColor: "#94a3b8",
        perksRu: [
            "3% кешбэк баллами на все терапевтические и гигиенические услуги",
            "Оплата бонусами до 30% стоимости чека",
            "Срок действия баллов: 12 месяцев",
        ],
    },
    {
        id: "gold",
        nameRu: "Золотой (Постоянный)",
        cashbackPercent: 5,
        maxInvoiceCoveragePercent: 50,
        minLifetimeSpentKop: 15000000, // 150 000 ₽
        minLifetimeSpentRub: 150000,
        badgeColor: "#eab308",
        perksRu: [
            "5% кешбэк баллами со всех услуг клиники",
            "Оплата бонусами до 50% стоимости чека",
            "Бесплатная ежегодная 3D-диагностика (ОПТГ)",
            "Приоритетная запись к ведущим специалистам",
        ],
    },
    {
        id: "platinum",
        nameRu: "Платиновый (VIP)",
        cashbackPercent: 10,
        maxInvoiceCoveragePercent: 70,
        minLifetimeSpentKop: 40000000, // 400 000 ₽
        minLifetimeSpentRub: 400000,
        badgeColor: "#06b6d4",
        perksRu: [
            "10% кешбэк баллами на весь чек",
            "Оплата бонусами до 70% стоимости лечения",
            "Персональный медицинский координатор 24/7",
            "Бесплатная семейная гигиена 1 раз в год",
        ],
    },
    {
        id: "family",
        nameRu: "Семейный (Единый пул)",
        cashbackPercent: 7,
        maxInvoiceCoveragePercent: 50,
        minLifetimeSpentKop: 0, // Activated upon creating family group
        minLifetimeSpentRub: 0,
        badgeColor: "#8b5cf6",
        perksRu: [
            "7% кешбэк со счетов всех членов семьи в единый баланс",
            "Оплата бонусами до 50% любого счета семьи",
            "Возможность списания баллов детьми и пожилыми родителями",
        ],
    },
];
/**
 * Retrieves tier definition by ID.
 */
export function getLoyaltyTierDefinition(tierId) {
    return LOYALTY_TIER_PRESETS.find((t) => t.id === tierId) ?? LOYALTY_TIER_PRESETS[0];
}
/**
 * 1. Calculates kopeck-exact loyalty cashback points accrual on paid invoice.
 */
export function calculateLoyaltyAccrual(input) {
    const discountKop = Math.max(0, input.discountKop ?? 0);
    const pointsRedeemedKop = Math.max(0, input.pointsRedeemedKop ?? 0);
    const certRedeemedKop = Math.max(0, input.certificateRedeemedKop ?? 0);
    const excludedKop = Math.max(0, input.excludedFromAccrualKop ?? 0);
    const totalDeductionsKop = discountKop + pointsRedeemedKop + certRedeemedKop;
    const paidOutOfPocketKop = Math.max(0, input.grossInvoiceKop - totalDeductionsKop);
    const eligibleBaseKop = Math.max(0, paidOutOfPocketKop - excludedKop);
    const tier = getLoyaltyTierDefinition(input.tierId);
    const cashbackPercent = input.customCashbackPercent ?? tier.cashbackPercent;
    const accruedPointsKop = Math.round((eligibleBaseKop * cashbackPercent) / 100);
    const accruedPointsRub = Math.round(accruedPointsKop / 100);
    return {
        grossInvoiceKop: input.grossInvoiceKop,
        totalDeductionsKop,
        paidOutOfPocketKop,
        excludedFromAccrualKop: excludedKop,
        eligibleBaseKop,
        cashbackPercent,
        accruedPointsKop,
        accruedPointsRub,
        tierId: tier.id,
        tierNameRu: tier.nameRu,
    };
}
/**
 * 2. Calculates 54-FZ statutory line-item discount distribution (Tag 1043)
 * using the Hamilton / Hare-Niemeyer largest remainder method.
 * Guarantees zero floating point error and exact penny matching on receipt rows.
 */
export function calculateLoyaltyRedemption54Fz(input) {
    let grossInvoiceKop = 0;
    let eligibleBaseKop = 0;
    let excludedBaseKop = 0;
    for (const item of input.items) {
        const lineGross = Math.max(0, Math.round(item.priceKop * (item.quantity || 1)));
        grossInvoiceKop += lineGross;
        if (item.isExcludedFromLoyalty) {
            excludedBaseKop += lineGross;
        }
        else {
            eligibleBaseKop += lineGross;
        }
    }
    const tier = getLoyaltyTierDefinition(input.tierId);
    const maxCoveragePercent = input.customMaxCoveragePercent ?? tier.maxInvoiceCoveragePercent;
    const maxAllowedKop = Math.round((eligibleBaseKop * maxCoveragePercent) / 100);
    const maxAllowedPointsRub = Math.floor(maxAllowedKop / 100);
    const availablePointsKop = Math.max(0, rubToKopecks(input.availablePointsBalanceRub));
    const requestedPointsKop = Math.max(0, rubToKopecks(input.requestedPointsRub));
    const actualRedeemedPointsKop = Math.min(availablePointsKop, requestedPointsKop, maxAllowedKop);
    const actualRedeemedPointsRub = kopecksToRub(actualRedeemedPointsKop);
    // Distribute redemption discount proportionally across eligible items
    const eligibleItems = input.items.filter((it) => !it.isExcludedFromLoyalty);
    const discountItemsInput = eligibleItems.map((it) => ({
        priceKopecks: it.priceKop,
        quantity: it.quantity || 1,
    }));
    const distributedDiscounts = distributeDiscountProportionally(discountItemsInput, actualRedeemedPointsKop);
    let eligibleIdx = 0;
    const lineItemsDiscounts = input.items.map((item) => {
        const lineGross = Math.max(0, Math.round(item.priceKop * (item.quantity || 1)));
        if (item.isExcludedFromLoyalty) {
            return {
                id: item.id,
                name: item.name,
                grossKop: lineGross,
                discountKop: 0,
                netPayableKop: lineGross,
                pricePerUnitNetKop: item.priceKop,
            };
        }
        const discountForLine = distributedDiscounts[eligibleIdx] ?? 0;
        eligibleIdx++;
        const netPayableKop = lineGross - discountForLine;
        const qty = item.quantity || 1;
        const pricePerUnitNetKop = Math.round(netPayableKop / qty);
        return {
            id: item.id,
            name: item.name,
            grossKop: lineGross,
            discountKop: discountForLine,
            netPayableKop,
            pricePerUnitNetKop,
        };
    });
    const netPayableKop = grossInvoiceKop - actualRedeemedPointsKop;
    return {
        grossInvoiceKop,
        eligibleBaseKop,
        excludedBaseKop,
        maxCoveragePercent,
        maxAllowedPointsRub,
        actualRedeemedPointsRub,
        actualRedeemedPointsKop,
        remainingPointsBalanceRub: Math.max(0, input.availablePointsBalanceRub - actualRedeemedPointsRub),
        netPayableKop,
        netPayableRub: kopecksToRub(netPayableKop),
        lineItemsDiscounts,
        fiscal54FzSplit: {
            tag1031CashKop: 0,
            tag1081ElectronicKop: netPayableKop,
            tag1215AdvanceOffsetBonusKop: actualRedeemedPointsKop,
            tag1043LineDiscountsTotalKop: actualRedeemedPointsKop,
        },
    };
}
/**
 * 3. Generates a 16-digit gift certificate serial number with Luhn check digit.
 * Format: 7701-XXXX-XXXX-XXXC (7701 is Moscow Dental Clinic prefix)
 */
export function generateLuhn16Certificate(randomSeed) {
    const prefix = "7701";
    let digits = prefix;
    for (let i = 0; i < 11; i++) {
        const rand = randomSeed !== undefined
            ? (randomSeed * (i + 1) * 7) % 10
            : Math.floor(Math.random() * 10);
        digits += rand.toString();
    }
    // Compute Luhn checksum digit
    let sum = 0;
    for (let i = 0; i < 15; i++) {
        let d = parseInt(digits[i], 10);
        if (i % 2 === 0) {
            d *= 2;
            if (d > 9)
                d -= 9;
        }
        sum += d;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    digits += checkDigit.toString();
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}
/**
 * Validates a 16-digit gift certificate serial number using the Luhn algorithm.
 */
export function validateLuhn16Certificate(formattedSerial) {
    const cleaned = formattedSerial.replace(/[\s-]/g, "");
    if (!/^\d{16}$/.test(cleaned)) {
        return false;
    }
    let sum = 0;
    for (let i = 0; i < 16; i++) {
        let d = parseInt(cleaned[i], 10);
        if (i % 2 === 0) {
            d *= 2;
            if (d > 9)
                d -= 9;
        }
        sum += d;
    }
    return sum % 10 === 0;
}
