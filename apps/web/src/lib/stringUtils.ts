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
