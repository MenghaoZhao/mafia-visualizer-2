import { Player } from "./types";

export const DEFAULT_PLAYERS: Player[] = [
  { id: "1", name: "Alice", status: "alive", role: "Unknown" },
  { id: "2", name: "Bob", status: "alive", role: "Unknown" },
  { id: "3", name: "Charlie", status: "alive", role: "Unknown" },
  { id: "4", name: "Dave", status: "alive", role: "Unknown" },
  { id: "5", name: "Eve", status: "alive", role: "Unknown" },
  { id: "6", name: "Frank", status: "alive", role: "Unknown" },
  { id: "7", name: "Grace", status: "alive", role: "Unknown" },
  { id: "8", name: "Henry", status: "alive", role: "Unknown" }
];

export interface PresetTranscript {
  title: string;
  description: string;
  text: string;
}

export const PRESET_TRANSCRIPTS: PresetTranscript[] = [
  {
    title: "The Doctor Accusation",
    description: "Alice suspects Bob, while Bob defends himself claiming Doctor role.",
    text: "Alice: I think Bob is acting super suspicious, he's definitely mafia! Bob: No wait, I am the doctor! I saved Dave last night. Dave, you can trust me. Dave: Yes, Alice, Bob might indeed be clean, but Charlie is being too quiet. I suspect Charlie is mafia."
  },
  {
    title: "Late Game Suspicion",
    description: "Charlie targets Eve while Frank vouches for Grace.",
    text: "Charlie: Eve has been trailing my votes all game. I think Eve is Mafia trying to blend in. Frank: I fully trust Grace, she is verified in my eyes. But Eve does look shady, I agree with Charlie on that."
  },
  {
    title: "Double Accusation Chaos",
    description: "Henry throws shade at Alice and Frank, but Grace clears Frank.",
    text: "Henry: Alice and Frank are working together, I suspect both of them are in the mafia! Grace: Henry, that makes no sense. I trust Frank, his logic has been sound. I think Henry is just trying to sow chaos."
  }
];
