
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { ProjectState, InspectionStatus, ItemResult } from '../types';
import { Icons } from '../constants';

// Manual encode helper function as per @google/genai guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Manual decode helper function as per @google/genai guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual audio decoding logic for raw PCM streams as per @google/genai guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface LiveAssistantProps {
  project: ProjectState;
  onUpdate: (updated: ProjectState) => void;
  currentLevel: string;
  onClose: () => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ project, onUpdate, currentLevel, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const intervalRef = useRef<number | null>(null);

  // Tool declaration for the model to log construction deficiencies
  const logDeficiency = ({ itemName, notes }: { itemName: string, notes: string }) => {
    const updatedProject = { ...project };
    const levelCategories = updatedProject.levelCategories[currentLevel] || [];
    
    // Attempt to map the detected item to an existing category
    let targetCatId = '';
    for (const cat of levelCategories) {
      if (cat.itemNames.some(name => name.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(name.toLowerCase()))) {
        targetCatId = cat.id;
        break;
      }
    }

    if (!targetCatId && levelCategories.length > 0) {
      targetCatId = levelCategories[0].id;
    }

    if (!targetCatId) return "Error: No categories found for this level.";

    const levelData = updatedProject.levelData[currentLevel] || {};
    const catItems = levelData[targetCatId] || [];
    const existingIndex = catItems.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());

    const newItem: ItemResult = existingIndex > -1 
      ? { ...catItems[existingIndex], status: InspectionStatus.FAIL, notes: notes || catItems[existingIndex].notes, round: catItems[existingIndex].round + 1 }
      : {
          id: Math.random().toString(36).substr(2, 9),
          name: itemName,
          status: InspectionStatus.FAIL,
          notes: notes,
          round: 1,
          photos: []
        };

    if (existingIndex > -1) {
      catItems[existingIndex] = newItem;
    } else {
      catItems.push(newItem);
    }

    levelData[targetCatId] = catItems;
    updatedProject.levelData[currentLevel] = levelData;
    onUpdate(updatedProject);
    return `Successfully logged deficiency: ${itemName}`;
  };

  const getMediaStream = async () => {
    const constraints: MediaStreamConstraints[] = [
      { audio: true, video: { facingMode: { ideal: 'environment' } } },
      { audio: true, video: true },
      { audio: true, video: false }
    ];

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        return stream;
      } catch (e) {
        console.warn(`Failed to get media with constraint:`, constraint, e);
      }
    }
    throw new Error("Could not access microphone or camera.");
  };

  const startLiveSession = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const stream = await getMediaStream();
      if (videoRef.current) videoRef.current.srcObject = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

      const logDeficiencyTool = {
        name: 'log_deficiency',
        parameters: {
          type: Type.OBJECT,
          description: 'Logs a construction deficiency found during the site walk.',
          properties: {
            itemName: { type: Type.STRING, description: 'The name of the item being inspected.' },
            notes: { type: Type.STRING, description: 'Details about the observed issue.' }
          },
          required: ['itemName', 'notes']
        }
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            // Handle microphone audio streaming
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64 = encode(new Uint8Array(int16.buffer));
              // Prevent stale closures by using sessionPromise.then
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            // Handle visual frame streaming for "video" multimodal input
            const hasVideo = stream.getVideoTracks().length > 0;
            if (hasVideo) {
              intervalRef.current = window.setInterval(() => {
                if (videoRef.current && canvasRef.current) {
                  const ctx = canvasRef.current.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                  }
                }
              }, 1000);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Process incoming model audio turn
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContext.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle function call requests from the model
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'log_deficiency') {
                  const result = logDeficiency(fc.args as any);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result } }
                  }));
                }
              }
            }

            // Update transcript for real-time visual feedback
            if (msg.serverContent?.outputTranscription) {
               setTranscript(prev => [...prev.slice(-5), { role: 'model', text: msg.serverContent!.outputTranscription!.text }]);
            }
            if (msg.serverContent?.inputTranscription) {
               setTranscript(prev => [...prev.slice(-5), { role: 'user', text: msg.serverContent!.inputTranscription!.text }]);
            }
          },
          onclose: () => cleanup(),
          onerror: (e) => {
            console.error(e);
            setErrorMessage("Connection error. Please try again.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [logDeficiencyTool] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the FrameCheck Site Assistant. The inspector is currently on "${currentLevel}". 
          The available inspection items for this level are: ${JSON.stringify(project.levelCategories[currentLevel]?.map(c => c.itemNames).flat() || [])}.
          When the inspector points out a failure, use the 'log_deficiency' tool. Be professional, concise, and helpful. You can see the site through the camera feed if it's available.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not start session. Verify camera/mic permissions.");
      setIsConnecting(false);
    }
  };

  const cleanup = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    if (intervalRef.current) clearInterval(intervalRef.current);
    const streams = videoRef.current?.srcObject as MediaStream;
    streams?.getTracks().forEach(t => t.stop());
    setIsActive(false);
  };

  useEffect(() => {
    startLiveSession();
    return () => cleanup();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-slate-500'}`}></div>
          <div>
            <h2 className="text-white font-black tracking-widest text-xs uppercase">Live Site Engine</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Walk Protocol: {currentLevel}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-xl p-4 rounded-3xl transition-all active:scale-90"
        >
          <Icons.Stop className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        {errorMessage ? (
          <div className="text-center p-10 space-y-6 animate-in zoom-in">
             <div className="w-20 h-20 bg-red-500/20 rounded-4xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <Icons.Alert className="w-10 h-10 text-red-500" />
             </div>
             <p className="text-red-400 font-bold max-w-xs mx-auto">{errorMessage}</p>
             <button 
               onClick={() => startLiveSession()}
               className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
             >
               Retry Link
             </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover opacity-60 grayscale-[0.2]"
            />
            <canvas ref={canvasRef} width="320" height="240" className="hidden" />
          </>
        )}

        {/* Central Pulse UI */}
        {!errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
               <div className="w-40 h-40 rounded-full border border-brand-500/20 animate-ping absolute top-0 left-0"></div>
               <div className="w-40 h-40 rounded-full bg-brand-500/10 backdrop-blur-3xl flex items-center justify-center border border-brand-500/30">
                 <div className="w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center shadow-[0_0_50px_rgba(26,31,255,0.4)]">
                   <Icons.Mic className="w-10 h-10 text-white" />
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Subtitles Overlay */}
        <div className="absolute bottom-40 left-0 right-0 p-10 flex flex-col items-center gap-2 pointer-events-none">
          {transcript.map((t, i) => (
            <div key={i} className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all animate-in slide-in-from-bottom-2 ${t.role === 'user' ? 'bg-white/10 text-white/60' : 'bg-brand-600/20 text-brand-400 border border-brand-500/20'}`}>
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="p-10 bg-black/40 backdrop-blur-3xl border-t border-white/10 flex justify-between items-center">
        <div className="flex gap-10">
           <div className="flex flex-col gap-1">
             <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Sensor Link</span>
             <span className={`text-11px font-black uppercase tracking-widest ${isActive ? 'text-green-400' : 'text-slate-500'}`}>{isActive ? 'ENCRYPTED' : 'WAITING'}</span>
           </div>
           <div className="flex flex-col gap-1">
             <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">AI Intelligence</span>
             <span className="text-[11px] font-black text-white uppercase tracking-widest">{isConnecting ? 'BOOTING...' : 'ZENITH-2.5'}</span>
           </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
           <Icons.Zap className="w-4 h-4 text-brand-400 animate-pulse" />
           <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Real-time Data Sync Active</span>
        </div>
      </div>
    </div>
  );
};

export default LiveAssistant;
