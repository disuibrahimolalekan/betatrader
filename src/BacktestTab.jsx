import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Play, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Minus, Database, Clock, Plus, X, Search
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const AV_KEY = import.meta.env.VITE_ALPHAVANTAGE_API_KEY || '';
const AV_BASE = 'https://www.alphavantage.co/query';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────────────────────
// ASSET DATABASE  (90+ symbols — searchable)
// ─────────────────────────────────────────────────────────────
const ASSET_DB = [
  // ── MAJOR FOREX ──────────────────────────────────────────────
  { value: 'EURUSD', label: 'EUR/USD', desc: 'Euro / US Dollar',               type: 'forex',  from: 'EUR', to: 'USD', cat: 'Forex' },
  { value: 'USDJPY', label: 'USD/JPY', desc: 'US Dollar / Japanese Yen',       type: 'forex',  from: 'USD', to: 'JPY', cat: 'Forex' },
  { value: 'GBPUSD', label: 'GBP/USD', desc: 'British Pound / US Dollar',      type: 'forex',  from: 'GBP', to: 'USD', cat: 'Forex' },
  { value: 'AUDUSD', label: 'AUD/USD', desc: 'Australian Dollar / US Dollar',  type: 'forex',  from: 'AUD', to: 'USD', cat: 'Forex' },
  { value: 'USDCAD', label: 'USD/CAD', desc: 'US Dollar / Canadian Dollar',    type: 'forex',  from: 'USD', to: 'CAD', cat: 'Forex' },
  { value: 'USDCHF', label: 'USD/CHF', desc: 'US Dollar / Swiss Franc',        type: 'forex',  from: 'USD', to: 'CHF', cat: 'Forex' },
  { value: 'NZDUSD', label: 'NZD/USD', desc: 'New Zealand Dollar / US Dollar', type: 'forex',  from: 'NZD', to: 'USD', cat: 'Forex' },
  { value: 'USDMXN', label: 'USD/MXN', desc: 'US Dollar / Mexican Peso',       type: 'forex',  from: 'USD', to: 'MXN', cat: 'Forex' },
  { value: 'USDZAR', label: 'USD/ZAR', desc: 'US Dollar / South African Rand', type: 'forex',  from: 'USD', to: 'ZAR', cat: 'Forex' },
  { value: 'USDSGD', label: 'USD/SGD', desc: 'US Dollar / Singapore Dollar',   type: 'forex',  from: 'USD', to: 'SGD', cat: 'Forex' },
  { value: 'USDHKD', label: 'USD/HKD', desc: 'US Dollar / Hong Kong Dollar',   type: 'forex',  from: 'USD', to: 'HKD', cat: 'Forex' },
  { value: 'USDNOK', label: 'USD/NOK', desc: 'US Dollar / Norwegian Krone',    type: 'forex',  from: 'USD', to: 'NOK', cat: 'Forex' },
  { value: 'USDSEK', label: 'USD/SEK', desc: 'US Dollar / Swedish Krona',      type: 'forex',  from: 'USD', to: 'SEK', cat: 'Forex' },
  { value: 'USDDKK', label: 'USD/DKK', desc: 'US Dollar / Danish Krone',       type: 'forex',  from: 'USD', to: 'DKK', cat: 'Forex' },
  { value: 'USDTRY', label: 'USD/TRY', desc: 'US Dollar / Turkish Lira',       type: 'forex',  from: 'USD', to: 'TRY', cat: 'Forex' },
  // ── CROSSES ──────────────────────────────────────────────────
  { value: 'GBPJPY', label: 'GBP/JPY', desc: 'British Pound / Japanese Yen',   type: 'forex',  from: 'GBP', to: 'JPY', cat: 'Forex Crosses' },
  { value: 'EURJPY', label: 'EUR/JPY', desc: 'Euro / Japanese Yen',            type: 'forex',  from: 'EUR', to: 'JPY', cat: 'Forex Crosses' },
  { value: 'AUDJPY', label: 'AUD/JPY', desc: 'Australian Dollar / Japanese Yen',type: 'forex', from: 'AUD', to: 'JPY', cat: 'Forex Crosses' },
  { value: 'CADJPY', label: 'CAD/JPY', desc: 'Canadian Dollar / Japanese Yen', type: 'forex',  from: 'CAD', to: 'JPY', cat: 'Forex Crosses' },
  { value: 'NZDJPY', label: 'NZD/JPY', desc: 'New Zealand Dollar / Yen',       type: 'forex',  from: 'NZD', to: 'JPY', cat: 'Forex Crosses' },
  { value: 'CHFJPY', label: 'CHF/JPY', desc: 'Swiss Franc / Japanese Yen',     type: 'forex',  from: 'CHF', to: 'JPY', cat: 'Forex Crosses' },
  { value: 'EURGBP', label: 'EUR/GBP', desc: 'Euro / British Pound',           type: 'forex',  from: 'EUR', to: 'GBP', cat: 'Forex Crosses' },
  { value: 'EURCHF', label: 'EUR/CHF', desc: 'Euro / Swiss Franc',             type: 'forex',  from: 'EUR', to: 'CHF', cat: 'Forex Crosses' },
  { value: 'EURAUD', label: 'EUR/AUD', desc: 'Euro / Australian Dollar',       type: 'forex',  from: 'EUR', to: 'AUD', cat: 'Forex Crosses' },
  { value: 'EURCAD', label: 'EUR/CAD', desc: 'Euro / Canadian Dollar',         type: 'forex',  from: 'EUR', to: 'CAD', cat: 'Forex Crosses' },
  { value: 'EURNZD', label: 'EUR/NZD', desc: 'Euro / New Zealand Dollar',      type: 'forex',  from: 'EUR', to: 'NZD', cat: 'Forex Crosses' },
  { value: 'GBPAUD', label: 'GBP/AUD', desc: 'British Pound / Australian Dollar',type: 'forex',from: 'GBP', to: 'AUD', cat: 'Forex Crosses' },
  { value: 'GBPCAD', label: 'GBP/CAD', desc: 'British Pound / Canadian Dollar', type: 'forex', from: 'GBP', to: 'CAD', cat: 'Forex Crosses' },
  { value: 'GBPCHF', label: 'GBP/CHF', desc: 'British Pound / Swiss Franc',    type: 'forex',  from: 'GBP', to: 'CHF', cat: 'Forex Crosses' },
  { value: 'GBPNZD', label: 'GBP/NZD', desc: 'British Pound / New Zealand Dollar',type:'forex',from: 'GBP', to: 'NZD', cat: 'Forex Crosses' },
  { value: 'AUDCAD', label: 'AUD/CAD', desc: 'Australian Dollar / Canadian Dollar',type:'forex',from:'AUD',to:'CAD', cat: 'Forex Crosses' },
  { value: 'AUDCHF', label: 'AUD/CHF', desc: 'Australian Dollar / Swiss Franc', type: 'forex', from: 'AUD', to: 'CHF', cat: 'Forex Crosses' },
  { value: 'AUDNZD', label: 'AUD/NZD', desc: 'Australian Dollar / New Zealand Dollar',type:'forex',from:'AUD',to:'NZD',cat:'Forex Crosses'},
  { value: 'CADCHF', label: 'CAD/CHF', desc: 'Canadian Dollar / Swiss Franc',  type: 'forex',  from: 'CAD', to: 'CHF', cat: 'Forex Crosses' },
  // ── METALS & COMMODITIES ─────────────────────────────────────
  { value: 'XAUUSD', label: 'XAU/USD', desc: 'Gold Spot / US Dollar',          type: 'metals', from: 'XAU', to: 'USD', cat: 'Metals' },
  { value: 'XAGUSD', label: 'XAG/USD', desc: 'Silver Spot / US Dollar',        type: 'metals', from: 'XAG', to: 'USD', cat: 'Metals' },
  { value: 'XPTUSD', label: 'XPT/USD', desc: 'Platinum / US Dollar',           type: 'metals', from: 'XPT', to: 'USD', cat: 'Metals' },
  { value: 'XPDUSD', label: 'XPD/USD', desc: 'Palladium / US Dollar',          type: 'metals', from: 'XPD', to: 'USD', cat: 'Metals' },
  // ── US & GLOBAL ETFs / INDICES ───────────────────────────────
  { value: 'SPY',  label: 'SPY',  desc: 'S\u0026P 500 ETF',          type: 'etf', cat: 'ETF / Index' },
  { value: 'QQQ',  label: 'QQQ',  desc: 'NASDAQ-100 ETF',            type: 'etf', cat: 'ETF / Index' },
  { value: 'DIA',  label: 'DIA',  desc: 'Dow Jones ETF',             type: 'etf', cat: 'ETF / Index' },
  { value: 'IWM',  label: 'IWM',  desc: 'Russell 2000 ETF',          type: 'etf', cat: 'ETF / Index' },
  { value: 'EEM',  label: 'EEM',  desc: 'Emerging Markets ETF',      type: 'etf', cat: 'ETF / Index' },
  { value: 'EWG',  label: 'EWG',  desc: 'Germany DAX ETF',           type: 'etf', cat: 'ETF / Index' },
  { value: 'EWU',  label: 'EWU',  desc: 'UK FTSE 100 ETF',           type: 'etf', cat: 'ETF / Index' },
  { value: 'EWJ',  label: 'EWJ',  desc: 'Japan Nikkei ETF',          type: 'etf', cat: 'ETF / Index' },
  { value: 'FXI',  label: 'FXI',  desc: 'China Large-Cap ETF',       type: 'etf', cat: 'ETF / Index' },
  { value: 'GLD',  label: 'GLD',  desc: 'Gold ETF',                  type: 'etf', cat: 'ETF / Index' },
  { value: 'SLV',  label: 'SLV',  desc: 'Silver ETF',                type: 'etf', cat: 'ETF / Index' },
  { value: 'USO',  label: 'USO',  desc: 'Crude Oil ETF',             type: 'etf', cat: 'ETF / Index' },
  { value: 'XLE',  label: 'XLE',  desc: 'Energy Select Sector ETF',  type: 'etf', cat: 'ETF / Index' },
  { value: 'XLF',  label: 'XLF',  desc: 'Financial Select Sector ETF',type:'etf', cat: 'ETF / Index' },
  { value: 'XLK',  label: 'XLK',  desc: 'Technology Select ETF',     type: 'etf', cat: 'ETF / Index' },
  { value: 'ARKK', label: 'ARKK', desc: 'ARK Innovation ETF',        type: 'etf', cat: 'ETF / Index' },
  { value: 'VIX',  label: 'VIX',  desc: 'Volatility Index (ProShares)',type:'etf', cat: 'ETF / Index' },
  // ── CRYPTO ───────────────────────────────────────────────────
  { value: 'BTC',  label: 'BTC/USD', desc: 'Bitcoin',             type: 'crypto', coin: 'BTC', market: 'USD', cat: 'Crypto' },
  { value: 'ETH',  label: 'ETH/USD', desc: 'Ethereum',            type: 'crypto', coin: 'ETH', market: 'USD', cat: 'Crypto' },
  { value: 'BNB',  label: 'BNB/USD', desc: 'Binance Coin',        type: 'crypto', coin: 'BNB', market: 'USD', cat: 'Crypto' },
  { value: 'SOL',  label: 'SOL/USD', desc: 'Solana',              type: 'crypto', coin: 'SOL', market: 'USD', cat: 'Crypto' },
  { value: 'XRP',  label: 'XRP/USD', desc: 'XRP (Ripple)',        type: 'crypto', coin: 'XRP', market: 'USD', cat: 'Crypto' },
  { value: 'ADA',  label: 'ADA/USD', desc: 'Cardano',             type: 'crypto', coin: 'ADA', market: 'USD', cat: 'Crypto' },
  { value: 'DOGE', label: 'DOGE/USD',desc: 'Dogecoin',            type: 'crypto', coin: 'DOGE',market: 'USD', cat: 'Crypto' },
  { value: 'TRX',  label: 'TRX/USD', desc: 'TRON',               type: 'crypto', coin: 'TRX', market: 'USD', cat: 'Crypto' },
  { value: 'AVAX', label: 'AVAX/USD',desc: 'Avalanche',           type: 'crypto', coin: 'AVAX',market: 'USD', cat: 'Crypto' },
  { value: 'DOT',  label: 'DOT/USD', desc: 'Polkadot',            type: 'crypto', coin: 'DOT', market: 'USD', cat: 'Crypto' },
  { value: 'MATIC',label: 'MATIC/USD',desc: 'Polygon',            type: 'crypto', coin: 'MATIC',market:'USD', cat: 'Crypto' },
  { value: 'LINK', label: 'LINK/USD',desc: 'Chainlink',           type: 'crypto', coin: 'LINK',market: 'USD', cat: 'Crypto' },
  { value: 'LTC',  label: 'LTC/USD', desc: 'Litecoin',            type: 'crypto', coin: 'LTC', market: 'USD', cat: 'Crypto' },
  { value: 'BCH',  label: 'BCH/USD', desc: 'Bitcoin Cash',        type: 'crypto', coin: 'BCH', market: 'USD', cat: 'Crypto' },
  { value: 'UNI',  label: 'UNI/USD', desc: 'Uniswap',             type: 'crypto', coin: 'UNI', market: 'USD', cat: 'Crypto' },
  { value: 'ATOM', label: 'ATOM/USD',desc: 'Cosmos',              type: 'crypto', coin: 'ATOM',market: 'USD', cat: 'Crypto' },
  { value: 'ETC',  label: 'ETC/USD', desc: 'Ethereum Classic',    type: 'crypto', coin: 'ETC', market: 'USD', cat: 'Crypto' },
  { value: 'XLM',  label: 'XLM/USD', desc: 'Stellar',             type: 'crypto', coin: 'XLM', market: 'USD', cat: 'Crypto' },
  { value: 'NEAR', label: 'NEAR/USD',desc: 'NEAR Protocol',       type: 'crypto', coin: 'NEAR',market: 'USD', cat: 'Crypto' },
  { value: 'FIL',  label: 'FIL/USD', desc: 'Filecoin',            type: 'crypto', coin: 'FIL', market: 'USD', cat: 'Crypto' },
  { value: 'APT',  label: 'APT/USD', desc: 'Aptos',               type: 'crypto', coin: 'APT', market: 'USD', cat: 'Crypto' },
  { value: 'ARB',  label: 'ARB/USD', desc: 'Arbitrum',            type: 'crypto', coin: 'ARB', market: 'USD', cat: 'Crypto' },
  { value: 'OP',   label: 'OP/USD',  desc: 'Optimism',            type: 'crypto', coin: 'OP',  market: 'USD', cat: 'Crypto' },
  { value: 'SUI',  label: 'SUI/USD', desc: 'Sui',                 type: 'crypto', coin: 'SUI', market: 'USD', cat: 'Crypto' },
  { value: 'INJ',  label: 'INJ/USD', desc: 'Injective',           type: 'crypto', coin: 'INJ', market: 'USD', cat: 'Crypto' },
];

// ─────────────────────────────────────────────────────────────
// Keep ASSET_OPTIONS as alias for backward compat (fetch fn uses assetOption)
// ─────────────────────────────────────────────────────────────
const ASSET_OPTIONS = ASSET_DB;

function buildCustomAsset(symbol) {
  if (!symbol) return null;
  const clean = symbol.trim().toUpperCase().replace('/', '');
  if (!clean) return null;

  // Detect metals
  if (/^(XAU|XAG|XPT|XPD)/.test(clean)) {
    return {
      value: clean,
      label: `${clean.slice(0, 3)}/${clean.slice(3) || 'USD'}`,
      desc: `Custom Metal: ${clean}`,
      type: 'metals',
      from: clean.slice(0, 3),
      to: clean.slice(3) || 'USD',
      cat: 'Custom'
    };
  }

  // Detect Forex (6 chars, e.g. EURUSD, GBPJPY)
  const majorCurrencies = ['EUR','USD','GBP','JPY','AUD','CAD','CHF','NZD','MXN','ZAR','SGD','HKD','NOK','SEK','DKK','TRY'];
  if (clean.length === 6 && majorCurrencies.includes(clean.slice(0,3)) && majorCurrencies.includes(clean.slice(3))) {
    return {
      value: clean,
      label: `${clean.slice(0,3)}/${clean.slice(3)}`,
      desc: `Custom Forex: ${clean.slice(0,3)} / ${clean.slice(3)}`,
      type: 'forex',
      from: clean.slice(0, 3),
      to: clean.slice(3),
      cat: 'Custom'
    };
  }

  // Detect Crypto
  const cryptoCoins = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','AVAX','DOT','MATIC','LINK','LTC','BCH','UNI','ATOM','ETC','XLM','NEAR','FIL','APT','ARB','OP','SUI','INJ'];
  let isCrypto = false;
  let coin = '';
  let market = 'USD';

  for (const c of cryptoCoins) {
    if (clean.startsWith(c)) {
      isCrypto = true;
      coin = c;
      const rem = clean.slice(c.length);
      market = rem || 'USD';
      break;
    }
  }

  if (!isCrypto) {
    if (clean.endsWith('USD') || clean.endsWith('USDT')) {
      isCrypto = true;
      const suffix = clean.endsWith('USDT') ? 'USDT' : 'USD';
      coin = clean.slice(0, clean.length - suffix.length);
      market = suffix;
    }
  }

  if (isCrypto && coin) {
    return {
      value: clean,
      label: `${coin}/${market}`,
      desc: `Custom Crypto: ${coin}`,
      type: 'crypto',
      coin,
      market,
      cat: 'Custom'
    };
  }

  // Default to ETF/Stock
  return {
    value: clean,
    label: clean,
    desc: `Custom ETF/Stock: ${clean}`,
    type: 'etf',
    cat: 'Custom'
  };
}

const TIMEFRAME_OPTIONS = [
  { value: '1D',  label: '1 Day (free tier)', free: true },
  { value: '1H',  label: '1 Hour (premium key required)', free: false },
  { value: '4H',  label: '4 Hour (premium key required)', free: false },
];

const TRADE_DIRECTION_OPTIONS = [
  { value: 'BUY',  label: 'BUY / LONG' },
  { value: 'SELL', label: 'SELL / SHORT' },
];

const INDICATOR_OPTIONS = [
  { value: 'price',     label: 'Price (Close)' },
  { value: 'rsi',       label: 'RSI (14)' },
  { value: 'sma20',     label: 'SMA 20' },
  { value: 'sma50',     label: 'SMA 50' },
  { value: 'macdLine',  label: 'MACD Line' },
  { value: 'macdHist',  label: 'MACD Histogram' },
  { value: 'bbUpper',   label: 'Bollinger Band Upper' },
  { value: 'bbLower',   label: 'Bollinger Band Lower' },
  { value: 'candle',    label: 'Candle Type' },
  { value: 'candleSize','label': 'Candle Size' },
  { value: 'trend',     label: 'Trend' },
  { value: 'volume',    label: 'Volume' },
];

const OPERATOR_OPTIONS_DEFAULT = [
  { value: 'above',          label: 'is above' },
  { value: 'below',          label: 'is below' },
  { value: 'crossesAbove',   label: 'crosses above' },
  { value: 'crossesBelow',   label: 'crosses below' },
  { value: 'equals',         label: 'is equal to' },
  { value: 'greaterThan',    label: 'is greater than' },
  { value: 'lessThan',       label: 'is less than' },
];

const OPERATOR_OPTIONS_CANDLE = [
  { value: 'isBullish',  label: 'is bullish' },
  { value: 'isBearish',  label: 'is bearish' },
];

const OPERATOR_OPTIONS_TREND = [
  { value: 'isUptrend',       label: 'is uptrend' },
  { value: 'isDowntrend',     label: 'is downtrend' },
  { value: 'isConsolidating', label: 'is consolidating' },
];

const OPERATOR_OPTIONS_CANDLE_SIZE = [
  { value: 'isLarge',   label: 'is large' },
  { value: 'isSmall',   label: 'is small' },
  { value: 'isNormal',  label: 'is normal' },
];

const OPERATOR_OPTIONS_VOLUME = [
  { value: 'aboveAvg',  label: 'is above average' },
  { value: 'belowAvg',  label: 'is below average' },
];

function getOperatorOptions(indicator) {
  if (indicator === 'candle') return OPERATOR_OPTIONS_CANDLE;
  if (indicator === 'trend') return OPERATOR_OPTIONS_TREND;
  if (indicator === 'candleSize') return OPERATOR_OPTIONS_CANDLE_SIZE;
  if (indicator === 'volume') return OPERATOR_OPTIONS_VOLUME;
  return OPERATOR_OPTIONS_DEFAULT;
}

function needsValue(indicator, operator) {
  const noValueOps = ['isBullish','isBearish','isUptrend','isDowntrend','isConsolidating','isLarge','isSmall','isNormal','aboveAvg','belowAvg'];
  return !noValueOps.includes(operator);
}

const DEFAULT_CONDITION = { indicator: 'rsi', operator: 'below', value: '30' };

// ─────────────────────────────────────────────────────────────
// PIP / POINT VALUE HELPERS
// ─────────────────────────────────────────────────────────────
function getPipSize(symbol) {
  if (symbol.includes('JPY')) return 0.01;
  if (symbol === 'XAUUSD') return 0.01;
  if (symbol === 'XAGUSD') return 0.001;
  if (['SPY','QQQ','DIA'].includes(symbol)) return 1;
  if (['BTC','ETH','SOL'].includes(symbol)) return 1;
  return 0.0001; // default forex
}

function toPips(priceDiff, symbol) {
  const ps = getPipSize(symbol);
  return Math.round((priceDiff / ps) * 10) / 10;
}

// ─────────────────────────────────────────────────────────────
// INDICATOR CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────
function calcSMA(prices, period) {
  // Returns array of SMA values (null for positions where not enough data)
  return prices.map((_, idx) => {
    if (idx < period - 1) return null;
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) sum += prices[i];
    return sum / period;
  });
}

function calcEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [];
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) { ema.push(prices[0]); continue; }
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(prices, period = 14) {
  const result = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return result;

  const changes = prices.map((p, i) => i === 0 ? 0 : p - prices[i - 1]);

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const c = changes[i];
    if (c > 0) avgGain += c; else avgLoss += Math.abs(c);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < prices.length; i++) {
    if (i > period) {
      const c = changes[i];
      const gain = c > 0 ? c : 0;
      const loss = c < 0 ? Math.abs(c) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
  }
  return result;
}

function calcMACD(prices) {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine = prices.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = calcEMA(macdLine, 9);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

function calcBollingerBands(prices, period = 20) {
  const sma = calcSMA(prices, period);
  return prices.map((_, idx) => {
    if (sma[idx] === null) return { upper: null, middle: null, lower: null };
    const window = prices.slice(idx - period + 1, idx + 1);
    const mean = sma[idx];
    const variance = window.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
  });
}

function calcTrend(closes, sma20, idx) {
  // Based on SMA20 slope + price position
  if (!sma20[idx] || !sma20[idx - 5]) return 'consolidating';
  const slope = sma20[idx] - sma20[idx - 5];
  const price = closes[idx];
  if (price > sma20[idx] && slope > 0) return 'uptrend';
  if (price < sma20[idx] && slope < 0) return 'downtrend';
  return 'consolidating';
}

function avgBodySize(candles, idx, lookback = 20) {
  const start = Math.max(0, idx - lookback);
  const bodies = candles.slice(start, idx + 1).map(c => Math.abs(c.close - c.open));
  return bodies.reduce((s, b) => s + b, 0) / bodies.length;
}

function avgVolume(candles, idx, lookback = 20) {
  const start = Math.max(0, idx - lookback);
  const vols = candles.slice(start, idx + 1).map(c => c.volume || 0);
  return vols.reduce((s, v) => s + v, 0) / vols.length;
}

// Build the full indicator matrix for all candles
function buildIndicatorMatrix(candles) {
  const closes   = candles.map(c => c.close);
  const highs    = candles.map(c => c.high);
  const lows     = candles.map(c => c.low);

  const sma20    = calcSMA(closes, 20);
  const sma50    = calcSMA(closes, 50);
  const rsiArr   = calcRSI(closes, 14);
  const { macdLine, histogram } = calcMACD(closes);
  const bbArr    = calcBollingerBands(closes, 20);

  return candles.map((c, idx) => {
    const prevMacdLine = idx > 0 ? macdLine[idx - 1] : null;
    const prevHistogram = idx > 0 ? histogram[idx - 1] : null;
    const prevClose = idx > 0 ? closes[idx - 1] : null;
    const prevSma20 = idx > 0 ? sma20[idx - 1] : null;
    const prevSma50 = idx > 0 ? sma50[idx - 1] : null;

    const isBullishCandle = c.close > c.open;
    const bodySize = Math.abs(c.close - c.open);
    const avgBody = avgBodySize(candles, idx);
    const candidateSize = bodySize > avgBody * 1.5 ? 'large' : bodySize < avgBody * 0.5 ? 'small' : 'normal';
    const avgVol = avgVolume(candles, idx);
    const trend = sma20[idx] ? calcTrend(closes, sma20, idx) : 'consolidating';

    return {
      idx,
      open:  c.open,
      high:  highs[idx],
      low:   lows[idx],
      close: closes[idx],
      volume: c.volume || 0,
      time: c.time,

      rsi:        rsiArr[idx],
      sma20:      sma20[idx],
      sma50:      sma50[idx],
      macdLine:   macdLine[idx],
      macdHist:   histogram[idx],
      prevMacdLine,
      prevHistogram,
      prevClose,
      prevSma20,
      prevSma50,
      bbUpper:    bbArr[idx]?.upper,
      bbLower:    bbArr[idx]?.lower,
      bbMiddle:   bbArr[idx]?.middle,
      isBullish:  isBullishCandle,
      isBearish:  !isBullishCandle,
      candleSize: candidateSize,
      trend,
      volAboveAvg: (c.volume || 0) > avgVol,
      volBelowAvg: (c.volume || 0) <= avgVol,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// CONDITION EVALUATION
// ─────────────────────────────────────────────────────────────
function evalCondition(bar, condition) {
  const { indicator, operator, value } = condition;
  const numVal = parseFloat(value);

  const indicatorVal = {
    price:    bar.close,
    rsi:      bar.rsi,
    sma20:    bar.sma20,
    sma50:    bar.sma50,
    macdLine: bar.macdLine,
    macdHist: bar.macdHist,
    bbUpper:  bar.bbUpper,
    bbLower:  bar.bbLower,
  }[indicator];

  // Candle type conditions (no numeric value needed)
  if (indicator === 'candle') {
    if (operator === 'isBullish') return bar.isBullish;
    if (operator === 'isBearish') return bar.isBearish;
    return false;
  }
  if (indicator === 'candleSize') {
    if (operator === 'isLarge')  return bar.candleSize === 'large';
    if (operator === 'isSmall')  return bar.candleSize === 'small';
    if (operator === 'isNormal') return bar.candleSize === 'normal';
    return false;
  }
  if (indicator === 'trend') {
    if (operator === 'isUptrend')       return bar.trend === 'uptrend';
    if (operator === 'isDowntrend')     return bar.trend === 'downtrend';
    if (operator === 'isConsolidating') return bar.trend === 'consolidating';
    return false;
  }
  if (indicator === 'volume') {
    if (operator === 'aboveAvg') return bar.volAboveAvg;
    if (operator === 'belowAvg') return bar.volBelowAvg;
    return false;
  }

  // Numeric value required
  if (indicatorVal === null || indicatorVal === undefined || isNaN(indicatorVal)) return false;

  switch (operator) {
    case 'above':       return indicatorVal > numVal;
    case 'below':       return indicatorVal < numVal;
    case 'equals':      return Math.abs(indicatorVal - numVal) < numVal * 0.001;
    case 'greaterThan': return indicatorVal > numVal;
    case 'lessThan':    return indicatorVal < numVal;
    case 'crossesAbove': {
      // Compare current vs previous value — both must exist
      const prevVal = {
        price:    bar.prevClose,
        rsi:      null,
        sma20:    bar.prevSma20,
        sma50:    bar.prevSma50,
        macdLine: bar.prevMacdLine,
        macdHist: bar.prevHistogram,
        bbUpper:  null,
        bbLower:  null,
      }[indicator];
      if (prevVal === null || prevVal === undefined) return false;
      return prevVal <= numVal && indicatorVal > numVal;
    }
    case 'crossesBelow': {
      const prevVal = {
        price:    bar.prevClose,
        rsi:      null,
        sma20:    bar.prevSma20,
        sma50:    bar.prevSma50,
        macdLine: bar.prevMacdLine,
        macdHist: bar.prevHistogram,
        bbUpper:  null,
        bbLower:  null,
      }[indicator];
      if (prevVal === null || prevVal === undefined) return false;
      return prevVal >= numVal && indicatorVal < numVal;
    }
    default: return false;
  }
}

// ─────────────────────────────────────────────────────────────
// BACKTESTING ENGINE
// ─────────────────────────────────────────────────────────────
function runEngine(matrix, conditions, lookAhead, direction, symbol) {
  const occurrences = [];

  for (let i = 50; i < matrix.length - lookAhead; i++) {
    const bar = matrix[i];

    // All conditions must be true
    const allMet = conditions.every(cond => evalCondition(bar, cond));
    if (!allMet) continue;

    const entryPrice = bar.close;
    const futureCandles = matrix.slice(i + 1, i + 1 + lookAhead);

    if (futureCandles.length === 0) continue;

    const futureHighs = futureCandles.map(c => c.high);
    const futureLows  = futureCandles.map(c => c.low);
    const finalPrice  = futureCandles[futureCandles.length - 1].close;

    let maxFav, maxAdv, outcome;

    if (direction === 'BUY') {
      const maxPrice = Math.max(...futureHighs);
      const minPrice = Math.min(...futureLows);
      maxFav = toPips(maxPrice - entryPrice, symbol);
      maxAdv = toPips(entryPrice - minPrice, symbol);
      outcome = finalPrice > entryPrice ? 'WIN' : 'LOSS';
    } else {
      const maxPrice = Math.max(...futureHighs);
      const minPrice = Math.min(...futureLows);
      maxFav = toPips(entryPrice - minPrice, symbol);
      maxAdv = toPips(maxPrice - entryPrice, symbol);
      outcome = finalPrice < entryPrice ? 'WIN' : 'LOSS';
    }

    occurrences.push({
      time: bar.time,
      entryPrice: entryPrice.toFixed(getPipSize(symbol) < 0.001 ? 5 : 2),
      maxFav: Math.max(0, maxFav),
      maxAdv: Math.max(0, maxAdv),
      outcome,
    });
  }

  if (occurrences.length === 0) return null;

  const wins = occurrences.filter(o => o.outcome === 'WIN').length;
  const winRate = Math.round((wins / occurrences.length) * 1000) / 10;

  const avgFav = occurrences.reduce((s, o) => s + o.maxFav, 0) / occurrences.length;
  const avgAdv = occurrences.reduce((s, o) => s + o.maxAdv, 0) / occurrences.length;
  const avgRR  = avgAdv > 0 ? Math.round((avgFav / avgAdv) * 100) / 100 : 0;

  const bestCase  = Math.max(...occurrences.map(o => o.maxFav));
  const worstCase = Math.max(...occurrences.map(o => o.maxAdv));

  const dateRange = `${occurrences[0].time} → ${occurrences[occurrences.length - 1].time}`;

  let verdict;
  if (winRate >= 60 && avgRR >= 1) verdict = 'STRONG';
  else if (winRate < 45) verdict = 'WEAK';
  else verdict = 'MIXED';

  return {
    totalSetups: occurrences.length,
    wins,
    winRate,
    avgFav: Math.round(avgFav * 10) / 10,
    avgAdv: Math.round(avgAdv * 10) / 10,
    avgRR,
    bestCase: Math.round(bestCase * 10) / 10,
    worstCase: Math.round(worstCase * 10) / 10,
    verdict,
    dateRange,
    occurrences,
  };
}

// ─────────────────────────────────────────────────────────────
// ALPHA VANTAGE DATA FETCH
// ─────────────────────────────────────────────────────────────
function getCacheKey(symbol, timeframe) {
  return `bt_${symbol}_${timeframe}`;
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function setCache(key, data, timestamp) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp }));
  } catch (e) { console.warn('Cache write failed:', e); }
}

function clearCache(symbol, timeframe) {
  try {
    localStorage.removeItem(getCacheKey(symbol, timeframe));
  } catch {}
}

// Build 4H candles from 1H candles
function build4HCandles(hourlyCandles) {
  // Sort chronologically oldest first
  const sorted = [...hourlyCandles].sort((a, b) => new Date(a.time) - new Date(b.time));
  const result = [];
  for (let i = 0; i + 3 < sorted.length; i += 4) {
    const group = sorted.slice(i, i + 4);
    result.push({
      time:   group[0].time,
      open:   group[0].open,
      high:   Math.max(...group.map(c => c.high)),
      low:    Math.min(...group.map(c => c.low)),
      close:  group[3].close,
      volume: group.reduce((s, c) => s + (c.volume || 0), 0),
    });
  }
  return result;
}

// Detect Alpha Vantage premium-endpoint error in Information message
function isPremiumError(json) {
  const info = json['Information'] || '';
  return info.includes('premium') || info.includes('premium endpoint') || info.includes('subscribe');
}

async function fetchAlphaVantageData(assetOption, timeframe, forceRefresh) {
  if (!AV_KEY || AV_KEY === 'your_key_here') {
    throw new Error('Alpha Vantage API key not configured. Please set VITE_ALPHAVANTAGE_API_KEY in your .env file. Get a free key at alphavantage.co');
  }

  // Block intraday timeframes with helpful message — they require premium
  if (timeframe === '1H' || timeframe === '4H') {
    throw new Error(
      `⚡ ${timeframe} intraday data requires an Alpha Vantage Premium subscription ($50/mo). ` +
      `Your free key only supports 1 Day (1D) historical data. Switch timeframe to "1 Day" to run the backtest, ` +
      `or upgrade at alphavantage.co/premium/`
    );
  }

  const cacheKey = getCacheKey(assetOption.value, timeframe);

  if (!forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached) return { candles: cached.data, timestamp: cached.timestamp, fromCache: true };
  }

  let candles = [];
  const { type } = assetOption;

  if (type === 'forex' || type === 'metals') {
    // FX_DAILY — free tier ✅
    const url = `${AV_BASE}?function=FX_DAILY&from_symbol=${assetOption.from}&to_symbol=${assetOption.to}&outputsize=full&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json['Error Message']) throw new Error(`Alpha Vantage error: ${json['Error Message']}`);
    if (json['Information']) {
      if (isPremiumError(json)) throw new Error(`Alpha Vantage: This endpoint requires a premium plan. ${json['Information']}`);
      throw new Error(`Alpha Vantage: ${json['Information']}`);
    }
    const series = json['Time Series FX (Daily)'];
    if (!series) throw new Error('No FX daily data returned. This pair may not be supported on your plan.');
    candles = Object.entries(series)
      .map(([time, v]) => ({
        time,
        open:   parseFloat(v['1. open']),
        high:   parseFloat(v['2. high']),
        low:    parseFloat(v['3. low']),
        close:  parseFloat(v['4. close']),
        volume: 0,
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

  } else if (type === 'etf') {
    // TIME_SERIES_DAILY — free tier ✅
    const url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${assetOption.value}&outputsize=full&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json['Error Message']) throw new Error(`Alpha Vantage error: ${json['Error Message']}`);
    if (json['Information']) {
      if (isPremiumError(json)) throw new Error(`Alpha Vantage: This endpoint requires a premium plan.`);
      throw new Error(`Alpha Vantage: ${json['Information']}`);
    }
    const series = json['Time Series (Daily)'];
    if (!series) throw new Error('No ETF daily data returned.');
    candles = Object.entries(series)
      .map(([time, v]) => ({
        time,
        open:   parseFloat(v['1. open']),
        high:   parseFloat(v['2. high']),
        low:    parseFloat(v['3. low']),
        close:  parseFloat(v['4. close']),
        volume: parseFloat(v['5. volume']),
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

  } else if (type === 'crypto') {
    // DIGITAL_CURRENCY_DAILY — free tier ✅
    const url = `${AV_BASE}?function=DIGITAL_CURRENCY_DAILY&symbol=${assetOption.coin}&market=${assetOption.market}&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json['Error Message']) throw new Error(`Alpha Vantage error: ${json['Error Message']}`);
    if (json['Information']) {
      if (isPremiumError(json)) throw new Error(`Alpha Vantage: This endpoint requires a premium plan.`);
      throw new Error(`Alpha Vantage: ${json['Information']}`);
    }
    const series = json['Time Series (Digital Currency Daily)'];
    if (!series) throw new Error('No crypto daily data returned. Check the coin symbol.');
    candles = Object.entries(series)
      .map(([time, v]) => ({
        time,
        open:   parseFloat(v['1b. open (USD)']  || v['1. open']),
        high:   parseFloat(v['2b. high (USD)']  || v['2. high']),
        low:    parseFloat(v['3b. low (USD)']   || v['3. low']),
        close:  parseFloat(v['4b. close (USD)'] || v['4. close']),
        volume: parseFloat(v['5. volume'] || 0),
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  const ts = Date.now();
  setCache(cacheKey, candles, ts);
  return { candles, timestamp: ts, fromCache: false };
}

// ─────────────────────────────────────────────────────────────
// OUTCOME DISTRIBUTION CHART DATA
// ─────────────────────────────────────────────────────────────
function buildChartData(occurrences) {
  if (!occurrences || occurrences.length === 0) return [];
  const buckets = {};
  occurrences.forEach(o => {
    const pip = Math.round(o.maxFav / 10) * 10; // bucket by 10s
    const key = `${pip}`;
    if (!buckets[key]) buckets[key] = { range: `${pip}p`, wins: 0, losses: 0 };
    if (o.outcome === 'WIN') buckets[key].wins++;
    else buckets[key].losses++;
  });
  return Object.values(buckets).sort((a, b) => parseFloat(a.range) - parseFloat(b.range));
}

// ─────────────────────────────────────────────────────────────
// STYLE CONSTANTS (matching existing BetaTrader palette)
// ─────────────────────────────────────────────────────────────
const s = {
  panel: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
    minWidth: 0,
    overflow: 'hidden',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    display: 'block',
  },
  select: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
  },
  conditionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 36px',
    gap: '10px',
    alignItems: 'end',
    marginBottom: '10px',
  },
  runBtn: {
    width: '100%',
    backgroundColor: 'var(--color-green)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '700',
    fontSize: '15px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.15s',
    marginTop: '16px',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  statCell: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statVal: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
  },
  occRow: {
    display: 'grid',
    gridTemplateColumns: '140px 100px 80px 80px 60px',
    gap: '8px',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '12px',
  },
  badge: (color) => ({
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: '11px',
    backgroundColor: color === 'green' ? 'var(--color-green-glow)' :
      color === 'red' ? 'var(--color-red-glow)' : 'rgba(255,165,0,0.15)',
    color: color === 'green' ? 'var(--color-green)' :
      color === 'red' ? 'var(--color-red)' : 'orange',
    display: 'inline-flex',
    alignItems: 'center',
  }),
  verdictBanner: (verdict) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '10px',
    marginBottom: '16px',
    backgroundColor:
      verdict === 'STRONG' ? 'rgba(0, 230, 118, 0.08)' :
      verdict === 'WEAK'   ? 'rgba(255, 68, 68, 0.08)' :
                             'rgba(255, 165, 0, 0.08)',
    border: `1px solid ${
      verdict === 'STRONG' ? 'var(--color-green)' :
      verdict === 'WEAK'   ? 'var(--color-red)' : 'orange'
    }`,
  }),
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '14px',
  },
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export default function BacktestTab() {
  // Config state
  const [asset, setAsset] = useState('EURUSD');
  const [assetQuery, setAssetQuery] = useState('EUR/USD');
  const [assetDropOpen, setAssetDropOpen] = useState(false);
  const assetBoxRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1D'); // default to free-tier daily
  const [direction, setDirection] = useState('BUY');

  // Click-outside closes the asset dropdown
  useEffect(() => {
    function handleOutside(e) {
      if (assetBoxRef.current && !assetBoxRef.current.contains(e.target)) {
        setAssetDropOpen(false);
        // If user typed something but didn't pick, restore label
        const cur = ASSET_DB.find(a => a.value === asset) || buildCustomAsset(asset);
        setAssetQuery(cur ? cur.label : asset);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [asset]);

  // Filtered list for the dropdown
  const filteredAssets = assetQuery.trim() === ''
    ? ASSET_DB
    : ASSET_DB.filter(a =>
        a.label.toLowerCase().includes(assetQuery.toLowerCase()) ||
        a.value.toLowerCase().includes(assetQuery.toLowerCase()) ||
        a.desc.toLowerCase().includes(assetQuery.toLowerCase()) ||
        a.cat.toLowerCase().includes(assetQuery.toLowerCase())
      );

  // Group filtered list by category for display
  const groupedAssets = filteredAssets.reduce((acc, item) => {
    (acc[item.cat] = acc[item.cat] || []).push(item);
    return acc;
  }, {});

  // Handle selecting an asset from the list
  const selectAsset = (opt) => {
    setAsset(opt.value);
    setAssetQuery(opt.label);
    setAssetDropOpen(false);
    setResults(null);
  };

  // Handle pressing Enter on a custom symbol
  const handleAssetKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = assetQuery.trim().toUpperCase();
      if (!q) return;
      // Check if it matches a DB entry
      const match = ASSET_DB.find(a =>
        a.value === q || a.label.replace('/','') === q || a.label === q
      );
      if (match) {
        selectAsset(match);
      } else {
        // Custom symbol — auto-detect type
        const customOpt = buildCustomAsset(q);
        setAsset(customOpt.value);
        setAssetQuery(customOpt.label);
        setAssetDropOpen(false);
        setResults(null);
      }
    }
    if (e.key === 'Escape') {
      setAssetDropOpen(false);
      const cur = ASSET_DB.find(a => a.value === asset) || buildCustomAsset(asset);
      setAssetQuery(cur ? cur.label : asset);
    }
  };
  const [lookAhead, setLookAhead] = useState(10);
  const [conditions, setConditions] = useState([{ ...DEFAULT_CONDITION }]);

  // Engine state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [expandOccurrences, setExpandOccurrences] = useState(false);

  const assetOption = ASSET_OPTIONS.find(a => a.value === asset) || buildCustomAsset(asset);

  // ── Condition builder helpers ──
  const addCondition = () => {
    if (conditions.length >= 3) return;
    setConditions(prev => [...prev, { ...DEFAULT_CONDITION }]);
  };

  const removeCondition = (idx) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx, field, val) => {
    setConditions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      // Reset operator/value when indicator changes
      if (field === 'indicator') {
        const ops = getOperatorOptions(val);
        next[idx].operator = ops[0].value;
        next[idx].value = '';
      }
      return next;
    });
  };

  // ── Run backtest ──
  const handleRun = useCallback(async (forceRefresh = false) => {
    if (!assetOption) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { candles, timestamp, fromCache } = await fetchAlphaVantageData(assetOption, timeframe, forceRefresh);

      if (!candles || candles.length < 60) {
        throw new Error(`Insufficient candle data (${candles?.length || 0} bars). Need at least 60. Try a different timeframe or asset.`);
      }

      setCacheInfo({
        fromCache,
        timestamp,
        count: candles.length,
      });

      const matrix = buildIndicatorMatrix(candles);
      const res = runEngine(matrix, conditions, parseInt(lookAhead), direction, assetOption.value);

      if (!res) {
        setError('No setup occurrences found with these conditions. Try different indicators or values.');
      } else {
        setResults(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to run backtest.');
    } finally {
      setLoading(false);
    }
  }, [assetOption, timeframe, conditions, lookAhead, direction]);

  const handleForceRefresh = () => {
    clearCache(asset, timeframe);
    handleRun(true);
  };

  // ── Chart data ──
  const chartData = results ? buildChartData(results.occurrences) : [];

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Backtest Engine <span style={{ color: 'var(--color-green)', fontSize: '13px', marginLeft: '8px' }}>V2</span>
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Client-side strategy backtesting · Powered by Alpha Vantage · No backend required
          </p>
        </div>
        {cacheInfo && (
          <button
            onClick={handleForceRefresh}
            disabled={loading}
            title="Clear cache and fetch fresh data"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} />
            Force Refresh
          </button>
        )}
      </div>

      {/* ── SETUP CONFIGURATION PANEL ── */}
      <div className="card">
        <div style={s.sectionTitle}>Setup Configuration</div>

        {/* Row 1: Asset, Timeframe, Direction, Look-ahead */}
        <div className="backtest-config-grid">
          <div style={{ position: 'relative' }} ref={assetBoxRef}>
            <label style={s.label}>Asset</label>
            {/* Searchable combobox */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary)',
              border: `1px solid ${assetDropOpen ? 'var(--color-green)' : 'var(--border-color)'}`,
              borderRadius: '8px',
              overflow: 'visible',
              transition: 'border-color 0.15s',
            }}>
              <Search size={13} style={{ position:'absolute', left:'10px', color:'var(--text-muted)', pointerEvents:'none' }} />
              <input
                type="text"
                value={assetQuery}
                placeholder="Search symbol…"
                onFocus={() => { setAssetDropOpen(true); setAssetQuery(''); }}
                onChange={e => { setAssetQuery(e.target.value); setAssetDropOpen(true); }}
                onKeyDown={handleAssetKeyDown}
                style={{
                  ...s.input,
                  paddingLeft: '30px',
                  paddingRight: '28px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '8px',
                  width: '100%',
                }}
              />
              <ChevronDown size={13} style={{ position:'absolute', right:'10px', color:'var(--text-muted)', pointerEvents:'none' }} />
            </div>

            {/* Dropdown list */}
            {assetDropOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                zIndex: 500,
                maxHeight: '300px',
                overflowY: 'auto',
                boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
              }}>
                {Object.keys(groupedAssets).length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No matches — press Enter to use <strong style={{color:'var(--color-green)'}}>{assetQuery.toUpperCase()}</strong> as custom symbol
                  </div>
                )}
                {Object.entries(groupedAssets).map(([cat, items]) => (
                  <div key={cat}>
                    <div style={{
                      padding: '6px 12px 4px',
                      fontSize: '10px',
                      fontWeight: '800',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                    }}>{cat}</div>
                    {items.map(opt => (
                      <button
                        key={opt.value}
                        onMouseDown={e => { e.preventDefault(); selectAsset(opt); }}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: opt.value === asset ? 'rgba(0,230,118,0.07)' : 'transparent',
                          padding: '9px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontWeight: '700', fontSize: '13px', color: opt.value === asset ? 'var(--color-green)' : 'var(--text-primary)', minWidth: '72px' }}>
                          {opt.label}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
                          {opt.desc}
                        </span>
                        {opt.value === asset && (
                          <span style={{ fontSize: '10px', color: 'var(--color-green)', fontWeight: '700' }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={s.label}>Timeframe</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={s.select}>
              {TIMEFRAME_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={s.label}>Trade Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value)} style={s.select}>
              {TRADE_DIRECTION_OPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={s.label}>Look-ahead Candles</label>
            <input
              type="number"
              min="1"
              max="50"
              value={lookAhead}
              onChange={e => setLookAhead(e.target.value)}
              style={s.input}
            />
          </div>
        </div>

        {/* ── CONDITIONS BUILDER ── */}
        <div style={s.sectionTitle}>Conditions Builder</div>

        <div className="condition-grid-header">
          <span style={{ ...s.label, marginBottom: 0 }}>Indicator</span>
          <span style={{ ...s.label, marginBottom: 0 }}>Operator</span>
          <span style={{ ...s.label, marginBottom: 0 }}>Value</span>
          <span />
        </div>

        {conditions.map((cond, idx) => {
          const ops = getOperatorOptions(cond.indicator);
          const showValue = needsValue(cond.indicator, cond.operator);
          return (
            <div key={idx} className="condition-row">
              {/* Indicator */}
              <select
                value={cond.indicator}
                onChange={e => updateCondition(idx, 'indicator', e.target.value)}
                style={s.select}
              >
                {INDICATOR_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={cond.operator}
                onChange={e => updateCondition(idx, 'operator', e.target.value)}
                style={s.select}
              >
                {ops.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Value */}
              {showValue ? (
                <input
                  type="number"
                  value={cond.value}
                  onChange={e => updateCondition(idx, 'value', e.target.value)}
                  placeholder="e.g. 30"
                  style={s.input}
                />
              ) : (
                <div style={{ ...s.input, color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  (no value)
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => removeCondition(idx)}
                disabled={conditions.length === 1}
                className="condition-remove-btn"
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-red)',
                  cursor: conditions.length === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: conditions.length === 1 ? 0.4 : 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}

        {conditions.length < 3 && (
          <button
            onClick={addCondition}
            style={{
              backgroundColor: 'transparent',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              padding: '10px',
              width: '100%',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            <Plus size={14} /> Add Condition ({conditions.length}/3)
          </button>
        )}

        {/* ── RUN BUTTON ── */}
        <button
          onClick={() => handleRun(false)}
          disabled={loading}
          style={{ ...s.runBtn, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <>
              <RefreshCw size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
              Running Backtest...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Backtest
            </>
          )}
        </button>
      </div>

      {/* ── CACHE INFO BAR ── */}
      {cacheInfo && !loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}>
          <Database size={13} />
          <span>
            {cacheInfo.fromCache ? '📦 Using cached data' : '🔄 Freshly fetched'}
            {' · '}
            {cacheInfo.count} candles
            {' · '}
            <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
            Last fetch: {new Date(cacheInfo.timestamp).toLocaleString()}
          </span>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '14px 18px',
          backgroundColor: 'var(--color-red-glow)',
          border: '1px solid var(--color-red)',
          borderRadius: '8px',
          color: 'var(--color-red)',
          fontSize: '13px',
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>{error}</div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-red)', cursor: 'pointer', marginLeft: 'auto' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── RESULTS PANEL ── */}
      {results && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* VERDICT BANNER */}
          <div style={s.verdictBanner(results.verdict)}>
            {results.verdict === 'STRONG' ? (
              <CheckCircle size={28} color="var(--color-green)" />
            ) : results.verdict === 'WEAK' ? (
              <AlertTriangle size={28} color="var(--color-red)" />
            ) : (
              <Minus size={28} color="orange" />
            )}
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: '800',
                color: results.verdict === 'STRONG' ? 'var(--color-green)' :
                       results.verdict === 'WEAK'   ? 'var(--color-red)' : 'orange',
              }}>
                {results.verdict === 'STRONG' && '✅ STRONG SETUP'}
                {results.verdict === 'MIXED'  && '🟡 MIXED RESULTS'}
                {results.verdict === 'WEAK'   && '❌ WEAK SETUP'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {results.verdict === 'STRONG' && 'Win rate above 60% and positive average R:R. Conditions historically favourable.'}
                {results.verdict === 'MIXED'  && 'Win rate between 45–60% or inconsistent R:R. Trade with caution.'}
                {results.verdict === 'WEAK'   && 'Win rate below 45%. Avoid trading this condition set.'}
              </div>
            </div>
          </div>

          {/* SUMMARY STATS */}
          <div className="card">
            <div style={s.sectionTitle}>Summary Statistics</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              📅 Data range: {results.dateRange}
            </div>
            <div className="stat-grid">
              <div style={s.statCell}>
                <span style={s.statLabel}>Total Setups</span>
                <span style={s.statVal}>{results.totalSetups}</span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Win Rate</span>
                <span style={{
                  ...s.statVal,
                  color: results.winRate >= 60 ? 'var(--color-green)' : results.winRate < 45 ? 'var(--color-red)' : 'orange',
                }}>
                  {results.winRate}%
                </span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Avg Favourable</span>
                <span style={{ ...s.statVal, color: 'var(--color-green)' }}>+{results.avgFav}p</span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Avg Adverse</span>
                <span style={{ ...s.statVal, color: 'var(--color-red)' }}>-{results.avgAdv}p</span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Best Case</span>
                <span style={{ ...s.statVal, color: 'var(--color-green)' }}>+{results.bestCase}p</span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Worst Case</span>
                <span style={{ ...s.statVal, color: 'var(--color-red)' }}>-{results.worstCase}p</span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Avg R:R</span>
                <span style={{
                  ...s.statVal,
                  color: results.avgRR >= 1 ? 'var(--color-green)' : 'var(--color-red)',
                }}>
                  1:{results.avgRR}
                </span>
              </div>
              <div style={s.statCell}>
                <span style={s.statLabel}>Wins / Losses</span>
                <span style={s.statVal}>{results.wins} / {results.totalSetups - results.wins}</span>
              </div>
            </div>

            {/* DISCLAIMER */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}>
              ⚠️ <strong>Limitations:</strong> Results are candle-based approximations. No spread simulation. Past performance is not indicative of future results. This is a research tool, not a prediction engine.
            </div>
          </div>

          {/* BAR CHART */}
          {chartData.length > 0 && (
            <div className="card">
              <div style={s.sectionTitle}>Outcome Distribution (by pip range)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: '700' }}
                  />
                  <Bar dataKey="wins" name="Wins" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" fill="var(--color-red)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* INDIVIDUAL OCCURRENCES */}
          <div className="card">
            <button
              onClick={() => setExpandOccurrences(prev => !prev)}
              style={{
                ...s.sectionTitle,
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 0,
              }}
            >
              <span>Individual Occurrences ({results.occurrences.length})</span>
              {expandOccurrences ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expandOccurrences && (
              <div style={{ marginTop: '12px', overflowX: 'auto', width: '100%', maxWidth: '100%', display: 'block' }}>
                {/* Header row */}
                <div style={{
                  ...s.occRow,
                  fontWeight: '700',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  paddingBottom: '8px',
                  borderBottom: '2px solid var(--border-color)',
                }}>
                  <span>Date / Time</span>
                  <span>Entry Price</span>
                  <span>Max Fav</span>
                  <span>Max Adv</span>
                  <span>Result</span>
                </div>
                {results.occurrences.map((occ, idx) => (
                  <div key={idx} style={s.occRow}>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: '11px' }}>
                      {occ.time}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: '600' }}>
                      {occ.entryPrice}
                    </span>
                    <span style={{ color: 'var(--color-green)', fontWeight: '700' }}>
                      +{occ.maxFav}p
                    </span>
                    <span style={{ color: 'var(--color-red)', fontWeight: '700' }}>
                      -{occ.maxAdv}p
                    </span>
                    <span style={s.badge(occ.outcome === 'WIN' ? 'green' : 'red')}>
                      {occ.outcome === 'WIN' ? <TrendingUp size={10} style={{ marginRight: 3 }} /> : <TrendingDown size={10} style={{ marginRight: 3 }} />}
                      {occ.outcome}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IDLE / NO RESULTS STATE ── */}
      {!results && !loading && !error && (
        <div className="card" style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderStyle: 'dashed',
        }}>
          <Database size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Configure your strategy above</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '380px', margin: '0 auto', lineHeight: '1.6' }}>
            Select an asset, timeframe, trade direction, and set up to 3 conditions. Click
            <strong style={{ color: 'var(--color-green)' }}> Run Backtest</strong> to scan historical data.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '16px' }}>
            💡 Free Alpha Vantage tier: 25 API calls/day. Data is cached for 24 hours.
          </p>
        </div>
      )}
    </div>
  );
}
