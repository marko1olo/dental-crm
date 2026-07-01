import { containsAnyFuzzyRoot, textToNumbers } from "./stringUtils";

export interface ParsedPatientData {
  fullName: string;
  phone: string;
  birthDate: string;
  notes?: string;
  email?: string;
}

export function parsePatientDictationLocal(input: string): ParsedPatientData {
  const result: ParsedPatientData = { fullName: "", phone: "", birthDate: "" };
  const normalizedInput = textToNumbers(input);
  let remaining = " " + normalizedInput + " ";

  // 0. Notes extraction
  const words = remaining.split(' ');
  const notesRoots = ["заметк", "комментар", "примечан", "важно", "напиши", "укажи", "пометк"];
  let noteStartIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (containsAnyFuzzyRoot(words[i] || '', notesRoots)) {
      noteStartIndex = i;
      break;
    }
  }
  if (noteStartIndex !== -1) {
    result.notes = words.slice(noteStartIndex + 1).join(' ').trim();
    remaining = words.slice(0, noteStartIndex).join(' ');
  }

  // 1. Email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;
  const emailMatch = remaining.match(emailRegex);
  if (emailMatch && emailMatch[0]) {
    result.email = emailMatch[0].trim();
    remaining = remaining.replace(emailMatch[0], ' ');
  }

  // 2. Phone extraction
  // Matches +7 999 123 45 67, 8(999)123-45-67, 8 999 1234567, 9991234567, etc.
  const phoneRegex = /(?:\+7|8|7)?[\s\-()]*[9][\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d/i;
  const phoneMatch = remaining.match(phoneRegex);
  if (phoneMatch && phoneMatch[0]) {
    const raw = phoneMatch[0];
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '7' + cleaned;
    if (cleaned.length === 11 && cleaned.startsWith('8')) cleaned = '7' + cleaned.slice(1);
    if (cleaned.length === 11) {
      result.phone = '+' + cleaned;
      remaining = remaining.replace(raw, ' ');
    }
  }

  // 3. Date of birth extraction
  // Numeric: 12.05.1990, 12/05/90, 12-05-1990
  const dobRegexNum = /(?:^|\s)(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})(?:\s|$)/;
  const dobMatchNum = remaining.match(dobRegexNum);
  if (dobMatchNum && dobMatchNum[1] && dobMatchNum[2] && dobMatchNum[3]) {
    let day = dobMatchNum[1];
    let month = dobMatchNum[2];
    let year = dobMatchNum[3];
    if (year.length === 2) {
      const y = parseInt(year, 10);
      year = y > 30 ? `19${year}` : `20${year}`;
    }
    result.birthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    remaining = remaining.replace(dobMatchNum[0], ' ');
  } else {
    // Text: 12 мая 90, 12 мая 1990 года (fuzzy month matching)
    const monthRoots = ["январ", "феврал", "март", "апрел", "мая", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];
    const monthMap: Record<string, number> = {
      "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "мая": 5, "май": 5, "июн": 6, "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12
    };

    const wordsTokens = remaining.split(/[\s,]+/);
    for (let i = 0; i < wordsTokens.length - 1; i++) {
      const w1 = wordsTokens[i] || '';
      const w2 = wordsTokens[i+1] || '';
      
      const dayNum = parseInt(w1, 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        // Is w2 a fuzzy month?
        let matchedMonth = -1;
        for (const root of monthRoots) {
          if (containsAnyFuzzyRoot(w2, [root])) {
            matchedMonth = monthMap[root]!;
            break;
          }
        }
        
        if (matchedMonth !== -1) {
          // Look for year in w3 or w4 (in case of "года")
          let yearStr = "";
          let yearWordIndex = -1;
          for (let k = 1; k <= 3; k++) {
             const potentialYear = wordsTokens[i+1+k];
             if (potentialYear && /^\d{2,4}$/.test(potentialYear)) {
               yearStr = potentialYear;
               yearWordIndex = i+1+k;
               break;
             }
          }
          
          if (yearStr) {
             let year = yearStr;
             if (year.length === 2) {
               const y = parseInt(year, 10);
               year = y > 30 ? `19${year}` : `20${year}`;
             }
             result.birthDate = `${year}-${String(matchedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
             
             // Remove the matched words
             const matchedText = wordsTokens.slice(i, yearWordIndex + 1).join(' ');
             remaining = remaining.replace(matchedText, ' ');
             // Also remove "год" or "года" if it follows
             remaining = remaining.replace(/\b(?:года|год)\b/gi, ' ');
             break;
          }
        }
      }
    }
  }

  // 4. Name extraction & cleanup
  const stopRoots = ["создай", "добавь", "запиши", "пациент", "нов", "пожалуйст", "имя", "на", "в", "к", "доктор", "врач", "ребенк", "мальчик", "девочк", "прием", "час", "срочн", "запис", "отмен", "перенес", "передвин", "телефон", "мобильн", "номер", "сотов", "дата", "рождени", "год", "восьмерк", "восемь", "семь", "плюс", "зовут", "лет"];
  
  const finalWords = remaining.split(/[\s,;]+/).filter(Boolean);
  const cleanWords: string[] = [];
  
  for (const w of finalWords) {
    // Only remove words if they match stop roots, but allow 1-letter words except "в", "к"
    if (w.length <= 1 && !["в", "к", "с"].includes(w.toLowerCase())) {
      cleanWords.push(w);
      continue;
    }
    if (!containsAnyFuzzyRoot(w, stopRoots)) {
      cleanWords.push(w);
    }
  }
  
  remaining = cleanWords.join(' ').trim();
  
  if (remaining.length > 0) {
    result.fullName = remaining.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  return result;
}
