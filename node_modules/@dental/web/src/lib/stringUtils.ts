/**
 * Calculates the Levenshtein distance between two strings.
 * This is used for typo tolerance (fuzzy matching).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1] as number;
      } else {
        matrix[i]![j] = Math.min(
          (matrix[i - 1]![j - 1] as number) + 1,
          Math.min(
            (matrix[i]![j - 1] as number) + 1,
            (matrix[i - 1]![j] as number) + 1
          )
        );
      }
    }
  }

  return matrix[b.length]![a.length] as number;
}

/**
 * Checks if a word is a fuzzy match for a target root.
 * Handles typos based on word length.
 */
export function isFuzzyMatch(inputWord: string, targetRoot: string): boolean {
  if (!inputWord || !targetRoot) return false;
  
  const input = inputWord.toLowerCase();
  const target = targetRoot.toLowerCase();
  
  if (input === target) return true;
  
  const distance = levenshteinDistance(input, target);
  
  // Tolerance rules:
  // length <= 3: exact match only
  // length 4-5: 1 typo allowed
  // length 6-8: 2 typos allowed
  // length 9+: 3 typos allowed
  if (target.length <= 3) return distance === 0;
  if (target.length <= 5) return distance <= 1;
  if (target.length <= 8) return distance <= 2;
  return distance <= 3;
}

/**
 * Checks if a word is a fuzzy match for a target root (prefix match).
 * Allows finding "жалобами" using the root "жалоб".
 */
export function isFuzzyRootMatch(inputWord: string, targetRoot: string): boolean {
  if (!inputWord || !targetRoot) return false;
  
  const input = inputWord.toLowerCase();
  const target = targetRoot.toLowerCase();
  
  if (input.startsWith(target)) return true;
  
  // If it doesn't start exactly, check distance of the prefix of the same length
  if (input.length >= target.length) {
    const prefix = input.substring(0, target.length);
    const distance = levenshteinDistance(prefix, target);
    
    if (target.length <= 3) return distance === 0;
    if (target.length <= 5) return distance <= 1;
    if (target.length <= 8) return distance <= 2;
    return distance <= 3;
  } else {
    // input is shorter than root
    const distance = levenshteinDistance(input, target);
    if (target.length <= 3) return distance === 0;
    if (target.length <= 5) return distance <= 1;
    if (target.length <= 8) return distance <= 2;
    return distance <= 3;
  }
}

/**
 * Checks if a text contains any word that fuzzy matches the given root.
 */
export function containsFuzzyRoot(text: string, root: string): boolean {
  if (!text || !root) return false;
  // fast path exact match
  if (text.toLowerCase().includes(root.toLowerCase())) return true;
  
  const words = text.toLowerCase().split(/[\s.,;!?]+/);
  return words.some(word => isFuzzyRootMatch(word, root));
}

/**
 * Checks if a text contains any word that fuzzy matches ANY of the given roots.
 */
export function containsAnyFuzzyRoot(text: string, roots: string[]): boolean {
  return roots.some(r => containsFuzzyRoot(text, r));
}

/**
 * Converts Russian number words into digits. 
 * Correctly combines "восемь девятьсот шестнадцать" into "8 916".
 */
export function textToNumbers(text: string): string {
  const numValues: Record<string, number> = {
    "ноль": 0, "нуль": 0, "один": 1, "одна": 1, "первый": 1, "первого": 1,
    "два": 2, "две": 2, "второй": 2, "второго": 2,
    "три": 3, "третий": 3, "третьего": 3,
    "четыре": 4, "четвертый": 4, "четвертого": 4,
    "пять": 5, "пятый": 5, "пятого": 5,
    "шесть": 6, "шестой": 6, "шестого": 6,
    "семь": 7, "седьмой": 7, "седьмого": 7,
    "восемь": 8, "восьмой": 8, "восьмого": 8,
    "девять": 9, "девятый": 9, "девятого": 9,
    "десять": 10, "десятый": 10, "десятого": 10,
    "одиннадцать": 11, "двенадцать": 12, "тринадцать": 13, 
    "четырнадцать": 14, "пятнадцать": 15, "шестнадцать": 16, 
    "семнадцать": 17, "восемнадцать": 18, "девятнадцать": 19,
    "двадцать": 20, "тридцать": 30, "сорок": 40, "пятьдесят": 50,
    "шестьдесят": 60, "семьдесят": 70, "восемьдесят": 80, "девяносто": 90,
    "сто": 100, "двести": 200, "триста": 300, "четыреста": 400, "четреста": 400,
    "пятьсот": 500, "шестьсот": 600, "семьсот": 700, "восемьсот": 800, "девятьсот": 900,
    "тысяча": 1000, "тысячи": 1000, "тысяч": 1000
  };

  const tokens = text.split(/(\s+)/);
  const result: string[] = [];
  
  let currentNum = 0;
  let inNumber = false;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.trim() === '') {
      result.push(token);
      continue;
    }
    
    const match = token.match(/^([.,;!?]*)(.*?)([.,;!?]*)$/);
    const prefix = match ? match[1] : '';
    const word = match ? match[2]!.toLowerCase() : token.toLowerCase();
    const suffix = match ? match[3] : '';
    
    let matchedVal = numValues[word];
    if (matchedVal === undefined) {
      // Sort keys by length descending to match longest roots first (e.g., "двенадцать" before "две")
      const sortedKeys = Object.keys(numValues).sort((a, b) => b.length - a.length);
      for (const k of sortedKeys) {
        if (isFuzzyRootMatch(word, k)) {
          matchedVal = numValues[k];
          break;
        }
      }
    }
    
    if (matchedVal !== undefined) {
      inNumber = true;
      
      if (matchedVal === 0) {
        if (currentNum > 0) {
          result.push(prefix + currentNum.toString() + " ");
        }
        result.push(prefix + "0 ");
        currentNum = 0;
        inNumber = false;
      } else if (matchedVal === 1000) {
        if (currentNum === 0) {
           currentNum = 1000;
        } else {
           let isValidMultiplier = true;
           const wLower = word.toLowerCase();
           const lastDigit = currentNum % 10;
           const lastTwoDigits = currentNum % 100;
           
           if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
              if (wLower.endsWith("а") || wLower.endsWith("и")) isValidMultiplier = false;
           } else if (lastDigit === 1) {
              if (!wLower.endsWith("а") && !wLower.endsWith("у")) isValidMultiplier = false;
           } else if (lastDigit >= 2 && lastDigit <= 4) {
              if (!wLower.endsWith("и")) isValidMultiplier = false;
           } else {
              if (wLower.endsWith("а") || wLower.endsWith("и")) isValidMultiplier = false;
           }
           
           if (isValidMultiplier) {
              currentNum *= 1000;
           } else {
              result.push(prefix + currentNum.toString() + " ");
              currentNum = 1000;
           }
        }
      } else if (currentNum > 0 && matchedVal >= 100 && (currentNum % 1000) !== 0) {
         result.push(prefix + currentNum.toString() + " ");
         currentNum = matchedVal;
      } else if (currentNum > 0 && matchedVal >= 10 && matchedVal < 100 && (currentNum % 100) !== 0) {
         result.push(prefix + currentNum.toString() + " ");
         currentNum = matchedVal;
      } else if (currentNum > 0 && matchedVal < 10 && (currentNum % 10) !== 0) {
         result.push(prefix + currentNum.toString() + " ");
         currentNum = matchedVal;
      } else {
         currentNum += matchedVal;
      }
      
      let nextIsNumber = false;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j]!.trim() !== '') {
          const wMatch = tokens[j]!.match(/^([.,;!?]*)(.*?)([.,;!?]*)$/);
          const nextWord = wMatch ? wMatch[2]!.toLowerCase() : tokens[j]!.toLowerCase();
          
          let hasNext = numValues[nextWord] !== undefined;
          if (!hasNext) {
            const sortedKeys = Object.keys(numValues).sort((a, b) => b.length - a.length);
            for (const k of sortedKeys) {
              if (isFuzzyRootMatch(nextWord, k)) {
                hasNext = true; break;
              }
            }
          }
          if (hasNext) {
            nextIsNumber = true;
          }
          break;
        }
      }
      
      if (!nextIsNumber) {
        result.push(currentNum === 0 && matchedVal !== 0 ? token : (currentNum.toString() + suffix));
        currentNum = 0;
        inNumber = false;
      }
    } else {
      if (inNumber) {
        result.push(currentNum.toString() + " ");
        currentNum = 0;
        inNumber = false;
      }
      result.push(token);
    }
  }
  
  return result.join('');
}

/**
 * Normalizes dental slang into ISO tooth numbers (e.g., "верхняя левая шестерка" -> "26").
 */
export function normalizeDentalSlang(text: string): string {
  const slangMap: Record<string, string> = {
    "единичк": "1", "двойк": "2", "тройк": "3", "четверк": "4",
    "пятерк": "5", "шестерк": "6", "семерк": "7", "восьмерк": "8",
    "единиц": "1", "двойниц": "2" 
  };

  const words = text.split(/(\s+)/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!.trim();
    if (!word) continue;
    
    let toothDigit = "";
    let isSlangWord = false;
    for (const [k, v] of Object.entries(slangMap)) {
      if (isFuzzyRootMatch(word, k)) {
        toothDigit = v;
        isSlangWord = true;
        break;
      }
    }
    
    // Also support raw digits 1-8 if they have quadrant context words!
    if (!toothDigit && /^[1-8]$/.test(word)) {
      toothDigit = word;
      isSlangWord = false;
    }
    
    if (toothDigit) {
      let isUpper = false;
      let isLower = false;
      let isLeft = false;
      let isRight = false;
      
      const searchStart = Math.max(0, i - 10);
      const searchEnd = Math.min(words.length - 1, i + 10);
      for (let j = searchStart; j <= searchEnd; j++) {
        const ctxWord = words[j]!.trim();
        if (isFuzzyRootMatch(ctxWord, "верхн") || isFuzzyRootMatch(ctxWord, "сверх")) isUpper = true;
        if (isFuzzyRootMatch(ctxWord, "нижн") || isFuzzyRootMatch(ctxWord, "снизу")) isLower = true;
        if (isFuzzyRootMatch(ctxWord, "лев") || isFuzzyRootMatch(ctxWord, "слев")) isLeft = true;
        if (isFuzzyRootMatch(ctxWord, "прав") || isFuzzyRootMatch(ctxWord, "справ")) isRight = true;
      }
      
      let quad = "";
      if (isUpper && isRight) quad = "1";
      else if (isUpper && isLeft) quad = "2";
      else if (isLower && isLeft) quad = "3";
      else if (isLower && isRight) quad = "4";
      else if (isUpper) quad = "1"; 
      else if (isLower) quad = "4"; 
      else if (isRight) quad = "1";
      else if (isLeft) quad = "2";
      else if (isSlangWord) quad = "1"; // fallback only if it was an explicit slang word
      
      if (quad) {
        words[i] = words[i]!.replace(word, quad + toothDigit);
      }
    }
  }
  return words.join('');
}
