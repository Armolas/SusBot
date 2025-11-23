import { createPublicClient, http } from "viem";
import { mainnet, base } from "viem/chains";

/**
 * Name Resolution Helper
 * Resolves Ethereum addresses to ENS or Basename
 */

// Create clients for ENS (mainnet) and Basename (Base)
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Resolve ENS name for an address
 */
async function resolveENS(address: string): Promise<string | null> {
  try {
    const ensName = await mainnetClient.getEnsName({
      address: address as `0x${string}`,
    });
    return ensName;
  } catch (error) {
    console.error(`Failed to resolve ENS for ${address}:`, error);
    return null;
  }
}

/**
 * Resolve Basename for an address
 */
async function resolveBasename(address: string): Promise<string | null> {
  try {
    const basename = await baseClient.getEnsName({
      address: address as `0x${string}`,
    });
    return basename;
  } catch (error) {
    console.error(`Failed to resolve Basename for ${address}:`, error);
    return null;
  }
}

/**
 * Try to resolve address to human-readable name
 * Checks: Basename → ENS → Shortened Address
 */
export async function resolveAddressToName(address: string): Promise<string> {
  // Try Basename first (Base network)
  const basename = await resolveBasename(address);
  if (basename) {
    return basename;
  }

  // Try ENS (Ethereum mainnet)
  const ensName = await resolveENS(address);
  if (ensName) {
    return ensName;
  }

  // Fallback to shortened address
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
