// The textarea stays the posted field: the page works without JS, old input refills it, and the editor writes into it.

/** What a browser leaves out of a label's text when naming a control: the control and hidden markers. */
const UNNAMED = 'textarea, [hidden], [aria-hidden="true"]';

/** @param {HTMLLabelElement} label */
function labelText(label) {
    const copy = label.cloneNode(true);

    copy.querySelectorAll(UNNAMED).forEach((node) => node.remove());

    return copy.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * The textarea's name, state, direction and language, read once, for the editor's textbox: the hidden textarea's
 * label, hint, error and required state would otherwise reach no one. Tiptap adds role="textbox".
 *
 * @param {HTMLTextAreaElement} textarea
 * @return {Record<string, string>}
 */
export function textboxAttributes(textarea) {
    const attributes = Object.fromEntries(Array.from(textarea.attributes)
        .filter(({name}) => name.startsWith('aria-'))
        .map(({name, value}) => [name, value]));
    const label = Array.from(textarea.labels ?? [], labelText).filter(Boolean).join(' ');

    // A browser names the textarea by its aria-labelledby, then its aria-label, then its labels.
    if (label && !('aria-labelledby' in attributes || 'aria-label' in attributes)) {
        attributes['aria-label'] = label;
    }

    if (textarea.required) {
        attributes['aria-required'] ??= 'true';
    }

    if (textarea.dir) {
        attributes.dir = textarea.dir;
    }

    if (textarea.lang) {
        attributes.lang = textarea.lang;
    }

    attributes['aria-multiline'] = 'true';

    return attributes;
}

/**
 * Hides the textarea and puts the editor after it, or after a label wrapping it (a label holds only phrasing content,
 * and would get every click in the editor). Its labels focus the editor, and a submit syncs its value once more.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement} editor
 * @param {{focus: () => void, sync: () => void}} hooks
 * @return {() => void} gives the textarea its place back
 */
export function takeOver(textarea, editor, {focus, sync}) {
    const labels = Array.from(textarea.labels ?? []);
    const form = textarea.form;

    (textarea.closest('label') ?? textarea).after(editor);
    textarea.hidden = true;
    labels.forEach((label) => label.addEventListener('click', focus));
    form?.addEventListener('submit', sync);

    return () => {
        labels.forEach((label) => label.removeEventListener('click', focus));
        form?.removeEventListener('submit', sync);
        editor.remove();
        textarea.hidden = false;
    };
}
