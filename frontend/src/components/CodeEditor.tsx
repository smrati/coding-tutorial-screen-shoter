import Editor, { type OnMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";

const DEFAULT_CODE = `# Write your Python code here
# Press Ctrl+S (Cmd+S on Mac) to capture a screenshot

def hello():
    print('Hello, World!')
`;

interface Props {
  initialValue: string | undefined;
  onEditorReady: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onChange?: (value: string) => void;
}

export default function CodeEditor({
  initialValue,
  onEditorReady,
  wrapperRef,
  onChange,
}: Props) {
  const handleMount: OnMount = (editor) => {
    onEditorReady(editor);
  };

  return (
    <div ref={wrapperRef} className="h-full w-full rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language="python"
        theme="vs-dark"
        defaultValue={initialValue || DEFAULT_CODE}
        onMount={handleMount}
        onChange={(value) => onChange?.(value ?? "")}
        options={{
          fontSize: 16,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
