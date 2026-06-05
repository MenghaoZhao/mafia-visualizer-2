export interface Player {
  id: string;
  name: string;
  status: 'alive' | 'dead';
  role?: 'Villager' | 'Mafia' | 'Detective' | 'Doctor' | 'Unknown';
}

export interface Opinion {
  id: string;
  speakerId: string;
  targetId: string;
  attitude: 'suspect' | 'trust' | 'neutral';
  comment: string;
  timestamp: number;
}

export interface GameLog {
  id: string;
  message: string;
  timestamp: number;
  type: 'system' | 'opinion_add' | 'opinion_clear' | 'status_change';
}
