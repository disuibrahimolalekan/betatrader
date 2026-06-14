import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import {
  TrendingUp, TrendingDown, Search, AlertTriangle, CheckCircle,
  RefreshCw, Trash2, Edit3, PlusCircle, Calendar, DollarSign,
  X, Lock, LogOut, Maximize2, ChevronDown, ChevronUp, BookOpen,
  Filter, Award, TrendingUp as TrendUpIcon, ShieldAlert, BarChart2,
  FileImage, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

function JournalTab({ user, prefilledData, clearPrefilledData, flatSymbolsList = [], theme }) {
  // --- 1. SUB-TAB STATE ---
  // 'log-trade' | 'my-trades' | 'performance'
  const [activeSubTab, setActiveSubTab] = useState('my-trades');

  // --- 2. AUTH FORM STATE ---
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // --- 3. LOG TRADE FORM STATE ---
  const [asset, setAsset] = useState('');
  const [assetSuggestions, setAssetSuggestions] = useState([]);
  const [direction, setDirection] = useState('BUY'); // 'BUY' | 'SELL'
  const [timeframe, setTimeframe] = useState('4H');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [lotSize, setLotSize] = useState('0.01');
  const [entryTime, setEntryTime] = useState('');
  const [emotionalState, setEmotionalState] = useState('CALM');
  const [setupNotes, setSetupNotes] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [status, setStatus] = useState('OPEN'); // 'OPEN' | 'CLOSED'
  const [exitPrice, setExitPrice] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [checklistScore, setChecklistScore] = useState(null);
  const [checklistVerdict, setChecklistVerdict] = useState(null);
  
  const [loadingSave, setLoadingSave] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // --- 4. MY TRADES STATE ---
  const [trades, setTrades] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const [signedUrls, setSignedUrls] = useState({}); // tradeId -> signedUrl

  // Filters
  const [filterAsset, setFilterAsset] = useState('');
  const [filterDirection, setFilterDirection] = useState('ALL'); // 'ALL' | 'BUY' | 'SELL'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'OPEN' | 'CLOSED'
  const [filterEmotion, setFilterEmotion] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Edit / Close Open Trade Modal State
  const [closingTrade, setClosingTrade] = useState(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');
  const [closeExitTime, setCloseExitTime] = useState('');
  const [loadingClose, setLoadingClose] = useState(false);

  // --- 5. INITIALIZE LOG TRADE / PREFILLS ---
  // Default entry time helper (local datetime string for inputs)
  const getLocalDateTimeString = (date = new Date()) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    if (!entryTime) {
      setEntryTime(getLocalDateTimeString());
    }
    if (!exitTime) {
      setExitTime(getLocalDateTimeString());
    }
  }, []);

  // Handle prefilled checklist data from Trader Tab
  useEffect(() => {
    if (prefilledData && user) {
      setAsset(prefilledData.asset || '');
      setDirection(prefilledData.direction || 'BUY');
      setChecklistScore(prefilledData.checklist_score ?? null);
      setChecklistVerdict(prefilledData.checklist_verdict || null);
      setStatus('OPEN');
      setEntryTime(getLocalDateTimeString());
      
      // Navigate to Log Trade sub-tab
      setActiveSubTab('log-trade');
      
      // Clear parent state to prevent infinite updates
      clearPrefilledData();
    }
  }, [prefilledData, user]);

  // Asset Autocomplete Suggestions
  useEffect(() => {
    if (!asset.trim()) {
      setAssetSuggestions([]);
      return;
    }
    const query = asset.toLowerCase();
    const filtered = flatSymbolsList.filter(item =>
      item.symbol.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
    ).slice(0, 6);
    setAssetSuggestions(filtered);
  }, [asset, flatSymbolsList]);

  // Fetch Trades when user is available or tab changes
  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  // Fetch Trades from Supabase
  const fetchTrades = async () => {
    setLoadingTrades(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error("Error fetching trades:", err);
    } finally {
      setLoadingTrades(false);
    }
  };

  // --- 6. AUTHENTICATION HANDLERS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setLoadingAuth(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthSuccess('Welcome back!');
      } else if (authMode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthSuccess('Registration successful! Please check your email for confirmation.');
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setAuthSuccess('Password reset email sent. Please check your inbox.');
      }
    } catch (err) {
      setAuthError(err.message || 'An error occurred during authentication');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // --- 7. AUTO CALCULATIONS ---
  const detectedAssetType = (symbol) => {
    const sym = symbol.toUpperCase().trim();
    const clean = sym.replace('/', '');
    const match = flatSymbolsList.find(x => x.symbol.toUpperCase() === sym || x.symbol.toUpperCase().replace('/', '') === sym.replace('/', ''));
    if (match) return match.type;
    
    if (/^(XAU|XAG|XPT|XPD)/.test(clean)) return 'metals';
    const majorCurrencies = ['EUR','USD','GBP','JPY','AUD','CAD','CHF','NZD','MXN','ZAR','SGD','HKD','NOK','SEK','DKK','TRY'];
    if (clean.length === 6 && majorCurrencies.includes(clean.slice(0,3)) && majorCurrencies.includes(clean.slice(3))) {
      return 'forex';
    }
    const cryptoCoins = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE','TRX','AVAX','DOT','MATIC','LINK','LTC','BCH','UNI','ATOM','ETC','XLM','NEAR','FIL','APT','ARB','OP','SUI','INJ'];
    if (cryptoCoins.some(coin => clean.startsWith(coin)) || clean.endsWith('USD') || clean.endsWith('USDT')) {
      return 'crypto';
    }
    return 'indices';
  };

  // Auto-calculated variables
  const isJpy = asset.toUpperCase().includes('JPY');
  const type = detectedAssetType(asset);

  const parsedEntry = parseFloat(entryPrice);
  const parsedExit = parseFloat(status === 'CLOSED' ? exitPrice : '');
  const parsedSL = parseFloat(stopLoss);
  const parsedTP = parseFloat(takeProfit);
  const parsedLot = parseFloat(lotSize) || 0.01;

  // Pip calculation
  let calculatedPips = null;
  if (!isNaN(parsedEntry) && !isNaN(parsedExit)) {
    const diff = direction === 'BUY' ? (parsedExit - parsedEntry) : (parsedEntry - parsedExit);
    
    if (type === 'metals') {
      if (asset.toUpperCase().includes('XAU')) {
        calculatedPips = Math.round(diff * 10 * 100) / 100;
      } else if (asset.toUpperCase().includes('XAG')) {
        calculatedPips = Math.round(diff * 100 * 100) / 100;
      } else {
        calculatedPips = Math.round(diff * 10 * 100) / 100;
      }
    } else if (type === 'forex') {
      if (isJpy) {
        calculatedPips = Math.round(diff * 100 * 100) / 100;
      } else {
        calculatedPips = Math.round(diff * 10000 * 100) / 100;
      }
    } else {
      // Crypto, indices
      calculatedPips = Math.round(diff * 100) / 100;
    }
  }

  // PnL calculation
  let calculatedPnL = null;
  if (calculatedPips !== null) {
    if (type === 'crypto' || type === 'indices') {
      // Direct difference times lot size (lots count as quantity)
      calculatedPnL = Math.round(calculatedPips * parsedLot * 100) / 100;
    } else {
      // standard pip value per lot ($10)
      calculatedPnL = Math.round(calculatedPips * parsedLot * 10 * 100) / 100;
    }
  }

  // Risk Reward Ratio
  let calculatedRR = 'N/A';
  if (!isNaN(parsedEntry) && !isNaN(parsedSL) && !isNaN(parsedTP)) {
    let risk = direction === 'BUY' ? (parsedEntry - parsedSL) : (parsedSL - parsedEntry);
    let reward = direction === 'BUY' ? (parsedTP - parsedEntry) : (parsedEntry - parsedTP);
    if (risk > 0 && reward > 0) {
      calculatedRR = `1:${(reward / risk).toFixed(2)}`;
    }
  }

  // Duration in minutes
  let calculatedDuration = null;
  if (status === 'CLOSED' && entryTime && exitTime) {
    const start = new Date(entryTime);
    const end = new Date(exitTime);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      calculatedDuration = Math.round((end - start) / 60000);
    }
  }

  // --- 8. LOG TRADE FORM SUBMIT ---
  const handleLogTradeSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setLoadingSave(true);

    try {
      // Form Validations
      if (!asset.trim()) throw new Error("Asset symbol is required");
      if (isNaN(parsedEntry)) throw new Error("Valid Entry Price is required");
      if (status === 'CLOSED' && isNaN(parsedExit)) throw new Error("Exit Price is required for closed trades");

      let screenshotUrl = null;

      // Handle file upload
      if (screenshotFile) {
        const fileExt = screenshotFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trade-screenshots')
          .upload(fileName, screenshotFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw new Error(`Screenshot upload failed: ${uploadError.message}`);
        screenshotUrl = fileName; // Save path in table
      }

      const payload = {
        user_id: user.id,
        asset: asset.toUpperCase().trim(),
        direction,
        timeframe,
        entry_price: parsedEntry,
        exit_price: status === 'CLOSED' ? parsedExit : null,
        stop_loss: isNaN(parsedSL) ? null : parsedSL,
        take_profit: isNaN(parsedTP) ? null : parsedTP,
        lot_size: parsedLot,
        pips: calculatedPips,
        pnl_usd: calculatedPnL,
        entry_time: new Date(entryTime).toISOString(),
        exit_time: status === 'CLOSED' ? new Date(exitTime).toISOString() : null,
        duration_minutes: calculatedDuration,
        status,
        emotional_state: emotionalState,
        setup_notes: setupNotes || null,
        checklist_score: checklistScore,
        checklist_verdict: checklistVerdict,
        screenshot_url: screenshotUrl
      };

      const { error: insertError } = await supabase
        .from('trades')
        .insert(payload);

      if (insertError) throw insertError;

      setFormSuccess("Trade logged successfully!");
      
      // Reset Form Fields
      setAsset('');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
      setLotSize('0.01');
      setSetupNotes('');
      setScreenshotFile(null);
      setStatus('OPEN');
      setExitPrice('');
      setChecklistScore(null);
      setChecklistVerdict(null);

      // Refresh trades list and switch to My Trades tab
      fetchTrades();
      setActiveSubTab('my-trades');
    } catch (err) {
      setFormError(err.message || 'Failed to save trade to Supabase');
    } finally {
      setLoadingSave(false);
    }
  };

  // --- 9. MY TRADES HANDLERS ---
  const handleToggleExpand = async (trade) => {
    if (expandedTradeId === trade.id) {
      setExpandedTradeId(null);
      return;
    }

    setExpandedTradeId(trade.id);

    // If trade has a screenshot, fetch the signed URL
    if (trade.screenshot_url && !signedUrls[trade.id]) {
      try {
        const { data, error } = await supabase.storage
          .from('trade-screenshots')
          .createSignedUrl(trade.screenshot_url, 3600); // 1 hour

        if (error) throw error;
        setSignedUrls(prev => ({ ...prev, [trade.id]: data.signedUrl }));
      } catch (err) {
        console.error("Failed to generate signed URL for screenshot:", err);
      }
    }
  };

  const handleDeleteTrade = async (tradeId) => {
    if (!window.confirm("Are you sure you want to delete this trade? This cannot be undone.")) return;

    try {
      const trade = trades.find(t => t.id === tradeId);
      
      // Delete screenshot if exists
      if (trade?.screenshot_url) {
        await supabase.storage
          .from('trade-screenshots')
          .remove([trade.screenshot_url]);
      }

      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId);

      if (error) throw error;

      setTrades(prev => prev.filter(t => t.id !== tradeId));
    } catch (err) {
      alert("Failed to delete trade: " + err.message);
    }
  };

  const handleOpenCloseModal = (trade) => {
    setClosingTrade(trade);
    setCloseExitPrice(trade.entry_price);
    setCloseExitTime(getLocalDateTimeString());
  };

  const handleCloseTradeSubmit = async (e) => {
    e.preventDefault();
    if (!closingTrade) return;
    setLoadingClose(true);

    try {
      const entryVal = parseFloat(closingTrade.entry_price);
      const exitVal = parseFloat(closeExitPrice);
      if (isNaN(exitVal)) throw new Error("Valid exit price is required");

      const diff = closingTrade.direction === 'BUY' ? (exitVal - entryVal) : (entryVal - exitVal);
      const tradeType = detectedAssetType(closingTrade.asset);
      const tradeIsJpy = closingTrade.asset.toUpperCase().includes('JPY');
      
      // Calculate Pips
      let pips = 0;
      if (tradeType === 'metals') {
        pips = closingTrade.asset.toUpperCase().includes('XAU') ? diff * 10 : diff * 100;
      } else if (tradeType === 'forex') {
        pips = tradeIsJpy ? diff * 100 : diff * 10000;
      } else {
        pips = diff;
      }
      pips = Math.round(pips * 100) / 100;

      // Calculate PnL
      let pnl = 0;
      if (tradeType === 'crypto' || tradeType === 'indices') {
        pnl = Math.round(pips * closingTrade.lot_size * 100) / 100;
      } else {
        pnl = Math.round(pips * closingTrade.lot_size * 10 * 100) / 100;
      }

      // Calculate Duration
      const start = new Date(closingTrade.entry_time);
      const end = new Date(closeExitTime);
      const duration = Math.round((end - start) / 60000);

      const { error } = await supabase
        .from('trades')
        .update({
          status: 'CLOSED',
          exit_price: exitVal,
          exit_time: end.toISOString(),
          pips,
          pnl_usd: pnl,
          duration_minutes: duration >= 0 ? duration : 0
        })
        .eq('id', closingTrade.id);

      if (error) throw error;

      setClosingTrade(null);
      fetchTrades();
    } catch (err) {
      alert("Failed to close trade: " + err.message);
    } finally {
      setLoadingClose(false);
    }
  };

  // Filter logic
  const filteredTrades = trades.filter(t => {
    if (filterAsset && !t.asset.toUpperCase().includes(filterAsset.toUpperCase())) return false;
    if (filterDirection !== 'ALL' && t.direction !== filterDirection) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterEmotion !== 'ALL' && t.emotional_state !== filterEmotion) return false;
    
    if (filterStartDate) {
      const filterStart = new Date(filterStartDate);
      const tradeDate = new Date(t.entry_time);
      if (tradeDate < filterStart) return false;
    }
    if (filterEndDate) {
      const filterEnd = new Date(filterEndDate + "T23:59:59");
      const tradeDate = new Date(t.entry_time);
      if (tradeDate > filterEnd) return false;
    }
    if (filterSearch && (!t.setup_notes || !t.setup_notes.toLowerCase().includes(filterSearch.toLowerCase()))) return false;
    
    return true;
  });

  // --- 10. STATISTICS ENGINE ---
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const totalClosedTrades = closedTrades.length;

  const winningTrades = closedTrades.filter(t => (t.pnl_usd || 0) >= 0);
  const losingTrades = closedTrades.filter(t => (t.pnl_usd || 0) < 0);

  const winRate = totalClosedTrades > 0
    ? Math.round((winningTrades.length / totalClosedTrades) * 100)
    : 0;

  const totalPnL = closedTrades.reduce((sum, t) => sum + parseFloat(t.pnl_usd || 0), 0);
  const totalPipsVal = closedTrades.reduce((sum, t) => sum + parseFloat(t.pips || 0), 0);

  // Profit Factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl_usd || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl_usd || 0), 0));
  const profitFactor = grossLoss > 0
    ? (grossProfit / grossLoss).toFixed(2)
    : grossProfit > 0 ? '∞' : '0.00';

  // Average Target R:R
  const tradesWithRR = closedTrades.filter(t => t.entry_price && t.stop_loss && t.take_profit);
  let avgTargetRR = 0.0;
  if (tradesWithRR.length > 0) {
    const rrSum = tradesWithRR.reduce((sum, t) => {
      const risk = t.direction === 'BUY' ? (t.entry_price - t.stop_loss) : (t.stop_loss - t.entry_price);
      const reward = t.direction === 'BUY' ? (t.take_profit - t.entry_price) : (t.entry_price - t.take_profit);
      if (risk > 0 && reward > 0) {
        return sum + (reward / risk);
      }
      return sum;
    }, 0);
    avgTargetRR = (rrSum / tradesWithRR.length).toFixed(2);
  }

  // Streaks
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  if (closedTrades.length > 0) {
    // Sort closed trades chronologically (oldest first)
    const chronoClosed = [...closedTrades].sort((a, b) => new Date(a.exit_time) - new Date(b.exit_time));
    const latestOutcome = (chronoClosed[chronoClosed.length - 1].pnl_usd || 0) >= 0 ? 'WIN' : 'LOSS';
    
    let streak = 0;
    for (let i = chronoClosed.length - 1; i >= 0; i--) {
      const outcome = (chronoClosed[i].pnl_usd || 0) >= 0 ? 'WIN' : 'LOSS';
      if (outcome === latestOutcome) streak++;
      else break;
    }
    if (latestOutcome === 'WIN') {
      currentWinStreak = streak;
    } else {
      currentLossStreak = streak;
    }
  }

  // Best & Worst Trades
  let bestTrade = null;
  let worstTrade = null;
  if (closedTrades.length > 0) {
    bestTrade = [...closedTrades].sort((a, b) => (b.pnl_usd || 0) - (a.pnl_usd || 0))[0];
    worstTrade = [...closedTrades].sort((a, b) => (a.pnl_usd || 0) - (b.pnl_usd || 0))[0];
  }

  // --- 11. CHART PREPARATION ---
  // A. Cumulative Equity Curve
  // Sort closed trades oldest first
  const equityData = [];
  let runningPnL = 0;
  [...closedTrades]
    .sort((a, b) => new Date(a.exit_time) - new Date(b.exit_time))
    .forEach((t) => {
      runningPnL += parseFloat(t.pnl_usd || 0);
      equityData.push({
        date: new Date(t.exit_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        pnl: Math.round(runningPnL * 100) / 100,
        asset: t.asset
      });
    });

  // B. Asset Breakdown
  const assetGroups = {};
  closedTrades.forEach(t => {
    if (!assetGroups[t.asset]) {
      assetGroups[t.asset] = { name: t.asset, totalPnL: 0, wins: 0, total: 0 };
    }
    assetGroups[t.asset].totalPnL += parseFloat(t.pnl_usd || 0);
    assetGroups[t.asset].total++;
    if ((t.pnl_usd || 0) >= 0) assetGroups[t.asset].wins++;
  });
  const assetChartData = Object.values(assetGroups).map(g => ({
    name: g.name,
    pnl: Math.round(g.totalPnL * 100) / 100,
    winRate: Math.round((g.wins / g.total) * 100)
  }));

  // C. Timeframe Breakdown
  const tfGroups = {};
  closedTrades.forEach(t => {
    const tf = t.timeframe || 'Unknown';
    if (!tfGroups[tf]) {
      tfGroups[tf] = { name: tf, wins: 0, total: 0 };
    }
    tfGroups[tf].total++;
    if ((t.pnl_usd || 0) >= 0) tfGroups[tf].wins++;
  });
  const tfChartData = Object.values(tfGroups).map(g => ({
    name: g.name,
    winRate: Math.round((g.wins / g.total) * 100)
  }));

  // D. Emotional State Analysis
  const emotionGroups = {};
  closedTrades.forEach(t => {
    const emo = t.emotional_state || 'CALM';
    if (!emotionGroups[emo]) {
      emotionGroups[emo] = { name: emo, totalPnL: 0, wins: 0, total: 0 };
    }
    emotionGroups[emo].totalPnL += parseFloat(t.pnl_usd || 0);
    emotionGroups[emo].total++;
    if ((t.pnl_usd || 0) >= 0) emotionGroups[emo].wins++;
  });
  const emotionChartData = Object.values(emotionGroups).map(g => ({
    name: g.name,
    winRate: Math.round((g.wins / g.total) * 100),
    avgPnL: Math.round((g.totalPnL / g.total) * 100) / 100
  }));

  // E. Monthly P&L
  const monthlyGroups = {};
  closedTrades.forEach(t => {
    if (!t.exit_time) return;
    const date = new Date(t.exit_time);
    const monthKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = { month: monthKey, pnl: 0 };
    }
    monthlyGroups[monthKey].pnl += parseFloat(t.pnl_usd || 0);
  });
  const monthlyChartData = Object.values(monthlyGroups).map(g => ({
    month: g.month,
    pnl: Math.round(g.pnl * 100) / 100
  }));

  // Render Login Modal Overlay if not logged in
  if (!user) {
    return (
      <div style={ds.authOverlay}>
        <div style={ds.authCard} className="animate-scale-in">
          <div style={ds.authHeader}>
            <div style={ds.authLogoIcon}>
              <Lock size={18} color="var(--color-green)" />
            </div>
            <div>
              <h3 style={ds.authTitle}>BetaTrader Journal</h3>
              <p style={ds.authSubtitle}>Private Supabase Cloud Integration</p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} style={ds.authBody}>
            {authError && (
              <div style={ds.authAlertError}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div style={ds.authAlertSuccess}>
                <CheckCircle size={15} style={{ flexShrink: 0 }} />
                <span>{authSuccess}</span>
              </div>
            )}

            <div style={ds.inputGrp}>
              <label style={ds.label}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trader@domain.com"
                style={ds.input}
              />
            </div>

            {authMode !== 'forgot' && (
              <div style={ds.inputGrp}>
                <label style={ds.label}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={ds.input}
                />
              </div>
            )}

            {authMode === 'signup' && (
              <div style={ds.inputGrp}>
                <label style={ds.label}>Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={ds.input}
                />
              </div>
            )}

            <button type="submit" disabled={loadingAuth} style={ds.authBtn}>
              {loadingAuth ? 'Connecting...' : authMode === 'login' ? 'Log In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          <div style={ds.authFooter}>
            {authMode === 'login' && (
              <>
                <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} style={ds.switchBtn}>New trader? Register</button>
                <button onClick={() => { setAuthMode('forgot'); setAuthError(''); }} style={ds.switchBtn}>Forgot password?</button>
              </>
            )}
            {authMode === 'signup' && (
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }} style={ds.switchBtn}>Back to Log In</button>
            )}
            {authMode === 'forgot' && (
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }} style={ds.switchBtn}>Back to Log In</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={ds.journalContainer} className="animate-fade-in">
      
      {/* Top Banner Auth Bar */}
      <div style={ds.userBar}>
        <div style={ds.userBarInfo}>
          <div style={ds.activeDot} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Logged in as: </span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-green)', marginLeft: '4px' }}>{user.email}</span>
        </div>
        <button onClick={handleLogout} style={ds.logoutBtn}>
          <LogOut size={13} /> Log Out
        </button>
      </div>

      {/* Navigation Headers */}
      <div style={ds.subTabsNav}>
        <button
          onClick={() => setActiveSubTab('my-trades')}
          style={{
            ...ds.subTabBtn,
            borderBottomColor: activeSubTab === 'my-trades' ? 'var(--color-green)' : 'transparent',
            color: activeSubTab === 'my-trades' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          <BookOpen size={14} /> MY TRADES
        </button>
        <button
          onClick={() => setActiveSubTab('log-trade')}
          style={{
            ...ds.subTabBtn,
            borderBottomColor: activeSubTab === 'log-trade' ? 'var(--color-green)' : 'transparent',
            color: activeSubTab === 'log-trade' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          <PlusCircle size={14} /> LOG TRADE
        </button>
        <button
          onClick={() => setActiveSubTab('performance')}
          style={{
            ...ds.subTabBtn,
            borderBottomColor: activeSubTab === 'performance' ? 'var(--color-green)' : 'transparent',
            color: activeSubTab === 'performance' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          <BarChart2 size={14} /> PERFORMANCE
        </button>
      </div>

      {/* --- SUB-TAB CONTENTS --- */}

      {/* 1. LOG TRADE FORM */}
      {activeSubTab === 'log-trade' && (
        <form onSubmit={handleLogTradeSubmit} style={ds.formCard} className="animate-scale-in">
          <h3 style={ds.cardTitle}>Record Trade Log Entry</h3>
          
          {formError && (
            <div style={ds.alertError}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div style={ds.alertSuccess}>
              <CheckCircle size={15} style={{ flexShrink: 0 }} />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Checklist Info Alert (If Prefilled) */}
          {checklistScore !== null && (
            <div style={ds.checklistBadgeAlert}>
              <Award size={16} />
              <div>
                <strong style={{ display: 'block', fontSize: '12px' }}>Pre-Trade Checklist Preloaded</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Score: {checklistScore}/100 | Groq Verdict: {checklistVerdict}
                </span>
              </div>
            </div>
          )}

          <div style={ds.formGrid}>
            <div style={ds.formColumn}>
              {/* Asset Autocomplete */}
              <div style={ds.inputGrp}>
                <label style={ds.label}>Asset Symbol</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={asset}
                    onChange={e => setAsset(e.target.value)}
                    placeholder="EUR/USD, BTCUSD, XAUUSD"
                    style={ds.input}
                  />
                  {assetSuggestions.length > 0 && (
                    <div style={ds.autocompleteBox}>
                      {assetSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAsset(item.symbol);
                            setAssetSuggestions([]);
                          }}
                          style={ds.autocompleteItem}
                        >
                          <strong style={{ color: 'var(--color-green)' }}>{item.symbol}</strong>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '11px' }}>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Direction</label>
                <div style={ds.toggleGroup}>
                  <button
                    type="button"
                    onClick={() => setDirection('BUY')}
                    style={{
                      ...ds.toggleBtn,
                      backgroundColor: direction === 'BUY' ? 'var(--color-green)' : 'transparent',
                      color: direction === 'BUY' ? 'var(--bg-primary)' : 'var(--color-green)',
                      borderColor: 'var(--color-green)'
                    }}
                  >
                    <TrendingUp size={14} /> BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SELL')}
                    style={{
                      ...ds.toggleBtn,
                      backgroundColor: direction === 'SELL' ? 'var(--color-red)' : 'transparent',
                      color: direction === 'SELL' ? 'var(--bg-primary)' : 'var(--color-red)',
                      borderColor: 'var(--color-red)'
                    }}
                  >
                    <TrendingDown size={14} /> SELL / SHORT
                  </button>
                </div>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Timeframe</label>
                <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={ds.select}>
                  <option value="1M">1 Minute (1M)</option>
                  <option value="5M">5 Minutes (5M)</option>
                  <option value="15M">15 Minutes (15M)</option>
                  <option value="1H">1 Hour (1H)</option>
                  <option value="4H">4 Hours (4H)</option>
                  <option value="1D">Daily (1D)</option>
                  <option value="1W">Weekly (1W)</option>
                </select>
              </div>

              <div style={ds.formRow}>
                <div style={ds.inputGrp}>
                  <label style={ds.label}>Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={entryPrice}
                    onChange={e => setEntryPrice(e.target.value)}
                    placeholder="1.0854"
                    style={ds.input}
                  />
                </div>
                <div style={ds.inputGrp}>
                  <label style={ds.label}>Lot Size</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={lotSize}
                    onChange={e => setLotSize(e.target.value)}
                    style={ds.input}
                  />
                </div>
              </div>

              <div style={ds.formRow}>
                <div style={ds.inputGrp}>
                  <label style={ds.label}>Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    placeholder="1.0820"
                    style={ds.input}
                  />
                </div>
                <div style={ds.inputGrp}>
                  <label style={ds.label}>Take Profit</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={e => setTakeProfit(e.target.value)}
                    placeholder="1.0910"
                    style={ds.input}
                  />
                </div>
              </div>
            </div>

            <div style={ds.formColumn}>
              <div style={ds.inputGrp}>
                <label style={ds.label}>Entry Time</label>
                <input
                  type="datetime-local"
                  required
                  value={entryTime}
                  onChange={e => setEntryTime(e.target.value)}
                  style={ds.input}
                />
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Status</label>
                <div style={ds.toggleGroup}>
                  <button
                    type="button"
                    onClick={() => setStatus('OPEN')}
                    style={{
                      ...ds.toggleBtn,
                      backgroundColor: status === 'OPEN' ? 'var(--color-blue)' : 'transparent',
                      color: status === 'OPEN' ? 'var(--bg-primary)' : 'var(--color-blue)',
                      borderColor: 'var(--color-blue)'
                    }}
                  >
                    OPEN
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('CLOSED')}
                    style={{
                      ...ds.toggleBtn,
                      backgroundColor: status === 'CLOSED' ? 'var(--text-primary)' : 'transparent',
                      color: status === 'CLOSED' ? 'var(--bg-primary)' : 'var(--text-primary)',
                      borderColor: 'var(--text-primary)'
                    }}
                  >
                    CLOSED
                  </button>
                </div>
              </div>

              {/* Conditional Exit Details */}
              {status === 'CLOSED' && (
                <div style={ds.formRow} className="animate-fade-in">
                  <div style={ds.inputGrp}>
                    <label style={ds.label}>Exit Price</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={exitPrice}
                      onChange={e => setExitPrice(e.target.value)}
                      placeholder="1.0894"
                      style={ds.input}
                    />
                  </div>
                  <div style={ds.inputGrp}>
                    <label style={ds.label}>Exit Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={exitTime}
                      onChange={e => setExitTime(e.target.value)}
                      style={ds.input}
                    />
                  </div>
                </div>
              )}

              <div style={ds.inputGrp}>
                <label style={ds.label}>Emotional State</label>
                <select value={emotionalState} onChange={e => setEmotionalState(e.target.value)} style={ds.select}>
                  <option value="CALM">CALM 🧘</option>
                  <option value="CONFIDENT">CONFIDENT 😎</option>
                  <option value="UNCERTAIN">UNCERTAIN 🌀</option>
                  <option value="FOMO">FOMO ⚡</option>
                  <option value="REVENGE">REVENGE 👺</option>
                </select>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Setup Notes (Max 500 chars)</label>
                <textarea
                  maxLength="500"
                  value={setupNotes}
                  onChange={e => setSetupNotes(e.target.value)}
                  placeholder="Explain the technical or fundamental context here..."
                  style={ds.textarea}
                />
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Chart Screenshot (Image only, Max 5MB)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={e => setScreenshotFile(e.target.files[0])}
                  style={ds.fileInput}
                />
              </div>
            </div>
          </div>

          {/* Auto calculations display */}
          <div style={ds.calculationsBox}>
            <span style={ds.calculationsTitle}>Live Calculations</span>
            <div style={ds.calculationsGrid}>
              <div style={ds.calcItem}>
                <span style={ds.calcLabel}>Pips</span>
                <span style={{
                  ...ds.calcValue,
                  color: calculatedPips === null ? 'var(--text-secondary)' : calculatedPips >= 0 ? 'var(--color-green)' : 'var(--color-red)'
                }}>
                  {calculatedPips === null ? '—' : `${calculatedPips > 0 ? '+' : ''}${calculatedPips}`}
                </span>
              </div>
              <div style={ds.calcItem}>
                <span style={ds.calcLabel}>Est. P&amp;L (USD)</span>
                <span style={{
                  ...ds.calcValue,
                  color: calculatedPnL === null ? 'var(--text-secondary)' : calculatedPnL >= 0 ? 'var(--color-green)' : 'var(--color-red)'
                }}>
                  {calculatedPnL === null ? '—' : `$${calculatedPnL}`}
                </span>
              </div>
              <div style={ds.calcItem}>
                <span style={ds.calcLabel}>Target R:R</span>
                <span style={ds.calcValue}>{calculatedRR}</span>
              </div>
              <div style={ds.calcItem}>
                <span style={ds.calcLabel}>Trade Duration</span>
                <span style={ds.calcValue}>
                  {calculatedDuration === null ? '—' : `${calculatedDuration} mins`}
                </span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loadingSave} style={ds.submitBtn}>
            {loadingSave ? 'Saving entry...' : 'LOG TRADE'}
          </button>
        </form>
      )}

      {/* 2. MY TRADES LIST */}
      {activeSubTab === 'my-trades' && (
        <div style={ds.tradesSection}>
          
          {/* Filters Bar */}
          <div style={ds.filterCard}>
            <div style={ds.filterHeader}>
              <Filter size={16} />
              <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Filter Journal Logs</h4>
            </div>
            
            <div style={ds.filterGrid}>
              <div style={ds.inputGrp}>
                <label style={ds.filterLabel}>Asset Symbol</label>
                <input
                  type="text"
                  value={filterAsset}
                  onChange={e => setFilterAsset(e.target.value)}
                  placeholder="EUR/USD"
                  style={ds.filterInput}
                />
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.filterLabel}>Direction</label>
                <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)} style={ds.filterSelect}>
                  <option value="ALL">ALL DIRECTIONS</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.filterLabel}>Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={ds.filterSelect}>
                  <option value="ALL">ALL STATUSES</option>
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.filterLabel}>Emotional State</label>
                <select value={filterEmotion} onChange={e => setFilterEmotion(e.target.value)} style={ds.filterSelect}>
                  <option value="ALL">ALL EMOTIONS</option>
                  <option value="CALM">CALM</option>
                  <option value="CONFIDENT">CONFIDENT</option>
                  <option value="UNCERTAIN">UNCERTAIN</option>
                  <option value="FOMO">FOMO</option>
                  <option value="REVENGE">REVENGE</option>
                </select>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.filterLabel}>Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  style={ds.filterInput}
                />
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.filterLabel}>End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  style={ds.filterInput}
                />
              </div>
            </div>

            <div style={{ ...ds.inputGrp, marginTop: '10px' }}>
              <label style={ds.filterLabel}>Search Notes Text</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={ds.searchIconInline} />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search keywords in setup notes..."
                  style={{ ...ds.filterInput, paddingLeft: '32px' }}
                />
              </div>
            </div>
          </div>

          {/* Trade List display */}
          {loadingTrades ? (
            <div style={ds.loadingContainer}>
              <RefreshCw size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Syncing journal records...</p>
            </div>
          ) : filteredTrades.length === 0 ? (
            <div style={ds.noDataBox}>
              <AlertTriangle size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <h3>No journal entries found matching filters.</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                Try relaxing filters or record a new trade.
              </p>
            </div>
          ) : (
            <div style={ds.tradesListContainer}>
              {filteredTrades.map(trade => {
                const isExpanded = expandedTradeId === trade.id;
                const dateFormatted = new Date(trade.entry_time).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                
                return (
                  <div key={trade.id} style={ds.tradeRowCard}>
                    
                    {/* Primary Row Summary */}
                    <div style={ds.rowSummary} onClick={() => handleToggleExpand(trade)}>
                      <div style={ds.rowBadgeCell}>
                        <span style={{
                          ...ds.directionBadge,
                          backgroundColor: trade.direction === 'BUY' ? 'var(--color-green-glow)' : 'var(--color-red-glow)',
                          color: trade.direction === 'BUY' ? 'var(--color-green)' : 'var(--color-red)',
                          borderColor: trade.direction === 'BUY' ? 'var(--color-green)' : 'var(--color-red)'
                        }}>
                          {trade.direction}
                        </span>
                        <div>
                          <strong style={{ fontSize: '15px' }}>{trade.asset}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                            {trade.timeframe} • {dateFormatted}
                          </span>
                        </div>
                      </div>

                      <div style={ds.rowStats}>
                        <div style={ds.rowStatCell}>
                          <span style={ds.miniLabel}>Entry Price</span>
                          <span style={ds.miniVal}>${parseFloat(trade.entry_price).toFixed(2)}</span>
                        </div>
                        <div style={ds.rowStatCell}>
                          <span style={ds.miniLabel}>Exit Price</span>
                          <span style={ds.miniVal}>
                            {trade.status === 'CLOSED' ? `$${parseFloat(trade.exit_price).toFixed(2)}` : 'OPEN'}
                          </span>
                        </div>
                      </div>

                      <div style={ds.rowResults}>
                        <div style={ds.rowStatCell}>
                          <span style={ds.miniLabel}>Pips</span>
                          <span style={{
                            ...ds.miniVal,
                            color: trade.pips === null ? 'var(--text-secondary)' : trade.pips >= 0 ? 'var(--color-green)' : 'var(--color-red)',
                            fontWeight: '700'
                          }}>
                            {trade.pips === null ? '—' : `${trade.pips > 0 ? '+' : ''}${trade.pips}`}
                          </span>
                        </div>
                        <div style={ds.rowStatCell}>
                          <span style={ds.miniLabel}>P&amp;L USD</span>
                          <span style={{
                            ...ds.miniVal,
                            color: trade.pnl_usd === null ? 'var(--text-secondary)' : trade.pnl_usd >= 0 ? 'var(--color-green)' : 'var(--color-red)',
                            fontWeight: '700'
                          }}>
                            {trade.pnl_usd === null ? '—' : `$${trade.pnl_usd}`}
                          </span>
                        </div>
                      </div>

                      <div style={ds.rowMetaBadges}>
                        <span style={{
                          ...ds.emotionBadge,
                          borderColor: trade.emotional_state === 'CALM' || trade.emotional_state === 'CONFIDENT' ? 'var(--color-blue)' : 'var(--color-amber)',
                          color: trade.emotional_state === 'CALM' || trade.emotional_state === 'CONFIDENT' ? 'var(--color-blue)' : 'var(--color-amber)'
                        }}>
                          {trade.emotional_state}
                        </span>

                        <span style={{
                          ...ds.statusBadge,
                          backgroundColor: trade.status === 'OPEN' ? 'var(--color-blue-glow)' : 'transparent',
                          color: trade.status === 'OPEN' ? 'var(--color-blue)' : 'var(--text-secondary)',
                          borderColor: trade.status === 'OPEN' ? 'var(--color-blue)' : 'var(--border-color)'
                        }}>
                          {trade.status}
                        </span>
                      </div>

                      <div style={ds.rowExpandIcon}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Expanded Content Drawer */}
                    {isExpanded && (
                      <div style={ds.expandedContent} className="animate-fade-in">
                        <div style={ds.expandedGrid}>
                          <div style={ds.expandedDetailCol}>
                            <h4 style={ds.subSectionHeading}>Trade Parameters</h4>
                            <div style={ds.detailGrid}>
                              <div style={ds.detailCell}>
                                <span>Lot Size:</span> <strong>{trade.lot_size} lots</strong>
                              </div>
                              <div style={ds.detailCell}>
                                <span>Stop Loss:</span> <strong>{trade.stop_loss ? `$${trade.stop_loss}` : 'None'}</strong>
                              </div>
                              <div style={ds.detailCell}>
                                <span>Take Profit:</span> <strong>{trade.take_profit ? `$${trade.take_profit}` : 'None'}</strong>
                              </div>
                              <div style={ds.detailCell}>
                                <span>Exit Time:</span> <strong>{trade.exit_time ? new Date(trade.exit_time).toLocaleString() : 'N/A'}</strong>
                              </div>
                              <div style={ds.detailCell}>
                                <span>Duration:</span> <strong>{trade.duration_minutes ? `${trade.duration_minutes} minutes` : 'N/A'}</strong>
                              </div>
                              <div style={ds.detailCell}>
                                <span>Checklist Score:</span> <strong>{trade.checklist_score !== null ? `${trade.checklist_score}/100` : 'None'}</strong>
                              </div>
                              <div style={ds.detailCell}>
                                <span>Checklist Verdict:</span> 
                                <strong style={{
                                  color: trade.checklist_verdict === 'GO' ? 'var(--color-green)' : trade.checklist_verdict === 'NO-GO' ? 'var(--color-red)' : 'var(--color-amber)',
                                  marginLeft: '4px'
                                }}>
                                  {trade.checklist_verdict || 'None'}
                                </strong>
                              </div>
                            </div>

                            <div style={{ marginTop: '12px' }}>
                              <span>Setup Notes:</span>
                              <p style={ds.notesParagraph}>
                                {trade.setup_notes || "No notes recorded for this trade setup."}
                              </p>
                            </div>

                            {/* Control buttons */}
                            <div style={ds.expandedControls}>
                              {trade.status === 'OPEN' && (
                                <button onClick={() => handleOpenCloseModal(trade)} style={ds.closeOpenBtn}>
                                  <CheckCircle size={13} /> Close Trade
                                </button>
                              )}
                              <button onClick={() => handleDeleteTrade(trade.id)} style={ds.deleteRowBtn}>
                                <Trash2 size={13} /> Delete Entry
                              </button>
                            </div>
                          </div>

                          {/* Screenshot display */}
                          {trade.screenshot_url && (
                            <div style={ds.expandedScreenshotCol}>
                              <span style={ds.label}>Chart Screenshot</span>
                              {signedUrls[trade.id] ? (
                                <a href={signedUrls[trade.id]} target="_blank" rel="noopener noreferrer" style={ds.screenshotLink}>
                                  <img
                                    src={signedUrls[trade.id]}
                                    alt={`Screenshot ${trade.asset}`}
                                    style={ds.screenshotImg}
                                  />
                                  <div style={ds.screenshotOverlay}>
                                    <Eye size={16} /> <span>Open Fullscreen</span>
                                  </div>
                                </a>
                              ) : (
                                <div style={ds.screenshotPlaceholder}>
                                  <RefreshCw size={18} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                                  <span style={{ fontSize: '11px', marginTop: '6px' }}>Decrypting signed image url...</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* 3. PERFORMANCE DASHBOARD */}
      {activeSubTab === 'performance' && (
        <div style={ds.perfSection} className="animate-scale-in">
          
          {totalClosedTrades === 0 ? (
            <div style={ds.noDataBox}>
              <AlertTriangle size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <h3>No performance statistics available.</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                You must have at least one CLOSED trade logged to generate statistics.
              </p>
            </div>
          ) : (
            <>
              {/* Aggregated Numbers Grid */}
              <div style={ds.statsGrid}>
                <div style={ds.statCell}>
                  <span style={ds.label}>Total Closed Trades</span>
                  <span style={ds.statVal}>{totalClosedTrades}</span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Win Rate</span>
                  <span style={{ ...ds.statVal, color: winRate >= 50 ? 'var(--color-green)' : 'var(--color-red)' }}>{winRate}%</span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Cumulative P&amp;L</span>
                  <span style={{ ...ds.statVal, color: totalPnL >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    ${totalPnL.toFixed(2)}
                  </span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Total Pips</span>
                  <span style={{ ...ds.statVal, color: totalPipsVal >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {totalPipsVal >= 0 ? '+' : ''}{totalPipsVal.toFixed(1)}
                  </span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Profit Factor</span>
                  <span style={{ ...ds.statVal, color: profitFactor === '∞' || parseFloat(profitFactor) >= 1.5 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {profitFactor}
                  </span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Average Target R:R</span>
                  <span style={ds.statVal}>{avgTargetRR === '0.00' ? 'N/A' : `1:${avgTargetRR}`}</span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Current Win Streak</span>
                  <span style={{ ...ds.statVal, color: 'var(--color-green)' }}>{currentWinStreak}</span>
                </div>
                <div style={ds.statCell}>
                  <span style={ds.label}>Current Loss Streak</span>
                  <span style={{ ...ds.statVal, color: 'var(--color-red)' }}>{currentLossStreak}</span>
                </div>
              </div>

              {/* Best & Worst Trades Highlight Box */}
              <div style={ds.highlightRow}>
                {bestTrade && (
                  <div style={{ ...ds.highlightCard, borderLeftColor: 'var(--color-green)' }}>
                    <div style={ds.highlightTitle}>
                      <Award size={15} color="var(--color-green)" />
                      <span>BEST TRADE</span>
                    </div>
                    <div style={ds.highlightBody}>
                      <strong style={{ fontSize: '16px' }}>{bestTrade.asset} ({bestTrade.direction})</strong>
                      <div style={{ color: 'var(--color-green)', fontWeight: '700', fontSize: '18px', marginTop: '6px' }}>
                        +${bestTrade.pnl_usd} <span style={{ fontSize: '12px', fontWeight: '500' }}>({bestTrade.pips} pips)</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                        Closed: {new Date(bestTrade.exit_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
                
                {worstTrade && (
                  <div style={{ ...ds.highlightCard, borderLeftColor: 'var(--color-red)' }}>
                    <div style={ds.highlightTitle}>
                      <ShieldAlert size={15} color="var(--color-red)" />
                      <span>WORST TRADE</span>
                    </div>
                    <div style={ds.highlightBody}>
                      <strong style={{ fontSize: '16px' }}>{worstTrade.asset} ({worstTrade.direction})</strong>
                      <div style={{ color: 'var(--color-red)', fontWeight: '700', fontSize: '18px', marginTop: '6px' }}>
                        -${Math.abs(worstTrade.pnl_usd)} <span style={{ fontSize: '12px', fontWeight: '500' }}>({worstTrade.pips} pips)</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                        Closed: {new Date(worstTrade.exit_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Charts Section */}
              <div style={ds.chartsGrid}>
                
                {/* 1. Equity Curve Chart */}
                <div style={ds.chartCard}>
                  <h4 style={ds.chartTitle}>Cumulative P&amp;L Equity Curve ($ USD)</h4>
                  <ResponsiveContainer key={theme} width="100%" height={260}>
                    <LineChart data={equityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        formatter={(val) => [`$${val}`, 'Cumulative P&L']}
                      />
                      <Line
                        type="monotone"
                        dataKey="pnl"
                        stroke="var(--color-green)"
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        dot={{ r: 4, strokeWidth: 1 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 2. Monthly P&L Chart */}
                <div style={ds.chartCard}>
                  <h4 style={ds.chartTitle}>Monthly Net Profit &amp; Loss ($ USD)</h4>
                  <ResponsiveContainer key={theme} width="100%" height={260}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        formatter={(val) => [`$${val}`, 'Monthly P&L']}
                      />
                      <Bar
                        dataKey="pnl"
                        fill="var(--color-green)"
                        shape={(props) => {
                          const { x, y, width, height, value } = props;
                          const color = value >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                          return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} />;
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 3. Asset Breakdown Chart */}
                <div style={ds.chartCard}>
                  <h4 style={ds.chartTitle}>P&amp;L and Win Rate by Asset Symbol</h4>
                  <ResponsiveContainer key={theme} width="100%" height={260}>
                    <BarChart data={assetChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--color-green)" fontSize={11} label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', fill: 'var(--color-green)', style: {fontSize: 10} }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--color-blue)" fontSize={11} label={{ value: 'Win Rate (%)', angle: 90, position: 'insideRight', fill: 'var(--color-blue)', style: {fontSize: 10} }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                      <Legend fontSize={11} />
                      <Bar yAxisId="left" dataKey="pnl" name="Total P&amp;L ($)" fill="var(--color-green)" rx={4} />
                      <Bar yAxisId="right" dataKey="winRate" name="Win Rate (%)" fill="var(--color-blue)" rx={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 4. Emotional State Analysis */}
                <div style={ds.chartCard}>
                  <h4 style={ds.chartTitle}>Emotional Performance Analysis</h4>
                  <ResponsiveContainer key={theme} width="100%" height={260}>
                    <BarChart data={emotionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--color-green)" fontSize={11} label={{ value: 'Avg P&L ($)', angle: -90, position: 'insideLeft', fill: 'var(--color-green)', style: {fontSize: 10} }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--color-blue)" fontSize={11} label={{ value: 'Win Rate (%)', angle: 90, position: 'insideRight', fill: 'var(--color-blue)', style: {fontSize: 10} }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                      <Legend fontSize={11} />
                      <Bar yAxisId="left" dataKey="avgPnL" name="Avg P&amp;L ($)" fill="var(--color-green)" rx={4} />
                      <Bar yAxisId="right" dataKey="winRate" name="Win Rate (%)" fill="var(--color-blue)" rx={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 5. Timeframe Win Rate Chart */}
                <div style={ds.chartCard}>
                  <h4 style={ds.chartTitle}>Win Rate by Trade Timeframe (%)</h4>
                  <ResponsiveContainer key={theme} width="100%" height={260}>
                    <BarChart data={tfChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} max={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        formatter={(val) => [`${val}%`, 'Win Rate']}
                      />
                      <Bar dataKey="winRate" fill="var(--color-blue)" rx={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </>
          )}

        </div>
      )}

      {/* --- CLOSE TRADE MODAL OVERLAY --- */}
      {closingTrade && (
        <div style={ds.modalOverlay}>
          <div style={ds.modalCard} className="animate-scale-in">
            <div style={ds.modalHeader}>
              <h3 style={ds.modalTitle}>Close Active Position</h3>
              <button onClick={() => setClosingTrade(null)} style={ds.closeBtn}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCloseTradeSubmit} style={ds.modalBody}>
              <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Asset: </span>
                <strong>{closingTrade.asset}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '16px' }}>Lot Size: </span>
                <strong>{closingTrade.lot_size} lots</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '16px' }}>Entry Price: </span>
                <strong>${parseFloat(closingTrade.entry_price).toFixed(4)}</strong>
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Exit Price</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={closeExitPrice}
                  onChange={e => setCloseExitPrice(e.target.value)}
                  placeholder="1.0850"
                  style={ds.input}
                />
              </div>

              <div style={ds.inputGrp}>
                <label style={ds.label}>Exit Time</label>
                <input
                  type="datetime-local"
                  required
                  value={closeExitTime}
                  onChange={e => setCloseExitTime(e.target.value)}
                  style={ds.input}
                />
              </div>

              <button type="submit" disabled={loadingClose} style={ds.submitBtn}>
                {loadingClose ? 'Updating record...' : 'CLOSE POSITION'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- 12. INLINE STYLES SHEET ---
const ds = {
  journalContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  userBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 16px',
  },
  userBarInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  activeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-green)',
    marginRight: '8px',
    boxShadow: '0 0 8px var(--color-green)',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--color-red)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'var(--transition-fast)',
    ':hover': {
      backgroundColor: 'var(--color-red-glow)'
    }
  },
  subTabsNav: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    gap: '8px',
  },
  subTabBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 18px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'var(--transition-fast)',
  },
  formCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '800',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '16px'
    }
  },
  formColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  inputGrp: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    height: '90px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    resize: 'none',
  },
  fileInput: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  select: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  toggleGroup: {
    display: 'flex',
    gap: '10px',
  },
  toggleBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    transition: 'var(--transition-fast)',
  },
  autocompleteBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    marginTop: '4px',
    zIndex: 10,
    maxHeight: '180px',
    overflowY: 'auto',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
  },
  autocompleteItem: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-primary)',
    ':hover': {
      backgroundColor: 'var(--bg-secondary)'
    }
  },
  calculationsBox: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '16px',
  },
  calculationsTitle: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  calculationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  calcItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  calcLabel: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
  },
  calcValue: {
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: 'var(--font-sans)',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: 'var(--color-green)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    ':hover': {
      opacity: 0.9
    }
  },
  checklistBadgeAlert: {
    backgroundColor: 'var(--color-green-glow)',
    border: '1px solid var(--color-green)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--color-green)',
  },
  alertError: {
    backgroundColor: 'var(--color-red-glow)',
    border: '1px solid var(--color-red)',
    color: 'var(--color-red)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertSuccess: {
    backgroundColor: 'var(--color-green-glow)',
    border: '1px solid var(--color-green)',
    color: 'var(--color-green)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  // MY TRADES STYLING
  tradesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  filterCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
    color: 'var(--text-primary)',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  filterLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  filterInput: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
  },
  filterSelect: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  },
  searchIconInline: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  loadingContainer: {
    padding: '40px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataBox: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradesListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  tradeRowCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  rowSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    cursor: 'pointer',
    flexWrap: 'wrap',
    gap: '14px',
    transition: 'var(--transition-fast)',
    ':hover': {
      backgroundColor: 'var(--bg-tertiary)'
    }
  },
  rowBadgeCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1 1 200px',
  },
  directionBadge: {
    fontSize: '10px',
    fontWeight: '800',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid',
  },
  rowStats: {
    display: 'flex',
    gap: '20px',
    flex: '1 1 150px',
  },
  rowResults: {
    display: 'flex',
    gap: '20px',
    flex: '1 1 150px',
  },
  rowMetaBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  rowStatCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  miniLabel: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  miniVal: {
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'var(--font-sans)',
  },
  emotionBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid',
  },
  rowExpandIcon: {
    color: 'var(--text-secondary)',
  },
  expandedContent: {
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    padding: '18px 24px',
  },
  expandedGrid: {
    display: 'grid',
    gridTemplateColumns: '3fr 2fr',
    gap: '24px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },
  expandedDetailCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  subSectionHeading: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '4px',
    marginBottom: '4px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 18px',
  },
  detailCell: {
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.02)',
    paddingBottom: '3px',
    color: 'var(--text-secondary)',
    '& strong': {
      color: 'var(--text-primary)'
    }
  },
  notesParagraph: {
    fontSize: '12px',
    lineHeight: '1.5',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '10px',
    marginTop: '4px',
  },
  expandedControls: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  closeOpenBtn: {
    backgroundColor: 'var(--color-blue-glow)',
    border: '1px solid var(--color-blue)',
    color: 'var(--color-blue)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  deleteRowBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--color-red)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  expandedScreenshotCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  screenshotPlaceholder: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    height: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  screenshotLink: {
    position: 'relative',
    display: 'block',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  screenshotImg: {
    width: '100%',
    maxHeight: '180px',
    objectFit: 'cover',
    display: 'block',
  },
  screenshotOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: 0,
    color: 'var(--text-primary)',
    fontWeight: '700',
    fontSize: '12px',
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 1
    }
  },

  // PERFORMANCE DASHBOARD STYLING
  perfSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '14px',
  },
  statCell: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statVal: {
    fontSize: '22px',
    fontWeight: '800',
    fontFamily: 'var(--font-sans)',
  },
  highlightRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  highlightCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderLeftWidth: '5px',
    borderRadius: '8px',
    padding: '16px',
  },
  highlightTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
  },
  highlightBody: {
    marginTop: '8px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr'
    }
  },
  chartCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '18px',
  },
  chartTitle: {
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '14px',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },

  // MODAL OVERLAY STYLING
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
  modalCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '15px',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // AUTH STYLING
  authOverlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    width: '100%',
  },
  authCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  authHeader: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  authLogoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  authSubtitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  authBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  authAlertError: {
    backgroundColor: 'var(--color-red-glow)',
    border: '1px solid var(--color-red)',
    color: 'var(--color-red)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  authAlertSuccess: {
    backgroundColor: 'var(--color-green-glow)',
    border: '1px solid var(--color-green)',
    color: 'var(--color-green)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  authBtn: {
    backgroundColor: 'var(--color-green)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'var(--transition-fast)',
    ':hover': {
      opacity: 0.9
    }
  },
  authFooter: {
    padding: '14px 24px',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    justifyContent: 'space-between',
  },
  switchBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-blue)',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    ':hover': {
      textDecoration: 'underline'
    }
  }
};

export default JournalTab;
