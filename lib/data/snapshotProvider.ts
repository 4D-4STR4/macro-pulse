import type { MarketSnapshot } from "@/lib/types";
import snapshot from "@/data/snapshot.json";

/**
 * Reads the bundled, real-context snapshot committed at data/snapshot.json.
 * Regenerate it with `npm run generate:snapshot`.
 */
export async function loadSnapshot(): Promise<MarketSnapshot> {
  // The JSON is validated by its generator; cast through unknown for the import.
  return snapshot as unknown as MarketSnapshot;
}
