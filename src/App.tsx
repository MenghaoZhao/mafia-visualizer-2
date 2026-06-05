import React, { useState, useEffect } from "react";
import { DEFAULT_PLAYERS, PRESET_TRANSCRIPTS } from "./data";
import { Player, Opinion, GameLog } from "./types";
import NetworkGraph from "./components/NetworkGraph";
import VoiceInputPanel from "./components/VoiceInputPanel";
import PlayerManager from "./components/PlayerManager";
import { 
  History, 
  Trash2, 
  RotateCcw, 
  Users, 
  Layers, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  Check, 
  Info,
  Flame, 
  AlertTriangle 
} from "lucide-react";

export default function App() {
  // 1. Core Reactive States
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem("mafia_players");
    return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
  });

  const [opinions, setOpinions] = useState<Opinion[]>(() => {
    const saved = localStorage.getItem("mafia_opinions");
    // Seed initial demo relations if none are present
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "demo-1",
        speakerId: "1", // Alice
        targetId: "2",  // Bob
        attitude: "suspect",
        comment: "Seems defensive on early rounds",
        timestamp: Date.now() - 300000
      },
      {
        id: "demo-2",
        speakerId: "2", // Bob
        targetId: "4",  // Dave
        attitude: "trust",
        comment: "Vouched for claims of Doctor healing",
        timestamp: Date.now() - 200000
      }
    ];
  });

  const [gameLogs, setGameLogs] = useState<GameLog[]>(() => {
    const saved = localStorage.getItem("mafia_logs");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "init",
        message: "Game started. Ready for transcript processing or voice recording.",
        timestamp: Date.now(),
        type: "system"
      }
    ];
  });

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showAllOpinions, setShowAllOpinions] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Local Storage Syncing
  useEffect(() => {
    localStorage.setItem("mafia_players", JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem("mafia_opinions", JSON.stringify(opinions));
  }, [opinions]);

  useEffect(() => {
    localStorage.setItem("mafia_logs", JSON.stringify(gameLogs));
  }, [gameLogs]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 3. Status Action Helpers
  const handleUpdatePlayer = (updated: Player) => {
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
    
    // Add Game Log
    setGameLogs(prev => [
      {
        id: Math.random().toString(),
        message: `${updated.name} (Role: ${updated.role || "Unknown"}) status updated to ${updated.status.toUpperCase()}`,
        timestamp: Date.now(),
        type: "status_change"
      },
      ...prev
    ]);
  };

  const handleAddPlayer = (name: string) => {
    const exists = players.some(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (exists) {
      setToastMessage(`Player "${name}" already exists!`);
      return;
    }
    const newPlayer: Player = {
      id: (Math.max(...players.map(p => parseInt(p.id) || 0)) + 1).toString(),
      name,
      status: "alive",
      role: "Unknown"
    };
    setPlayers(prev => [...prev, newPlayer]);
    setGameLogs(prev => [
      {
        id: Math.random().toString(),
        message: `New player ${name} joined the circle.`,
        timestamp: Date.now(),
        type: "system"
      },
      ...prev
    ]);
  };

  const handleDeletePlayer = (id: string) => {
    const p = players.find(player => player.id === id);
    if (!p) return;
    
    // Safety limit of 3 players for clean circular rendering layout
    if (players.length <= 3) {
      setToastMessage("Cannot have less than 3 players in a session!");
      return;
    }

    setPlayers(prev => prev.filter(player => player.id !== id));
    // Clear opinions belonging to or referencing this deleted player
    setOpinions(prev => prev.filter(op => op.speakerId !== id && op.targetId !== id));
    
    if (selectedPlayerId === id) setSelectedPlayerId(null);

    setGameLogs(prev => [
      {
        id: Math.random().toString(),
        message: `Player ${p.name} removed from circle.`,
        timestamp: Date.now(),
        type: "system"
      },
      ...prev
    ]);
  };

  // Resolve matching string from speech mapping to raw Player structures
  const matchPlayer = (name: string): Player | undefined => {
    if (!name) return undefined;
    const clean = name.toLowerCase().trim().replace(/^(player\s*)/gi, "");
    
    // Try exact sequence first
    const exact = players.find(p => p.name.toLowerCase().trim() === clean);
    if (exact) return exact;

    // Try inclusion pattern
    return players.find(p => {
      const pClean = p.name.toLowerCase().trim();
      return pClean.includes(clean) || clean.includes(pClean);
    });
  };

  // Handle incoming relations extracted via Gemini models
  const handleAddTranscriptOpinions = (data: { rawTranscript: string; opinions: any[] }) => {
    if (!data.rawTranscript) return;

    // Post entire recorded transcript to logs
    const transcriptLog: GameLog = {
      id: Math.random().toString(),
      message: `Audio Transcript processed: "${data.rawTranscript}"`,
      timestamp: Date.now(),
      type: "system"
    };

    const newOpinionLogs: GameLog[] = [];
    const updatedOpinions = [...opinions];

    if (data.opinions && Array.isArray(data.opinions)) {
      data.opinions.forEach(item => {
        const speakerUser = matchPlayer(item.speaker);
        const targetUser = matchPlayer(item.target);

        if (speakerUser && targetUser && speakerUser.id !== targetUser.id) {
          // Remove any previous relationship between exact speaker -> target to avoid layered duplicates
          const idx = updatedOpinions.findIndex(
            op => op.speakerId === speakerUser.id && op.targetId === targetUser.id
          );
          if (idx !== -1) updatedOpinions.splice(idx, 1);

          // If attitude is neutral, it represents clearing/resolving mistrust
          if (item.attitude !== "neutral") {
            const newOp: Opinion = {
              id: Math.random().toString(),
              speakerId: speakerUser.id,
              targetId: targetUser.id,
              attitude: item.attitude,
              comment: item.comment || "",
              timestamp: Date.now()
            };
            updatedOpinions.push(newOp);

            newOpinionLogs.push({
              id: Math.random().toString(),
              message: `Relationship Added: ${speakerUser.name} now ${item.attitude === 'suspect' ? '🔴 SUSPECTS' : '🟢 TRUSTS'} ${targetUser.name} ("${item.comment}")`,
              timestamp: Date.now(),
              type: "opinion_add"
            });
          } else {
            newOpinionLogs.push({
              id: Math.random().toString(),
              message: `Relationship Cleared: ${speakerUser.name} cleared prior opinion on ${targetUser.name}`,
              timestamp: Date.now(),
              type: "opinion_clear"
            });
          }
        }
      });
    }

    setOpinions(updatedOpinions);
    setGameLogs(prev => [transcriptLog, ...newOpinionLogs, ...prev]);
    setToastMessage(`AI Processed successfully! Extracted ${data.opinions?.length || 0} relational vectors.`);
  };

  // Manual fallback relationship adder
  const handleAddManualOpinion = (
    speakerId: string,
    targetId: string,
    attitude: 'suspect' | 'trust' | 'neutral',
    comment: string
  ) => {
    const speaker = players.find(p => p.id === speakerId);
    const target = players.find(p => p.id === targetId);
    if (!speaker || !target) return;

    const updatedOpinions = [...opinions];
    // Evict old vector
    const idx = updatedOpinions.findIndex(o => o.speakerId === speakerId && o.targetId === targetId);
    if (idx !== -1) updatedOpinions.splice(idx, 1);

    if (attitude !== 'neutral') {
      const newOp: Opinion = {
        id: Math.random().toString(),
        speakerId,
        targetId,
        attitude,
        comment,
        timestamp: Date.now()
      };
      updatedOpinions.push(newOp);
      
      setGameLogs(prev => [
        {
          id: Math.random().toString(),
          message: `Manual Relation: ${speaker.name} ${attitude === 'suspect' ? '🔴 suspects' : '🟢 trusts'} ${target.name} ("${comment}")`,
          timestamp: Date.now(),
          type: "opinion_add"
        },
        ...prev
      ]);
    } else {
      setGameLogs(prev => [
        {
          id: Math.random().toString(),
          message: `Manual Relation: ${speaker.name} cleared opinion on ${target.name}`,
          timestamp: Date.now(),
          type: "opinion_clear"
        },
        ...prev
      ]);
    }

    setOpinions(updatedOpinions);
    setToastMessage("Opinion updated!");
  };

  const handleDeleteOpinion = (id: string) => {
    setOpinions(prev => prev.filter(op => op.id !== id));
  };

  // Reset entire state completely
  const handleResetEntireGame = () => {
    if (window.confirm("Are you sure you want to reset all players, roles, and opinions back to default?")) {
      setPlayers(DEFAULT_PLAYERS);
      setOpinions([]);
      setGameLogs([
        {
          id: "reset",
          message: "Session has been reset. Standard players initialized.",
          timestamp: Date.now(),
          type: "system"
        }
      ]);
      setSelectedPlayerId(null);
      setToastMessage("Game reset to defaults!");
    }
  };

  // Clear relationship vectors only while retaining custom player list and roles
  const handleClearOpinionsOnly = () => {
    if (window.confirm("Erase all relationship arrow links between players? Player standings will remain intact.")) {
      setOpinions([]);
      setGameLogs(prev => [
        {
          id: Math.random().toString(),
          message: "All relationship arrows have been cleared.",
          timestamp: Date.now(),
          type: "system"
        },
        ...prev
      ]);
      setToastMessage("All relationship links cleared!");
    }
  };

  const getLogBadgeColor = (type: string) => {
    switch (type) {
      case "opinion_add":
        return "bg-red-950/40 text-red-500 border-red-900/50";
      case "opinion_clear":
        return "bg-neutral-900 text-neutral-500 border-neutral-800";
      case "status_change":
        return "bg-amber-950/50 text-amber-500 border-amber-900/50";
      default:
        return "bg-neutral-800/40 text-neutral-400 border-neutral-800/80";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 flex flex-col font-sans select-none antialiased selection:bg-red-950/50 p-4 sm:p-6 md:p-8 gap-6">
      
      {/* Dynamic Toast Popup */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-4.5 py-2.5 rounded-full z-50 shadow-2xl flex items-center gap-2 font-mono font-bold uppercase tracking-wider">
          <Info className="w-4 h-4 text-red-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Navigation / Header bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-neutral-800 pb-4 gap-4 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-2.5">
            <Flame className="w-7 h-7 text-red-650 shrink-0 animate-pulse" />
            OMERTA <span className="text-red-600">ANALYTICS</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
            Social Deduction Logic Engine v4.2 • Realtime Suspicion Analyzer
          </p>
        </div>

        {/* Global Toolbar Utilities */}
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/30 border border-red-900/40 rounded-full">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse"></div>
            <span className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-widest">Live Feed</span>
          </div>

          {/* Toggle Display mode */}
          <button
            onClick={() => setShowAllOpinions(!showAllOpinions)}
            className={`text-[10px] px-3 py-1.5 font-mono font-bold uppercase border rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              showAllOpinions 
                ? "bg-red-950/40 border-red-900/50 text-red-400 hover:bg-red-900/40" 
                : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200"
            }`}
            id="all-arrows-toggle"
            title="Toggle showing all player arrows vs only showing the active/selected player's"
          >
            <Layers className="w-3.5 h-3.5" />
            {showAllOpinions ? "Mode: Array" : "Mode: Focus"}
          </button>

          {/* Erase Arrows */}
          <button
            onClick={handleClearOpinionsOnly}
            className="text-[10px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-mono font-bold uppercase cursor-pointer"
            id="clear-all-relations-btn"
            title="Clear relation arrow vectors"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
            Raze Vectors
          </button>

          {/* Hard Reset */}
          <button
            onClick={handleResetEntireGame}
            className="text-[10px] text-neutral-500 hover:text-red-500 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-mono font-bold uppercase cursor-pointer"
            id="reset-entire-game-btn"
            title="Reset players to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Wipe Engine
          </button>
        </div>
      </header>

      {/* Main Layout Area - Bento Grid structure */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start overflow-visible">
        
        {/* Left Column: Interactive Vector Graph & Live Stats (Bento visual core col-span-5) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col items-center">
          
          {/* Render circular graph visualizer */}
          <NetworkGraph
            players={players}
            opinions={opinions}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            showAllOpinions={showAllOpinions}
          />

          {/* Real-Time Stats Gauge */}
          <div id="stats-dashboard" className="w-full bg-neutral-900 rounded-2xl border border-neutral-800 p-4 grid grid-cols-3 gap-2 text-center text-xs shadow-2xl">
            <div className="bg-neutral-950/80 p-2.5 text-center rounded-xl border border-neutral-850">
              <span className="text-[10px] uppercase text-neutral-500 font-mono font-bold tracking-wider block mb-0.5">ALIVE TABLE</span>
              <span className="text-base font-black text-green-500 font-mono">
                {players.filter(p => p.status === 'alive').length}
              </span>
            </div>
            <div className="bg-neutral-950/80 p-2.5 text-center rounded-xl border border-neutral-850">
              <span className="text-[10px] uppercase text-neutral-500 font-mono font-bold tracking-wider block mb-0.5">ELIMINATED</span>
              <span className="text-base font-black text-red-600 font-mono">
                {players.filter(p => p.status === 'dead').length}
              </span>
            </div>
            <div className="bg-neutral-950/80 p-2.5 text-center rounded-xl border border-neutral-850">
              <span className="text-[10px] uppercase text-neutral-500 font-mono font-bold tracking-wider block mb-0.5">VECTORS</span>
              <span className="text-base font-black text-neutral-200 font-mono">
                {opinions.length}
              </span>
            </div>
          </div>

          {/* Opinion Density Arc Gauge */}
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex justify-between items-center text-neutral-400">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider">Opinion Intensity Matrix</span>
              <span className="text-[11px] font-mono text-neutral-400">{Math.min(100, Math.round((opinions.length / Math.max(1, players.length * 2)) * 100))}%</span>
            </div>
            <div className="w-full h-1 bg-neutral-950 rounded-full mt-2">
              <div 
                className="h-full bg-red-600 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(220,38,38,0.8)]"
                style={{ width: `${Math.min(100, Math.round((opinions.length / Math.max(1, players.length * 2)) * 100))}%` }}
              ></div>
            </div>
          </div>
          
          <div className="w-full text-[11px] text-neutral-500 leading-normal bg-neutral-950/50 border border-neutral-850 rounded-xl p-3 flex gap-2 items-start">
            <Info className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] uppercase tracking-tight">
              WORLD VIEW INDEX: CLICK ANY SUSPECT NODE TO MANAGE INDIVIDUAL ROLES AND OVERLAY outgoing STRATEGIC VECTORS.
            </p>
          </div>

        </div>

        {/* Right Column: AI Analysis Feed & Player Standing Directory (Bento functional blocks) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Quick AI Modulate Panel */}
          <VoiceInputPanel
            onAddTranscriptOpinions={handleAddTranscriptOpinions}
            playerNames={players.map(p => p.name)}
          />

          {/* Player Management Card */}
          <PlayerManager
            players={players}
            opinions={opinions}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            onUpdatePlayer={handleUpdatePlayer}
            onAddPlayer={handleAddPlayer}
            onDeletePlayer={handleDeletePlayer}
            onAddManualOpinion={handleAddManualOpinion}
            onDeleteOpinion={handleDeleteOpinion}
          />

          {/* Chronicle Stream History Activity Log */}
          <div id="game-history-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5 font-mono">
                <History className="w-4 h-4 text-red-600" />
                INTELLIGENCE FEED LOGS
              </h3>
              <button
                onClick={() => setGameLogs([])}
                className="text-[10px] text-neutral-500 hover:text-white transition-colors uppercase font-mono font-bold cursor-pointer"
                id="clear-logs-btn"
              >
                Flush chronicle
              </button>
            </div>

            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {gameLogs.length === 0 ? (
                <div className="text-center py-6 text-neutral-650 text-[10px] font-mono uppercase tracking-widest italic">
                  CHRONICLE STANDBY // NO INTERACTIVE SPEECH DETECTED
                </div>
              ) : (
                gameLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-neutral-950/80 rounded-xl border border-neutral-850 text-xs space-y-1 leading-normal font-sans">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getLogBadgeColor(log.type)}`}>
                        {log.type.replace("_", " ")}
                      </span>
                      <span className="text-[9px] text-neutral-550 font-mono flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-neutral-400 font-mono text-[11px] leading-relaxed italic">"{log.message}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 pt-4 flex flex-col sm:flex-row justify-between items-center text-[9px] text-neutral-600 font-mono tracking-widest gap-2">
        <p className="uppercase">
          EMBEDDED NEURAL LOGICAL DECRYPTOR • INVESTIGATION MODE
        </p>
        <p className="uppercase">
          OMERTA ANALYSIS SERVICE • SECURE SERVER BACKEND ACTIVE
        </p>
      </footer>

    </div>
  );
}
