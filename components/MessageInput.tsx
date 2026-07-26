"use client";

import {
  ArrowUp,
  AudioLines,
  Globe2,
  Mic,
  Paperclip,
  Plus,
  Square,
  UploadCloud,
  X,
} from "lucide-react";

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import FilePreview, {
  type UploadFile,
} from "@/components/FilePreview";

type MessageInputProps = {
  onSend: (
    message: string,
    files?: File[]
  ) => void;
  disabled?: boolean;
  onOpenLiveVoice?: () => void;
};

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;

    [index: number]: {
      isFinal: boolean;

      0: {
        transcript: string;
      };
    };
  };

  resultIndex: number;
};

type SpeechRecognitionErrorEventLike =
  Event & {
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
    | ((
        event: SpeechRecognitionEventLike
      ) => void)
    | null;

  onerror:
    | ((
        event: SpeechRecognitionErrorEventLike
      ) => void)
    | null;
};

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?:
      SpeechRecognitionConstructor;

    webkitSpeechRecognition?:
      SpeechRecognitionConstructor;
  }
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_TEXTAREA_HEIGHT = 200;

function createUploadFile(
  file: File
): UploadFile {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
  };
}

export default function MessageInput({
  onSend,
  disabled = false,
  onOpenLiveVoice,
}: MessageInputProps) {
  const [message, setMessage] =
    useState("");

  const [files, setFiles] =
    useState<UploadFile[]>([]);

  const [
    webSearchEnabled,
    setWebSearchEnabled,
  ] = useState(false);

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const [
    isListening,
    setIsListening,
  ] = useState(false);

  const [
    fileError,
    setFileError,
  ] = useState("");

  const [
    voiceError,
    setVoiceError,
  ] = useState("");

  const [
    isAttachmentMenuOpen,
    setIsAttachmentMenuOpen,
  ] = useState(false);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const attachmentMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const dragCounterRef = useRef(0);

  const speechRecognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null
    );

  const initialVoiceTextRef =
    useRef("");

  const cleanedMessage = message.trim();

  const hasContent =
    cleanedMessage.length > 0 ||
    files.length > 0;

  const canSend =
    hasContent &&
    cleanedMessage.length <=
      MAX_MESSAGE_LENGTH &&
    !disabled;

  function resizeTextarea() {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "0px";

    const nextHeight = Math.min(
      textarea.scrollHeight,
      MAX_TEXTAREA_HEIGHT
    );

    textarea.style.height =
      `${Math.max(nextHeight, 24)}px`;

    textarea.style.overflowY =
      textarea.scrollHeight >
      MAX_TEXTAREA_HEIGHT
        ? "auto"
        : "hidden";
  }

  useEffect(() => {
    resizeTextarea();
  }, [message]);

  useEffect(() => {
    function handleDocumentMouseDown(
      event: MouseEvent
    ) {
      const target = event.target as Node;

      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(
          target
        )
      ) {
        setIsAttachmentMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleDocumentMouseDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentMouseDown
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort();
      speechRecognitionRef.current = null;
    };
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ) {
    const nextMessage =
      event.target.value;

    if (
      nextMessage.length <=
      MAX_MESSAGE_LENGTH
    ) {
      setMessage(nextMessage);
    }
  }

  function addFiles(
    selectedFiles: File[]
  ) {
    setFileError("");

    const availableSlots =
      MAX_FILES - files.length;

    if (availableSlots <= 0) {
      setFileError(
        `You can attach up to ${MAX_FILES} files.`
      );

      return;
    }

    const validFiles: UploadFile[] = [];

    for (const file of selectedFiles) {
      if (
        validFiles.length >=
        availableSlots
      ) {
        break;
      }

      if (
        file.size > MAX_FILE_SIZE
      ) {
        setFileError(
          `"${file.name}" is larger than 25 MB and was not added.`
        );

        continue;
      }

      const alreadyAdded = files.some(
        (upload) =>
          upload.file.name === file.name &&
          upload.file.size === file.size &&
          upload.file.lastModified ===
            file.lastModified
      );

      if (alreadyAdded) {
        continue;
      }

      validFiles.push(
        createUploadFile(file)
      );
    }

    if (validFiles.length > 0) {
      setFiles((currentFiles) => [
        ...currentFiles,
        ...validFiles,
      ]);
    }

    if (
      selectedFiles.length >
      availableSlots
    ) {
      setFileError(
        `You can attach up to ${MAX_FILES} files.`
      );
    }

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    addFiles(selectedFiles);

    event.target.value = "";

    setIsAttachmentMenuOpen(false);
  }

  function handleRemoveFile(
    id: string
  ) {
    setFiles((currentFiles) =>
      currentFiles.filter(
        (upload) => upload.id !== id
      )
    );

    setFileError("");
  }

  function handleDragEnter(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    dragCounterRef.current += 1;

    setIsDragging(true);
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    dragCounterRef.current -= 1;

    if (
      dragCounterRef.current <= 0
    ) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    dragCounterRef.current = 0;
    setIsDragging(false);

    const droppedFiles = Array.from(
      event.dataTransfer.files
    );

    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }

  function stopVoiceInput() {
    const recognition =
      speechRecognitionRef.current;

    if (!recognition) {
      setIsListening(false);
      return;
    }

    recognition.stop();
  }

  function startVoiceInput() {
    setVoiceError("");

    if (disabled) return;

    if (isListening) {
      stopVoiceInput();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is not supported in this browser. Try Google Chrome or Microsoft Edge."
      );

      return;
    }

    speechRecognitionRef.current?.abort();

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.lang =
      navigator.language || "en-US";

    initialVoiceTextRef.current =
      message.trim();

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError("");
    };

    recognition.onresult = (
      event
    ) => {
      let completeTranscript = "";

      for (
        let index = 0;
        index < event.results.length;
        index += 1
      ) {
        completeTranscript +=
          event.results[index][0]
            .transcript;
      }

      const spokenText =
        completeTranscript.trim();

      const existingText =
        initialVoiceTextRef.current.trim();

      const nextMessage =
        existingText && spokenText
          ? `${existingText} ${spokenText}`
          : existingText || spokenText;

      setMessage(
        nextMessage.slice(
          0,
          MAX_MESSAGE_LENGTH
        )
      );
    };

    recognition.onerror = (
      event
    ) => {
      setIsListening(false);

      if (
        event.error === "not-allowed"
      ) {
        setVoiceError(
          "Microphone access was denied. Allow microphone access in your browser settings and try again."
        );

        return;
      }

      if (
        event.error === "no-speech"
      ) {
        setVoiceError(
          "Aura could not hear anything. Please try again."
        );

        return;
      }

      if (
        event.error ===
        "audio-capture"
      ) {
        setVoiceError(
          "No working microphone was found."
        );

        return;
      }

      if (
        event.error === "aborted"
      ) {
        return;
      }

      setVoiceError(
        event.message ||
          "Voice input stopped because of an error."
      );
    };

    recognition.onend = () => {
      setIsListening(false);

      if (
        speechRecognitionRef.current ===
        recognition
      ) {
        speechRecognitionRef.current =
          null;
      }

      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        resizeTextarea();
      });
    };

    speechRecognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      speechRecognitionRef.current =
        null;

      setIsListening(false);

      setVoiceError(
        "The microphone could not start. Please try again."
      );
    }
  }

  function sendMessage() {
    if (!canSend) return;

    if (isListening) {
      stopVoiceInput();
    }

    onSend(
      cleanedMessage,
      files.map(
        (upload) => upload.file
      )
    );

    setMessage("");
    setFiles([]);
    setFileError("");
    setVoiceError("");
    setIsAttachmentMenuOpen(false);

    initialVoiceTextRef.current = "";

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative z-20 shrink-0 bg-[var(--aura-background)] px-3 pb-2 text-[var(--aura-text)] transition-colors duration-200 sm:px-4 sm:pb-3"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-14 bg-gradient-to-t from-[var(--aura-background)] via-[var(--aura-background)] to-transparent" />

      <div className="relative mx-auto w-full max-w-[680px]">
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[24px] border-2 border-dashed border-[var(--aura-border)] bg-[var(--aura-surface)]/95 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--aura-surface-hover)] text-[var(--aura-text-secondary)]">
                <UploadCloud size={18} />
              </div>

              <p className="mt-2.5 text-[13px] font-medium text-[var(--aura-text)]">
                Drop files here
              </p>

              <p className="mt-1 text-xs text-[var(--aura-text-muted)]">
                Up to {MAX_FILES} files, 25 MB each
              </p>
            </div>
          </div>
        )}

        <div className="relative rounded-[24px] border border-[var(--aura-border)] bg-[var(--aura-surface-secondary)] shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all duration-200 focus-within:border-[var(--aura-border)] focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          {files.length > 0 && (
            <div className="px-3 pt-2.5">
              <FilePreview
                files={files}
                onRemove={handleRemoveFile}
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={
              handleFileSelection
            }
            className="hidden"
          />

          <div className="px-4 pb-0.5 pt-2.5">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "Listening..."
                  : files.length > 0
                    ? "Add a message..."
                    : "Message Aura"
              }
              rows={1}
              disabled={disabled}
              className="block min-h-6 max-h-[200px] w-full resize-none overflow-y-hidden border-0 bg-transparent p-0 text-[15px] leading-6 text-[var(--aura-text)] outline-none placeholder:text-[var(--aura-text-secondary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Message Aura"
            />
          </div>

          {isListening && (
            <div className="flex items-center gap-2 px-4 pb-1 text-[11px] text-red-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

              Listening…
            </div>
          )}

          {fileError && (
            <div className="mx-3 mb-1.5 flex items-start justify-between gap-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
              <span>{fileError}</span>

              <button
                type="button"
                onClick={() =>
                  setFileError("")
                }
                className="shrink-0 rounded-md p-0.5 transition hover:bg-red-500/20"
                aria-label="Dismiss file error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {voiceError && (
            <div className="mx-3 mb-1.5 flex items-start justify-between gap-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">
              <span>{voiceError}</span>

              <button
                type="button"
                onClick={() =>
                  setVoiceError("")
                }
                className="shrink-0 rounded-md p-0.5 transition hover:bg-red-500/20"
                aria-label="Dismiss voice error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-end justify-between gap-2 px-2 pb-2 pt-0.5">
            <div className="flex min-w-0 items-center gap-1">
              <div
                ref={attachmentMenuRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsAttachmentMenuOpen(
                      (currentValue) =>
                        !currentValue
                    )
                  }
                  disabled={disabled}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
                    isAttachmentMenuOpen
                      ? "bg-[var(--aura-surface-hover)] text-[var(--aura-text)]"
                      : "text-[var(--aura-text-secondary)] hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-label="Add files"
                  title="Add files"
                >
                  <Plus
                    size={18}
                    strokeWidth={1.9}
                  />
                </button>

                {isAttachmentMenuOpen && (
                  <div className="absolute bottom-10 left-0 z-50 w-52 overflow-hidden rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface)] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--aura-text-secondary)] transition hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                    >
                      <Paperclip
                        size={17}
                      />

                      <span>
                        Add photos and files
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setWebSearchEnabled(
                    (currentValue) =>
                      !currentValue
                  )
                }
                disabled={disabled}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition-all duration-150 ${
                  webSearchEnabled
                    ? "border-[var(--aura-accent)] bg-[var(--aura-primary-soft)] text-[var(--aura-accent)]"
                    : "border-transparent text-[var(--aura-text-secondary)] hover:border-[var(--aura-border)] hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                } disabled:cursor-not-allowed disabled:opacity-40`}
                aria-pressed={
                  webSearchEnabled
                }
                aria-label="Toggle web search"
                title="Search the web"
              >
                <Globe2 size={16} />

                <span className="hidden sm:inline">
                  Search
                </span>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!disabled && (
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                    isListening
                      ? "bg-red-500/15 text-red-500 hover:bg-red-500/20"
                      : "text-[var(--aura-text-secondary)] hover:bg-[var(--aura-surface-hover)] hover:text-[var(--aura-text)]"
                  }`}
                  aria-label={
                    isListening
                      ? "Stop voice input"
                      : "Start voice input"
                  }
                  aria-pressed={
                    isListening
                  }
                  title={
                    isListening
                      ? "Stop listening"
                      : "Voice input"
                  }
                >
                  {isListening ? (
                    <Square
                      size={14}
                      fill="currentColor"
                    />
                  ) : (
                    <Mic
                      size={17}
                      strokeWidth={1.9}
                    />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (disabled) return;

                  if (canSend) {
                    sendMessage();
                    return;
                  }

                  onOpenLiveVoice?.();
                }}
                disabled={disabled}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                  disabled
                    ? "cursor-not-allowed bg-[var(--aura-text-muted)] text-[var(--aura-background)] opacity-60"
                    : canSend
                      ? "scale-100 bg-[var(--aura-primary)] text-white shadow-sm hover:bg-[var(--aura-primary-hover)] active:scale-90"
                      : "bg-[var(--aura-text)] text-[var(--aura-background)] shadow-sm hover:opacity-80 active:scale-90"
                }`}
                aria-label={
                  disabled
                    ? "Aura is responding"
                    : canSend
                      ? "Send message"
                      : "Start live voice chat"
                }
                title={
                  disabled
                    ? "Aura is responding"
                    : canSend
                      ? "Send message"
                      : "Start live voice chat"
                }
              >
                {disabled ? (
                  <Square
                    size={14}
                    fill="currentColor"
                    className="animate-pulse"
                  />
                ) : canSend ? (
                  <ArrowUp
                    size={16}
                    strokeWidth={2.4}
                    className="transition-transform duration-200"
                  />
                ) : (
                  <AudioLines
                    size={17}
                    strokeWidth={2}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[11px] leading-4 text-[var(--aura-text-secondary)]">
          Aura can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
}