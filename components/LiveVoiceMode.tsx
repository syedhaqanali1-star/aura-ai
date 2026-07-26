"use client";

import {
  ChevronDown,
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useChat } from "@/context/ChatContext";

type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;
  onerror:
    | ((event: SpeechRecognitionErrorEventLike) => void)
    | null;
};

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type LiveVoiceModeProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TranscriptEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SILENCE_DELAY_MS = 650;
const BARGE_IN_START_DELAY_MS = 550;
const BARGE_IN_RMS_THRESHOLD = 0.055;
const BARGE_IN_FRAMES_REQUIRED = 5;

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " Code omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getVoiceLabel(
  voice: SpeechSynthesisVoice
): string {
  const localLabel = voice.localService
    ? "Device"
    : "Online";

  return `${voice.name} · ${voice.lang} · ${localLabel}`;
}

function choosePreferredVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("en")
  );

  const preferredNames = [
    "Microsoft Aria",
    "Microsoft Jenny",
    "Google US English",
    "Samantha",
    "Microsoft Guy",
    "Daniel",
  ];

  for (const preferredName of preferredNames) {
    const match = englishVoices.find((voice) =>
      voice.name
        .toLowerCase()
        .includes(preferredName.toLowerCase())
    );

    if (match) {
      return match;
    }
  }

  return englishVoices[0] ?? voices[0] ?? null;
}

export default function LiveVoiceMode({
  isOpen,
  onClose,
}: LiveVoiceModeProps) {
  const {
    currentMessages,
    isGenerating,
    sendMessage,
    stopGenerating,
  } = useChat();

  const [status, setStatus] =
    useState<VoiceStatus>("idle");
  const [isMuted, setIsMuted] =
    useState(false);
  const [speakerEnabled, setSpeakerEnabled] =
    useState(true);
  const [interimTranscript, setInterimTranscript] =
    useState("");
  const [pendingUserText, setPendingUserText] =
    useState("");
  const [errorMessage, setErrorMessage] =
    useState("");
  const [transcriptEntries, setTranscriptEntries] =
    useState<TranscriptEntry[]>([]);
  const [availableVoices, setAvailableVoices] =
    useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] =
    useState("");
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] =
    useState(false);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);
  const shouldRestartRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const isMutedRef = useRef(isMuted);
  const statusRef = useRef<VoiceStatus>(status);
  const speakerEnabledRef =
    useRef(speakerEnabled);
  const selectedVoiceUriRef =
    useRef(selectedVoiceUri);
  const silenceTimerRef =
    useRef<number | null>(null);
  const pendingUserTextRef = useRef("");
  const awaitingAssistantRef = useRef(false);
  const messagesBeforeSendRef = useRef(0);
  const spokenAssistantMessageRef =
    useRef<string | null>(null);
  const transcriptEndRef =
    useRef<HTMLDivElement | null>(null);

  const microphoneStreamRef =
    useRef<MediaStream | null>(null);
  const audioContextRef =
    useRef<AudioContext | null>(null);
  const analyserRef =
    useRef<AnalyserNode | null>(null);
  const animationFrameRef =
    useRef<number | null>(null);
  const speakingStartedAtRef = useRef(0);
  const loudFrameCountRef = useRef(0);
  const bargeInLockedRef = useRef(false);

  const startRecognitionRef =
    useRef<() => void>(() => undefined);
  const handleBargeInRef =
    useRef<() => void>(() => undefined);

  const statusText: Record<VoiceStatus, string> =
    useMemo(
      () => ({
        idle: "Ready",
        connecting: "Starting…",
        listening: "Listening",
        thinking: "Thinking",
        speaking: "Aura is speaking",
        error: "Voice unavailable",
      }),
      []
    );

  const selectedVoice = useMemo(
    () =>
      availableVoices.find(
        (voice) =>
          voice.voiceURI === selectedVoiceUri
      ) ?? null,
    [availableVoices, selectedVoiceUri]
  );

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    speakerEnabledRef.current = speakerEnabled;
  }, [speakerEnabled]);

  useEffect(() => {
    selectedVoiceUriRef.current =
      selectedVoiceUri;
  }, [selectedVoiceUri]);

  useEffect(() => {
    pendingUserTextRef.current = pendingUserText;
  }, [pendingUserText]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    shouldRestartRef.current = false;

    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.onend = null;
      recognition.abort();
    }

    recognitionRef.current = null;
  }, []);

  const stopMicrophoneMonitor =
    useCallback(() => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );
        animationFrameRef.current = null;
      }

      analyserRef.current?.disconnect();
      analyserRef.current = null;

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }

      microphoneStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      microphoneStreamRef.current = null;
      loudFrameCountRef.current = 0;
      bargeInLockedRef.current = false;
    }, []);

  const startMicrophoneMonitor =
    useCallback(async () => {
      stopMicrophoneMonitor();

      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

        if (!isOpenRef.current) {
          stream
            .getTracks()
            .forEach((track) => track.stop());
          return;
        }

        const audioContext = new AudioContext();
        const source =
          audioContext.createMediaStreamSource(
            stream
          );
        const analyser =
          audioContext.createAnalyser();

        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.25;
        source.connect(analyser);

        microphoneStreamRef.current = stream;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const samples =
          new Float32Array(
            analyser.fftSize
          );

        const monitor = () => {
          const activeAnalyser =
            analyserRef.current;

          if (!activeAnalyser) {
            return;
          }

          activeAnalyser.getFloatTimeDomainData(
            samples
          );

          let sumSquares = 0;

          for (
            let index = 0;
            index < samples.length;
            index += 1
          ) {
            sumSquares +=
              samples[index] * samples[index];
          }

          const rms = Math.sqrt(
            sumSquares / samples.length
          );

          const canInterrupt =
            statusRef.current === "speaking" &&
            !isMutedRef.current &&
            Date.now() -
              speakingStartedAtRef.current >
              BARGE_IN_START_DELAY_MS &&
            !bargeInLockedRef.current;

          if (
            canInterrupt &&
            rms >= BARGE_IN_RMS_THRESHOLD
          ) {
            loudFrameCountRef.current += 1;
          } else {
            loudFrameCountRef.current = Math.max(
              0,
              loudFrameCountRef.current - 1
            );
          }

          if (
            canInterrupt &&
            loudFrameCountRef.current >=
              BARGE_IN_FRAMES_REQUIRED
          ) {
            bargeInLockedRef.current = true;
            loudFrameCountRef.current = 0;
            handleBargeInRef.current();
          }

          animationFrameRef.current =
            window.requestAnimationFrame(
              monitor
            );
        };

        monitor();
      } catch {
        setErrorMessage(
          "Aura needs microphone permission for live voice and interruption."
        );
      }
    }, [stopMicrophoneMonitor]);

  const speakText = useCallback(
    (rawText: string) => {
      window.speechSynthesis?.cancel();

      const text =
        cleanTextForSpeech(rawText);

      if (
        !speakerEnabledRef.current ||
        !text
      ) {
        setStatus("connecting");

        window.setTimeout(() => {
          startRecognitionRef.current();
        }, 80);

        return;
      }

      const utterance =
        new SpeechSynthesisUtterance(text);

      const chosenVoice =
        availableVoices.find(
          (voice) =>
            voice.voiceURI ===
            selectedVoiceUriRef.current
        ) ??
        choosePreferredVoice(
          availableVoices
        );

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang =
          navigator.language || "en-US";
      }

      utterance.rate = 1.04;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        stopRecognition();
        speakingStartedAtRef.current =
          Date.now();
        loudFrameCountRef.current = 0;
        bargeInLockedRef.current = false;
        setStatus("speaking");
      };

      utterance.onend = () => {
        bargeInLockedRef.current = false;

        if (
          isOpenRef.current &&
          !isMutedRef.current
        ) {
          setStatus("connecting");

          window.setTimeout(() => {
            startRecognitionRef.current();
          }, 90);
        } else {
          setStatus("idle");
        }
      };

      utterance.onerror = () => {
        bargeInLockedRef.current = false;

        if (
          isOpenRef.current &&
          !isMutedRef.current
        ) {
          setStatus("connecting");

          window.setTimeout(() => {
            startRecognitionRef.current();
          }, 90);
        } else {
          setStatus("idle");
        }
      };

      window.speechSynthesis?.speak(utterance);
    },
    [availableVoices, stopRecognition]
  );

  const submitPendingSpeech = useCallback(() => {
    clearSilenceTimer();

    const text =
      pendingUserTextRef.current.trim();

    if (
      !text ||
      awaitingAssistantRef.current ||
      isGenerating
    ) {
      return;
    }

    stopRecognition();
    window.speechSynthesis?.cancel();

    pendingUserTextRef.current = "";
    setPendingUserText("");
    setInterimTranscript("");

    setTranscriptEntries((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text,
      },
    ]);

    messagesBeforeSendRef.current =
      currentMessages.length;
    awaitingAssistantRef.current = true;
    spokenAssistantMessageRef.current = null;

    setStatus("thinking");
    sendMessage(text);
  }, [
    clearSilenceTimer,
    currentMessages.length,
    isGenerating,
    sendMessage,
    stopRecognition,
  ]);

  const scheduleSpeechSubmission =
    useCallback(() => {
      clearSilenceTimer();

      silenceTimerRef.current =
        window.setTimeout(() => {
          submitPendingSpeech();
        }, SILENCE_DELAY_MS);
    }, [
      clearSilenceTimer,
      submitPendingSpeech,
    ]);

  const startRecognition = useCallback(() => {
    if (
      !isOpenRef.current ||
      isMutedRef.current ||
      awaitingAssistantRef.current ||
      statusRef.current === "speaking"
    ) {
      return;
    }

    setErrorMessage("");

    const SpeechRecognition =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("error");
      setErrorMessage(
        "Live speech recognition is not supported in this browser. Use Google Chrome or Microsoft Edge."
      );
      return;
    }

    stopRecognition();
    shouldRestartRef.current = true;

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      navigator.language || "en-US";

    recognition.onstart = () => {
      setStatus("listening");
      setErrorMessage("");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let temporaryText = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result =
          event.results[index];
        const spokenText =
          result[0].transcript;

        if (result.isFinal) {
          finalText += spokenText;
        } else {
          temporaryText += spokenText;
        }
      }

      if (finalText.trim()) {
        setPendingUserText((current) => {
          const separator =
            current.trim().length > 0
              ? " "
              : "";
          const next =
            `${current}${separator}${finalText.trim()}`;

          pendingUserTextRef.current = next;
          return next;
        });

        scheduleSpeechSubmission();
      }

      setInterimTranscript(
        temporaryText.trim()
      );

      if (temporaryText.trim()) {
        scheduleSpeechSubmission();
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === "aborted" ||
        event.error === "no-speech"
      ) {
        return;
      }

      shouldRestartRef.current = false;
      setStatus("error");

      if (event.error === "not-allowed") {
        setErrorMessage(
          "Microphone access was denied. Allow microphone access in your browser settings and try again."
        );
        return;
      }

      if (event.error === "audio-capture") {
        setErrorMessage(
          "No working microphone was found."
        );
        return;
      }

      setErrorMessage(
        event.message ||
          "Aura could not start live voice mode."
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (
        shouldRestartRef.current &&
        isOpenRef.current &&
        !isMutedRef.current &&
        !awaitingAssistantRef.current &&
        statusRef.current !== "speaking"
      ) {
        window.setTimeout(() => {
          startRecognitionRef.current();
        }, 120);
      }
    };

    recognitionRef.current = recognition;

    try {
      setStatus("connecting");
      recognition.start();
    } catch {
      recognitionRef.current = null;
      shouldRestartRef.current = false;
      setStatus("error");
      setErrorMessage(
        "The microphone could not start. Please try again."
      );
    }
  }, [
    scheduleSpeechSubmission,
    stopRecognition,
  ]);

  useEffect(() => {
    startRecognitionRef.current =
      startRecognition;
  }, [startRecognition]);

  const handleBargeIn = useCallback(() => {
    if (
      statusRef.current !== "speaking"
    ) {
      return;
    }

    window.speechSynthesis?.cancel();
    stopRecognition();

    setStatus("connecting");
    setInterimTranscript("");
    pendingUserTextRef.current = "";
    setPendingUserText("");

    window.setTimeout(() => {
      bargeInLockedRef.current = false;
      startRecognitionRef.current();
    }, 70);
  }, [stopRecognition]);

  useEffect(() => {
    handleBargeInRef.current =
      handleBargeIn;
  }, [handleBargeIn]);

  function toggleMute(): void {
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;

      if (
        !awaitingAssistantRef.current &&
        status !== "speaking"
      ) {
        window.setTimeout(() => {
          startRecognitionRef.current();
        }, 80);
      }

      return;
    }

    setIsMuted(true);
    isMutedRef.current = true;
    stopRecognition();
    clearSilenceTimer();
    setInterimTranscript("");

    if (status !== "thinking") {
      setStatus("idle");
    }
  }

  function resetConversation(): void {
    stopGenerating();
    stopRecognition();
    clearSilenceTimer();
    window.speechSynthesis?.cancel();

    awaitingAssistantRef.current = false;
    spokenAssistantMessageRef.current = null;
    pendingUserTextRef.current = "";

    setTranscriptEntries([]);
    setPendingUserText("");
    setInterimTranscript("");
    setErrorMessage("");
    setStatus("idle");

    if (!isMuted) {
      window.setTimeout(() => {
        startRecognitionRef.current();
      }, 100);
    }
  }

  function handleClose(): void {
    stopGenerating();
    stopRecognition();
    stopMicrophoneMonitor();
    clearSilenceTimer();
    window.speechSynthesis?.cancel();

    awaitingAssistantRef.current = false;
    spokenAssistantMessageRef.current = null;
    pendingUserTextRef.current = "";

    setStatus("idle");
    setTranscriptEntries([]);
    setPendingUserText("");
    setInterimTranscript("");
    setErrorMessage("");
    setIsMuted(false);
    setIsVoiceMenuOpen(false);

    onClose();
  }

  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth
        .getVoices()
        .slice()
        .sort((first, second) =>
          first.name.localeCompare(second.name)
        );

      setAvailableVoices(voices);

      setSelectedVoiceUri((current) => {
        if (
          current &&
          voices.some(
            (voice) =>
              voice.voiceURI === current
          )
        ) {
          return current;
        }

        return (
          choosePreferredVoice(voices)
            ?.voiceURI ?? ""
        );
      });
    };

    loadVoices();
    synth.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      synth.removeEventListener(
        "voiceschanged",
        loadVoices
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopRecognition();
      stopMicrophoneMonitor();
      clearSilenceTimer();
      window.speechSynthesis?.cancel();
      return;
    }

    void startMicrophoneMonitor();

    const timer =
      window.setTimeout(() => {
        startRecognitionRef.current();
      }, 160);

    return () => {
      window.clearTimeout(timer);
      stopRecognition();
      stopMicrophoneMonitor();
      clearSilenceTimer();
      window.speechSynthesis?.cancel();
    };
  }, [
    clearSilenceTimer,
    isOpen,
    startMicrophoneMonitor,
    stopMicrophoneMonitor,
    stopRecognition,
  ]);

  useEffect(() => {
    if (!speakerEnabled) {
      window.speechSynthesis?.cancel();

      if (
        statusRef.current === "speaking" &&
        isOpenRef.current &&
        !isMutedRef.current
      ) {
        setStatus("connecting");

        window.setTimeout(() => {
          startRecognitionRef.current();
        }, 70);
      }
    }
  }, [speakerEnabled]);

  useEffect(() => {
    if (
      !isOpen ||
      !awaitingAssistantRef.current
    ) {
      return;
    }

    if (isGenerating) {
      setStatus("thinking");
      return;
    }

    const newMessages =
      currentMessages.slice(
        messagesBeforeSendRef.current
      );

    const auraMessage = [...newMessages]
      .reverse()
      .find(
        (message) =>
          message.role === "aura" &&
          typeof message.text === "string" &&
          message.text.trim().length > 0
      );

    if (!auraMessage) {
      return;
    }

    if (
      spokenAssistantMessageRef.current ===
      auraMessage.text
    ) {
      return;
    }

    spokenAssistantMessageRef.current =
      auraMessage.text;
    awaitingAssistantRef.current = false;

    setTranscriptEntries((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: auraMessage.text,
      },
    ]);

    speakText(auraMessage.text);
  }, [
    currentMessages,
    isGenerating,
    isOpen,
    speakText,
  ]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    transcriptEntries,
    pendingUserText,
    interimTranscript,
  ]);

  if (!isOpen) {
    return null;
  }

  const liveUserText = [
    pendingUserText,
    interimTranscript,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#0d0d0d] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold">
            Voice with Aura
          </p>
          <p className="mt-0.5 text-xs text-white/40">
            Speak naturally and interrupt anytime
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
          aria-label="Close voice mode"
        >
          <X size={20} />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-4 sm:px-6">
        <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
          <div className="relative flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
            <div
              className={`absolute inset-0 rounded-full blur-3xl transition-all duration-500 ${
                status === "listening"
                  ? "scale-110 bg-blue-500/35"
                  : status === "speaking"
                    ? "scale-110 bg-violet-500/35"
                    : status === "thinking"
                      ? "scale-100 bg-emerald-500/25"
                      : status === "error"
                        ? "scale-90 bg-red-500/20"
                        : "scale-90 bg-white/10"
              }`}
            />

            <div
              className={`relative flex h-32 w-32 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] shadow-2xl backdrop-blur-2xl transition-all duration-300 sm:h-40 sm:w-40 ${
                status === "listening" ||
                status === "speaking"
                  ? "scale-105"
                  : "scale-100"
              }`}
            >
              <div
                className={`h-16 w-16 rounded-full blur-sm transition-all duration-300 sm:h-20 sm:w-20 ${
                  status === "listening"
                    ? "animate-pulse bg-blue-400"
                    : status === "speaking"
                      ? "animate-pulse bg-violet-400"
                      : status === "thinking"
                        ? "animate-pulse bg-emerald-400"
                        : status === "error"
                          ? "bg-red-400"
                          : "bg-white/40"
                }`}
              />
            </div>

            {(status === "listening" ||
              status === "speaking") && (
              <>
                <span
                  className={`absolute h-40 w-40 animate-ping rounded-full border sm:h-48 sm:w-48 ${
                    status === "listening"
                      ? "border-blue-400/25"
                      : "border-violet-400/25"
                  }`}
                />
                <span
                  className={`absolute h-48 w-48 animate-ping rounded-full border [animation-delay:300ms] sm:h-56 sm:w-56 ${
                    status === "listening"
                      ? "border-blue-400/10"
                      : "border-violet-400/10"
                  }`}
                />
              </>
            )}
          </div>

          <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {statusText[status]}
          </h1>

          <p className="mt-2 text-center text-sm text-white/45">
            {isMuted
              ? "Microphone muted"
              : status === "speaking"
                ? "Start talking to interrupt Aura"
                : status === "thinking"
                  ? "Preparing a response"
                  : "Pause briefly when you finish"}
          </p>

          <div className="mt-6 h-44 w-full overflow-y-auto rounded-3xl border border-white/[0.08] bg-white/[0.035] px-4 py-4 sm:h-52 sm:px-5">
            {transcriptEntries.length === 0 &&
            !liveUserText ? (
              <div className="flex h-full items-center justify-center text-center">
                <p className="max-w-sm text-sm leading-6 text-white/30">
                  Your conversation appears here.
                  Aura will automatically answer when
                  you stop speaking.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transcriptEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex ${
                      entry.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                        entry.role === "user"
                          ? "bg-white text-black"
                          : "bg-white/10 text-white/85"
                      }`}
                    >
                      {entry.text}
                    </div>
                  </div>
                ))}

                {liveUserText && (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm leading-6 text-white/70">
                      {pendingUserText}
                      {interimTranscript && (
                        <span className="text-white/40">
                          {pendingUserText ? " " : ""}
                          {interimTranscript}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm leading-6 text-red-200">
              {errorMessage}
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 px-4 pb-6 pt-3 sm:pb-8">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
          <div className="relative w-full">
            <button
              type="button"
              onClick={() =>
                setIsVoiceMenuOpen(
                  (current) => !current
                )
              }
              className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-left text-sm text-white/80 transition hover:bg-white/[0.08]"
              aria-expanded={isVoiceMenuOpen}
            >
              <span className="truncate">
                {selectedVoice
                  ? selectedVoice.name
                  : "Default device voice"}
              </span>
              <ChevronDown
                size={17}
                className={`shrink-0 text-white/45 transition ${
                  isVoiceMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {isVoiceMenuOpen && (
              <div className="absolute bottom-12 left-0 z-20 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#1b1b1b] p-1.5 shadow-2xl">
                {availableVoices.length > 0 ? (
                  availableVoices.map((voice) => (
                    <button
                      key={voice.voiceURI}
                      type="button"
                      onClick={() => {
                        setSelectedVoiceUri(
                          voice.voiceURI
                        );
                        setIsVoiceMenuOpen(false);
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        voice.voiceURI ===
                        selectedVoiceUri
                          ? "bg-white text-black"
                          : "text-white/75 hover:bg-white/10"
                      }`}
                    >
                      {getVoiceLabel(voice)}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm text-white/40">
                    No additional browser voices
                    were found.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.055] p-2">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                isMuted
                  ? "bg-white text-black"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label={
                isMuted
                  ? "Unmute microphone"
                  : "Mute microphone"
              }
            >
              {isMuted ? (
                <MicOff size={19} />
              ) : (
                <Mic size={19} />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setSpeakerEnabled(
                  (current) => !current
                )
              }
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                speakerEnabled
                  ? "text-white hover:bg-white/10"
                  : "bg-white text-black"
              }`}
              aria-label={
                speakerEnabled
                  ? "Turn voice off"
                  : "Turn voice on"
              }
            >
              {speakerEnabled ? (
                <Volume2 size={19} />
              ) : (
                <VolumeX size={19} />
              )}
            </button>

            <button
              type="button"
              onClick={resetConversation}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              aria-label="Restart voice conversation"
            >
              <RotateCcw size={18} />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
            >
              End
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
