/**
 * ResuscitationKitWatchdogService.ts
 * Мониторинг аптечки неотложной помощи (Приказ МЗ РФ № 786н).
 */

export interface Medication {
    id: string;
    name: string;
    expiryDate: string; // ISO 8601
}

export interface KitStatus {
    medications: Medication[];
    oxygenPressureBar: number;
    defibrillatorChargePercent: number;
}

export interface WatchdogAlert {
    type: 'EXPIRY_WARNING' | 'EXPIRY_BLOCK' | 'PRESSURE_LOW' | 'DEFIB_LOW';
    message: string;
    severity: 'warning' | 'critical';
}

export class ResuscitationKitWatchdogService {
    private static readonly REQUIRED_MEDICATIONS = [
        'Адреналин',
        'Преднизолон',
        'Дексаметазон',
        'Атропин',
        'Супрастин',
        'Глюкоза 40%',
        'Нашатырный спирт'
    ];

    public static checkStatus(kit: KitStatus): WatchdogAlert[] {
        const alerts: WatchdogAlert[] = [];
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        // Check expiry
        for (const med of kit.medications) {
            const expiry = new Date(med.expiryDate);
            if (expiry < now) {
                alerts.push({
                    type: 'EXPIRY_BLOCK',
                    message: `Препарат ${med.name} просрочен (истек ${med.expiryDate})!`,
                    severity: 'critical'
                });
            } else if (expiry <= thirtyDaysFromNow) {
                alerts.push({
                    type: 'EXPIRY_WARNING',
                    message: `Срок годности препарата ${med.name} истекает через 30 дней (${med.expiryDate})`,
                    severity: 'warning'
                });
            }
        }

        // Check oxygen
        if (kit.oxygenPressureBar < 50) {
            alerts.push({
                type: 'PRESSURE_LOW',
                message: `Давление кислородного баллона критически низкое: ${kit.oxygenPressureBar} бар (минимум 50)`,
                severity: 'critical'
            });
        } else if (kit.oxygenPressureBar < 100) {
            alerts.push({
                type: 'PRESSURE_LOW',
                message: `Давление кислородного баллона низкое: ${kit.oxygenPressureBar} бар (норма >= 100)`,
                severity: 'warning'
            });
        }

        // Check defib
        if (kit.defibrillatorChargePercent < 90) {
            alerts.push({
                type: 'DEFIB_LOW',
                message: `Заряд дефибриллятора низкий: ${kit.defibrillatorChargePercent}%`,
                severity: 'warning'
            });
        }

        return alerts;
    }
}
