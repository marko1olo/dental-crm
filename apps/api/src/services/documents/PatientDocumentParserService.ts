
/**
 * Сервис для парсинга и валидации персональных документов РФ:
 * - Паспорт РФ: серия (4 цифры), номер (6 цифр), код подразделения (XXX-XXX)
 * - СНИЛС: 11 цифр, алгоритм контрольной суммы mod 101
 * - Единый полис ОМС: 16 цифр, алгоритм Луна
 */

export class PatientDocumentParserService {
  /**
   * Валидация паспорта РФ
   * Формат серии: 4 цифры (могут быть разделены пробелом)
   * Формат номера: 6 цифр
   * Код подразделения: XXX-XXX
   */
  static validatePassport(
    series: string,
    number: string,
    departmentCode: string
  ): boolean {
    const s = series.replace(/\s/g, "");
    if (!/^\d{4}$/.test(s)) return false;
    if (!/^\d{6}$/.test(number)) return false;
    if (!/^\d{3}-\d{3}$/.test(departmentCode)) return false;
    return true;
  }

  /**
   * Валидация СНИЛС (11 цифр)
   * Алгоритм: сумма цифр с коэффициентами 9, 8, 7, 6, 5, 4, 3, 2, 1
   * Контрольное число рассчитывается по модулю 101
   */
  static validateSnils(snils: string): boolean {
    const s = snils.replace(/\D/g, "");
    if (s.length !== 11) return false;

    const digits = s.split("").map(Number);
    const sum = digits
      .slice(0, 9)
      .reduce((acc, digit, idx) => acc + digit * (9 - idx), 0);

    let checkDigit = sum % 101;
    if (checkDigit === 100 || checkDigit === 101) {
      checkDigit = 0;
    }

    return checkDigit === parseInt(s.slice(9, 11), 10);
  }

  /**
   * Валидация полиса ОМС (16 цифр)
   * Алгоритм Луна
   */
  static validateOms(oms: string): boolean {
    const s = oms.replace(/\D/g, "");
    if (s.length !== 16) return false;

    const digits = s.split("").map(Number);
    const checksum = digits.pop()!;
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      if (digit === undefined) continue;
      // Удвоение через одну (начиная с первой)
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    const calculatedChecksum = (10 - (sum % 10)) % 10;
    return calculatedChecksum === checksum;
  }
}
