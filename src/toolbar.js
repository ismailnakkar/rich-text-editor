import {editLink} from './link.js';

/** `label` keys the labels; `format` is the extension aria-pressed reports. Link and Clear formatting are actions. */
const BUTTONS = [
    {
        label: 'bold',
        format: 'bold',
        icon: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
        run: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
        label: 'italic',
        format: 'italic',
        icon: 'M10 5h8M6 19h8M14 5l-4 14',
        run: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
        label: 'orderedList',
        format: 'orderedList',
        icon: 'M10 6h10M10 12h10M10 18h10M4 4h1v5M4 9h2M4 15a1 1 0 0 1 2 0c0 1-2 2-2 3h2',
        run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
        label: 'bulletList',
        format: 'bulletList',
        icon: 'M10 6h10M10 12h10M10 18h10M5 6h.01M5 12h.01M5 18h.01',
        run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
        label: 'link',
        icon: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
        run: editLink,
    },
    {
        label: 'clearFormatting',
        icon: 'M5 5h12M11 5v14M8 19h6M3 3l18 18',
        run: (editor) => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    },
];

/** The only extensions whose markdown input rules run: no `# ` or `> ` for a format the toolbar can't make. */
export const TOOLBAR_FORMATS = BUTTONS.flatMap(({format}) => format ?? []);

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_ATTRIBUTES = {
    viewBox: '0 0 24 24',
    width: '18',
    height: '18',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
};

/** Built node by node, not from markup, so a Trusted Types policy has nothing to refuse. */
function svgIcon(path) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const shape = document.createElementNS(SVG_NS, 'path');

    Object.entries(ICON_ATTRIBUTES).forEach(([name, value]) => svg.setAttribute(name, value));
    shape.setAttribute('d', path);
    svg.append(shape);

    return svg;
}

/**
 * @param {import('@tiptap/core').Editor} editor
 * @param {import('./index.js').Labels} labels
 * @return {HTMLDivElement}
 */
export function toolbar(editor, labels) {
    const bar = document.createElement('div');
    const formatButtons = [];

    bar.className = 'editors-rich-toolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', labels.toolbar);

    for (const {label, format, icon, run} of BUTTONS) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'editors-rich-button';
        button.title = labels[label];
        // Commands run whether or not the text is editable.
        button.disabled = !editor.isEditable;
        button.setAttribute('aria-label', labels[label]);
        button.addEventListener('click', () => run(editor, labels));
        button.append(svgIcon(icon));
        bar.append(button);

        if (format) {
            formatButtons.push([button, format]);
        }
    }

    const refresh = () => formatButtons.forEach(([button, format]) => {
        button.setAttribute('aria-pressed', String(editor.isActive(format)));
    });

    editor.on('transaction', refresh);
    refresh();

    return bar;
}
