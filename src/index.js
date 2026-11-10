import {Editor} from '@tiptap/core';
import {takeOver, textboxAttributes} from './field.js';
import {EXTENSIONS} from './schema.js';
import {TOOLBAR_FORMATS, toolbar} from './toolbar.js';

/** English defaults; the app passes its own wording. */
const LABELS = {
    toolbar: 'Formatting',
    bold: 'Bold',
    italic: 'Italic',
    orderedList: 'Numbered list',
    bulletList: 'Bulleted list',
    link: 'Link',
    clearFormatting: 'Clear formatting',
    linkPrompt: 'Link address: http://, https://, mailto: or a path on this site. Leave it empty to remove the link.',
    linkRefused: 'This address can\'t be kept as a link. Start it with http://, https://, mailto: or /.',
};

export function richTextEditor(textarea, {labels = {}} = {}) {
    // A label left undefined or null, as a missing translation is, keeps its default.
    const wording = Object.fromEntries(Object.entries(LABELS).map(([key, text]) => [key, labels[key] ?? text]));
    const host = document.createElement('div');

    host.className = 'editors-rich';

    // Stored markup is parsed into the schema, so it can't run handlers and loses what the schema lacks.
    const editor = new Editor({
        element: host,
        editable: !(textarea.readOnly || textarea.matches(':disabled')),
        extensions: EXTENSIONS,
        enableInputRules: TOOLBAR_FORMATS,
        // Or a pasted URL becomes a link nobody made.
        enablePasteRules: false,
        content: textarea.value,
        editorProps: {attributes: {...textboxAttributes(textarea), class: 'editors-rich-content'}},
    });

    const sync = () => {
        textarea.value = editor.isEmpty ? '' : editor.getHTML();
    };

    editor.on('update', sync);
    host.prepend(toolbar(editor, wording));

    // ProseMirror focuses only an editable view; a read-only one takes focus as a plain element.
    const focus = () => (editor.isEditable ? editor.view.focus() : editor.view.dom.focus());
    const restore = takeOver(textarea, host, {focus, sync});

    return {
        editor,
        destroy() {
            editor.destroy();
            restore();
        },
    };
}
