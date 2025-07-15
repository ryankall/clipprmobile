import type { Client } from "@shared/schema";

/**
 * Get the display name for a client, showing "Gold" for VIP clients
 */
export function getClientDisplayName(client: Pick<Client, 'name' | 'loyaltyStatus'>): string {
  if (client.loyaltyStatus === 'vip') {
    return 'Gold';
  }
  return client.name || 'Unknown Client';
}

/**
 * Check if a client is VIP
 */
export function isVipClient(client: Pick<Client, 'loyaltyStatus'>): boolean {
  return client.loyaltyStatus === 'vip';
}

/**
 * Get the badge text for a client's loyalty status
 */
export function getClientBadgeText(client: Pick<Client, 'loyaltyStatus'>): string {
  if (client.loyaltyStatus === 'vip') {
    return 'Gold';
  }
  return 'Regular';
}