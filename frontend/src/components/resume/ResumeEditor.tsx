'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading1, Heading2, Heading3, Italic, List, Redo2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeEditorProps {
  content: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, disabled, onClick, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
          : 'text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {children}
    </button>
  );
}

export function ResumeEditor({ content, onChange }: ResumeEditorProps) {
  const initializedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'resume-editor-content min-h-[60vh] px-6 py-6 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  // 异步加载初始内容（仅一次）
  useEffect(() => {
    if (!editor || initializedRef.current) return;
    const doc = content;
    if (!doc || typeof doc !== 'object' || (doc as { type?: unknown }).type !== 'doc') return;
    initializedRef.current = true;
    editor.commands.setContent(doc as never, false);
  }, [editor, content]);

  // 内容变化（重新生成/切换版本）时重置编辑器
  useEffect(() => {
    initializedRef.current = false;
  }, [content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-light bg-white dark:border-border-dark dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-1 border-b border-border-light px-3 py-2 dark:border-border-dark">
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          label="H1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="H3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border-light dark:bg-border-dark" aria-hidden="true" />
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <span
          className="mx-1 h-5 w-px bg-border-light dark:border-border-dark"
          aria-hidden="true"
        />
        <ToolbarButton
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
