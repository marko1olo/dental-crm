import Fuse from "fuse.js";
import { ServiceCatalogItem } from "@dental/shared";

export interface IntentMatchQuery {
  action: string;
  modifier?: string;
  tooth?: string;
}

export class PriceListMatcher {
  private fuse: Fuse<ServiceCatalogItem>;

  constructor(catalog: ServiceCatalogItem[]) {
    // Fuse is configured for hybrid search across title and aliases
    this.fuse = new Fuse(catalog, {
      keys: [
        { name: "title", weight: 0.7 },
        { name: "aliases", weight: 0.9 }, // Aliases have higher weight because they map exact doctor slang
        { name: "code", weight: 0.3 }
      ],
      threshold: 0.4, // Requires a reasonably close match
      ignoreLocation: true,
      includeScore: true
    });
  }

  /**
   * Matches a parsed intent against the real local price list database.
   * This guarantees ZERO hallucinations from LLM since we always return a real DB item.
   */
  public matchIntent(intent: IntentMatchQuery): ServiceCatalogItem | null {
    // Build a search query based on the LLM intent
    const queryParts = [intent.action];
    
    // Add modifiers like "сложное" (complex)
    if (intent.modifier) {
      queryParts.push(intent.modifier);
    }
    
    const query = queryParts.join(" ");
    const results = this.fuse.search(query);

    if (results.length > 0 && results[0]?.item) {
      // Return the top matched real price list item
      return results[0].item;
    }
    
    return null;
  }
}
