import { useState, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWriteContract, useReadContract } from 'wagmi';
// @ts-ignore
import { base } from 'viem/chains';
import { GameCanvas } from './game/GameCanvas';
import { CONTRACTS, isContractDeployed, BASE_BRICK_BREAKER_ABI } from './contracts';
import { playClick } from './game/audio';

// ── Types ──
type Screen = 'HOME' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'LEADERBOARD';

// ── Wallet icon SVGs ──
const WALLET_ICONS: Record<string, string> = {
  metamask: '🦊',
  rabby: '🐰',
  coinbase: '🔵',
  walletconnect: '🔗',
  injected: '💎',
};

function getWalletEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('metamask')) return WALLET_ICONS.metamask;
  if (lower.includes('rabby')) return WALLET_ICONS.rabby;
  if (lower.includes('coinbase') || lower.includes('base')) return WALLET_ICONS.coinbase;
  if (lower.includes('walletconnect')) return WALLET_ICONS.walletconnect;
  return WALLET_ICONS.injected;
}

function getWalletDisplayName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('coinbase')) return 'Base Wallet';
  return name;
}

function App() {
  // ── Wallet ──
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  // ── Read leaderboard ──
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useReadContract({
    address: CONTRACTS.GAME_CONTRACT,
    abi: BASE_BRICK_BREAKER_ABI,
    functionName: 'getLeaderboard',
    args: [BigInt(10)],
    query: { enabled: isContractDeployed(CONTRACTS.GAME_CONTRACT) },
  }) as any;

  // ── Read player best score ──
  const { data: playerScore, isLoading: isLoadingPlayerScore } = useReadContract({
    address: CONTRACTS.GAME_CONTRACT,
    abi: BASE_BRICK_BREAKER_ABI,
    functionName: 'getBestScore',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: isConnected && isContractDeployed(CONTRACTS.GAME_CONTRACT) },
  }) as any;

  // ── Read check-in status ──
  useReadContract({
    address: CONTRACTS.GAME_CONTRACT,
    abi: BASE_BRICK_BREAKER_ABI,
    functionName: 'lastCheckIn',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: isConnected && isContractDeployed(CONTRACTS.GAME_CONTRACT) },
  });

  // ── Read badge status ──
  const { data: hasBadge, isLoading: isLoadingBadge } = useReadContract({
    address: CONTRACTS.GAME_CONTRACT,
    abi: BASE_BRICK_BREAKER_ABI,
    functionName: 'hasBadge',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: isConnected && isContractDeployed(CONTRACTS.GAME_CONTRACT) },
  }) as any;

  // ── Game state ──
  const [screen, setScreen] = useState<Screen>('HOME');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [activeEffects, setActiveEffects] = useState<{ type: string; remaining: number }[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [txStatus, setTxStatus] = useState<string>('');

  // ── Callbacks from GameCanvas ──
  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleLivesChange = useCallback((l: number) => setLives(l), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);
  const handleEffectsChange = useCallback((e: { type: string; remaining: number }[]) => setActiveEffects(e), []);

  const handleGameOver = useCallback((s: number, l: number) => {
    setFinalScore(s);
    setFinalLevel(l);
    setScreen('GAME_OVER');
  }, []);

  const handleVictory = useCallback((s: number) => {
    setFinalScore(s);
    setFinalLevel(10);
    setScreen('VICTORY');
  }, []);

  // ── Wallet helpers ──
  const isOnBase = chain?.id === base.id;

  const connectWallet = () => {
    playClick();
    setShowWalletModal(true);
  };

  const handleConnectWallet = (connector: any) => {
    playClick();
    connect({ connector });
    setShowWalletModal(false);
  };

  const ensureBase = async () => {
    if (!isOnBase) {
      switchChain?.({ chainId: base.id });
      return false;
    }
    return true;
  };

  // ── Contract interactions ──
  const submitScore = async () => {
    if (!isConnected) return connectWallet();
    if (!(await ensureBase())) return;
    if (!isContractDeployed(CONTRACTS.GAME_CONTRACT)) {
      setTxStatus('⚠️ Contract not deployed yet');
      return;
    }
    try {
      setTxStatus('Submitting score...');
      await writeContractAsync({
        address: CONTRACTS.GAME_CONTRACT,
        abi: BASE_BRICK_BREAKER_ABI,
        functionName: 'submitScore',
        args: [BigInt(finalScore), BigInt(finalLevel)],
      });
      setTxStatus('✅ Score submitted on Base!');
    } catch (err: any) {
      setTxStatus(`❌ ${err?.shortMessage || 'Transaction failed'}`);
    }
  };

  const dailyCheckIn = async () => {
    if (!isConnected) return connectWallet();
    if (!(await ensureBase())) return;
    if (!isContractDeployed(CONTRACTS.GAME_CONTRACT)) {
      setTxStatus('⚠️ Contract not deployed yet');
      return;
    }
    try {
      setTxStatus('Checking in...');
      await writeContractAsync({
        address: CONTRACTS.GAME_CONTRACT,
        abi: BASE_BRICK_BREAKER_ABI,
        functionName: 'checkIn',
      });
      setTxStatus('✅ Daily check-in done!');
    } catch (err: any) {
      setTxStatus(`❌ ${err?.shortMessage || 'Transaction failed'}`);
    }
  };

  const mintBadge = async () => {
    if (!isConnected) return connectWallet();
    if (!(await ensureBase())) return;
    if (!isContractDeployed(CONTRACTS.GAME_CONTRACT)) {
      setTxStatus('⚠️ Contract not deployed yet');
      return;
    }
    try {
      setTxStatus('Minting badge...');
      await writeContractAsync({
        address: CONTRACTS.GAME_CONTRACT,
        abi: BASE_BRICK_BREAKER_ABI,
        functionName: 'mintBadge',
      });
      setTxStatus('✅ Badge minted!');
    } catch (err: any) {
      setTxStatus(`❌ ${err?.shortMessage || 'Transaction failed'}`);
    }
  };

  // ── Effect labels ──
  const effectLabels: Record<string, string> = {
    BIG_PADDLE: '↔ Big Paddle',
    MULTI_BALL: '⚪ Multi Ball',
    SLOW_BALL: '🐢 Slow',
    LASER_PADDLE: '⚡ Laser',
    FIRE_BALL: '🔥 Fire Ball',
    SHIELD: '🛡 Shield',
  };

  // ══════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════

  // ── HOME SCREEN ──
  if (screen === 'HOME') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(0,82,255,0.4) 0%, transparent 70%)' }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        </div>

        {/* Title */}
        <div className="relative z-10 text-center mb-12">
          <div className="text-7xl font-black mb-2 tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 30%, #0052FF 60%, #93C5FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0,82,255,0.4))',
            }}>
            BASE BRICK
          </div>
          <div className="text-7xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #93C5FD 0%, #FFFFFF 50%, #60A5FA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(147,197,253,0.3))',
            }}>
            BREAKER
          </div>
          <p className="text-slate-400 mt-4 text-lg">Smash bricks. Earn on-chain. Built on Base.</p>
        </div>

        {/* Buttons */}
        <div className="relative z-10 flex flex-col gap-4 w-72">
          {/* PLAY — gated behind wallet */}
          {isConnected ? (
            <button
              onClick={() => { playClick(); setScreen('PLAYING'); setScore(0); setLives(3); setLevel(1); }}
              className="py-4 rounded-xl text-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #0052FF)',
                boxShadow: '0 0 30px rgba(0,82,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}>
              ▶ PLAY
            </button>
          ) : (
            <button
              onClick={() => { playClick(); setShowWalletModal(true); }}
              className="py-4 rounded-xl text-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #0052FF)',
                boxShadow: '0 0 30px rgba(0,82,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}>
              🔗 Connect Wallet to Play
            </button>
          )}

          {/* Connected wallet info */}
          {isConnected && (
            <div className="text-center">
              <div className="py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-300 mb-2 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {address?.slice(0, 6)}...{address?.slice(-4)}
                {!isOnBase && <span className="text-red-400 ml-2">(Wrong Network)</span>}
                <button onClick={() => { playClick(); disconnect(); }}
                  className="ml-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                  title="Disconnect">
                  ✕
                </button>
              </div>
              {!isOnBase && (
                <button onClick={() => { playClick(); switchChain?.({ chainId: base.id }); }}
                  className="w-full py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all">
                  Switch to Base
                </button>
              )}
            </div>
          )}

          {/* Player stats (if connected) */}
          {isConnected && isOnBase && (
            <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3">
              {isLoadingPlayerScore ? (
                <div className="text-xs text-slate-500">Loading stats...</div>
              ) : playerScore && Number(playerScore[0]) > 0 ? (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Best Score:</span>
                    <span className="font-bold text-blue-400">{Number(playerScore[0])}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Level Reached:</span>
                    <span className="font-bold text-white">{Number(playerScore[1])}/10</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">No scores yet. Play and submit!</div>
              )}
              
              {isLoadingBadge ? (
                <div className="text-xs text-slate-500">Loading badge...</div>
              ) : hasBadge ? (
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <span>🏅</span>
                  <span>Badge Minted</span>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { playClick(); dailyCheckIn(); }}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-800/60 border border-slate-700 hover:border-green-500/40 hover:bg-green-500/10 transition-all text-slate-300">
              ✅ Daily Check-in
            </button>
            <button onClick={() => { playClick(); mintBadge(); }}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-800/60 border border-slate-700 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all text-slate-300">
              🏅 Mint Badge
            </button>
          </div>

          <button onClick={() => { playClick(); setScreen('LEADERBOARD'); }}
            className="py-3 rounded-xl text-sm font-semibold bg-slate-800/60 border border-slate-700 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all text-slate-300">
            🏅 Leaderboard
          </button>

          {txStatus && (
            <p className="text-center text-sm text-slate-400 mt-2">{txStatus}</p>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-slate-600 text-xs">
          Move paddle: Arrow keys / Mouse / Touch · Launch: Space / Click
        </div>

        {/* ═══ WALLET CONNECT MODAL ═══ */}
        {showWalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => { playClick(); setShowWalletModal(false); }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            
            {/* Modal */}
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 100%)',
                border: '1px solid rgba(59,130,246,0.3)',
                boxShadow: '0 0 60px rgba(0,82,255,0.2), 0 25px 50px rgba(0,0,0,0.5)',
              }}>
              {/* Header glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)' }} />
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white">Connect Wallet</h2>
                  <p className="text-xs text-slate-500 mt-1">Choose your wallet to start playing</p>
                </div>
                <button onClick={() => { playClick(); setShowWalletModal(false); }}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm">
                  ✕
                </button>
              </div>

              {/* Wallet list */}
              <div className="px-6 pb-6 space-y-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => handleConnectWallet(connector)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 group"
                    style={{
                      background: 'rgba(30,41,59,0.5)',
                      borderColor: 'rgba(51,65,85,0.5)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37,99,235,0.15)';
                      e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0,82,255,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(30,41,59,0.5)';
                      e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                    <span className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg"
                      style={{ background: 'rgba(15,23,42,0.8)' }}>
                      {getWalletEmoji(connector.name)}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                        {getWalletDisplayName(connector.name)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {connector.name.toLowerCase().includes('walletconnect') ? 'Scan QR code' : 'Browser extension'}
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-blue-400 transition-colors text-lg">→</span>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5">
                <div className="h-px w-full bg-slate-800 mb-3" />
                <p className="text-[10px] text-slate-600 text-center">
                  By connecting, you agree to the Terms of Service
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── GAME SCREEN ──
  if (screen === 'PLAYING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center p-2 md:p-0">
        {/* HUD */}
        <div className="w-full max-w-[820px] px-2 md:px-4 py-2 md:py-3 flex items-center justify-between flex-wrap gap-2 md:gap-0">
          {/* Score / Level / Lives */}
          <div className="flex gap-3 md:gap-6 items-center">
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider hidden md:inline">Score</span>
              <div className="text-xl md:text-2xl font-black text-blue-400">{score}</div>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider hidden md:inline">Level</span>
              <div className="text-xl md:text-2xl font-black text-white">{level}/10</div>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider hidden md:inline">Lives</span>
              <div className="text-lg md:text-2xl font-black text-red-400">
                {'❤️'.repeat(Math.max(0, lives))}
              </div>
            </div>
          </div>

          {/* Pause / Back */}
          <div className="flex gap-1 md:gap-2">
            <button onClick={() => setPaused(!paused)}
              className="px-2 md:px-4 py-1 md:py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs md:text-sm font-semibold hover:bg-slate-700 transition-all">
              {paused ? '▶' : '⏸'}
            </button>
            <button onClick={() => setScreen('HOME')}
              className="px-2 md:px-4 py-1 md:py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs md:text-sm font-semibold hover:bg-slate-700 transition-all text-slate-400">
              ✕
            </button>
          </div>
        </div>

        {/* Active effects bar */}
        {activeEffects.length > 0 && (
          <div className="flex gap-2 mb-2">
            {activeEffects.map((e, i) => (
              <div key={i} className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 border border-blue-500/30 text-blue-300">
                {effectLabels[e.type] || e.type} {e.remaining}s
              </div>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div className="relative">
          <GameCanvas
            level={level}
            onScoreChange={handleScoreChange}
            onLivesChange={handleLivesChange}
            onLevelChange={handleLevelChange}
            onEffectsChange={handleEffectsChange}
            onGameOver={handleGameOver}
            onVictory={handleVictory}
            paused={paused}
          />

          {/* Pause overlay */}
          {paused && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-black text-blue-400 mb-4" style={{ textShadow: '0 0 20px rgba(0,82,255,0.6)' }}>
                  PAUSED
                </div>
                <button onClick={() => setPaused(false)}
                  className="px-8 py-3 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 transition-all"
                  style={{ boxShadow: '0 0 20px rgba(0,82,255,0.5)' }}>
                  ▶ Resume
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LEADERBOARD SCREEN ──
  if (screen === 'LEADERBOARD') {
    const leaderboardData = Array.isArray(leaderboard) ? leaderboard : [];
    
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center py-6 md:py-8 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(0,82,255,0.4) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8 md:mb-12">
            <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.3))',
              }}>
              🏆 LEADERBOARD
            </div>
            <p className="text-slate-400 text-sm md:text-base">Top 10 Players on Base</p>
          </div>

          {/* Leaderboard table */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden mb-6">
            {isLoadingLeaderboard ? (
              <div className="p-6 md:p-8 text-center text-slate-400">Loading...</div>
            ) : leaderboardData.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-slate-400">No scores yet. Be the first! 🚀</div>
            ) : (
              <div className="divide-y divide-slate-700">
                {leaderboardData.map((entry: any, index: number) => (
                  <div key={index} className="px-3 md:px-6 py-3 md:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                    style={{
                      background: index === 0 ? 'rgba(251,191,36,0.1)' : index === 1 ? 'rgba(192,192,192,0.1)' : index === 2 ? 'rgba(205,127,50,0.1)' : undefined,
                    }}>
                    <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                      <div className="text-xl md:text-2xl font-black w-6 md:w-8 text-center flex-shrink-0">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs md:text-sm text-slate-400 truncate">
                          {`${entry.player.slice(0, 6)}...${entry.player.slice(-4)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg md:text-xl font-black text-blue-400">{Number(entry.score)}</div>
                      <div className="text-xs text-slate-500">L{Number(entry.levelReached)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back button */}
          <button onClick={() => setScreen('HOME')}
            className="w-full py-2 md:py-3 rounded-xl font-semibold bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-slate-300 text-sm md:text-base">
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ── GAME OVER / VICTORY SCREEN ──
  const isVictory = screen === 'VICTORY';
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: isVictory
              ? 'radial-gradient(circle, rgba(250,204,21,0.5) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 text-center w-full max-w-xs md:max-w-md">
        {/* Title */}
        <div className="text-4xl md:text-6xl font-black mb-2"
          style={{
            background: isVictory
              ? 'linear-gradient(135deg, #FCD34D, #F59E0B, #FBBF24)'
              : 'linear-gradient(135deg, #FCA5A5, #EF4444, #DC2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 20px ${isVictory ? 'rgba(250,204,21,0.4)' : 'rgba(220,38,38,0.4)'})`,
          }}>
          {isVictory ? '🏆 VICTORY!' : 'GAME OVER'}
        </div>

        <p className="text-slate-400 text-base md:text-lg mb-6 md:mb-8">
          {isVictory ? 'You cleared all 10 levels!' : `Reached Level ${finalLevel}`}
        </p>

        {/* Score card */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl px-6 md:px-12 py-6 md:py-8 mb-6 md:mb-8"
          style={{ boxShadow: '0 0 40px rgba(0,10,40,0.5)' }}>
          <div className="text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-2">Final Score</div>
          <div className="text-5xl md:text-6xl font-black text-blue-400" style={{ textShadow: '0 0 20px rgba(0,82,255,0.4)' }}>
            {finalScore}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 md:gap-3 w-full mx-auto">
          <button onClick={submitScore}
            disabled={isTxPending}
            className="py-2 md:py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 text-sm md:text-base"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #0052FF)',
              boxShadow: '0 0 20px rgba(0,82,255,0.3)',
            }}>
            {isTxPending ? '⏳ Submitting...' : '📤 Submit Score to Base'}
          </button>

          <button onClick={() => { setScreen('PLAYING'); setScore(0); setLives(3); setLevel(1); setTxStatus(''); }}
            className="py-2 md:py-3 rounded-xl font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-sm md:text-base">
            🔄 Play Again
          </button>

          <button onClick={() => { setScreen('HOME'); setTxStatus(''); }}
            className="py-2 md:py-3 rounded-xl font-semibold text-slate-400 hover:text-white transition-all text-xs md:text-sm">
            ← Back to Menu
          </button>

          {txStatus && (
            <p className="text-center text-xs md:text-sm text-slate-400 mt-2">{txStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
