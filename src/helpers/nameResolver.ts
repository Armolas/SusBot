/**
 * Name Resolution Helper
 */

export async function resolveAddressToName(address: string): Promise<string> {
  return shortenAddress(address);
}

/**
 * Shorten an Ethereum address
 * Example: 0x1234...5678
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Resolve multiple addresses in parallel
 */
export async function resolveMultipleAddresses(
  addresses: string[]
): Promise<Map<string, string>> {
  const resolutions = new Map<string, string>();

  const promises = addresses.map(async (address) => {
    const name = await resolveAddressToName(address);
    resolutions.set(address, name);
  });

  await Promise.all(promises);
  return resolutions;
}

/**
 * Cache for resolved names to avoid repeated lookups
 */
const nameCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Resolve address with caching
 */
export async function resolveAddressToNameCached(
  address: string
): Promise<string> {
  // Check cache
  const cached = nameCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.name;
  }

  // Resolve and cache
  const name = await resolveAddressToName(address);
  nameCache.set(address, { name, timestamp: Date.now() });
  return name;
}
