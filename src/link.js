/** laravel-safe-html's link schemes; it keeps relative links too. */
const SCHEMES = ['http', 'https', 'mailto'];

/** RFC 3986's scheme: what precedes a colon in the first segment. */
const SCHEME = /^([^:/?#]*):/;

/** The edge spaces and C0 controls laravel-safe-html trims first, as browsers do. */
const EDGES = /^[\x00-\x20]+|[\x00-\x20]+$/g;

/** How a relative answer to the prompt must start, so `www.example.com` isn't taken for a path on this site. */
const RELATIVE_ANSWER = /^[/?#.]/;

function parses(href) {
    try {
        new URL(href, document.baseURI);

        return true;
    } catch {
        return false;
    }
}

/**
 * Whether an href stays a link, when loaded, pasted or entered. Looser than laravel-safe-html on purpose: the server
 * cleans every body on save, so a stricter check here could only drop links it keeps.
 */
export function isAllowedLink(url) {
    const href = url.replace(EDGES, '');
    const scheme = SCHEME.exec(href)?.[1].toLowerCase();

    return href !== ''
        && (scheme === undefined || SCHEMES.includes(scheme))
        && parses(href);
}

/**
 * The Link button: an empty answer removes the link, an allowed one sets it, or inserts it as text at a bare caret.
 *
 * @param {import('@tiptap/core').Editor} editor
 * @param {import('./index.js').Labels} labels
 */
export function editLink(editor, labels) {
    const answer = window.prompt(labels.linkPrompt, editor.getAttributes('link').href ?? '');

    if (answer === null) {
        return;
    }

    const href = answer.trim();

    if (href === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();

        return;
    }

    if (!isAllowedLink(href) || !(SCHEME.test(href) || RELATIVE_ANSWER.test(href))) {
        window.alert(labels.linkRefused);

        return;
    }

    if (editor.state.selection.empty && !editor.isActive('link')) {
        editor.chain().focus().insertContent({type: 'text', text: href, marks: [{type: 'link', attrs: {href}}]}).run();

        return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({href}).run();
}
