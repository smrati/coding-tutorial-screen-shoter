import { useEffect, useRef, useCallback, useMemo } from "react";
import MDEditor from "@uiw/react-md-editor";
import type { ICommand } from "@uiw/react-md-editor";
import { getCommands } from "@uiw/react-md-editor";
import rehypeHighlight from "rehype-highlight";
import { uploadImage } from "../services/api";

const DEFAULT_MARKDOWN = `# Welcome to Tutorial Recorder

Write your tutorial content here using **Markdown**.

## Code Example

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

## Tips

- Press **Ctrl+S** to capture a screenshot
- Use Markdown to combine **text**, \`code\`, and more
- Paste images directly into the editor
- Export your slides as a video when done
`;

interface Props {
  initialValue: string | undefined;
  value: string;
  onChange: (value: string) => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
}

function createImageCommand(onChange: (v: string) => void, valueRef: React.RefObject<string>): ICommand {
  return {
    name: "image",
    keyCommand: "image",
    shortcuts: "ctrlcmd+k",
    buttonProps: { "aria-label": "Add image", title: "Add image" },
    icon: (
      <svg width="13" height="13" viewBox="0 0 20 20">
        <path
          fill="currentColor"
          d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"
        />
      </svg>
    ),
    execute: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const placeholder = `![uploading...]\n`;
        const before = valueRef.current || "";
        onChange(before + placeholder);

        try {
          const url = await uploadImage(file);
          const current = valueRef.current || "";
          onChange(current.replace(placeholder, `\n![image](${url})\n`));
        } catch (err) {
          console.error("Image upload failed:", err);
          const current = valueRef.current || "";
          onChange(current.replace(placeholder, ""));
        }
      };
      input.click();
    },
  };
}

export default function MarkdownEditor({
  initialValue,
  value,
  onChange,
  previewRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!containerRef.current) return;
    const previewEl = containerRef.current.querySelector(".w-md-editor-preview");
    if (previewEl) {
      (previewRef as React.MutableRefObject<HTMLDivElement | null>).current =
        previewEl as HTMLDivElement;
      (previewEl as HTMLElement).style.overflow = "hidden";

      let style = previewEl.querySelector("#youtube-preview-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "youtube-preview-style";
        style.textContent = `
          .wmde-markdown {
            font-size: 18px !important;
            line-height: 1.6 !important;
            padding: 2rem !important;
          }
          .wmde-markdown h1 { font-size: 2em !important; margin: 0.6em 0 0.4em !important; }
          .wmde-markdown h2 { font-size: 1.5em !important; margin: 0.5em 0 0.3em !important; }
          .wmde-markdown h3 { font-size: 1.25em !important; margin: 0.4em 0 0.3em !important; }
          .wmde-markdown h4 { font-size: 1.1em !important; }
          .wmde-markdown code { font-size: 0.85em !important; }
          .wmde-markdown pre { font-size: 15px !important; }
          .wmde-markdown img { max-width: 100% !important; }
          .wmde-markdown ul, .wmde-markdown ol { font-size: 1em !important; }
          .wmde-markdown blockquote { font-size: 1em !important; }
          .wmde-markdown p { margin: 0.5em 0 !important; }
        `;
        previewEl.appendChild(style);
      }
    }
  }, [previewRef]);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const placeholder = `![uploading...]\n`;
          const beforePaste = valueRef.current || "";
          const withPlaceholder = beforePaste + placeholder;
          onChange(withPlaceholder);

          uploadImage(file)
            .then((url) => {
              const current = valueRef.current || "";
              const updated = current.replace(
                placeholder,
                `\n![image](${url})\n`
              );
              onChange(updated);
            })
            .catch((err) => {
              console.error("Image upload failed:", err);
              const current = valueRef.current || "";
              onChange(current.replace(placeholder, ""));
            });
          return;
        }
      }
    },
    [onChange]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const imageCommand = useMemo(
    () => createImageCommand(onChange, valueRef),
    [onChange]
  );

  const commands = useMemo(() => {
    const defaults = getCommands();
    return defaults.map((cmd) => (cmd.name === "image" ? imageCommand : cmd));
  }, [imageCommand]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg overflow-hidden" data-color-mode="dark">
      <MDEditor
        value={value ?? initialValue ?? DEFAULT_MARKDOWN}
        onChange={(v) => onChange(v ?? "")}
        preview="live"
        height="100%"
        commands={commands}
        previewOptions={{
          rehypePlugins: [rehypeHighlight],
        }}
      />
    </div>
  );
}

export { DEFAULT_MARKDOWN };
