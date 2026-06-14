import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  Play, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  BookOpen,
  UserCheck,
  Cpu,
  Info,
  X
} from 'lucide-react';

function App() {
  // --- 1. STATE DECLARATIONS ---
  const [apiKeys, setApiKeys] = useState({
    twelveData: import.meta.env.VITE_TWELVEDATA_API_KEY || '',
    groq: import.meta.env.VITE_GROQ_API_KEY || '',
    finnhub: import.meta.env.VITE_FINNHUB_API_KEY || '',
    cryptoPanic: import.meta.env.VITE_CRYPTOPANIC_API_KEY || ''
  });
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState('forex'); // 'forex' | 'metals' | 'indices' | 'crypto'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Flattened combined list for search autocomplete
  const [flatSymbolsList, setFlatSymbolsList] = useState([]);
  const [symbolsLoaded, setSymbolsLoaded] = useState(false);
  
  const [selectedAsset, setSelectedAsset] = useState(null); 
  const [marketData, setMarketData] = useState(null); 
  const [recentNews, setRecentNews] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [dismissedWarning, setDismissedWarning] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingVerdict, setLoadingVerdict] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [error, setError] = useState(null);
  
  // Trade direction selection
  const [tradeDirection, setTradeDirection] = useState(null); // 'BUY' | 'SELL'
  
  // Pre-Trade Checklist Modal
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistStep, setChecklistStep] = useState(0);
  const [checklistAnswers, setChecklistAnswers] = useState(Array(7).fill(null));
  
  // AI Verdict Result
  const [aiVerdict, setAiVerdict] = useState(null);

  // Auto-refresh tracker (for 15 mins check in spec)
  const lastFetchTime = useRef(null);

  // --- 2. PRE-DEFINED SYMBOLS FOR QUICK ACCESS / FALLBACKS ---
  const quickAssets = {
    forex: [
      { symbol: 'EUR/USD', name: 'EUR/USD - Euro / US Dollar' },
      { symbol: 'USD/JPY', name: 'USD/JPY - US Dollar / Japanese Yen' },
      { symbol: 'GBP/USD', name: 'GBP/USD - British Pound / US Dollar' },
      { symbol: 'AUD/USD', name: 'AUD/USD - Australian Dollar / US Dollar' },
      { symbol: 'USD/CAD', name: 'USD/CAD - US Dollar / Canadian Dollar' },
      { symbol: 'USD/CHF', name: 'USD/CHF - US Dollar / Swiss Franc' },
      { symbol: 'GBP/JPY', name: 'GBP/JPY - British Pound / Japanese Yen' },
      { symbol: 'EUR/JPY', name: 'EUR/JPY - Euro / Japanese Yen' }
    ],
    metals: [
      { symbol: 'XAU/USD', name: 'XAU/USD - Gold Spot' },
      { symbol: 'XAG/USD', name: 'XAG/USD - Silver Spot' }
    ],
    indices: [
      { symbol: 'SPX', name: 'SPX - S&P 500 Index' },
      { symbol: 'IXIC', name: 'NDX - NASDAQ Composite' },
      { symbol: 'DJI', name: 'DJI - Dow Jones Industrial' },
      { symbol: 'GDAXI', name: 'DAX - German Stock Index' },
      { symbol: 'FTSE', name: 'FTSE 100 - UK Index' }
    ],
    crypto: [
      { symbol: 'bitcoin', name: 'BTC - Bitcoin' },
      { symbol: 'ethereum', name: 'ETH - Ethereum' },
      { symbol: 'solana', name: 'SOL - Solana' },
      { symbol: 'binancecoin', name: 'BNB - Binance Coin' }
    ]
  };

  // --- 3. CHECKLIST QUESTIONS DEFINITION ---
  const checklistQuestions = [
    {
      id: 0,
      question: "What's your entry reason?",
      options: [
        "Clear technical setup",
        "Fundamental/news catalyst",
        "Both",
        "Just looks good"
      ]
    },
    {
      id: 1,
      question: "Trade direction vs bigger trend?",
      options: [
        "With the trend",
        "Counter-trend (strong reason)",
        "Haven't checked"
      ]
    },
    {
      id: 2,
      question: "Stop loss placement?",
      options: [
        "Defined with exact price",
        "Roughly in mind",
        "Not set yet"
      ]
    },
    {
      id: 3,
      question: "Risk/Reward ratio?",
      options: [
        "1:2 or better",
        "1:1.5",
        "1:1",
        "Less than 1:1"
      ]
    },
    {
      id: 4,
      question: "Why entering RIGHT NOW?",
      options: [
        "Setup I've been watching",
        "Just spotted it",
        "Recovering a loss",
        "Bored/FOMO"
      ]
    },
    {
      id: 5,
      question: "Upcoming high-impact news?",
      options: [
        "Checked, nothing major",
        "There's news coming, I'm aware",
        "Haven't checked"
      ]
    },
    {
      id: 6,
      question: "% of account at risk?",
      options: [
        "1% or less",
        "2%",
        "3-5%",
        "More than 5%"
      ]
    }
  ];

  // --- 4. ASSET TO CURRENCY MAPPING FOR EVENTS ---
  const getWatchCurrencies = (asset) => {
    if (!asset) return ['USD'];
    const sym = asset.symbol.toUpperCase();
    if (asset.type === 'crypto') return ['USD', 'BTC'];
    
    // Forex mapping
    if (sym === 'EUR/USD') return ['EUR', 'USD'];
    if (sym === 'USD/JPY') return ['USD', 'JPY'];
    if (sym === 'GBP/USD') return ['GBP', 'USD'];
    if (sym === 'AUD/USD') return ['AUD', 'USD'];
    if (sym === 'USD/CAD') return ['USD', 'CAD'];
    if (sym === 'USD/CHF') return ['USD', 'CHF'];
    if (sym === 'GBP/JPY') return ['GBP', 'JPY'];
    if (sym === 'EUR/JPY') return ['EUR', 'JPY'];
    if (sym === 'EUR/GBP') return ['EUR', 'GBP'];
    if (sym === 'AUD/CAD') return ['AUD', 'CAD'];
    if (sym === 'NZD/USD') return ['NZD', 'USD'];
    if (sym === 'CAD/JPY') return ['CAD', 'JPY'];
    
    // Metals
    if (sym.includes('XAU')) return ['USD'];
    if (sym.includes('XAG')) return ['USD'];
    
    // Indices
    if (sym === 'SPX' || sym === 'IXIC' || sym === 'DJI') return ['USD'];
    if (sym === 'GDAXI') return ['EUR'];
    if (sym === 'FTSE') return ['GBP'];
    
    // Fallback based on split characters
    const parts = sym.split('/');
    if (parts.length === 2) return [parts[0], parts[1]];
    return ['USD'];
  };

  // --- 5. EFFECT HOOKS ---
  // Load symbols once Twelve Data key is configured or Demo Mode is toggled
  useEffect(() => {
    loadSymbolsDirectory();
  }, [apiKeys.twelveData, demoMode]);

  // Fetch asset data when selectedAsset changes
  useEffect(() => {
    if (selectedAsset) {
      fetchAssetData(selectedAsset);
      setTradeDirection(null);
      setAiVerdict(null);
      setDismissedWarning(false);
      lastFetchTime.current = Date.now();
    }
  }, [selectedAsset]);

  // 15-minute polling loop check
  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedAsset && lastFetchTime.current && Date.now() - lastFetchTime.current > 15 * 60 * 1000) {
        console.log("Refreshing data due to 15-minute page idle...");
        fetchAssetData(selectedAsset);
        lastFetchTime.current = Date.now();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [selectedAsset]);

  // Autocomplete filter hook
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    
    // Filter from combined list
    const filtered = flatSymbolsList.filter(item => 
      item.symbol.toLowerCase().includes(query) || 
      item.name.toLowerCase().includes(query)
    ).slice(0, 10);
    
    setSearchResults(filtered);
  }, [searchQuery, flatSymbolsList]);

  // --- 6. SYMBOL DISCOVERY IMPLEMENTATION (Section 10B) ---
  const loadSymbolsDirectory = async () => {
    if (demoMode) {
      // Build dummy searchable lists for autocompletion
      const combined = [
        ...quickAssets.forex.map(x => ({ ...x, type: 'forex' })),
        ...quickAssets.metals.map(x => ({ ...x, type: 'metals' })),
        ...quickAssets.indices.map(x => ({ ...x, type: 'indices' })),
        ...quickAssets.crypto.map(x => ({ ...x, type: 'crypto' })),
        { symbol: 'NZD/USD', name: 'NZD/USD - New Zealand Dollar / US Dollar', type: 'forex' },
        { symbol: 'CAD/JPY', name: 'CAD/JPY - Canadian Dollar / Japanese Yen', type: 'forex' },
        { symbol: 'EUR/GBP', name: 'EUR/GBP - Euro / British Pound', type: 'forex' },
        { symbol: 'AUD/CAD', name: 'AUD/CAD - Australian Dollar / Canadian Dollar', type: 'forex' }
      ];
      setFlatSymbolsList(combined);
      setSymbolsLoaded(true);
      return;
    }

    if (!apiKeys.twelveData) {
      setFlatSymbolsList([]);
      setSymbolsLoaded(false);
      return;
    }

    setLoadingSymbols(true);
    try {
      console.log("Fetching full symbols lists in parallel...");
      
      const twelveDataUrl = import.meta.env.VITE_TWELVEDATA_URL || 'https://api.twelvedata.com';
      const coinGeckoUrl = import.meta.env.VITE_COINGECKO_URL || 'https://api.coingecko.com/api/v3';
      
      const [forexRes, indicesRes, cryptoRes] = await Promise.all([
        fetch(`${twelveDataUrl}/forex_pairs?apikey=${apiKeys.twelveData}`).then(r => r.json()),
        fetch(`${twelveDataUrl}/stocks?apikey=${apiKeys.twelveData}&type=index`).then(r => r.json()),
        fetch(`${coinGeckoUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1`).then(r => r.json())
      ]);

      let forexList = [];
      if (forexRes.data) {
        forexList = forexRes.data.map(item => ({
          symbol: item.symbol,
          name: `${item.symbol} — ${item.currency_base}/${item.currency_quote}`,
          type: 'forex'
        }));
      }

      let indicesList = [];
      if (indicesRes.data) {
        indicesList = indicesRes.data.map(item => ({
          symbol: item.symbol,
          name: `${item.symbol} — ${item.name}`,
          type: 'indices'
        }));
      }

      let cryptoList = [];
      if (Array.isArray(cryptoRes)) {
        cryptoList = cryptoRes.map(item => ({
          symbol: item.id,
          name: `${item.symbol.toUpperCase()} — ${item.name}`,
          type: 'crypto'
        }));
      }

      const combined = [...forexList, ...indicesList, ...cryptoList];
      setFlatSymbolsList(combined);
      setSymbolsLoaded(true);
    } catch (err) {
      console.error("Failed loading autocomplete database:", err);
      // Fallback to quick access database
      const fallback = [
        ...quickAssets.forex.map(x => ({ ...x, type: 'forex' })),
        ...quickAssets.metals.map(x => ({ ...x, type: 'metals' })),
        ...quickAssets.indices.map(x => ({ ...x, type: 'indices' })),
        ...quickAssets.crypto.map(x => ({ ...x, type: 'crypto' }))
      ];
      setFlatSymbolsList(fallback);
    } finally {
      setLoadingSymbols(false);
    }
  };

  // --- 7. TECHNICAL ANALYSIS CALCULATION (Section 5) ---
  const performTechnicalCalculations = (candlesData, currentPrice) => {
    if (!candlesData || candlesData.length < 30) {
      return {
        price: currentPrice,
        sma20: currentPrice,
        rsi: 50,
        rsiStatus: 'Neutral',
        trend: 'CONSOLIDATING',
        signal: 'STAY OUT — Insufficient candle data for indicator calculations'
      };
    }

    // Extract close prices. Order must be oldest to newest.
    // If it's Twelve Data, we reversed it before passing, so index 0 is oldest, 29 is newest.
    const closePrices = candlesData.map(c => parseFloat(c.close));
    const len = closePrices.length;

    // A. Calculate 20-period SMA
    const calculateSMA = (prices, idx, period = 20) => {
      let sum = 0;
      for (let i = idx - period + 1; i <= idx; i++) {
        sum += prices[i];
      }
      return sum / period;
    };

    const currentSMA = calculateSMA(closePrices, len - 1);
    const priorSMA = calculateSMA(closePrices, len - 5); // 5-candle slope

    const slope = currentSMA - priorSMA;

    // B. Calculate 14-period RSI (Wilder's smoothed)
    const changes = [];
    for (let i = 1; i < len; i++) {
      changes.push(closePrices[i] - closePrices[i - 1]);
    }

    let avgGain = 0;
    let avgLoss = 0;

    // Initial 14 changes
    for (let i = 0; i < 14; i++) {
      const change = changes[i];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    avgGain = avgGain / 14;
    avgLoss = avgLoss / 14;

    // Wilder's smoothing for remaining 15 changes
    for (let i = 14; i < changes.length; i++) {
      const change = changes[i];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
    }

    let rsi = 50;
    if (avgLoss === 0) {
      rsi = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }

    // Rounding
    rsi = Math.round(rsi * 10) / 10;

    // C. Trend Verdict
    let trend = 'CONSOLIDATING';
    if (currentPrice > currentSMA && slope > 0) {
      trend = 'UPTREND';
    } else if (currentPrice < currentSMA && slope < 0) {
      trend = 'DOWNTREND';
    }

    // RSI Flags
    let rsiStatus = 'Neutral';
    if (rsi > 70) rsiStatus = 'Overbought';
    if (rsi < 30) rsiStatus = 'Oversold';

    // D. Technical Signals logic
    let signal = 'STAY OUT — Market consolidating or lack of trend alignment';
    
    if (trend === 'UPTREND') {
      if (rsi >= 70) {
        signal = 'WAIT — Uptrend present but RSI is Overbought (Pullback risk, monitor for better entry)';
      } else {
        signal = 'LONG SIGNAL: Uptrend confirmed. Price above SMA20 & RSI neutral. Conditions favour BUY/LONG.';
      }
    } else if (trend === 'DOWNTREND') {
      if (rsi <= 30) {
        signal = 'WAIT — Downtrend present but RSI is Oversold (Bounce risk, monitor for better entry)';
      } else {
        signal = 'SHORT SIGNAL: Downtrend confirmed. Price below SMA20 & RSI neutral. Conditions favour SELL/SHORT.';
      }
    }

    return {
      price: currentPrice,
      sma20: Math.round(currentSMA * 10000) / 10000,
      rsi,
      rsiStatus,
      trend,
      signal
    };
  };

  // --- 8. REAL API INTEGRATION SERVICES ---
  const fetchAssetData = async (asset) => {
    setLoadingData(true);
    setError(null);
    setMarketData(null);
    setRecentNews([]);
    setUpcomingEvents([]);

    try {
      if (demoMode) {
        await simulateMarketData(asset);
        return;
      }

      // Check required key
      if (asset.type !== 'crypto' && !apiKeys.twelveData) {
        throw new Error("Twelve Data API Key is missing. Configure it in the Settings panel.");
      }

      // 8.1 Fetch Price & Time Series in parallel
      if (asset.type === 'crypto') {
        const coinGeckoUrl = import.meta.env.VITE_COINGECKO_URL || 'https://api.coingecko.com/api/v3';
        // CoinGecko calls (Price + 7 days OHLC for candles)
        const priceUrl = `${coinGeckoUrl}/simple/price?ids=${asset.symbol}&vs_currencies=usd&include_24hr_change=true`;
        const ohlcUrl = `${coinGeckoUrl}/coins/${asset.symbol}/ohlc?vs_currency=usd&days=7`;

        const [priceRes, ohlcRes] = await Promise.all([
          fetch(priceUrl).then(r => {
            if (!r.ok) throw new Error("CoinGecko Simple Price rate limit or connection issue.");
            return r.json();
          }),
          fetch(ohlcUrl).then(r => {
            if (!r.ok) throw new Error("CoinGecko OHLC candles rate limit or connection issue.");
            return r.json();
          })
        ]);

        const priceInfo = priceRes[asset.symbol];
        if (!priceInfo) throw new Error("Crypto asset not found on CoinGecko.");

        const currentPrice = priceInfo.usd;
        const change24h = Math.round(priceInfo.usd_24h_change * 100) / 100;

        // Convert CoinGecko OHLC [time, open, high, low, close] to standard candle format
        // CoinGecko returns them oldest to newest, which is chronological.
        // Let's slice the last 30 candles
        const candles = ohlcRes.slice(-30).map(candle => ({
          close: parseFloat(candle[4])
        }));

        const indicators = performTechnicalCalculations(candles, currentPrice);

        setMarketData({
          price: currentPrice,
          change24h,
          trend: indicators.trend,
          rsi: indicators.rsi,
          rsiStatus: indicators.rsiStatus,
          signal: indicators.signal,
          priceFormatted: currentPrice.toFixed(2)
        });

      } else {
        // Twelve Data calls (Quote + 4H Candles)
        // Clean symbols for Twelve Data: EUR/USD is good, SPX is indices
        let symbol = asset.symbol;
        const twelveDataUrl = import.meta.env.VITE_TWELVEDATA_URL || 'https://api.twelvedata.com';
        const quoteUrl = `${twelveDataUrl}/quote?symbol=${symbol}&apikey=${apiKeys.twelveData}`;
        const candlesUrl = `${twelveDataUrl}/time_series?symbol=${symbol}&interval=4h&outputsize=30&apikey=${apiKeys.twelveData}`;

        const [quoteRes, candlesRes] = await Promise.all([
          fetch(quoteUrl).then(r => r.json()),
          fetch(candlesUrl).then(r => r.json())
        ]);

        if (quoteRes.status === 'error' || candlesRes.status === 'error') {
          throw new Error(quoteRes.message || candlesRes.message || "Twelve Data API call failed.");
        }

        const currentPrice = parseFloat(quoteRes.price || quoteRes.close);
        const change24h = parseFloat(quoteRes.percent_change || 0);

        // Twelve Data returns candles most recent first. We must reverse to get oldest to newest.
        const values = candlesRes.values || [];
        const chronologicalCandles = [...values].reverse();

        const indicators = performTechnicalCalculations(chronologicalCandles, currentPrice);

        // Format rules from spec: JPY pairs use 3 decimals, forex minors use 4, metals 2, crypto/indices 2
        let decimals = 2;
        if (symbol.includes('JPY')) decimals = 3;
        else if (asset.type === 'forex') decimals = 4;
        
        setMarketData({
          price: currentPrice,
          change24h: Math.round(change24h * 100) / 100,
          trend: indicators.trend,
          rsi: indicators.rsi,
          rsiStatus: indicators.rsiStatus,
          signal: indicators.signal,
          priceFormatted: currentPrice.toFixed(decimals)
        });
      }

      // 8.2 Fetch Economic Events & News in Parallel if Finnhub Key exists
      if (apiKeys.finnhub) {
        const watchCurrencies = getWatchCurrencies(asset);
        
        const finnhubUrl = import.meta.env.VITE_FINNHUB_URL || 'https://finnhub.io/api/v1';
        // News Endpoint Selection (Forex category vs index tickers)
        let newsUrl = `${finnhubUrl}/news?category=forex&token=${apiKeys.finnhub}`;
        if (asset.type === 'indices') {
          // Map index to popular tracking ETF symbol for company-news
          const trackingMap = {
            'SPX': 'SPY',
            'IXIC': 'QQQ',
            'DJI': 'DIA',
            'GDAXI': 'EWG',
            'FTSE': 'EWU'
          };
          const etfTicker = trackingMap[asset.symbol.toUpperCase()] || 'SPY';
          const toDate = new Date().toISOString().split('T')[0];
          const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          newsUrl = `${finnhubUrl}/company-news?symbol=${etfTicker}&from=${fromDate}&to=${toDate}&token=${apiKeys.finnhub}`;
        }

        const economicCalendarUrl = `${finnhubUrl}/calendar/economic?token=${apiKeys.finnhub}`;

        const newsPromise = asset.type === 'crypto' && apiKeys.cryptoPanic
          ? fetchCryptoPanicNews(asset)
          : fetch(newsUrl).then(r => r.json());

        const calendarPromise = fetch(economicCalendarUrl).then(r => r.json());

        const [newsRes, calendarRes] = await Promise.all([
          newsPromise.catch(e => { console.warn("News failed:", e); return []; }),
          calendarPromise.catch(e => { console.warn("Calendar failed:", e); return { economicCalendar: [] }; })
        ]);

        // Parse & Map news
        if (Array.isArray(newsRes)) {
          const parsedNews = newsRes.slice(0, 5).map(item => {
            const date = item.datetime ? new Date(item.datetime * 1000) : new Date();
            const timeAgo = formatTimeAgo(date);
            return {
              headline: item.headline || item.title || "Market Update",
              source: item.source || "Financial Feed",
              timeAgo,
              url: item.url || "#"
            };
          });
          setRecentNews(parsedNews);
        }

        // Parse & Map Economic Events (Filter for High impact and currencies matching asset)
        const eventsList = calendarRes.economicCalendar || [];
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const filteredEvents = eventsList
          .filter(e => {
            const eventDate = new Date(e.time);
            const isFuture = eventDate > now && eventDate <= next24h;
            const isHighImpact = e.impact && e.impact.toLowerCase() === 'high';
            const isMatchCurrency = watchCurrencies.includes(e.country?.toUpperCase());
            return isFuture && isHighImpact && isMatchCurrency;
          })
          .map(e => {
            const eventDate = new Date(e.time);
            const diffMs = eventDate - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const timeUntil = diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins}m`;
            return {
              event: e.event,
              country: e.country,
              timeUntil,
              impact: 'High',
              description: `Expected actual: ${e.actual || 'TBD'}, previous: ${e.prev || 'N/A'}`
            };
          });

        setUpcomingEvents(filteredEvents);
      } else {
        // Mock news or no keys warnings
        console.log("Finnhub Key missing, skipping news and calendar fetch.");
      }

    } catch (err) {
      setError(err.message || 'Error fetching market data from servers');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch from CryptoPanic (CORS caught helper)
  const fetchCryptoPanicNews = async (asset) => {
    if (!apiKeys.cryptoPanic) return [];
    
    // Map CoinGecko ID to short currency symbol
    const symbolMap = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'binancecoin': 'BNB'
    };
    const coinSymbol = symbolMap[asset.symbol] || 'BTC';
    
    try {
      const cryptoPanicUrl = import.meta.env.VITE_CRYPTOPANIC_URL || 'https://cryptopanic.com/api/v1/posts/';
      const url = `${cryptoPanicUrl}?auth_token=${apiKeys.cryptoPanic}&currencies=${coinSymbol}&filter=important`;
      
      // We try direct fetch, but CryptoPanic might trigger CORS on web clients.
      const res = await fetch(url);
      if (!res.ok) throw new Error("CORS or authentication error on CryptoPanic API.");
      const data = await res.json();
      
      if (data.results) {
        return data.results.map(post => ({
          headline: post.title,
          source: post.domain || 'CryptoPanic',
          datetime: Math.floor(new Date(post.created_at).getTime() / 1000),
          url: post.url
        }));
      }
      return [];
    } catch (e) {
      console.warn("CryptoPanic direct call failed due to CORS or keys. Falling back to public Finnhub forex category.", e);
      // Fallback to general forex news from Finnhub if it exists
      if (apiKeys.finnhub) {
        const res = await fetch(`https://finnhub.io/api/v1/news?category=forex&token=${apiKeys.finnhub}`);
        return res.json();
      }
      return [];
    }
  };

  // Helper date formatter
  const formatTimeAgo = (date) => {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
  };

  // --- 9. GROQ AI PRE-TRADE HEDGE VERDICT (Section 13) ---
  const getAiVerdict = async () => {
    setLoadingVerdict(true);
    setError(null);
    try {
      if (demoMode) {
        await simulateVerdict();
        return;
      }

      if (!apiKeys.groq) {
        throw new Error("Groq API Key is missing. Fill it in the Settings panel.");
      }

      // Compile technical context
      const technicalContext = `Asset: ${selectedAsset.symbol} (${selectedAsset.name})
Direction: ${tradeDirection}
Current Price: ${marketData.priceFormatted}
Trend (4H SMA20): ${marketData.trend}
RSI (14-period): ${marketData.rsi} (${marketData.rsiStatus})
Technical Signal: ${marketData.signal}
`;

      // Compile checklist questions and answers
      const formattedAnswers = checklistQuestions.map((q, idx) => {
        return `Q: ${q.question}\nA: ${checklistAnswers[idx]}`;
      }).join('\n\n');

      // Compile news and calendar awareness context
      const newsContext = `
Upcoming High Impact Events: ${upcomingEvents.length > 0 
  ? upcomingEvents.map(e => `${e.event} in ${e.timeUntil}`).join(", ") 
  : "None in next 24 hours"}

Recent Headlines:
${recentNews.slice(0, 3).map(n => `- ${n.headline}`).join("\n")}
`;

      const systemPrompt = `You are a brutally honest trading psychology coach and risk manager. A trader is about to enter a forex, crypto, or indices trade. Analyze their pre-trade checklist and return a structured verdict. Be direct, no sugarcoating. Call out revenge trading, oversizing, and FOMO hard. Always respond in this exact format:

VERDICT: [GO 🟢 / PROCEED WITH CAUTION 🟡 / NO-GO 🔴]

KEY OBSERVATION: [1-2 sentences]

RED FLAGS: [bullet list, or "None" if clean]

WHAT TO WATCH: [1-2 specific notes for this trade]`;

      const userContent = `Technical Context:\n${technicalContext}\n\nPre-Trade Checklist:\n${formattedAnswers}\n\nNews & Event Context:\n${newsContext}`;

      console.log("Sending query to Groq Llama-3.1-8b-instant...");
      
      const groqUrl = import.meta.env.VITE_GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';
      const response = await fetch(groqUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeys.groq}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userContent
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Groq API error. Check key status.");
      }

      const data = await response.json();
      const rawText = data.choices[0].message.content;

      // Parse structured output
      const parsed = parseGroqVerdict(rawText);
      setAiVerdict(parsed);

    } catch (err) {
      setError(err.message || 'Failed to generate AI verdict');
    } finally {
      setLoadingVerdict(false);
      setChecklistOpen(false);
    }
  };

  // Robust parser for Groq output structure
  const parseGroqVerdict = (text) => {
    try {
      // Find Verdict line
      const verdictMatch = text.match(/VERDICT:\s*(GO\s*🟢|PROCEED\s*WITH\s*CAUTION\s*🟡|NO-GO\s*🔴|GO|PROCEED\s*WITH\s*CAUTION|NO-GO)/i);
      let verdict = 'PROCEED WITH CAUTION';
      if (verdictMatch) {
        const matchedStr = verdictMatch[1].toUpperCase();
        if (matchedStr.includes('GO') && !matchedStr.includes('NO')) verdict = 'GO';
        else if (matchedStr.includes('NO')) verdict = 'NO-GO';
        else verdict = 'PROCEED WITH CAUTION';
      }

      // Find Key Observation
      const obsMatch = text.match(/KEY\s*OBSERVATION:\s*([\s\S]*?)(?=RED\s*FLAGS:|$)/i);
      const observation = obsMatch ? obsMatch[1].trim() : 'Review observations below.';

      // Find Red Flags
      const flagsMatch = text.match(/RED\s*FLAGS:\s*([\s\S]*?)(?=WHAT\s*TO\s*WATCH:|$)/i);
      let redFlags = ['None'];
      if (flagsMatch) {
        const flagsRaw = flagsMatch[1].trim();
        if (flagsRaw.toLowerCase() !== 'none' && flagsRaw !== '') {
          // Split into list items
          redFlags = flagsRaw
            .split('\n')
            .map(line => line.replace(/^-\s*/, '').replace(/^\*\s*/, '').trim())
            .filter(line => line.length > 0);
        }
      }

      // Find What To Watch
      const watchMatch = text.match(/WHAT\s*TO\s*WATCH:\s*([\s\S]*?)$/i);
      const whatToWatch = watchMatch ? watchMatch[1].trim() : 'Monitor price volatility.';

      return {
        raw: text,
        verdict,
        observation,
        redFlags,
        whatToWatch
      };
    } catch (e) {
      console.warn("Custom parsing failed, displaying raw Groq feedback.", e);
      // Fallback
      return {
        raw: text,
        verdict: text.includes('NO-GO') ? 'NO-GO' : text.includes('GO 🟢') ? 'GO' : 'PROCEED WITH CAUTION',
        observation: text,
        redFlags: ['Failed to parse structured format. Displaying raw data.'],
        whatToWatch: 'Please review raw message below.'
      };
    }
  };

  // --- 10. MOCK SIMULATORS FOR DEMO MODE ---
  const simulateMarketData = async (asset) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Choose price depending on symbol
    let mockPrice = 1.0845;
    let change = 0.45;
    if (asset.type === 'crypto') {
      mockPrice = asset.symbol === 'bitcoin' ? 68430.50 : (asset.symbol === 'ethereum' ? 3512.20 : 145.60);
      change = -2.15;
    } else if (asset.symbol.includes('JPY')) {
      mockPrice = 156.88;
      change = 0.82;
    } else if (asset.symbol.includes('XAU')) {
      mockPrice = 2324.50;
      change = 1.12;
    } else if (asset.type === 'indices') {
      mockPrice = asset.symbol === 'SPX' ? 5430.25 : (asset.symbol === 'IXIC' ? 17750.40 : 38900.00);
      change = 0.33;
    }

    setMarketData({
      price: mockPrice,
      change24h: change,
      trend: change >= 0 ? 'UPTREND' : 'DOWNTREND',
      rsi: change >= 0 ? 64.2 : 28.5,
      rsiStatus: change >= 0 ? 'Neutral' : 'Oversold',
      signal: change >= 0 
        ? 'LONG SIGNAL: Uptrend confirmed. Price above SMA20 & RSI neutral. Conditions favour BUY/LONG.' 
        : 'WAIT — Downtrend present but RSI is Oversold (Bounce risk, monitor for better entry)',
      priceFormatted: mockPrice.toFixed(asset.symbol.includes('JPY') ? 3 : asset.type === 'forex' ? 4 : 2)
    });

    setUpcomingEvents([
      {
        event: 'US Federal Funds Rate Decision',
        country: 'USD',
        timeUntil: '4h 15m',
        impact: 'High',
        description: 'Interest rate press conference. Heightened USD volatility.'
      }
    ]);

    setRecentNews([
      {
        headline: 'Markets wait in anticipation for Federal Reserve FOMC conference updates',
        source: 'Forex Insight',
        timeAgo: '12 mins ago',
        url: '#'
      },
      {
        headline: 'Gold technical levels steady above $2,300 amid yields drop',
        source: 'Finnhub News',
        timeAgo: '2 hours ago',
        url: '#'
      },
      {
        headline: 'Crypto majors trade sideways ahead of macro liquidity changes',
        source: 'Coingecko Pulse',
        timeAgo: '4 hours ago',
        url: '#'
      }
    ]);
  };

  const simulateVerdict = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Base simulated verdict on answers
    const entryReason = checklistAnswers[0];
    const riskPercentage = checklistAnswers[6];
    const triggerNow = checklistAnswers[4];
    
    let verdict = 'PROCEED WITH CAUTION';
    let observation = 'The trade direction aligns with the overall trend, and sizing is kept safe. However, upcoming economic releases demand tight stop placements.';
    let redFlags = [];
    let watch = 'Wait for news consolidation before moving position to break-even.';

    if (riskPercentage === 'More than 5%' || riskPercentage === '3-5%') {
      verdict = 'NO-GO';
      redFlags.push('High Account Risk Sizing: Risking over 3% on a single position invite ruin.');
    }
    if (triggerNow === 'Bored/FOMO' || triggerNow === 'Recovering a loss') {
      verdict = 'NO-GO';
      redFlags.push('Impulsive Execution Trigger: Boredom, FOMO, and revenge trading bypass strict setups.');
    }
    if (entryReason === 'Just looks good') {
      verdict = 'PROCEED WITH CAUTION';
      redFlags.push('Weak technical justification: Entering a position on a whim lack setup confirmation.');
    }

    if (redFlags.length === 0) {
      verdict = 'GO';
      observation = 'Excellent trade execution plan. Clear entry reason, aligned with overall trend structure, tight risk sizing, and clear price stops.';
      redFlags = ['None'];
      watch = 'Execute at designated trigger level. Stick to original target levels.';
    }

    setAiVerdict({
      verdict,
      observation,
      redFlags,
      whatToWatch: watch
    });
  };

  const resetTradeState = () => {
    setTradeDirection(null);
    setAiVerdict(null);
    setChecklistStep(0);
    setChecklistAnswers(Array(7).fill(null));
  };

  const handleAnswerSelect = (optionIndex) => {
    const newAnswers = [...checklistAnswers];
    newAnswers[checklistStep] = checklistQuestions[checklistStep].options[optionIndex];
    setChecklistAnswers(newAnswers);
    
    if (checklistStep < 6) {
      setChecklistStep(checklistStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (checklistStep > 0) {
      setChecklistStep(checklistStep - 1);
    }
  };

  // --- 11. RENDERING THE WEB APPLICATION ---
  return (
    <div style={styles.appContainer}>
      
      {/* HEADER SECTION */}
      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <div style={styles.logoIcon}>
            <Cpu size={18} color="var(--color-green)" />
          </div>
          <div>
            <h1 style={styles.appTitle}>BetaTrader</h1>
            <p style={styles.appSubtitle}>Personal Decision Support Terminal</p>
          </div>
        </div>
        
        <div style={styles.headerControls}>
          <button 
            onClick={() => setDemoMode(!demoMode)} 
            style={{
              ...styles.demoBtn,
              borderColor: demoMode ? 'var(--color-blue)' : 'var(--border-color)',
              color: demoMode ? 'var(--color-blue)' : 'var(--text-secondary)'
            }}
          >
            <span style={{
              ...styles.indicatorDot,
              backgroundColor: demoMode ? 'var(--color-blue)' : 'var(--text-muted)'
            }} />
            Demo Mode: {demoMode ? 'ON' : 'OFF'}
          </button>
          
          <button 
            onClick={() => setSettingsOpen(true)} 
            style={styles.settingsBtn}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* SETTINGS DRAWER OVERLAY */}
      {settingsOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, ...styles.settingsModal }} className="animate-scale-in">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>API Configuration</h3>
              <button onClick={() => setSettingsOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Twelve Data API Key</label>
                <input 
                  type="password" 
                  value={apiKeys.twelveData} 
                  onChange={(e) => setApiKeys({ ...apiKeys, twelveData: e.target.value })}
                  placeholder="Twelve Data API Key" 
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Groq API Key</label>
                <input 
                  type="password" 
                  value={apiKeys.groq} 
                  onChange={(e) => setApiKeys({ ...apiKeys, groq: e.target.value })}
                  placeholder="Groq API Key" 
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Finnhub API Key</label>
                <input 
                  type="password" 
                  value={apiKeys.finnhub} 
                  onChange={(e) => setApiKeys({ ...apiKeys, finnhub: e.target.value })}
                  placeholder="Finnhub API Key" 
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>CryptoPanic API Key</label>
                <input 
                  type="password" 
                  value={apiKeys.cryptoPanic} 
                  onChange={(e) => setApiKeys({ ...apiKeys, cryptoPanic: e.target.value })}
                  placeholder="CryptoPanic API Key" 
                  style={styles.textInput}
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setSettingsOpen(false)} style={styles.primaryBtn}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE CONTENT LAYOUT */}
      <main style={styles.mainLayout}>
        
        {/* Left Column: Asset Selection & Technical Dashboard */}
        <section style={styles.primaryColumn}>
          
          {/* SEARCH AND QUICK SELECTOR CARD */}
          <div style={styles.card}>
            <div style={styles.searchContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. EUR/USD, BTC, Gold)..." 
                style={styles.searchBar}
              />
              
              {/* Autocomplete Dropdown List */}
              {searchResults.length > 0 && (
                <div style={styles.dropdown}>
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedAsset(item);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      style={styles.dropdownItem}
                    >
                      <span style={styles.dropdownSymbol}>{item.symbol}</span>
                      <span style={styles.dropdownName}>{item.name}</span>
                      <span style={styles.dropdownTag}>{item.type.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Category tabs */}
            <div style={styles.tabsContainer}>
              {['forex', 'metals', 'indices', 'crypto'].map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); resetTradeState(); setSelectedAsset(null); }}
                  style={{
                    ...styles.tabBtn,
                    borderBottomColor: activeCategory === cat ? 'var(--color-green)' : 'transparent',
                    color: activeCategory === cat ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Quick selector grid */}
            <div style={styles.assetsGrid}>
              {quickAssets[activeCategory].map(asset => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset({ ...asset, type: activeCategory })}
                  style={{
                    ...styles.assetBtn,
                    borderColor: selectedAsset?.symbol === asset.symbol ? 'var(--color-green)' : 'var(--border-color)',
                    backgroundColor: selectedAsset?.symbol === asset.symbol ? 'var(--bg-tertiary)' : 'transparent'
                  }}
                >
                  <span style={styles.assetSymbol}>{asset.symbol}</span>
                  <span style={styles.assetName}>{asset.name.split(' - ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE TERMINAL PANEL */}
          {selectedAsset ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* PRICE CARD */}
              <div style={styles.card}>
                {loadingData ? (
                  <div style={styles.loadingContainer}>
                    <RefreshCw size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>Syncing exchange feeds...</p>
                  </div>
                ) : marketData ? (
                  <div>
                    {/* Header: Title + Price info */}
                    <div style={styles.priceHeader}>
                      <div>
                        <h2 style={styles.priceSymbol}>{selectedAsset.symbol.toUpperCase()}</h2>
                        <p style={styles.priceName}>{selectedAsset.name}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={styles.currentPrice}>${marketData.priceFormatted}</span>
                        <div style={{
                          ...styles.changeBadge,
                          color: marketData.change24h >= 0 ? 'var(--color-green)' : 'var(--color-red)'
                        }}>
                          {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h}% (24h)
                        </div>
                      </div>
                    </div>

                    {/* Warning Banner (Upcoming news impact within 24h) */}
                    {upcomingEvents.length > 0 && !dismissedWarning && (
                      <div style={styles.warningBanner}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <AlertTriangle size={18} color="var(--color-amber)" />
                          <div>
                            <span style={styles.warningTag}>⚠️ HIGH IMPACT EVENT IN {upcomingEvents[0].timeUntil.toUpperCase()}</span>
                            <p style={styles.warningDetail}>{upcomingEvents[0].event}</p>
                          </div>
                        </div>
                        <button onClick={() => setDismissedWarning(true)} style={styles.warningDismiss}>
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Indicators Grid */}
                    <div style={styles.indicatorsGrid}>
                      <div style={styles.indicatorCell}>
                        <span style={styles.indicatorLabel}>Trend (4H SMA20)</span>
                        <span style={{
                          ...styles.indicatorVal,
                          color: marketData.trend === 'UPTREND' ? 'var(--color-green)' : marketData.trend === 'DOWNTREND' ? 'var(--color-red)' : 'var(--text-secondary)'
                        }}>
                          {marketData.trend}
                        </span>
                      </div>
                      <div style={styles.indicatorCell}>
                        <span style={styles.indicatorLabel}>RSI (14-Period)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={styles.indicatorVal}>{marketData.rsi}</span>
                          <span style={{
                            ...styles.rsiLabel,
                            backgroundColor: marketData.rsiStatus === 'Overbought' ? 'var(--color-red-glow)' : marketData.rsiStatus === 'Oversold' ? 'var(--color-green-glow)' : 'transparent',
                            color: marketData.rsiStatus === 'Overbought' ? 'var(--color-red)' : marketData.rsiStatus === 'Oversold' ? 'var(--color-green)' : 'var(--text-secondary)',
                            borderColor: marketData.rsiStatus !== 'Neutral' ? 'currentColor' : 'transparent'
                          }}>
                            {marketData.rsiStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Technical Signal Plain language block */}
                    <div style={styles.signalCard}>
                      <div style={styles.signalTitle}>TECHNICAL SIGNAL</div>
                      <p style={styles.signalText}>{marketData.signal}</p>
                    </div>

                    {/* Trade Direction Selection */}
                    <div style={styles.tradeControls}>
                      <button
                        onClick={() => { setTradeDirection('BUY'); setAiVerdict(null); }}
                        style={{
                          ...styles.buyBtn,
                          backgroundColor: tradeDirection === 'BUY' ? 'var(--color-green)' : 'transparent',
                          color: tradeDirection === 'BUY' ? 'var(--bg-primary)' : 'var(--color-green)'
                        }}
                      >
                        <TrendingUp size={16} /> BUY / LONG
                      </button>
                      <button
                        onClick={() => { setTradeDirection('SELL'); setAiVerdict(null); }}
                        style={{
                          ...styles.sellBtn,
                          backgroundColor: tradeDirection === 'SELL' ? 'var(--color-red)' : 'transparent',
                          color: tradeDirection === 'SELL' ? 'var(--bg-primary)' : 'var(--color-red)'
                        }}
                      >
                        <TrendingDown size={16} /> SELL / SHORT
                      </button>
                    </div>

                    {tradeDirection && (
                      <button 
                        onClick={() => { setChecklistStep(0); setChecklistAnswers(Array(7).fill(null)); setChecklistOpen(true); }}
                        style={styles.checklistTriggerBtn}
                      >
                        <Play size={14} style={{ marginRight: '6px' }} /> Run Pre-Trade Checklist
                      </button>
                    )}

                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Feeds unavailable. Check internet or API keys.</p>
                )}
              </div>

              {/* DYNAMIC PSYCHOLOGICAL AI VERDICT */}
              {aiVerdict && (
                <div style={{
                  ...styles.card,
                  ...styles.verdictCard,
                  borderColor: aiVerdict.verdict === 'GO' ? 'var(--color-green)' : aiVerdict.verdict === 'NO-GO' ? 'var(--color-red)' : 'var(--color-amber)'
                }} className="animate-fade-in">
                  <div style={styles.verdictHeader}>
                    <span style={styles.verdictBadge}>PSYCHOLOGICAL HEDGE VERDICT</span>
                    <h3 style={{
                      ...styles.verdictTitle,
                      color: aiVerdict.verdict === 'GO' ? 'var(--color-green)' : aiVerdict.verdict === 'NO-GO' ? 'var(--color-red)' : 'var(--color-amber)'
                    }}>
                      VERDICT: {aiVerdict.verdict} {aiVerdict.verdict === 'GO' ? '🟢' : aiVerdict.verdict === 'NO-GO' ? '🔴' : '🟡'}
                    </h3>
                  </div>

                  <div style={styles.verdictSection}>
                    <h4 style={styles.verdictSecLabel}>Key Observation</h4>
                    <p style={styles.verdictSecContent}>{aiVerdict.observation}</p>
                  </div>

                  <div style={styles.verdictSection}>
                    <h4 style={styles.verdictSecLabel}>Red Flags</h4>
                    {aiVerdict.redFlags && aiVerdict.redFlags.length > 0 && aiVerdict.redFlags[0] !== 'None' ? (
                      <ul style={styles.bulletList}>
                        {aiVerdict.redFlags.map((flag, idx) => (
                          <li key={idx} style={styles.bulletItem}>{flag}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ ...styles.verdictSecContent, color: 'var(--color-green)' }}>✓ No psychological red flags detected. Excellent discipline.</p>
                    )}
                  </div>

                  <div style={styles.verdictSection}>
                    <h4 style={styles.verdictSecLabel}>What to Watch</h4>
                    <p style={styles.verdictSecContent}>{aiVerdict.whatToWatch}</p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div style={styles.welcomeCard}>
              <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <h3>Select a trading asset above to begin.</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '380px' }}>
                BetaTrader calculates 4H technical indicators and executes psychological checks to validate trading signals before you pull the trigger.
              </p>
            </div>
          )}

        </section>

        {/* Right Column: News Feed & Economic Events Calendar */}
        {selectedAsset && (
          <section style={styles.secondaryColumn} className="animate-fade-in">
            {/* ECONOMIC CALENDAR CARD */}
            <div style={styles.card}>
              <h3 style={styles.sectionHeading}>Economic Calendar</h3>
              {upcomingEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {upcomingEvents.map((e, index) => (
                    <div key={index} style={styles.eventCard}>
                      <div style={styles.eventHeader}>
                        <span style={styles.eventCountry}>{e.country}</span>
                        <span style={{
                          ...styles.eventImpact,
                          backgroundColor: e.impact === 'High' ? 'var(--color-red-glow)' : 'var(--color-amber-glow)',
                          color: e.impact === 'High' ? 'var(--color-red)' : 'var(--color-amber)'
                        }}>
                          {e.impact} Impact
                        </span>
                      </div>
                      <h4 style={styles.eventName}>{e.event}</h4>
                      <div style={styles.eventTime}>In {e.timeUntil}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noEventsBox}>
                  <CheckCircle size={16} color="var(--color-green)" style={{ marginRight: '6px' }} />
                  <span>No major events scheduled in the next 24 hours.</span>
                </div>
              )}
            </div>

            {/* NEWS CALENDAR FEED */}
            <div style={styles.card}>
              <h3 style={styles.sectionHeading}>
                {selectedAsset.type === 'crypto' ? 'Crypto Pulse' : 'Market News'}
              </h3>
              {recentNews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                  {recentNews.map((n, idx) => (
                    <a key={idx} href={n.url} target="_blank" rel="noreferrer" style={styles.newsLinkCard}>
                      <div style={styles.newsMeta}>
                        <span>{n.source}</span>
                        <span>•</span>
                        <span>{n.timeAgo}</span>
                      </div>
                      <h4 style={styles.newsHeadline}>{n.headline}</h4>
                      <div style={styles.newsHoverIndicator}>
                        Open Article <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px' }}>News articles unavailable. Ensure Finnhub/CryptoPanic tokens are populated.</p>
              )}
            </div>
          </section>
        )}

      </main>

      {/* SEQUENTIAL PRE-TRADE CHECKLIST OVERLAY MODAL */}
      {checklistOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="animate-scale-in">
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} color="var(--color-green)" />
                <h3 style={styles.modalTitle}>Pre-Trade Checklist</h3>
              </div>
              <button onClick={() => setChecklistOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Step progress loading meter */}
            <div style={styles.progressBarBg}>
              <div style={{
                ...styles.progressBarFill,
                width: `${((checklistStep + 1) / 7) * 100}%`
              }} />
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={styles.stepCounter}>Question {checklistStep + 1} of 7</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Selected: {checklistAnswers.filter(x => x !== null).length} / 7
                </span>
              </div>
              
              <h2 style={styles.checklistQuestion}>
                {checklistQuestions[checklistStep].question}
              </h2>
              
              <div style={styles.optionsContainer}>
                {checklistQuestions[checklistStep].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    style={{
                      ...styles.optionBtn,
                      borderColor: checklistAnswers[checklistStep] === option ? 'var(--color-green)' : 'var(--border-color)',
                      backgroundColor: checklistAnswers[checklistStep] === option ? 'var(--color-green-glow)' : 'transparent'
                    }}
                  >
                    <span style={styles.optionNum}>{idx + 1}</span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                onClick={handlePreviousStep} 
                disabled={checklistStep === 0}
                style={{
                  ...styles.secondaryBtn,
                  opacity: checklistStep === 0 ? 0.4 : 1
                }}
              >
                Back
              </button>
              
              {checklistStep === 6 && checklistAnswers[6] !== null ? (
                <button 
                  onClick={getAiVerdict} 
                  style={styles.primaryBtn}
                  disabled={loadingVerdict}
                >
                  {loadingVerdict ? 'Compiling Verdict...' : 'Get Verdict'}
                </button>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Select option to proceed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI COMPILING / REASONING LOADING DIALOG */}
      {loadingVerdict && (
        <div style={styles.modalOverlay}>
          <div style={styles.aiCompilingBox}>
            <Cpu size={32} className="pulse spin" style={{ color: 'var(--color-green)', animation: 'pulse 1.5s infinite' }} />
            <h3 style={{ marginTop: '16px' }}>Consulting Risk Engine</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
              Groq AI is reviewing trade discipline answers against live news context and market structure...
            </p>
          </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATION ERROR SNACKBAR */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '13px' }}>{error}</div>
          <button onClick={() => setError(null)} style={styles.errorCloseBtn}>
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  );
}

// --- 12. INLINE STYLES SHEET ---
const styles = {
  appContainer: {
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)',
  },
  appSubtitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  demoBtn: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'var(--transition-fast)',
  },
  indicatorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  settingsBtn: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    width: '38px',
    height: '38px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  mainLayout: {
    display: 'flex',
    flexDirection: 'row',
    gap: '24px',
    flexWrap: 'wrap',
  },
  primaryColumn: {
    flex: '2 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  secondaryColumn: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
    position: 'relative',
  },
  welcomeCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  searchBar: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '12px 12px 12px 40px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    marginTop: '6px',
    zIndex: 100,
    maxHeight: '260px',
    overflowY: 'auto',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: '13px',
    ':hover': {
      backgroundColor: 'var(--bg-tertiary)'
    }
  },
  dropdownSymbol: {
    fontWeight: '700',
    minWidth: '70px',
    color: 'var(--color-green)',
  },
  dropdownName: {
    color: 'var(--text-secondary)',
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropdownTag: {
    fontSize: '10px',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '16px',
  },
  tabBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  assetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '10px',
  },
  assetBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  assetSymbol: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  assetName: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  loadingContainer: {
    padding: '40px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  priceSymbol: {
    fontSize: '24px',
    fontWeight: '800',
  },
  priceName: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  currentPrice: {
    fontSize: '28px',
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  changeBadge: {
    fontSize: '13px',
    fontWeight: '700',
    marginTop: '4px',
  },
  warningBanner: {
    backgroundColor: 'var(--color-amber-glow)',
    border: '1px solid var(--color-amber)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  warningTag: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--color-amber)',
    display: 'block',
  },
  warningDetail: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    marginTop: '2px',
  },
  warningDismiss: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
  },
  indicatorsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  indicatorCell: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  indicatorLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  indicatorVal: {
    fontSize: '16px',
    fontWeight: '700',
  },
  rsiLabel: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid transparent',
  },
  signalCard: {
    backgroundColor: 'var(--bg-primary)',
    borderLeft: '4px solid var(--color-blue)',
    padding: '16px',
    borderRadius: '0 8px 8px 0',
    marginBottom: '20px',
  },
  signalTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-blue)',
    marginBottom: '4px',
  },
  signalText: {
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  tradeControls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  buyBtn: {
    flex: 1,
    border: '1px solid var(--color-green)',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'var(--transition-fast)',
  },
  sellBtn: {
    flex: 1,
    border: '1px solid var(--color-red)',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'var(--transition-fast)',
  },
  checklistTriggerBtn: {
    width: '100%',
    backgroundColor: 'var(--color-green)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
    boxShadow: '0 4px 12px var(--color-green-glow)',
  },
  sectionHeading: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  eventCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCountry: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  eventImpact: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  eventName: {
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  eventTime: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  noEventsBox: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    marginTop: '12px',
  },
  newsLinkCard: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    transition: 'var(--transition-fast)',
  },
  newsMeta: {
    display: 'flex',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  newsHeadline: {
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  newsHoverIndicator: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--color-blue)',
    marginTop: '8px',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 7, 13, 0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  settingsModal: {
    maxWidth: '460px',
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  infoAlert: {
    backgroundColor: 'var(--color-blue-glow)',
    border: '1px solid var(--color-blue)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  infoAlertText: {
    fontSize: '12px',
    lineHeight: '1.4',
    color: 'var(--text-primary)',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: 'var(--text-primary)',
  },
  textInput: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
  },
  inputHint: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  link: {
    color: 'var(--color-green)',
    textDecoration: 'none',
  },
  modalFooter: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: 'var(--color-green)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    padding: '10px 18px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  stepCounter: {
    fontSize: '13px',
    color: 'var(--color-green)',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    backgroundColor: 'var(--border-color)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--color-green)',
    transition: 'width var(--transition-fast)',
  },
  checklistQuestion: {
    fontSize: '18px',
    fontWeight: '800',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '14px',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
  },
  optionNum: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
  },
  aiCompilingBox: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '40px 30px',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  verdictCard: {
    borderLeftWidth: '6px',
  },
  verdictHeader: {
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  verdictBadge: {
    fontSize: '9px',
    fontWeight: '800',
    color: 'var(--text-secondary)',
    letterSpacing: '0.1em',
  },
  verdictTitle: {
    fontSize: '18px',
    fontWeight: '800',
    marginTop: '4px',
  },
  verdictSection: {
    marginBottom: '14px',
  },
  verdictSecLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  verdictSecContent: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'var(--text-primary)',
  },
  bulletList: {
    paddingLeft: '18px',
    marginTop: '4px',
  },
  bulletItem: {
    fontSize: '13px',
    color: 'var(--color-red)',
    lineHeight: '1.5',
    marginBottom: '4px',
  },
  errorBanner: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: 'var(--color-red-glow)',
    border: '1px solid var(--color-red)',
    color: 'var(--color-red)',
    borderRadius: '8px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    maxWidth: '400px',
    animation: 'fadeIn var(--transition-normal) forwards',
  },
  errorCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-red)',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  }
};

export default App;
