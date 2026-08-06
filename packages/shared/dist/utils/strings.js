export function splitLine(line, delimiter) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (char === delimiter && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    values.push(current.trim());
    return values;
}
export function isValidRussianSnils(snilsRaw) {
    if (!snilsRaw)
        return true;
    const digits = snilsRaw.replace(/\D/g, "");
    if (digits.length !== 11)
        return false;
    if (/^(\d)\1{10}$/.test(digits))
        return false;
    const numPart = parseInt(digits.slice(0, 9), 10);
    if (numPart <= 1001001)
        return true;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        const char = digits[i];
        if (char)
            sum += parseInt(char, 10) * (9 - i);
    }
    let control = 0;
    if (sum < 100) {
        control = sum;
    }
    else if (sum === 100 || sum === 101) {
        control = 0;
    }
    else {
        const rem = sum % 101;
        control = rem === 100 || rem === 101 ? 0 : rem;
    }
    const expectedControl = parseInt(digits.slice(9), 10);
    return control === expectedControl;
}
export function isValidRussianInn(innRaw) {
    if (!innRaw)
        return true;
    const digits = innRaw.replace(/\D/g, "");
    if (digits.length !== 10 && digits.length !== 12)
        return false;
    const getCheckDigit = (d, weights) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
            const char = d[i];
            const w = weights[i];
            if (char !== undefined && w !== undefined) {
                sum += parseInt(char, 10) * w;
            }
        }
        return (sum % 11) % 10;
    };
    if (digits.length === 10) {
        const w10 = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        const d9 = digits[9];
        return d9 !== undefined && getCheckDigit(digits, w10) === parseInt(d9, 10);
    }
    const w11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const w12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const d10 = digits[10];
    const d11 = digits[11];
    const check11 = d10 !== undefined && getCheckDigit(digits, w11) === parseInt(d10, 10);
    const check12 = d11 !== undefined && getCheckDigit(digits, w12) === parseInt(d11, 10);
    return check11 && check12;
}
export function isValidRussianPassport(passportRaw) {
    if (!passportRaw)
        return true;
    const digits = passportRaw.replace(/\D/g, "");
    return digits.length === 10;
}
