"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeBlockProps = {
  code: string;
  language?: string;
};

function formatLanguage(language?: string) {
  if (!language) return "Code";

  const names: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    jsx: "JavaScript JSX",
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TypeScript TSX",
    py: "Python",
    python: "Python",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    bash: "Bash",
    shell: "Shell",
    sh: "Shell",
    sql: "SQL",
    java: "Java",
    cpp: "C++",
    c: "C",
    cs: "C#",
    csharp: "C#",
    php: "PHP",
    ruby: "Ruby",
    rust: "Rust",
    go: "Go",
    kotlin: "Kotlin",
    swift: "Swift",
    markdown: "Markdown",
    md: "Markdown",
    yaml: "YAML",
    yml: "YAML",
    text: "Plain Text",
    plaintext: "Plain Text",
  };

  return names[language.toLowerCase()] ?? language.toUpperCase();
}

function normalizeLanguage(language?: string) {
  if (!language) return "text";

  const aliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    cs: "csharp",
    md: "markdown",
    yml: "yaml",
    plaintext: "text",
  };

  const normalizedLanguage = language.toLowerCase();

  return aliases[normalizedLanguage] ?? normalizedLanguage;
}

export default function CodeBlock({
  code,
  language,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const cleanCode = useMemo(() => {
    return code.replace(/\n$/, "");
  }, [code]);

  const normalizedLanguage = normalizeLanguage(language);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-black/10 bg-[#171717] shadow-sm">
      <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#212121] px-4">
        <span className="text-xs font-medium text-white/60">
          {formatLanguage(language)}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label={copied ? "Code copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={normalizedLanguage}
          style={oneDark}
          showLineNumbers={false}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: "16px",
            background: "#171717",
            fontSize: "13px",
            lineHeight: "22px",
            minWidth: "max-content",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },
          }}
        >
          {cleanCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}