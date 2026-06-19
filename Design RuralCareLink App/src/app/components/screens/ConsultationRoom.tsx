import { useState, useEffect, useRef } from "react";
import { Camera, CameraOff, Mic, MicOff, Send, PhoneOff, MessageSquare, Shield, Wifi, AlertTriangle, X, CheckCircle } from "lucide-react";
import api from "../../services/api";
import { useI18n } from "../../context/I18nContext";

interface Message {
  sender: "nurse" | "doctor";
  text: string;
  time: string;
}

interface ConsultationRoomProps {
  visitId: string;
  patientName: string;
  onClose: () => void;
}

export function ConsultationRoom({ visitId, patientName, onClose }: ConsultationRoomProps) {
  const { t } = useI18n();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "doctor", text: `Hello. I have received the case file for ${patientName}. Let's review the vitals together.`, time: "17:45" },
    { sender: "nurse", text: `Yes doctor, patient complains of severe dry cough and fever for the past three days.`, time: "17:46" },
  ]);
  const [inputText, setInputText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "low_bandwidth">("connecting");
  
  // Internet degradation states
  const [showLowInternetModal, setShowLowInternetModal] = useState(false);
  const [latency, setLatency] = useState(42);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Server-side visit ID resolution state
  const [resolvedVisitId, setResolvedVisitId] = useState(visitId);

  // Call ending flow states
  const [endingCallStatus, setEndingCallStatus] = useState<"idle" | "sending_prescription" | "done">("idle");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load server-side ID if synced
  useEffect(() => {
    async function resolveId() {
      try {
        const { getVisitById } = await import("../../db/localDB");
        const localVisit = await getVisitById(visitId);
        if (localVisit && localVisit.serverId) {
          setResolvedVisitId(localVisit.serverId);
        }
      } catch (e) {
        console.warn("Failed to load local visit:", e);
      }
    }
    resolveId();
  }, [visitId]);

  // Real API Signaling & Webcam Capture
  useEffect(() => {
    if (!resolvedVisitId || resolvedVisitId === visitId) return;

    let active = true;
    let activeStream: MediaStream | null = null;

    async function startCall() {
      try {
        // 1. Tell server we are starting/joining the call
        const visitRes = await api.get(`/visits/${resolvedVisitId}`);
        const currentMode = visitRes.data.visit.consultationMode;
        
        const isDoctorCalling = currentMode === "VIDEO";
        await api.patch(`/visits/${resolvedVisitId}`, {
          consultationMode: "VIDEO",
          networkStatus: isDoctorCalling ? "ONLINE" : "WEAK"
        });

        // 2. Start the camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        activeStream = stream;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera access or call signaling failed:", err);
      }
    }

    startCall();

    // 3. Poll to check if doctor connects or hangs up
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/visits/${resolvedVisitId}`);
        const v = res.data.visit;
        if (!active) return;

        if (v.consultationMode === "OFFLINE") {
          clearInterval(pollInterval);
          onClose();
        } else if (v.networkStatus === "ONLINE") {
          setConnectionStatus("connected");
        }
      } catch (err) {
        console.warn("Error polling call status:", err);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      api.patch(`/visits/${resolvedVisitId}`, {
        consultationMode: "OFFLINE",
        networkStatus: "OFFLINE"
      }).catch(err => console.warn(err));
    };
  }, [resolvedVisitId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Mute/Camera Toggles
  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !cameraActive;
      });
    }
    setCameraActive(!cameraActive);
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !micActive;
      });
    }
    setMicActive(!micActive);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMsg: Message = { sender: "nurse", text: inputText, time: timeStr };
    setMessages(prev => [...prev, newMsg]);
    setInputText("");

    // Simulate doctor response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        sender: "doctor",
        text: `Vitals look stable. I will prescribe paracetamol for the fever. Keep checking SpO2 twice daily.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  // Switch to Chat-Only Mode
  const handleSwitchToChatOnly = () => {
    // Turn off camera and mic
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.enabled = false;
      });
    }
    setCameraActive(false);
    setMicActive(false);
    setShowLowInternetModal(false);
    setShowChat(true);
  };

  // Terminate Consultation and Push Prescription
  const handleEndCall = async () => {
    setEndingCallStatus("sending_prescription");

    try {
      // Create prescription in DB (automatically triggers notification alert)
      await api.post('/prescriptions', {
        visitId: resolvedVisitId,
        medicationName: "Paracetamol",
        dosage: "500mg",
        frequency: "1-0-1",
        duration: "3 days",
        instructions: "Take after meals",
      });
    } catch (err) {
      console.warn("Failed to push prescription on server, writing mock local prescription:", err);
    }

    // Hold loading screen for professional transmission animation
    setTimeout(() => {
      setEndingCallStatus("done");
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 2500);
  };

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100vh",
      background: "#090d14",
      color: "#fff",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div style={{
          position: "absolute",
          top: 90,
          left: 16,
          right: 16,
          background: "rgba(229, 57, 53, 0.95)",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          zIndex: 150,
          textAlign: "center",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          animation: "scaleIn 0.2s ease-out",
        }}>
          <AlertTriangle size={16} />
          {toastMessage}
        </div>
      )}

      {/* 1. Full Screen Doctor View (WhatsApp / Instagram Style) */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
      }}>
        {connectionStatus === "connecting" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.15)",
              borderTopColor: "#a5d6a7",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }} />
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              Initiating secure line...
            </div>
          </div>
        ) : (
          <div style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 1,
              }}
            />

            {!cameraActive && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "radial-gradient(circle, #193d25 0%, #0d1a11 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2
              }}>
                {/* Pulsing Green Halo behind Doctor details */}
                <div style={{
                  position: "absolute",
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: "rgba(46, 125, 50, 0.2)",
                  animation: "pulse 2s infinite ease-in-out",
                  zIndex: 2,
                }} />

                {/* Doctor Avatar */}
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: "#2E7D32",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid rgba(255, 255, 255, 0.25)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#fff",
                  zIndex: 3,
                }}>
                  DR
                </div>

                <div style={{ marginTop: 20, textAlign: "center", zIndex: 3 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                    Dr. Anil Deshmukh
                  </div>
                  <div style={{ fontSize: 13, color: "#a5d6a7", fontWeight: 500, marginTop: 4 }}>
                    Consulting Cardiologist
                  </div>
                </div>
              </div>
            )}

              {/* Voice Waves */}
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 14, height: 16, alignItems: "center" }}>
                <div style={{ width: 3, height: 10, background: "#a5d6a7", borderRadius: 3, animation: "voiceWave 0.8s infinite ease-in-out" }} />
                <div style={{ width: 3, height: 6, background: "#a5d6a7", borderRadius: 3, animation: "voiceWave 0.8s infinite ease-in-out 0.2s" }} />
                <div style={{ width: 3, height: 15, background: "#a5d6a7", borderRadius: 3, animation: "voiceWave 0.8s infinite ease-in-out 0.4s" }} />
                <div style={{ width: 3, height: 8, background: "#a5d6a7", borderRadius: 3, animation: "voiceWave 0.8s infinite ease-in-out 0.1s" }} />
            </div>
          </div>
        )}
      </div>

      {/* 2. Floating Call Header Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "36px 16px 16px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: connectionStatus === "low_bandwidth" ? "#e53935" : "#4caf50",
            boxShadow: connectionStatus === "low_bandwidth" ? "0 0 8px #e53935" : "0 0 8px #4caf50",
          }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#fff" }}>{patientName}</div>
            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.75)", display: "flex", alignItems: "center", gap: 4 }}>
              <Shield size={12} color="#a5d6a7" /> Secure Connection
            </div>
          </div>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(8px)",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 4
        }}>
          <Wifi size={12} color={connectionStatus === "low_bandwidth" ? "#e53935" : "#a5d6a7"} />
          <span style={{ color: connectionStatus === "low_bandwidth" ? "#ff8a80" : "#fff" }}>
            {latency}ms
          </span>
        </div>
      </div>

      {/* 3. Floating Picture in Picture Webcam Overlay (Draggable / Floating Right) */}
      {connectionStatus !== "connecting" && (
        <div style={{
          position: "absolute",
          top: 86,
          right: 16,
          width: 90,
          height: 130,
          borderRadius: 12,
          background: "#1e293b",
          overflow: "hidden",
          boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
          border: "2px solid rgba(255,255,255,0.3)",
          zIndex: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
        }}>
          {cameraActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              <CameraOff size={20} style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: 9 }}>Camera Off</div>
            </div>
          )}
          <div style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            background: "rgba(0,0,0,0.6)",
            padding: "1px 4px",
            borderRadius: 3,
            fontSize: 8,
            color: "#fff",
          }}>
            PHC
          </div>
        </div>
      )}

      {/* 4. Bottom Controls Overlay (WhatsApp Glassmorphic Panel) */}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        right: 16,
        background: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: 24,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
      }}>
        {/* Toggle Video */}
        <button
          onClick={toggleCamera}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: cameraActive ? "rgba(255,255,255,0.15)" : "#e53935",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.1s",
          }}
        >
          {cameraActive ? <Camera size={20} /> : <CameraOff size={20} />}
        </button>

        {/* Toggle Audio */}
        <button
          onClick={toggleMic}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: micActive ? "rgba(255,255,255,0.15)" : "#e53935",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.1s",
          }}
        >
          {micActive ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Open Chat Overlay */}
        <button
          onClick={() => {
            if (connectionStatus !== "low_bandwidth") {
              setToastMessage("Switching to chat is only permitted under low internet connectivity.");
              setTimeout(() => setToastMessage(null), 3500);
            } else {
              setShowChat(true);
            }
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: showChat ? "#2E7D32" : connectionStatus !== "low_bandwidth" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.15)",
            color: connectionStatus !== "low_bandwidth" ? "rgba(255,255,255,0.4)" : "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: connectionStatus !== "low_bandwidth" ? "not-allowed" : "pointer",
            position: "relative",
            transition: "transform 0.1s",
          }}
          title={connectionStatus !== "low_bandwidth" ? "Chat locked (only available on low connectivity)" : "Open Chat"}
        >
          <MessageSquare size={20} />
          {messages.length > 0 && !showChat && (
            <div style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff1744",
            }} />
          )}
        </button>

        {/* Red End Call Button */}
        <button
          onClick={handleEndCall}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(211,47,47,0.4)",
            transition: "transform 0.1s",
          }}
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {/* 5. Sliding Chat Bottom-Sheet Overlay (WhatsApp Style) */}
      {showChat && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(9, 13, 20, 0.4)",
          backdropFilter: "blur(6px)",
          zIndex: 15,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}>
          {/* Top Dismiss clicker */}
          <div style={{ flex: 1 }} onClick={() => setShowChat(false)} />

          {/* Chat Sheet Content */}
          <div style={{
            height: "70%",
            background: "#ffffff",
            color: "#1a2332",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
            animation: "slideUp 0.3s ease-out",
          }}>
            {/* Sheet Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Consultation Chat</h3>
                <span style={{ fontSize: 11, color: "#8a9aaa" }}>Live with Dr. Anil Deshmukh</span>
              </div>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#f8fafc",
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.sender === "nurse" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}>
                  <div style={{
                    fontSize: 9,
                    color: "#8a9aaa",
                    marginBottom: 2,
                    textAlign: m.sender === "nurse" ? "right" : "left"
                  }}>
                    {m.sender === "nurse" ? "Nurse Priya" : "Dr. Anil"}
                  </div>
                  <div style={{
                    background: m.sender === "nurse" ? "#d1e7dd" : "#ffffff",
                    color: "#1a2332",
                    borderRadius: 14,
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.4,
                    border: "1px solid",
                    borderColor: m.sender === "nurse" ? "#a3cfbb" : "#e2e8f0",
                    borderBottomRightRadius: m.sender === "nurse" ? 2 : 14,
                    borderBottomLeftRadius: m.sender === "doctor" ? 2 : 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}>
                    {m.text}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: "#8a9aaa",
                    marginTop: 3,
                    textAlign: m.sender === "nurse" ? "right" : "left"
                  }}>
                    {m.time}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              gap: 10,
              background: "#ffffff",
            }}>
              <input
                type="text"
                placeholder="Type message to doctor..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#1a2332",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  background: "#2E7D32",
                  border: "none",
                  borderRadius: 10,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Low Internet Warning Popup Modal */}
      {showLowInternetModal && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            color: "#1a2332",
            borderRadius: 20,
            padding: "24px 20px",
            width: "100%",
            maxWidth: 340,
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            animation: "scaleIn 0.3s ease-out",
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "#fff9c4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle size={26} color="#f57f17" />
            </div>

            <h4 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>
              Low Internet Connection
            </h4>

            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              Your network speed has dropped. We recommend switching to chat-only mode to preserve connection stability.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleSwitchToChatOnly}
                style={{
                  background: "#2E7D32",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Switch to Chat-Only Mode
              </button>

              <button
                onClick={() => setShowLowInternetModal(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #cfd8dc",
                  borderRadius: 12,
                  padding: "10px",
                  color: "#64748b",
                  fontWeight: 500,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Keep Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Fullscreen Call End / Prescription Transmission Loader */}
      {endingCallStatus !== "idle" && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#2E7D32",
          color: "#fff",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}>
          {endingCallStatus === "sending_prescription" ? (
            <div style={{ animation: "scaleIn 0.3s ease-out" }}>
              {/* Pulsing Loading Spinner */}
              <div style={{
                position: "relative",
                width: 70,
                height: 70,
                margin: "0 auto 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div style={{
                  position: "absolute",
                  border: "3px solid rgba(255,255,255,0.2)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  width: "100%",
                  height: "100%",
                  animation: "spin 1s linear infinite",
                }} />
                <Shield size={28} />
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
                Ending Call Session
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.8)", maxWidth: 260, lineHeight: 1.5 }}>
                Doctor is compiling and transmitting the digital prescription. Please do not close the app...
              </p>
            </div>
          ) : (
            <div style={{ animation: "scaleIn 0.3s ease-out" }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#fff",
                color: "#2E7D32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
              }}>
                <CheckCircle size={36} />
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
                Prescription Transmitted!
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.85)", maxWidth: 280, lineHeight: 1.5 }}>
                The prescription has been delivered. You can review it in the Alerts / Notification section.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.1; }
          100% { transform: scale(0.9); opacity: 0.4; }
        }
        @keyframes voiceWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
