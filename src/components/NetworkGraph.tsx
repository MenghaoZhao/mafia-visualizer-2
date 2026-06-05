import React, { useState } from "react";
import { motion } from "motion/react";
import { Player, Opinion } from "../types";
import { Skull, User, Eye, Shield, HelpCircle, Flame } from "lucide-react";

interface NetworkGraphProps {
  players: Player[];
  opinions: Opinion[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  showAllOpinions: boolean;
}

export default function NetworkGraph({
  players,
  opinions,
  selectedPlayerId,
  onSelectPlayer,
  showAllOpinions
}: NetworkGraphProps) {
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);

  const size = 500;
  const center = size / 2;
  const radius = 170; // Circle radius
  const nodeRadius = 32; // Player circle avatar radius

  // Calculate coordinates on the circle for each player
  const playerPositions = players.reduce((acc, player, idx) => {
    const angle = (idx * 2 * Math.PI) / players.length - Math.PI / 2; // Start from top
    acc[player.id] = {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      angle
    };
    return acc;
  }, {} as Record<string, { x: number; y: number; angle: number }>);

  // Filter opinions to display
  // If showAllOpinions is true, show all.
  // Otherwise, only show opinions where SPEAKER or TARGET is the selected player OR hovered player
  const activeOpinions = opinions.filter(op => {
    // Exclude if speaker or target is no longer in current players (safety check)
    if (!playerPositions[op.speakerId] || !playerPositions[op.targetId]) return false;

    if (showAllOpinions) return true;
    
    const activeId = hoveredPlayerId || selectedPlayerId;
    if (!activeId) return false;
    
    // Show relationships initiating from or pointed to the highlighted player
    return op.speakerId === activeId;
  });

  // Unique arrows helpers - key them by speakerId -> targetId to avoid duplicate overlapping arrows
  // If multiple exist, we can take the latest one (highest timestamp)
  const dedupedOpinionsMap: Record<string, Opinion> = {};
  activeOpinions.sort((a, b) => a.timestamp - b.timestamp).forEach(op => {
    const key = `${op.speakerId}->${op.targetId}`;
    dedupedOpinionsMap[key] = op;
  });
  const uniqueOpinions = Object.values(dedupedOpinionsMap);

  // Helper to draw clean non-overlapping arrows from node edge to node edge
  const renderArrow = (op: Opinion) => {
    const start = playerPositions[op.speakerId];
    const end = playerPositions[op.targetId];
    if (!start || !end) return null;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return null;

    // Offset line ends so arrows touch node circumference precisely (radius size nodeRadius + arrowhead offset)
    const startOffsetRatio = nodeRadius / dist;
    // markerWidth is 10, offset from target node edge accordingly
    const endOffsetRatio = (nodeRadius + 12) / dist; 

    const startX = start.x + dx * startOffsetRatio;
    const startY = start.y + dy * startOffsetRatio;
    const endX = end.x - dx * endOffsetRatio;
    const endY = end.y - dy * endOffsetRatio;

    const isSuspect = op.attitude === "suspect";
    const strokeColor = isSuspect ? "#dc2626" : "#16a34a"; // Red-600 for accusation, Green-600 for defense
    const markerId = isSuspect ? "url(#arrow-suspect)" : "url(#arrow-trust)";
    const strokeStyle = op.attitude === "neutral" ? "stroke-neutral-600" : "";
    const isDashed = op.attitude === "trust";

    // Curve them slightly if there is bidirectional relation to prevent direct overlapping!
    const reciprocalKey = `${op.targetId}->${op.speakerId}`;
    const hasReciprocal = !!dedupedOpinionsMap[reciprocalKey];

    if (hasReciprocal) {
      // Draw quad bezier curve offset control point
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      // Perpendicular vector
      const nx = -dy / dist;
      const ny = dx / dist;
      // Adjust offset direction based on who is who to keep consistency
      const curveAmount = 25; 
      const ctrlX = midX + nx * curveAmount;
      const ctrlY = midY + ny * curveAmount;

      return (
        <g key={op.id}>
          <path
            d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={3}
            strokeDasharray={isDashed ? "5,5" : undefined}
            markerEnd={markerId}
            className="transition-all duration-300 opacity-95"
          />
          {/* Subtle text card on curve midpoint for detailed context on hover */}
          {selectedPlayerId && (op.speakerId === selectedPlayerId || op.targetId === selectedPlayerId) && (
            <foreignObject
              x={(midX + ctrlX) / 2 - 40}
              y={(midY + ctrlY) / 2 - 10}
              width="80"
              height="20"
              className="overflow-visible pointer-events-none"
            >
              <div className="bg-neutral-950/95 text-[9px] text-neutral-300 border border-neutral-800 rounded px-1 py-0.5 text-center truncate max-w-[80px]" title={op.comment}>
                {op.comment}
              </div>
            </foreignObject>
          )}
        </g>
      );
    }

    return (
      <g key={op.id}>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={strokeColor}
          strokeWidth={3}
          strokeDasharray={isDashed ? "5,5" : undefined}
          markerEnd={markerId}
          className="transition-all duration-300 opacity-95"
        />
        {/* Simple inline snippet overlay on standard arrow center line */}
        {selectedPlayerId && (op.speakerId === selectedPlayerId || op.targetId === selectedPlayerId) && (
          <foreignObject
            x={(startX + endX) / 2 - 40}
            y={(startY + endY) / 2 - 10}
            width="80"
            height="20"
            className="overflow-visible pointer-events-none"
          >
            <div className="bg-neutral-950/95 text-[9px] text-neutral-300 border border-neutral-800 rounded px-1 py-0.5 text-center truncate max-w-[80px]" title={op.comment}>
              {op.comment}
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "Mafia":
        return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case "Doctor":
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case "Detective":
        return <Eye className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <User className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getRoleBorderColor = (role?: string) => {
    switch (role) {
      case "Mafia":
        return "border-red-650/80 shadow-[0_0_10px_rgba(220,38,38,0.4)]";
      case "Doctor":
        return "border-emerald-500/80 shadow-[0_0_10px_rgba(22,163,74,0.4)]";
      case "Detective":
        return "border-blue-500/80 shadow-[0_0_10px_rgba(37,99,235,0.4)]";
      default:
        return "border-neutral-700";
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-4 flex items-center justify-center shadow-2xl overflow-hidden">
      
      {/* Decorative center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
        <span className="text-9xl font-extrabold tracking-widest text-neutral-400 uppercase">OMERTA</span>
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full overflow-visible z-10"
        id="mafia-relationship-svg"
      >
        {/* Core SVG Header Templates for Arrowmarkers */}
        <defs>
          <marker
            id="arrow-suspect"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#dc2626" />
          </marker>
          <marker
            id="arrow-trust"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#16a34a" />
          </marker>
        </defs>

        {/* 1. Background Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#262626"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          className="opacity-70"
        />

        {/* 2. Opinion/Relationship Arrows */}
        <g id="relationship-arrows">
          {uniqueOpinions.map(op => renderArrow(op))}
        </g>

        {/* 3. Player Interactive Nodes */}
        <g id="player-nodes">
          {players.map((player) => {
            const pos = playerPositions[player.id];
            if (!pos) return null;

            const isSelected = selectedPlayerId === player.id;
            const isHovered = hoveredPlayerId === player.id;
            const isDead = player.status === "dead";
            
            // Highlight connections outgoing from this player
            const isHighlighted = isSelected || isHovered;

            return (
              <g
                key={player.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => onSelectPlayer(isSelected ? null : player.id)}
                onMouseEnter={() => setHoveredPlayerId(player.id)}
                onMouseLeave={() => setHoveredPlayerId(null)}
              >
                {/* Outer pulsing circle glow on selection */}
                {isHighlighted && (
                  <circle
                    r={nodeRadius + 6}
                    fill="none"
                    stroke={isDead ? "#404040" : "#dc2626"}
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}

                {/* Main Node Background */}
                <circle
                  r={nodeRadius}
                  fill={isDead ? "#0a0a0a" : "#171717"}
                  stroke={isDead ? "#404040" : isSelected ? "#dc2626" : "#262626"}
                  strokeWidth={isSelected ? 3.5 : 1.5}
                  className={`transition-all duration-300 shadow-xl`}
                />

                {/* Dead Overlay Filter */}
                {isDead && (
                  <circle
                    r={nodeRadius}
                    fill="rgba(10, 10, 10, 0.75)"
                  />
                )}

                {/* Avatar Initial / Graphical Icon */}
                <g transform="translate(0, -2)">
                  {isDead ? (
                    <Skull className="w-8 h-8 text-neutral-600 mx-auto" />
                  ) : (
                    <text
                      textAnchor="middle"
                      className="fill-neutral-100 font-black text-lg select-none font-mono"
                      dy=".3em"
                    >
                      {player.name.substring(0, 2).toUpperCase()}
                    </text>
                  )}
                </g>

                {/* Player Name below node */}
                <g transform={`translate(0, ${nodeRadius + 16})`}>
                  <rect
                    x="-45"
                    y="-9"
                    width="90"
                    height="18"
                    rx="4"
                    fill={isSelected ? "#dc2626" : isDead ? "#171717" : "#0a0a0a"}
                    stroke={isSelected ? "#ef4444" : isDead ? "#262626" : "#171717"}
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    className={`font-semibold text-[10px] select-none font-mono ${isDead ? "fill-neutral-600 line-through" : isSelected ? "fill-white" : "fill-neutral-200"}`}
                    dy=".3em"
                  >
                    {player.name}
                  </text>
                </g>

                {/* Active Role Mini-Badge at Top Right corner of Node */}
                {!isDead && player.role && player.role !== "Unknown" && (
                  <g transform="translate(18, -18)">
                    <circle
                      r="9"
                      fill="#0a0a0a"
                      stroke={player.role === "Mafia" ? "#dc2626" : player.role === "Doctor" ? "#16a34a" : "#2563eb"}
                      strokeWidth="1"
                    />
                    <g transform="translate(-7, -7)">
                      {getRoleIcon(player.role)}
                    </g>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Toggle Hints panel built directly into the container */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-950/90 px-3 py-1.5 rounded-lg border border-neutral-800 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-0.5 bg-red-600 inline-block"></span>
          <span className="font-mono text-[10px] uppercase font-bold tracking-tight">Accusations</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-0.5 bg-green-500 border-dashed border-t inline-block"></span>
          <span className="font-mono text-[10px] uppercase font-bold tracking-tight">Vouches</span>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase text-neutral-500">Filter: Click Avatar</span>
        </div>
      </div>
    </div>
  );
}
