export function formatPhoneNumber(value: string): string {
  if (!value) return value;
  
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  
  // Special handling if starts with 7 or 8 for Russian numbers
  let prefix = '';
  let rest = digits;
  
  if (digits.startsWith('7') || digits.startsWith('8')) {
    prefix = '+7 ';
    rest = digits.substring(1);
  } else if (digits.length >= 10) {
    prefix = '+7 ';
  } else {
    // Just a fallback for non-russian or incomplete starts
    prefix = '+';
  }
  
  if (rest.length === 0) return prefix;
  
  let formatted = prefix + '(' + rest.substring(0, 3);
  
  if (rest.length >= 4) {
    formatted += ') ' + rest.substring(3, 6);
  }
  if (rest.length >= 7) {
    formatted += '-' + rest.substring(6, 8);
  }
  if (rest.length >= 9) {
    formatted += '-' + rest.substring(8, 10);
  }
  
  return formatted;
}

export function formatCurrencyNumeric(value: string | number): string {
  if (typeof value === 'number') {
    return Math.max(0, Math.round(value)).toString();
  }
  
  // Remove non-digits
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  
  const num = parseInt(digits, 10);
  return isNaN(num) ? '' : num.toString();
}
