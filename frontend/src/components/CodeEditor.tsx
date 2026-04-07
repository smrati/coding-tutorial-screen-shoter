import Editor, { type OnMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";

interface Props {
  onEditorReady: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export default function CodeEditor({ onEditorReady, wrapperRef }: Props) {
  const handleMount: OnMount = (editor) => {
    onEditorReady(editor);
  };

  return (
    <div ref={wrapperRef} className="h-full w-full rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language="python"
        theme="vs-dark"
        defaultValue="# Write your Python code here
# Press Ctrl+S (Cmd+S on Mac) to capture a screenshot

def hello():
    print('Hello, World!')
"
        onMount={handleMount}
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
