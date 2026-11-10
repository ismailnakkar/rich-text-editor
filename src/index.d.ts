import type {Editor} from '@tiptap/core';

/** The toolbar's name, each button's, and the Link button's dialog texts. */
export interface Labels {
    toolbar: string;
    bold: string;
    italic: string;
    orderedList: string;
    bulletList: string;
    link: string;
    clearFormatting: string;
    /** The Link button's window.prompt. */
    linkPrompt: string;
    /** The window.alert for an address that can't be kept as a link. */
    linkRefused: string;
}

export interface RichTextOptions {
    /** Merged over the English defaults: one left out, undefined or null keeps its default. */
    labels?: {[Key in keyof Labels]?: string | null};
}

export interface RichTextEditor {
    readonly editor: Editor;
    /** Removes the editor and shows the textarea again, holding the last edit. */
    destroy(): void;
}

/** Puts a rich-text editor in the textarea's place; the hidden textarea stays the posted field and holds its HTML. */
export function richTextEditor(textarea: HTMLTextAreaElement, options?: RichTextOptions): RichTextEditor;
