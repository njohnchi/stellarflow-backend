import axios from 'axios';
import { validatePrice } from './validation';
export class GHSRateFetcher {
    coinGeckoUrl = "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=ghs,usd&include_last_updated_at=true";
    usdToGhsUrl = "https://open.er-api.com/v6/latest/USD";
    getCurrency() {
        return "GHS";
    }
    async fetchRate() {
        const prices = [];
        // Strategy 1: Try CoinGecko direct GHS price
        try {
            const coinGeckoResponse = await withRetry(() => axios.get(this.coinGeckoUrl, {
                timeout: 10000,
                headers: {
                    "User-Agent": "StellarFlow-Oracle/1.0",
                },
            }), { maxRetries: 3, retryDelay: 1000 });
            const stellarPrice = coinGeckoResponse.data.stellar;
            if (!stellarPrice) {
                throw new Error('CoinGecko did not return a Stellar price payload');
            }
            const lastUpdatedAt = stellarPrice.last_updated_at
                ? new Date(stellarPrice.last_updated_at * 1000)
                : new Date();
            if (typeof stellarPrice.ghs === 'number') {
                return {
                    currency: 'GHS',
                    rate: validatePrice(stellarPrice.ghs),
                    timestamp: lastUpdatedAt,
                    source: 'CoinGecko'
                };
            }
            if (typeof stellarPrice.usd !== 'number') {
                throw new Error('CoinGecko did not return a usable USD price for Stellar');
            }
            const usdPrice = validatePrice(stellarPrice.usd);
            const exchangeRateResponse = await axios.get(this.usdToGhsUrl, {
                timeout: 10000,
                headers: {
                    "User-Agent": "StellarFlow-Oracle/1.0",
                },
            }), { maxRetries: 3, retryDelay: 1000 });
            const stellarPrice = coinGeckoResponse.data.stellar;
            if (stellarPrice &&
                typeof stellarPrice.usd === "number" &&
                stellarPrice.usd > 0) {
                const exchangeRateResponse = await withRetry(() => axios.get(this.usdToGhsUrl, {
                    timeout: 10000,
                    headers: {
                        "User-Agent": "StellarFlow-Oracle/1.0",
                    },
                }), { maxRetries: 3, retryDelay: 1000 });
                const usdToGhsRate = exchangeRateResponse.data.rates?.GHS;
                if (exchangeRateResponse.data.result === "success" &&
                    typeof usdToGhsRate === "number" &&
                    usdToGhsRate > 0) {
                    const fxTimestamp = exchangeRateResponse.data.time_last_update_unix
                        ? new Date(exchangeRateResponse.data.time_last_update_unix * 1000)
                        : new Date();
                    const lastUpdatedAt = stellarPrice.last_updated_at
                        ? new Date(stellarPrice.last_updated_at * 1000)
                        : new Date();
                    prices.push({
                        rate: stellarPrice.usd * usdToGhsRate,
                        timestamp: fxTimestamp > lastUpdatedAt ? fxTimestamp : lastUpdatedAt,
                        source: "CoinGecko + ExchangeRate API",
                        trustLevel: "trusted",
                    });
                    // Success - reset error tracker
                    errorTracker.trackSuccess("GHS-price-fetch");
                }
            }
        }
        catch (error) {
            console.debug("CoinGecko + ExchangeRate API failed");
        }
        // Strategy 3: Try alternative XLM pricing source
        try {
            const alternativeUrl = "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";
            const altResponse = await withRetry(() => axios.get(alternativeUrl, {
                timeout: 10000,
                headers: {
                    "User-Agent": "StellarFlow-Oracle/1.0",
                },
            });
            const usdToGhsRate = exchangeRateResponse.data.rates?.GHS;
            if (exchangeRateResponse.data.result !== 'success' || typeof usdToGhsRate !== 'number') {
                throw new Error('USD to GHS conversion feed did not return a usable GHS rate');
            }
            const validatedUsdToGhsRate = validatePrice(usdToGhsRate);
            const fxTimestamp = exchangeRateResponse.data.time_last_update_unix
                ? new Date(exchangeRateResponse.data.time_last_update_unix * 1000)
                : lastUpdatedAt;
            return {
                currency: 'GHS',
                rate: validatePrice(usdPrice * validatedUsdToGhsRate),
                timestamp: fxTimestamp > lastUpdatedAt ? fxTimestamp : lastUpdatedAt,
                source: 'CoinGecko + ExchangeRate API'
            };
        }
        // All strategies failed - track failure and send notification if 3 consecutive failures
        const error = new Error("All GHS rate sources failed");
        const thresholdReached = errorTracker.trackFailure("GHS-price-fetch", {
            errorMessage: error.message,
            timestamp: new Date(),
            service: "GHSRateFetcher",
        });
        if (thresholdReached) {
            await webhookService.sendErrorNotification({
                errorType: "PRICE_FETCH_FAILED_CONSECUTIVE",
                errorMessage: error.message,
                attempts: 3,
                service: "GHSRateFetcher",
                pricePair: "XLM/GHS",
                timestamp: new Date(),
            });
        }
        throw error;
    }
    async isHealthy() {
        try {
            const rate = await this.fetchRate();
            return rate.rate > 0;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=ghsFetcher.js.map