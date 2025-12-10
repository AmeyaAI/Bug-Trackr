import React from 'react';
import dynamic from 'next/dynamic';
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from '@/contexts/ThemeContext';

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  error?: boolean;
  label?: string;
  required?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  minHeight = '200px',
  disabled = false,
  error = false,
  label,
  required = false,
}) => {
  const { theme } = useTheme();
  
  // Parse minHeight string to number if possible
  const heightNum = parseInt(minHeight.replace('px', ''), 10) || 200;

  return (
    <div data-color-mode={theme} className="w-full">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className={error ? "border border-destructive rounded-md" : ""}>
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          height={heightNum}
          preview="live"
          textareaProps={{
            placeholder,
            disabled
          }}
          style={{
            backgroundColor: 'transparent',
          }}
          commandsFilter={(cmd) => {
            if (cmd.name === 'fullscreen') {
              return false;
            }
            return cmd;
          }}
        />
      </div>
    </div>
  );
};
