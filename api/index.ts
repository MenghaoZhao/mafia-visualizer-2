import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();

// Keep JSON upload limits high for base64 sound bites
app.use(express.json({ limit: "15mb" }));

// Lazy init Gemini to run gracefully under any missing secret scenarios
let ai: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add your key in the Settings > Secrets panel!");
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// API endpoint for raw text/transcript analysis
app.post("/api/analyze-text", async (req, res) => {
  try {
    const { text, players } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Please enter some discussion text to analyze." });
    }
    const playerListStr = players && Array.isArray(players) ? players.join(", ") : "";

    const client = getGemini();
    const prompt = `You are a helper moderator in the social deduction game of Mafia.
Analyze the following player discussion transcript or quote.
Your goal is to parse who is communicating (the speaker) and their exact attitudes towards other players.

Known player list: [${playerListStr}].

Dialogue/transcript text:
"${text}"

Instructions:
1. Identify who is speaking (the "speaker") and who they are speaking about (the "target"). Each speaker and target MUST refer to one of the known players in [${playerListStr}]. If they use shorthand or pronoun references, resolve them carefully based on the context of the conversation.
2. Determine their "attitude":
   - Use 'suspect' if the speaker accuses, doubts, casts shade on, or thinks the target is Mafia/werewolf/bad.
   - Use 'trust' if the speaker defends, clears, vouches for, or wants to join forces with the target.
   - Use 'neutral' if they clear a prior shade, state they are unsure, or say they don't have enough info on them yet.
3. Extract a brief reason or context snippet as formatting comment (e.g. "accuses them of lying about being the doctor").
4. Ignore general text that doesn't detail relationship states or roles.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawTranscript: {
              type: Type.STRING,
              description: "Cleaned up transcript of the analysed dialogue."
            },
            opinions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: {
                    type: Type.STRING,
                    description: "The speaker player name. Must match one of the provided list."
                  },
                  target: {
                    type: Type.STRING,
                    description: "The target player name being accused or trusted. Must match one of the provided list."
                  },
                  attitude: {
                    type: Type.STRING,
                    description: "Must be 'suspect', 'trust', or 'neutral'."
                  },
                  comment: {
                    type: Type.STRING,
                    description: "A short snippet of reasoning or summarized accusation from the dialogue."
                  }
                },
                required: ["speaker", "target", "attitude", "comment"]
              }
            }
          },
          required: ["rawTranscript", "opinions"]
        }
      }
    });

    const parsedResult = JSON.parse(response.text || "{}");
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Gemini text analysis error:", error);
    return res.status(500).json({ error: error.message || "An error occurred during text analysis." });
  }
});

// API endpoint for direct audio recording voice processing
app.post("/api/analyze-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType, players } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "No voice recording data detected." });
    }
    const playerListStr = players && Array.isArray(players) ? players.join(", ") : "";

    const client = getGemini();

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioBase64
      }
    };

    const textPart = {
      text: `You are an expert helper moderator in the social deduction game of Mafia.
Listen to the attached audio recording of players discussing opinions.
Your tasks are:
1. Fully transcribe the conversation in the audio clip.
2. Scan the transcript to identify who is speaking (the speaker) and what they assert regarding other players (the target).

Known player list: [${playerListStr}].

Instructions:
1. Identify who is speaking (the "speaker") and who they are speaking about (the "target"). Map these strictly to the player list: [${playerListStr}]. If they say "Player 1", match to "Player 1". If they mention names like "Alice", match them correctly.
2. Determine their "attitude":
   - 'suspect': thinks they are Mafia or suspicious.
   - 'trust': thinks they are good/citizen/doctor/etc.
   - 'neutral': clearing details, unsure, or expressing mixed elements.
3. Include the brief quote or snippet supporting this deduction.`
    };

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [audioPart, textPart],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawTranscript: {
              type: Type.STRING,
              description: "Complete verbatim transcription of the processed audio."
            },
            opinions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: {
                    type: Type.STRING,
                    description: "Speaker name. Must match one of the provided list."
                  },
                  target: {
                    type: Type.STRING,
                    description: "Target player name. Must match one of the provided list."
                  },
                  attitude: {
                    type: Type.STRING,
                    description: "Must be 'suspect', 'trust', or 'neutral'."
                  },
                  comment: {
                    type: Type.STRING,
                    description: "Direct quote or rationale from the talk."
                  }
                },
                required: ["speaker", "target", "attitude", "comment"]
              }
            }
          },
          required: ["rawTranscript", "opinions"]
        }
      }
    });

    const parsedResult = JSON.parse(response.text || "{}");
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Gemini audio analysis error:", error);
    return res.status(500).json({ error: error.message || "An error occurred trying to transcribe and analyze the audio recording." });
  }
});

// Serve static files in production
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

export default app;
