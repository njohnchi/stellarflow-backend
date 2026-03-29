import { MarketRateService } from "../src/services/marketRate";
import { AggregatedFetcherResponse, MarketRate } from "../src/services/marketRate/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class TestMarketRateService extends MarketRateService {
  public latestPricesCalls = 0;

  override async getAllRates(): Promise<
    Array<{ success: boolean; data?: MarketRate; error?: string }>
  > {
    this.latestPricesCalls += 1;

    return [
      {
        success: true,
        data: {
          currency: "KES",
          rate: 150,
          timestamp: new Date("2026-03-27T12:00:00.000Z"),
          source: "test",
        },
      },
      {
        success: true,
        data: {
          currency: "GHS",
          rate: 15,
          timestamp: new Date("2026-03-27T12:00:00.000Z"),
          source: "test",
        },
      },
    ];
  }
}

async function run(): Promise<void> {
  const service = Object.assign(
    Object.create(TestMarketRateService.prototype) as TestMarketRateService & {
      cache: Map<string, unknown>;
      latestPricesCache: { response: AggregatedFetcherResponse; expiry: Date } | null;
      LATEST_PRICES_CACHE_DURATION_MS: number;
    },
    {
      latestPricesCalls: 0,
      cache: new Map<string, unknown>(),
      latestPricesCache: null,
      LATEST_PRICES_CACHE_DURATION_MS: 10_000,
    },
  );

  const firstResponse = await service.getLatestPrices();
  const secondResponse = await service.getLatestPrices();

  assert(firstResponse.success, "first latest-prices response should succeed");
  assert(secondResponse.success, "second latest-prices response should succeed");
  assert(
    service.latestPricesCalls === 1,
    `expected cached latest prices to reuse the first response, got ${service.latestPricesCalls} fetches`,
  );
  assert(
    firstResponse === secondResponse,
    "expected cached latest prices to return the same response object within the TTL",
  );

  (
    service as unknown as {
      latestPricesCache: { response: AggregatedFetcherResponse; expiry: Date } | null;
    }
  ).latestPricesCache = {
    response: secondResponse,
    expiry: new Date(Date.now() - 1000),
  };

  const thirdResponse = await service.getLatestPrices();

  assert(thirdResponse.success, "third latest-prices response should succeed");
  assert(
    service.latestPricesCalls === 2,
    `expected an expired cache entry to trigger a refresh, got ${service.latestPricesCalls} fetches`,
  );

  service.clearCache();
  assert(
    (
      service as unknown as {
        latestPricesCache: { response: AggregatedFetcherResponse; expiry: Date } | null;
      }
    ).latestPricesCache === null,
    "expected clearCache to remove the latest-prices cache entry",
  );

  console.log("responseCaching.test.ts passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
