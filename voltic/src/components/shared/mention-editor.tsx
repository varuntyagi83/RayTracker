"use client";

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { BookOpen, Image as ImageIcon } from "lucide-react";
import type { MentionableItem, Mention as MentionData } from "@/types/creative-studio";

// ─── Mention List Component (dropdown) ──────────────────────────────────────

interface MentionListProps {
  items: MentionableItem[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command({
            id: JSON.stringify({
              id: item.id,
              type: item.type,
              name: item.name,
              slug: item.slug,
            }),
            label: item.name,
          });
        }
      },
      [items, command]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border bg-popover p-2 shadow-md">
          <p className="text-sm text-muted-foreground px-2 py-1">No results</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-popover shadow-md overflow-hidden min-w-[240px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onClick={() => selectItem(index)}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="size-7 rounded object-cover border shrink-0"
              />
            ) : item.type === "brand_guidelines" ? (
              <div className="size-7 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen className="size-3.5" />
              </div>
            ) : (
              <div className="size-7 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ImageIcon className="size-3.5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{item.name}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              )}
            </div>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                item.type === "brand_guidelines"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {item.type === "brand_guidelines" ? "Brand" : "Asset"}
            </span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";

// ─── Main Editor ────────────────────────────────────────────────────────────

export interface MentionEditorRef {
  clearContent: () => void;
  submit: () => void;
}

interface MentionEditorProps {
  onSubmit: (content: string, mentions: MentionData[]) => void;
  onMentionQuery: (query: string) => Promise<MentionableItem[]>;
  disabled?: boolean;
  placeholder?: string;
}

export const MentionEditor = forwardRef<MentionEditorRef, MentionEditorProps>(
  ({ onSubmit, onMentionQuery, disabled, placeholder }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
        }),
        Placeholder.configure({
          placeholder: placeholder ?? "Type a message... Use @ to mention brand guidelines or assets",
        }),
        Mention.configure({
          HTMLAttributes: {
            class:
              "inline-flex items-center gap-0.5 rounded bg-indigo-100 text-indigo-700 px-1 py-0.5 text-sm font-medium",
          },
          suggestion: {
            char: "@",
            items: async ({ query }: { query: string }) => {
              return await onMentionQuery(query);
            },
            render: () => {
              let component: ReactRenderer<MentionListRef> | null = null;
              let popup: TippyInstance[] | null = null;

              return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onStart: (props: SuggestionProps<any>) => {
                  component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                  });

                  if (!props.clientRect) return;

                  popup = tippy("body", {
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: "manual",
                    placement: "bottom-start",
                  });
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onUpdate: (props: SuggestionProps<any>) => {
                  component?.updateProps(props);

                  if (!props.clientRect) return;

                  popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });
                },
                onKeyDown: (props: SuggestionKeyDownProps) => {
                  if (props.event.key === "Escape") {
                    popup?.[0]?.hide();
                    return true;
                  }
                  return component?.ref?.onKeyDown(props) ?? false;
                },
                onExit: () => {
                  popup?.[0]?.destroy();
                  component?.destroy();
                },
              };
            },
          },
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "min-h-[60px] max-h-[200px] overflow-y-auto px-3 py-2 text-sm focus:outline-none prose prose-sm max-w-none",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            // Check if mention dropdown is open
            const mentionPopup = document.querySelector("[data-tippy-root]");
            if (mentionPopup) return false;

            event.preventDefault();
            handleSubmit();
            return true;
          }
          return false;
        },
      },
      editable: !disabled,
    });

    const handleSubmit = useCallback(() => {
      if (!editor) return;

      const text = editor.getText().trim();
      if (!text) return;

      // Extract mentions from Tiptap document
      const mentions: MentionData[] = [];
      const doc = editor.getJSON();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function extractMentions(node: any) {
        if (node.type === "mention" && node.attrs) {
          try {
            const data = JSON.parse(node.attrs.id);
            mentions.push({
              type: data.type,
              id: data.id,
              name: data.name,
              slug: data.slug,
            });
          } catch {
            // Skip invalid mention data
          }
        }
        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            extractMentions(child);
          }
        }
      }

      extractMentions(doc);
      onSubmit(text, mentions);
      editor.commands.clearContent();
    }, [editor, onSubmit]);

    useImperativeHandle(ref, () => ({
      clearContent: () => {
        editor?.commands.clearContent();
      },
      submit: () => {
        handleSubmit();
      },
    }));

    if (!editor) return null;

    return (
      <div
        className={`rounded-lg border bg-background transition-colors ${
          disabled ? "opacity-50 pointer-events-none" : "focus-within:ring-1 focus-within:ring-ring"
        }`}
      >
        <EditorContent editor={editor} />
      </div>
    );
  }
);

MentionEditor.displayName = "MentionEditor";
