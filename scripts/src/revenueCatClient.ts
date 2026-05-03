import { createClient } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!apiKey) throw new Error("REVENUECAT_SECRET_API_KEY is not set");

  const client = createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return client;
}
