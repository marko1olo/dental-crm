import { Decimal } from "decimal.js";

/**
 * Сервис для расчета надбавок к зарплате за сверхурочные, ночные смены и работу в праздничные дни.
 * Расчет ведется по правилам ТК РФ:
 * - Сверхурочные: первые 2 часа — 1.5x, последующие — 2.0x.
 * - Ночные часы (22:00-06:00): +20% к тарифной ставке.
 * - Праздничные/выходные: 2.0x к тарифной ставке.
 */
export class ShiftBonusPayrollService {
    /**
     * Вычисляет надбавку за смену.
     * @param hourlyRate Часовая тарифная ставка
     * @param totalHours Всего отработано часов
     * @param overtimeHours Сверхурочные часы (включены в totalHours)
     * @param nightHours Часы работы в ночное время (22:00-06:00, включены в totalHours)
     * @param holidayHours Часы работы в праздничные/выходные дни (включены в totalHours)
     */
    static calculateShiftBonus(
        hourlyRate: number,
        totalHours: number,
        overtimeHours: number,
        nightHours: number,
        holidayHours: number
    ): {
        overtimeBonus: number;
        nightBonus: number;
        holidayBonus: number;
        totalBonus: number;
    } {
        const rate = new Decimal(hourlyRate);
        
        // 1. Сверхурочные (первые 2 часа 1.5x, остальные 2.0x)
        // Надбавка - это коэффициент минус 1, т.к. базовая оплата уже включена в оклад.
        // Первые 2 часа: (1.5 - 1) = 0.5x, остальные: (2.0 - 1) = 1.0x
        let overtimeBonus = new Decimal(0);
        if (overtimeHours > 0) {
            const firstTwoHours = Math.min(overtimeHours, 2);
            const remainingHours = Math.max(overtimeHours - 2, 0);
            
            overtimeBonus = overtimeBonus.plus(new Decimal(firstTwoHours).times(rate).times(0.5));
            overtimeBonus = overtimeBonus.plus(new Decimal(remainingHours).times(rate).times(1.0));
        }

        // 2. Ночные (22:00 - 06:00): +20% к ставке
        const nightBonus = new Decimal(nightHours).times(rate).times(0.2);

        // 3. Праздничные (работа в праздники: 2.0x)
        // Надбавка = коэффициент 2.0 - 1.0 = 1.0x (сверх оклада)
        const holidayBonus = new Decimal(holidayHours).times(rate).times(1.0);

        const totalBonus = overtimeBonus.plus(nightBonus).plus(holidayBonus);

        return {
            overtimeBonus: this.roundMoney(overtimeBonus),
            nightBonus: this.roundMoney(nightBonus),
            holidayBonus: this.roundMoney(holidayBonus),
            totalBonus: this.roundMoney(totalBonus),
        };
    }

    private static roundMoney(value: Decimal): number {
        return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }
}
