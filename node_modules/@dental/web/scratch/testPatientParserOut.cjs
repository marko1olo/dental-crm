"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePatientDictationLocal = parsePatientDictationLocal;
function parsePatientDictationLocal(input) {
    var result = { fullName: "", phone: "", birthDate: "" };
    // Extract phone number (starts with +, or 7/8 and has 10-11 digits)
    // E.g. +79001234567, 89001234567, 8 (900) 123-45-67
    var phoneMatch = input.match(/(?:\+7|8|7)[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d/);
    if (phoneMatch) {
        var raw = phoneMatch[0];
        var cleaned = raw.replace(/\D/g, '');
        if (cleaned.startsWith('8'))
            cleaned = '7' + cleaned.slice(1);
        result.phone = '+' + cleaned;
        input = input.replace(raw, '');
    }
    // Extract date of birth (DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY)
    var dobMatch = input.match(/\b(\d{2})[\.\/\-](\d{2})[\.\/\-](\d{4})\b/);
    if (dobMatch) {
        // Return in YYYY-MM-DD format for <input type="date">
        result.birthDate = "".concat(dobMatch[3], "-").concat(dobMatch[2], "-").concat(dobMatch[1]);
        input = input.replace(dobMatch[0], '');
    }
    // Remaining text is likely the name
    // Clean up punctuation, extra spaces
    var name = input.replace(/[,;]/g, '').replace(/\s+/g, ' ').trim();
    result.fullName = name;
    return result;
}
