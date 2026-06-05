import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Sparkles, AlertTriangle } from "lucide-react";
import { PRESET_TRANSCRIPTS, PresetTranscript } from "../data";

interface VoiceInputPanelProps {
  onAddTranscriptOpinions: (data: { rawTranscript: string; opinions: any[] }) => void;
  playerNames: string[];
}

export default function VoiceInputPanel({
  onAddTranscriptOpinions,
  playerNames
}: VoiceInputPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Set up second counter
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleStartRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording is not supported in this browser. Please use the Manual Text input card below.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Let browser choose its preferred container/mimeType for safety
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setLoading(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          
          if (audioBlob.size < 1000) {
            throw new Error("Recording too short or no audio detected. Try talking longer.");
          }

          // Convert to Base64 to safely post to backend 
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const rawBase64 = (reader.result as string).split(",")[1];
            
            // Post payload to backend transcription API
            const response = await fetch("/api/analyze-audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: rawBase64,
                mimeType: audioBlob.type,
                players: playerNames
              })
            });

            if (!response.ok) {
              const errBody = await response.json().catch(() => ({}));
              throw new Error(errBody.error || `Server returned error (${response.status})`);
            }

            const data = await response.json();
            onAddTranscriptOpinions(data);
          };
        } catch (err: any) {
          console.error(err);
          setErrorMsg(err.message || "Failed to process audio recording.");
        } finally {
          setLoading(false);
          // Stop stream tracks to disable red recording node in browser
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start(250); // Get chunk interval
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not access microphone. Make sure permissions are granted or type manually below.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process typed or pasted transcript
  const handleAnalyzeText = async (textToUse?: string) => {
    const rawVal = textToUse !== undefined ? textToUse : manualText;
    if (!rawVal.trim()) {
      setErrorMsg("Please enter text before analyzing.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawVal,
          players: playerNames
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Server issue analyzing speech text.");
      }

      const data = await response.json();
      onAddTranscriptOpinions(data);
      if (textToUse === undefined) {
        setManualText(""); // Clear manual input on success
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not analyze transcript.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Mic Recording Area - Bento Grid Block */}
      <div id="mic-recorder-card" className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 shadow-2xl text-center relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-3 right-3 bg-red-950/50 border border-red-900/50 text-red-400 text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full font-bold pointer-events-none flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> AI FEED
        </div>

        <h3 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 justify-center">
          Voice Record Discussion
        </h3>
        <p className="text-[11px] text-neutral-500 max-w-sm mb-4">
          Hit record to process ongoing circle arguments. Let players speak, then stop to update their suspicion vectors.
        </p>

        {isRecording ? (
          <div className="flex flex-col items-center space-y-3 py-2">
            {/* Animated Pulser */}
            <div className="relative">
              <span className="absolute -inset-2 bg-red-650/40 rounded-full blur-sm animate-ping"></span>
              <button
                onClick={handleStopRecording}
                className="relative bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-colors z-10 shadow-lg shadow-red-950/50"
                id="voice-stop-btn"
              >
                <Square className="w-6 h-6 fill-white" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-red-950/30 border border-red-900 rounded-full">
              <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse"></div>
              <span className="text-xs font-mono text-red-500 font-bold uppercase">LIVE FEED {formatTime(recordingSeconds)}</span>
            </div>
            <p className="text-[10px] text-neutral-400 animate-pulse font-medium">Listening to speech details...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 py-2">
            <button
              onClick={handleStartRecording}
              disabled={loading}
              className={`bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500 text-neutral-100 rounded-full p-5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
              id="voice-record-btn"
            >
              <Mic className="w-7 h-7 text-red-600" />
            </button>
            <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              {loading ? "PROCESSING RELATIONS..." : "ACTIVATE RECORDING"}
            </span>
          </div>
        )}

        {loading && (
          <div className="mt-3 text-xs text-neutral-400 flex items-center gap-1.5 animate-pulse justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]"></div>
            <span className="font-mono text-[10px] text-neutral-500">DECRYPTED NEURAL INTERFACE ANALYSING DIALOGUE...</span>
          </div>
        )}
      </div>

      {/* 2. Error Message panel if any */}
      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/60 p-3.5 rounded-xl flex gap-2.5 items-start text-xs text-red-350">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <div className="space-y-0.5">
            <p className="font-bold text-red-450 uppercase tracking-wider text-[10px]">Processing Fail</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}


    </div>
  );
}
