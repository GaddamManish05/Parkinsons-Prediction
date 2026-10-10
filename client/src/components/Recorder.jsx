import { useState, useRef, useEffect } from "react";
import { FaMicrophone, FaStop, FaPlay, FaCloudUploadAlt, FaSync, FaExclamationTriangle, FaVolumeUp } from "react-icons/fa";

export default function Recorder({ onAudioSubmit }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [wavBlob, setWavBlob] = useState(null);
  const [micError, setMicError] = useState("");
  const [volumePercent, setVolumePercent] = useState(0);
  const [recordingWarning, setRecordingWarning] = useState("");
  
  const recordingRef = useRef(false);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const leftchannelRef = useRef([]);
  const recordingLengthRef = useRef(0);
  const sampleRateRef = useRef(44100);

  useEffect(() => {
    return () => {
      stopRecordingResources();
    };
  }, []);

  const stopRecordingResources = () => {
    recordingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    leftchannelRef.current = [];
    recordingLengthRef.current = 0;
    setAudioUrl(null);
    setWavBlob(null);
    setDuration(0);
    setMicError("");
    setRecordingWarning("");
    setVolumePercent(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferSize = 2048;
      const scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      scriptProcessor.onaudioprocess = (e) => {
        const left = e.inputBuffer.getChannelData(0);
        leftchannelRef.current.push(new Float32Array(left));
        recordingLengthRef.current += bufferSize;

        // Calculate live volume RMS level
        let sum = 0;
        for (let i = 0; i < left.length; i++) {
          sum += left[i] * left[i];
        }
        const rms = Math.sqrt(sum / left.length);
        const level = Math.min(100, Math.round(rms * 400));
        setVolumePercent(level);
      };

      recordingRef.current = true;
      visualize();
      setRecording(true);

      timerRef.current = setInterval(() => {
        if (recordingRef.current) {
          setDuration((prev) => prev + 1);
        }
      }, 1000);
    } catch (err) {
      setMicError("Microphone access failed. Please check browser permissions or connect a valid audio input device.");
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (!recordingRef.current) return;

    recordingRef.current = false;
    setRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (duration < 3) {
      setRecordingWarning("Sample duration is under 3 seconds. For best accuracy, sustained vocalization of 3-5 seconds is recommended.");
    }

    const leftBuffer = flattenArray(leftchannelRef.current, recordingLengthRef.current);
    const blob = encodeWAV(leftBuffer, sampleRateRef.current);
    setWavBlob(blob);
    
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const flattenArray = (channelBuffer, recordingLength) => {
    const result = new Float32Array(recordingLength);
    let offset = 0;
    for (let i = 0; i < channelBuffer.length; i++) {
      const buffer = channelBuffer[i];
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  };

  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);
    return new Blob([view], { type: "audio/wav" });
  };

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const visualize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const canvasCtx = canvas.getContext("2d");
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!recordingRef.current) return;
      const width = canvas.width;
      const height = canvas.height;

      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "rgba(148, 163, 184, 0.08)";
      canvasCtx.fillRect(0, 0, width, height);

      canvasCtx.lineWidth = 3;
      const gradient = canvasCtx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#0284c7");
      gradient.addColorStop(0.5, "#0d9488");
      gradient.addColorStop(1, "#4f46e5");
      canvasCtx.strokeStyle = gradient;

      canvasCtx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const handleSubmit = () => {
    if (wavBlob) {
      const file = new File([wavBlob], `voice-recording-${Date.now()}.wav`, {
        type: "audio/wav"
      });
      onAudioSubmit(file);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  return (
    <div className="recorder-card">
      <h3 className="card-subtitle" style={{ fontSize: "20px", fontWeight: "700" }}>Voice Acoustic Recorder</h3>
      <p className="card-description" style={{ marginTop: "6px" }}>
        Produce a sustained vocalization vowel sound (e.g. 'ahhhhh') steadily for at least 3-5 seconds.
      </p>

      {micError && (
        <div className="recommendations-box border-red" style={{ marginTop: "12px", padding: "12px" }}>
          <span style={{ color: "var(--red)", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaExclamationTriangle /> {micError}
          </span>
        </div>
      )}

      <div className="canvas-container">
        <canvas ref={canvasRef} width="400" height="120" className="visualizer-canvas" />
        {recording && (
          <span className="recording-indicator">
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--red)", marginRight: "6px" }}></span>
            Recording
          </span>
        )}
      </div>

      {recording && (
        <div style={{ width: "100%", maxWidth: "400px", margin: "8px auto 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><FaVolumeUp /> Mic Input Level:</span>
            <span>{volumePercent}%</span>
          </div>
          <div style={{ background: "rgba(148, 163, 184, 0.2)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
            <div 
              style={{ 
                width: `${volumePercent}%`, 
                height: "100%", 
                background: volumePercent > 85 ? "var(--red)" : volumePercent > 10 ? "var(--green)" : "var(--orange)",
                transition: "width 0.1s ease" 
              }} 
            />
          </div>
        </div>
      )}

      <div className="timer-display" style={{ color: recording ? "var(--red)" : "var(--text-main)", marginTop: "12px" }}>
        {formatTime(duration)}
      </div>

      {recordingWarning && (
        <p style={{ color: "var(--orange)", fontSize: "12.5px", marginTop: "4px" }}>
          ⚠️ {recordingWarning}
        </p>
      )}

      <div className="recorder-controls" style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px" }}>
        {!recording ? (
          <button onClick={startRecording} className="btn-primary btn-record">
            <FaMicrophone /> Start Vocalizing
          </button>
        ) : (
          <button onClick={stopRecording} className="btn-danger btn-stop">
            <FaStop /> Stop & Save
          </button>
        )}
      </div>

      {audioUrl && (
        <div className="preview-container" style={{ marginTop: "24px" }}>
          <h4 className="preview-title" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}><FaPlay /> Acoustic Sample Preview</h4>
          <audio src={audioUrl} controls className="audio-preview" />
          <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center", marginTop: "12px" }}>
            <button onClick={startRecording} className="btn-secondary btn-small"><FaSync /> Re-record</button>
            <button onClick={handleSubmit} className="btn-success btn-small"><FaCloudUploadAlt /> Analyze Biomarkers</button>
          </div>
        </div>
      )}
    </div>
  );
}

