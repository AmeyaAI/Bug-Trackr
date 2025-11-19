/**
 * MarkdownEditor Component
 * 
 * A rich-text markdown editor with formatting toolbar and live preview.
 * Features a two-pane layout with Write/Preview tabs similar to GitHub.
 * 
 * Supports:
 * - Text formatting (bold, italic, underline, strikethrough)
 * - Code blocks and inline code
 * - Headings (H1, H2, H3)
 * - Lists (bullet, numbered)
 * - Quotes and dividers
 * - Text size options
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  MoreHorizontal,
  ChevronDown,
  Eye,
  FileEdit,
  Type,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

type TabMode = 'write' | 'preview';

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
  const [activeTab, setActiveTab] = useState<TabMode>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get current selection or insert at cursor
  const insertText = useCallback((before: string, after: string = '', placeholder: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      // Select the inserted text so user can immediately type to replace placeholder
      const selectionStart = start + before.length;
      const selectionEnd = selectionStart + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  }, [value, onChange]);
  // Insert text at line start
  const insertAtLineStart = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [value, onChange]);

  // Formatting functions
  const formatBold = useCallback(() => insertText('**', '**', 'bold text'), [insertText]);
  const formatItalic = useCallback(() => insertText('*', '*', 'italic text'), [insertText]);
  const formatUnderline = useCallback(() => insertText('<u>', '</u>', 'underlined text'), [insertText]);
  const formatStrikethrough = useCallback(() => insertText('~~', '~~', 'strikethrough text'), [insertText]);
  const formatInlineCode = useCallback(() => insertText('`', '`', 'code'), [insertText]);
  const formatCodeBlock = useCallback(() => insertText('\n```\n', '\n```\n', 'code block'), [insertText]);
  const formatHeading1 = useCallback(() => insertAtLineStart('# '), [insertAtLineStart]);
  const formatHeading2 = useCallback(() => insertAtLineStart('## '), [insertAtLineStart]);
  const formatHeading3 = useCallback(() => insertAtLineStart('### '), [insertAtLineStart]);
  const formatBulletList = useCallback(() => insertAtLineStart('- '), [insertAtLineStart]);
  const formatNumberedList = useCallback(() => insertAtLineStart('1. '), [insertAtLineStart]);
  const formatQuote = useCallback(() => insertAtLineStart('> '), [insertAtLineStart]);
  const formatDivider = useCallback(() => insertText('\n\n---\n\n'), [insertText]);

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !disabled) {
        if (e.key === 'b') {
          e.preventDefault();
          formatBold();
        } else if (e.key === 'i') {
          e.preventDefault();
          formatItalic();
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
      return () => textarea.removeEventListener('keydown', handleKeyDown);
    }
  }, [disabled, formatBold, formatItalic]);

  return (
    <div>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <Card className={`overflow-hidden p-0 gap-0 ${error ? 'border-destructive' : ''}`}>
        {/* Tab Navigation */}
        <div className="flex items-center border-b bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors
              border-b-2 -mb-[1px]
              ${activeTab === 'write' 
                ? 'border-primary text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <FileEdit className="size-4" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors
              border-b-2 -mb-[1px]
              ${activeTab === 'preview' 
                ? 'border-primary text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Eye className="size-4" />
            Preview
          </button>
        </div>

        {/* Toolbar - Only show in write mode */}
        {activeTab === 'write' && (
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b bg-muted/20">
            {/* Text Formatting Group */}
            <div className="flex items-center gap-0.5 pr-2 border-r">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatBold}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Bold (Ctrl+B)"
              >
                <Bold className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatItalic}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Italic (Ctrl+I)"
              >
                <Italic className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatUnderline}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Underline"
              >
                <Underline className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatStrikethrough}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Strikethrough"
              >
                <Strikethrough className="size-4" />
              </Button>
            </div>

            {/* Code Group */}
            <div className="flex items-center gap-0.5 pr-2 border-r">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatInlineCode}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Inline code"
              >
                <Code className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatCodeBlock}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Code block"
              >
                <Code2 className="size-4" />
              </Button>
            </div>

            {/* Heading Dropdown */}
            <div className="flex items-center pr-2 border-r">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 px-2 hover:bg-accent"
                    title="Heading"
                  >
                    <Type className="size-4 mr-1" />
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={formatHeading1}>
                    <Heading1 className="size-4 mr-2" />
                    Heading 1
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={formatHeading2}>
                    <Heading2 className="size-4 mr-2" />
                    Heading 2
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={formatHeading3}>
                    <Heading3 className="size-4 mr-2" />
                    Heading 3
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* List Group */}
            <div className="flex items-center gap-0.5 pr-2 border-r">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatBulletList}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Bullet list"
              >
                <List className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatNumberedList}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Numbered list"
              >
                <ListOrdered className="size-4" />
              </Button>
            </div>

            {/* Quote & Divider Group */}
            <div className="flex items-center gap-0.5 pr-2 border-r">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatQuote}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Quote"
              >
                <Quote className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formatDivider}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Horizontal divider"
              >
                <Minus className="size-4" />
              </Button>
            </div>

            {/* More Options */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 w-8 p-0 hover:bg-accent"
                    title="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => insertText('[', '](url)', 'link text')}>
                    Insert link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertText('![', '](url)', 'alt text')}>
                    Insert image
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => insertText('\n- [ ] ', '', 'Task')}>
                    Task list
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertText('\n| Column 1 | Column 2 |\n|----------|----------|\n| ', ' |  |\n', 'Cell')}>
                    Insert table
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div>
          {activeTab === 'write' ? (
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[200px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none rounded-none font-mono text-sm p-3"
              style={{ minHeight }}
            />
          ) : (
            <div 
              className="p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none overflow-auto"
              style={{ minHeight }}
            >
              {value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom rendering for better styling
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                    code: (props) => {
                      const { inline, children, ...rest } = props as { inline?: boolean; children?: React.ReactNode };
                      return inline ? (
                        <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...rest}>
                          {children}
                        </code>
                      ) : (
                        <code className="block p-3 rounded bg-muted text-sm font-mono overflow-x-auto" {...rest}>
                          {children}
                        </code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-6 border-border" />,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                  }}
                >
                  {value}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">Nothing to preview</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
