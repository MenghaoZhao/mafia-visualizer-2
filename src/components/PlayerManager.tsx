import React, { useState } from "react";
import { Player, Opinion } from "../types";
import { Plus, Trash, Skull, UserCheck, Shield, HelpCircle, Eye, Flame, AlertCircle } from "lucide-react";

interface PlayerManagerProps {
  players: Player[];
  opinions: Opinion[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  onUpdatePlayer: (updated: Player) => void;
  onAddPlayer: (name: string) => void;
  onDeletePlayer: (id: string) => void;
  onAddManualOpinion: (speakerId: string, targetId: string, attitude: 'suspect' | 'trust' | 'neutral', comment: string) => void;
  onDeleteOpinion: (id: string) => void;
}

export default function PlayerManager({
  players,
  opinions,
  selectedPlayerId,
  onSelectPlayer,
  onUpdatePlayer,
  onAddPlayer,
  onDeletePlayer,
  onAddManualOpinion,
  onDeleteOpinion
}: PlayerManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [manualTargetId, setManualTargetId] = useState("");
  const [manualAttitude, setManualAttitude] = useState<'suspect' | 'trust' | 'neutral'>('suspect');
  const [manualComment, setManualComment] = useState("");

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    onAddPlayer(newPlayerName.trim());
    setNewPlayerName("");
  };

  const handleManualOpinionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !manualTargetId) return;
    onAddManualOpinion(
      selectedPlayerId,
      manualTargetId,
      manualAttitude,
      manualComment.trim() || (manualAttitude === 'suspect' ? 'Suspects them' : manualAttitude === 'trust' ? 'Trusts them' : 'Neutral')
    );
    setManualComment("");
    setManualTargetId("");
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Selected Player Info & Fine-Tuning card */}
      {selectedPlayer ? (
        <div id="player-editor-card" className="bg-neutral-900 rounded-2xl border border-red-900/40 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-red-500 bg-red-950/40 border border-red-900/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Selected Detail
            </span>
            <button
              onClick={() => onSelectPlayer(null)}
              className="text-xs text-neutral-400 hover:text-white transition-all bg-neutral-850 p-1 px-2.5 rounded-lg border border-neutral-800 cursor-pointer"
              id="close-editor-btn"
            >
              Clear Focus
            </button>
          </div>

          <div className="space-y-3">
            {/* Rename Field */}
            <div>
              <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block mb-1">
                Player Name / Handle
              </label>
              <input
                type="text"
                value={selectedPlayer.name}
                id="edit-player-name-input"
                onChange={(e) => onUpdatePlayer({ ...selectedPlayer, name: e.target.value })}
                className="w-full bg-neutral-950 px-3.5 py-2 rounded-xl text-xs text-white border border-neutral-800 focus:outline-none focus:border-red-600/50"
              />
            </div>

            {/* Quick Status and Role toggles */}
            <div className="grid grid-cols-2 gap-3 pb-1">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block mb-1">
                  Life Status
                </label>
                <button
                  type="button"
                  id="status-toggle-btn"
                  onClick={() => onUpdatePlayer({
                    ...selectedPlayer,
                    status: selectedPlayer.status === 'alive' ? 'dead' : 'alive'
                  })}
                  className={`w-full text-xs font-semibold py-2 px-3 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedPlayer.status === 'alive'
                      ? "bg-green-950/30 text-green-500 border-green-900/50 hover:bg-green-955/40"
                      : "bg-red-950/30 text-red-500 border-red-900/50 hover:bg-red-955/40"
                  }`}
                >
                  <Skull className="w-3.5 h-3.5" />
                  {selectedPlayer.status.toUpperCase()}
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block mb-1">
                  Game Role
                </label>
                <select
                  value={selectedPlayer.role || 'Unknown'}
                  id="role-select-dropdown"
                  onChange={(e) => onUpdatePlayer({
                    ...selectedPlayer,
                    role: e.target.value as any
                  })}
                  className="w-full bg-neutral-950 px-3 py-2 rounded-xl text-xs text-white border border-neutral-800 focus:outline-none focus:border-red-650/50 h-[34px]"
                >
                  <option value="Unknown">Unknown Role</option>
                  <option value="Villager">Villager 🧑</option>
                  <option value="Mafia">Mafia 🕵️‍♂️</option>
                  <option value="Detective">Detective 🔍</option>
                  <option value="Doctor">Doctor 🩺</option>
                </select>
              </div>
            </div>

            {/* Manual Relationship Creator */}
            <div className="border-t border-neutral-800/80 pt-3.5 space-y-2.5">
              <h5 className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 flex items-center gap-1">
                Add Manual Opinion
              </h5>
              
              <form onSubmit={handleManualOpinionSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    required
                    id="manual-target-select"
                    value={manualTargetId}
                    onChange={(e) => setManualTargetId(e.target.value)}
                    className="bg-neutral-950 text-xs rounded-xl border border-neutral-800 p-2 text-neutral-200 focus:outline-none"
                  >
                    <option value="">Choose Target...</option>
                    {players
                      .filter(p => p.id !== selectedPlayer.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    }
                  </select>

                  <select
                    value={manualAttitude}
                    id="manual-attitude-select"
                    onChange={(e) => setManualAttitude(e.target.value as any)}
                    className="bg-neutral-950 text-xs rounded-xl border border-neutral-800 p-2 text-neutral-200 focus:outline-none"
                  >
                    <option value="suspect">Suspects 🔴</option>
                    <option value="trust">Trusts 🟢</option>
                    <option value="neutral">Clear/Neutral ⚪</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    id="manual-comment-input"
                    placeholder="Short nuance (claims neighbor)"
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    className="flex-1 bg-neutral-950 text-xs rounded-xl border border-neutral-800 px-3 py-1.5 text-white placeholder-neutral-705 focus:outline-none focus:border-red-800/60"
                  />
                  <button
                    type="submit"
                    id="submit-manual-relation-btn"
                    disabled={!manualTargetId}
                    className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-red-500 hover:text-red-400 border border-neutral-700 font-mono font-bold uppercase px-3.5 py-1 text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Add Arrow
                  </button>
                </div>
              </form>
            </div>

            {/* List personal opinions */}
            <div className="border-t border-neutral-800/80 pt-3.5 space-y-2">
              <h5 className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500">
                Opinions held by {selectedPlayer.name}
              </h5>
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs text-neutral-300">
                {opinions.filter(o => o.speakerId === selectedPlayer.id).length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic">No opinions registered yet.</p>
                ) : (
                  opinions
                    .filter(o => o.speakerId === selectedPlayer.id)
                    .map(op => {
                      const targetName = players.find(p => p.id === op.targetId)?.name || "Unknown";
                      const isSuspect = op.attitude === "suspect";
                      return (
                        <div key={op.id} className="flex items-center justify-between bg-neutral-955 p-2 rounded-xl border border-neutral-800/60 shadow-inner">
                          <span className="truncate">
                            {isSuspect ? "🔴 Suspects" : "🟢 Trusts"}{" "}
                            <strong className="text-neutral-150">{targetName}</strong>{" "}
                            <span className="text-[10px] text-neutral-500 block truncate font-medium mt-0.5">"{op.comment}"</span>
                          </span>
                          <button
                            onClick={() => onDeleteOpinion(op.id)}
                            className="text-neutral-500 hover:text-red-600 transition-colors shrink-0 font-bold ml-1.5 cursor-pointer text-sm"
                            title="Delete opinion link"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 shadow-2xl flex flex-col items-center justify-center text-center py-7 space-y-2">
          <AlertCircle className="w-8 h-8 text-neutral-600" />
          <h4 className="text-xs font-mono uppercase font-bold text-neutral-400">No Target Selected</h4>
          <p className="text-[11px] text-neutral-500 max-w-xs">
            Interact with node avatars in the center circle or list below to fine-tune roles and standings.
          </p>
        </div>
      )}

      {/* 2. Full Player Standings List & Controls */}
      <div id="players-standings-card" className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-neutral-400">
            Player Directory ({players.filter(p => p.status === 'alive').length} / {players.length} Alive)
          </h3>
          <span className="text-[10px] font-mono text-neutral-500 uppercase">
            Active Table
          </span>
        </div>

        {/* Dynamic add quick form */}
        <form onSubmit={handleAddPlayerSubmit} className="flex gap-2">
          <input
            type="text"
            required
            id="add-player-name-input"
            maxLength={14}
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Add suspect handle..."
            className="flex-1 bg-neutral-950 text-xs px-3 py-2 rounded-xl border border-neutral-800 text-white placeholder-neutral-705 focus:outline-none focus:border-red-900"
          />
          <button
            type="submit"
            id="add-player-btn"
            className="bg-neutral-800 hover:bg-neutral-700 text-red-500 font-mono font-bold p-2 px-4 rounded-xl transition-all border border-neutral-700 flex items-center gap-1 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Join
          </button>
        </form>

        {/* Players directory view */}
        <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
          {players.map((p) => {
            const isSelected = selectedPlayerId === p.id;
            const isDead = p.status === "dead";
            
            return (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "bg-red-950/20 border-red-900/60 text-white"
                    : isDead
                      ? "bg-neutral-950/40 border-neutral-900 text-neutral-600"
                      : "bg-neutral-950 hover:bg-neutral-950/80 border-neutral-800/80 hover:border-neutral-700 text-neutral-300"
                }`}
                id={`player-row-${p.id}`}
              >
                <div className="flex items-center gap-2.5 truncate max-w-[55%]">
                  <div className={`w-2 h-2 rounded-full ${isDead ? "bg-neutral-800" : "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse"}`}></div>
                  <div className="truncate">
                    <p className={`text-xs font-bold ${isDead ? "line-through text-neutral-500" : ""}`}>
                      {p.name}
                    </p>
                    <p className="text-[9px] font-mono text-neutral-550 uppercase tracking-tight">
                      {p.role || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Status Toggle Quick Button */}
                  <button
                    type="button"
                    id={`toggle-row-${p.id}`}
                    onClick={() => onUpdatePlayer({ ...p, status: isDead ? "alive" : "dead" })}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isDead
                        ? "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white"
                        : "bg-red-950/30 border-red-900/40 text-red-500 hover:bg-red-900/40"
                    }`}
                    title={isDead ? "Mark alive" : "Mark eliminated"}
                  >
                    <Skull className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete player button */}
                  {players.length > 3 && (
                    <button
                      type="button"
                      id={`delete-row-${p.id}`}
                      onClick={() => onDeletePlayer(p.id)}
                      className="p-1.5 rounded-lg border border-neutral-800 text-neutral-500 hover:text-red-500 hover:border-red-900/40 bg-neutral-900 transition-all cursor-pointer"
                      title="Remove player"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
