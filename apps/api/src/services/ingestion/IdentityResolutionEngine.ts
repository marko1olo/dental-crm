export class IdentityResolutionEngine {
  /**
   * Calculates the Levenshtein distance between two strings.
   */
  static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[a.length][b.length];
  }

  /**
   * Normalizes a phone number to E.164 format.
   * Strips all non-digit characters. Assumes Russian +7 if starts with 8 and length 11.
   */
  static normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('8')) {
      cleaned = '7' + cleaned.substring(1);
    }
    if (cleaned.length === 10) {
      cleaned = '7' + cleaned;
    }
    return '+' + cleaned;
  }

  /**
   * Normalizes a name string for comparison.
   * Lowercases, trims, and replaces multiple spaces with a single space.
   */
  static normalizeName(name: string | null | undefined): string {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Compares two patient records and returns a confidence score between 0.0 and 1.0.
   */
  static calculateConfidenceScore(
    incoming: { fullName: string; phone?: string | null; birthDate?: string | null },
    existing: { fullName: string; phone?: string | null; birthDate?: string | null }
  ): number {
    let score = 0;
    
    // 1. Phone Match (E.164)
    const phoneInc = this.normalizePhone(incoming.phone);
    const phoneEx = this.normalizePhone(existing.phone);
    let phoneMatch = false;
    
    if (phoneInc && phoneEx && phoneInc === phoneEx) {
      score += 0.4;
      phoneMatch = true;
    } else if (phoneInc && phoneEx && phoneInc !== phoneEx) {
      // Different phones mean lower confidence, unless other data perfectly matches
      score -= 0.1;
    }

    // 2. Name Match
    const nameInc = this.normalizeName(incoming.fullName);
    const nameEx = this.normalizeName(existing.fullName);
    const maxLen = Math.max(nameInc.length, nameEx.length);
    const dist = this.levenshteinDistance(nameInc, nameEx);
    
    const nameSimilarity = maxLen === 0 ? 0 : (maxLen - dist) / maxLen;
    
    // We weight name similarity by 0.4
    score += nameSimilarity * 0.4;

    // 3. BirthDate Match
    if (incoming.birthDate && existing.birthDate) {
      if (incoming.birthDate === existing.birthDate) {
        score += 0.3; // High boost for exact DOB match
        
        // If names are very similar and DOB matches, it's almost certainly the same person
        if (nameSimilarity > 0.8) {
          score += 0.1;
        }
      } else {
        // Different DOB reduces confidence
        score -= 0.2;
      }
    }

    // Cap the score between 0.0 and 1.0
    return Math.max(0, Math.min(1.0, score));
  }

  /**
   * Determines the action based on the confidence score.
   */
  static getResolutionAction(score: number): 'AUTO_MERGE' | 'MANUAL_REVIEW' | 'CREATE_NEW' {
    if (score >= 0.85) return 'AUTO_MERGE';
    if (score >= 0.65) return 'MANUAL_REVIEW';
    return 'CREATE_NEW';
  }
}
