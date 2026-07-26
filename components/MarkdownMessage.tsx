"use client";

import {
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import CodeBlock from "@/components/CodeBlock";

type MarkdownMessageProps = {
  content: string;
};

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

export default function MarkdownMessage({
  content,
}: MarkdownMessageProps) {
  return (
    <div className="max-w-none break-words text-[15px] leading-7 text-[var(--aura-text)] transition-colors duration-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-7 text-2xl font-semibold tracking-[-0.02em] text-[var(--aura-text)] first:mt-0">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-3 mt-7 text-xl font-semibold tracking-[-0.015em] text-[var(--aura-text)] first:mt-0">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-lg font-semibold text-[var(--aura-text)] first:mt-0">
              {children}
            </h3>
          ),

          h4: ({ children }) => (
            <h4 className="mb-2 mt-5 text-base font-semibold text-[var(--aura-text)] first:mt-0">
              {children}
            </h4>
          ),

          p: ({ children }) => (
            <p className="my-3 leading-7 text-[var(--aura-text)] first:mt-0 last:mb-0">
              {children}
            </p>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--aura-text)]">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="italic text-[var(--aura-text-secondary)]">
              {children}
            </em>
          ),

          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-[var(--aura-text-muted)]">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-6 marker:text-[var(--aura-text-muted)]">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="leading-7 text-[var(--aura-text)]">
              {children}
            </li>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-[3px] border-[var(--aura-accent)] pl-4 text-[var(--aura-text-secondary)]">
              {children}
            </blockquote>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--aura-accent)] underline underline-offset-4 transition hover:opacity-80"
            >
              {children}
            </a>
          ),

          hr: () => (
            <hr className="my-6 border-[var(--aura-border)]" />
          ),

          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-[var(--aura-border)]">
              <table className="min-w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-[var(--aura-surface-secondary)]">
              {children}
            </thead>
          ),

          tbody: ({ children }) => (
            <tbody className="divide-y divide-[var(--aura-border)] bg-[var(--aura-surface)]">
              {children}
            </tbody>
          ),

          tr: ({ children }) => (
            <tr className="divide-x divide-[var(--aura-border)]">
              {children}
            </tr>
          ),

          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-[var(--aura-text)]">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="px-4 py-3 align-top text-[var(--aura-text-secondary)]">
              {children}
            </td>
          ),

          pre: ({ children }) => {
            const child = Array.isArray(children)
              ? children[0]
              : children;

            if (isValidElement<CodeElementProps>(child)) {
              const className =
                child.props.className ?? "";

              const languageMatch =
                /language-([\w-]+)/.exec(className);

              const language =
                languageMatch?.[1];

              const codeText = String(
                child.props.children ?? ""
              ).replace(/\n$/, "");

              return (
                <CodeBlock
                  code={codeText}
                  language={language}
                />
              );
            }

            return (
              <pre className="my-5 overflow-x-auto rounded-xl bg-[var(--aura-code-bg)] p-4 text-sm text-[var(--aura-code-text)]">
                {children}
              </pre>
            );
          },

          code: ({
            children,
            className,
            ...props
          }: ComponentPropsWithoutRef<"code">) => (
            <code
              {...props}
              className={`rounded-md bg-[var(--aura-inline-code-bg)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--aura-inline-code-text)] ${
                className ?? ""
              }`}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}