import { useEffect, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import rehypeHighlight from "rehype-highlight";

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
- Export your slides as a video when done
`;

interface Props {
  initialValue: string | undefined;
  value: string;
  onChange: (value: string) => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
}

export default function MarkdownEditor({
  initialValue,
  value,
  onChange,
  previewRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const previewEl = containerRef.current.querySelector(".w-md-editor-preview");
    if (previewEl) {
      (previewRef as React.MutableRefObject<HTMLDivElement | null>).current =
        previewEl as HTMLDivElement;
    }
  }, [previewRef]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg overflow-hidden" data-color-mode="dark">
      <MDEditor
        value={value || initialValue || DEFAULT_MARKDOWN}
        onChange={(v) => onChange(v ?? "")}
        preview="live"
        height="100%"
        previewOptions={{
          rehypePlugins: [rehypeHighlight],
        }}
      />
    </div>
  );
}

export { DEFAULT_MARKDOWN };
