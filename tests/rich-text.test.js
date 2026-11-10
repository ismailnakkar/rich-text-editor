/**
 * Apps print what laravel-safe-html stores from this editor raw, so its output is pinned here: every element the policy
 * keeps, no attribute it drops, no typed or pasted format the toolbar can't make, and links kept as written.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {richTextEditor} from '../src/index.js';

/** What the editor writes for every format: the toolbar's, then those only a stored body or a paste brings. */
const EDITOR_BODY = '<p><strong>Bold</strong> and <em>italic</em>, '
    + '<a target="_blank" rel="noopener noreferrer" href="https://example.test/help">a link</a>.<br>Next line.</p>'
    + '<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li><p>first</p></li></ol>'
    + '<h2>Head</h2><p><u>under</u> <s>struck</s> x<sub>2</sub> x<sup>2</sup> <code>code</code></p>'
    + '<blockquote><p>quote</p></blockquote><pre><code>block</code></pre><hr>'
    + '<p><a target="_blank" rel="noopener noreferrer" href="https://example.test/api"><code>linked</code></a> '
    + '<strong><code>bold</code></strong></p><ul><li><h3>Item head</h3><p>item</p></li></ul>';

/** What laravel-safe-html 0.2.0 stores for EDITOR_BODY (SafeHtml::clean, run on it). */
const STORED_BODY = '<p><strong>Bold</strong> and <em>italic</em>, '
    + '<a target="_blank" href="https://example.test/help" rel="noopener noreferrer">a link</a>.<br />Next line.</p>'
    + '<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li><p>first</p></li></ol>'
    + '<h2>Head</h2><p><u>under</u> <s>struck</s> x<sub>2</sub> x<sup>2</sup> <code>code</code></p>'
    + '<blockquote><p>quote</p></blockquote><pre><code>block</code></pre><hr />'
    + '<p><a target="_blank" href="https://example.test/api" rel="noopener noreferrer"><code>linked</code></a> '
    + '<strong><code>bold</code></strong></p><ul><li><h3>Item head</h3><p>item</p></li></ul>';

/** Hrefs laravel-safe-html 0.2.0 keeps (each checked with SafeHtml::clean): re-saving must keep every one. */
const KEPT_HREFS = [
    'https://example.test/a b?c d#e f', '/go?to=https://example.test/a b', 'mailto:team@example.test?body=one%0D%0Atwo',
    '//example.test/help', 'https://bücher.test/', 'https://ü.xn--bcher-kva.test/', 'https://ex_ample.test/',
    'https://[::1]/', 'https://example.test/%E2%80%8B', 'www.example.com', './a:b', '?a:b', '#top',
];

const editors = [];

afterEach(() => editors.splice(0).forEach((rich) => rich.destroy()));

/** One field in a form, as an app's page holds it. */
function mount(value, attributes = '', options = undefined) {
    document.body.innerHTML = '<form><label for="content">Content</label>'
        + `<textarea name="content" id="content"${attributes}></textarea></form>`;

    const textarea = document.querySelector('textarea');
    textarea.value = value;

    const rich = richTextEditor(textarea, options);
    editors.push(rich);

    return {
        editor: rich.editor,
        textarea,
        button: (label) => document.querySelector(`.editors-rich-toolbar button[aria-label="${label}"]`),
        submit: () => textarea.form.dispatchEvent(new Event('submit')),
    };
}

/** What the form posts once the editor has had the body. */
function resave(value) {
    const {textarea, submit} = mount(value);

    submit();

    return textarea.value;
}

/** What the form posts after `text` is typed into an empty field, one key at a time through the input rules; \n is Enter. */
function typed(text) {
    const {editor, textarea} = mount('');

    for (const key of text) {
        if (key === '\n') {
            editor.commands.keyboardShortcut('Enter');

            continue;
        }

        const {from, to} = editor.state.selection;
        const insert = () => editor.state.tr.insertText(key, from, to);

        if (!editor.view.someProp('handleTextInput', (handle) => handle(editor.view, from, to, key, insert))) {
            editor.view.dispatch(insert());
        }
    }

    return textarea.value;
}

/** The markup with each element's attributes sorted, so two serialisations of the same DOM compare equal. */
function canonical(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    for (const element of template.content.querySelectorAll('*')) {
        const attributes = Array.from(element.attributes, ({name, value}) => [name, value]).sort();

        attributes.forEach(([name]) => element.removeAttribute(name));
        attributes.forEach(([name, value]) => element.setAttribute(name, value));
    }

    return template.innerHTML;
}

/** A stored body holding one link, built through the DOM so any href is written as the attribute holds it. */
function linked(href) {
    const link = document.createElement('a');

    link.setAttribute('href', href);
    link.textContent = 'x';

    return `<p>${link.outerHTML}</p>`;
}

/** The href of the link the form posts, or null without one. */
function postedHref(posted) {
    const template = document.createElement('template');
    template.innerHTML = posted;

    return template.content.querySelector('a')?.getAttribute('href') ?? null;
}

/** Answers the link prompt (a function gets its message and default) and returns what alert was told. */
function answerPrompt(answer) {
    const alerts = [];

    // happy-dom has neither.
    window.prompt = vi.fn((message, value) => typeof answer === 'function' ? answer(message, value) : answer);
    window.alert = vi.fn((message) => alerts.push(message));

    return alerts;
}

/** Selects all of `body` and answers the Link button's prompt with `answer`. */
function linkAll(answer, body = '<p>help</p>', options = undefined) {
    const field = mount(body, '', options);
    const alerts = answerPrompt(answer);

    field.editor.commands.selectAll();
    field.button('Link').click();

    return {...field, alerts};
}

describe('the fields', () => {
    it('gives every field on the page its own editor, and each textarea stays its posted field', () => {
        document.body.innerHTML = '<form>'
            + '<label for="en">Content</label><textarea id="en" name="content"></textarea>'
            + '<label for="fr">French</label><textarea id="fr" name="translations[fr][content]" lang="fr"></textarea>'
            + '<label for="ar">Arabic</label><textarea id="ar" name="translations[ar][content]" lang="ar" dir="rtl"></textarea>'
            + '</form>';

        const fields = Array.from(document.querySelectorAll('textarea'));
        const [en, fr, ar] = fields.map((field) => richTextEditor(field));

        editors.push(en, fr, ar);

        expect(document.querySelectorAll('.editors-rich')).toHaveLength(3);
        expect(fields.every((field) => field.hidden && field.nextElementSibling.classList.contains('editors-rich'))).toBe(true);
        expect([en, fr, ar].map(({editor}) => editor.view.dom.getAttribute('aria-label'))).toEqual(['Content', 'French', 'Arabic']);

        fr.editor.commands.setContent('<p>bonjour</p>', {emitUpdate: true});
        fr.editor.commands.selectAll();
        fields[1].nextElementSibling.querySelector('button[aria-label="Bold"]').click();
        ar.editor.commands.setContent('<p>مرحبا</p>', {emitUpdate: true});

        const posted = new FormData(document.querySelector('form'));

        expect(posted.get('content')).toBe('');
        expect(posted.get('translations[fr][content]')).toBe('<p><strong>bonjour</strong></p>');
        expect(posted.get('translations[ar][content]')).toBe('<p>مرحبا</p>');
        expect(en.editor.isActive('bold')).toBe(false);
    });

    it('edits an Arabic field right to left, in its language', () => {
        const {editor} = mount('', ' lang="ar" dir="rtl"');

        expect(editor.view.dom.getAttribute('dir')).toBe('rtl');
        expect(editor.view.dom.getAttribute('lang')).toBe('ar');
        expect(editor.view.dom.getAttribute('aria-label')).toBe('Content');
        expect(editor.view.dom.getAttribute('role')).toBe('textbox');
        expect(editor.view.dom.getAttribute('aria-multiline')).toBe('true');
    });

    it('is focused by a click on its label, which points at the hidden textarea', () => {
        const {editor} = mount('<p>text</p>');

        document.querySelector('label').click();

        expect(document.activeElement).toBe(editor.view.dom);
    });

    it('takes the hint, error and required state the textarea carries', () => {
        const {editor} = mount('', ' required aria-describedby="content-hint content-error" aria-invalid="true"');

        expect(editor.view.dom.getAttribute('aria-describedby')).toBe('content-hint content-error');
        expect(editor.view.dom.getAttribute('aria-invalid')).toBe('true');
        expect(editor.view.dom.getAttribute('aria-required')).toBe('true');
    });

    it('lifts required while it is the field, so an empty one does not block the submit unseen', () => {
        const {textarea} = mount('', ' required');

        expect(textarea.form.checkValidity()).toBe(true);

        editors.pop().destroy();

        expect(textarea.required).toBe(true);
    });

    it('is read-only for a readonly textarea and shut for a disabled one, toolbar included', () => {
        const readOnly = mount('<p>text</p>', ' readonly').editor;

        expect(readOnly.isEditable).toBe(false);
        expect(readOnly.view.dom.getAttribute('aria-readonly')).toBe('true');
        expect(readOnly.view.dom.getAttribute('tabindex')).toBe('0');
        expect(document.querySelector('.editors-rich-button').disabled).toBe(true);

        const disabled = mount('<p>text</p>', ' disabled').editor;

        expect(disabled.view.dom.getAttribute('contenteditable')).toBe('false');
        expect(disabled.view.dom.getAttribute('aria-disabled')).toBe('true');
        expect(disabled.view.dom.hasAttribute('tabindex')).toBe(false);
        expect(document.querySelector('.editors-rich-button').disabled).toBe(true);
    });

    it('is named as a browser names the textarea: aria-labelledby, then aria-label, then its labels', () => {
        expect(mount('', ' aria-label="Body"').editor.view.dom.getAttribute('aria-label')).toBe('Body');

        const {editor} = mount('', ' aria-labelledby="heading"');

        expect(editor.view.dom.getAttribute('aria-labelledby')).toBe('heading');
        expect(editor.view.dom.hasAttribute('aria-label')).toBe(false);
    });

    it('follows a label that wraps the textarea, named by its text without the field or hidden markers', () => {
        document.body.innerHTML = '<form><label>Content <span aria-hidden="true">*</span><span hidden>hint</span>'
            + '<span class="sr-only">(required)</span><textarea name="content">&lt;p&gt;Hello&lt;/p&gt;</textarea></label></form>';

        const label = document.querySelector('label');
        const rich = richTextEditor(document.querySelector('textarea'));
        editors.push(rich);
        const focus = vi.spyOn(rich.editor.view, 'focus');

        expect(rich.editor.view.dom.getAttribute('aria-label')).toBe('Content (required)');
        expect(label.nextElementSibling.classList).toContain('editors-rich');

        // Outside the label, a click in the editor is the editor's own.
        rich.editor.view.dom.querySelector('p').click();
        document.querySelector('.editors-rich-button').click();

        expect(focus).not.toHaveBeenCalled();

        label.querySelector('.sr-only').click();

        expect(focus).toHaveBeenCalled();

        editors.pop().destroy();

        expect(label.querySelector('textarea').hidden).toBe(false);
        expect(label.nextElementSibling).toBeNull();
    });

    it('gives the textarea its place back on destroy, holding the last edit', () => {
        const {editor, textarea, submit} = mount('<p>draft</p>');

        editor.commands.selectAll();
        editor.commands.toggleItalic();
        editors.pop().destroy();
        const view = vi.spyOn(editor, 'view', 'get');

        expect(document.querySelector('.editors-rich')).toBeNull();
        expect(textarea.hidden).toBe(false);
        expect(textarea.value).toBe('<p><em>draft</em></p>');

        // Its submit and label listeners are gone.
        textarea.value = 'typed';
        submit();
        document.querySelector('label').click();

        expect(textarea.value).toBe('typed');
        expect(view).not.toHaveBeenCalled();
    });
});

describe('what it writes', () => {
    it('brings stored bodies back as semantic HTML without losing anything', () => {
        // Bodies as laravel-safe-html stored them under Quill: the seeder's, and the old normaliser's real lists.
        const cases = [
            ['<p>Each request is checked, then paid <strong>automatically</strong>.</p>',
                '<p>Each request is checked, then paid <strong>automatically</strong>.</p>'],
            ['<p>From the <em>Referrals</em> page.</p>', '<p>From the <em>Referrals</em> page.</p>'],
            ['<p>one<br />two<br /></p><p><br /></p><p>after a blank line</p>',
                '<p>one<br>two<br></p><p><br></p><p>after a blank line</p>'],
            ['<ul><li>one</li><li>two</li></ul><ol><li>first</li></ol>',
                '<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li><p>first</p></li></ol>'],
            ['<p><a href="https://example.test" target="_blank" rel="noopener noreferrer" title="Help">help</a></p>',
                '<p><a target="_blank" rel="noopener noreferrer" href="https://example.test" title="Help">help</a></p>'],
            ['<p><a href="/member/files" target="_blank" rel="noopener noreferrer">files</a></p>',
                '<p><a target="_blank" rel="noopener noreferrer" href="/member/files">files</a></p>'],
            // Quill took these from Ctrl+U and pasted documents, and laravel-safe-html kept them.
            ['<p><u>u</u> <s>s</s> <strike>strike</strike> x<sub>2</sub> x<sup>2</sup> <code>c</code> <b>b</b> <i>i</i></p>',
                '<p><u>u</u> <s>s</s> <s>strike</s> x<sub>2</sub> x<sup>2</sup> <code>c</code> <strong>b</strong> <em>i</em></p>'],
            ['<h1>one</h1><h6>six</h6><blockquote>quote</blockquote><pre>pre</pre><hr />',
                '<h1>one</h1><h6>six</h6><blockquote><p>quote</p></blockquote><pre><code>pre</code></pre><hr>'],
            // Inline code keeps the link and formats around it, and a list item may open with any block.
            ['<p><a href="https://example.test"><code>c</code></a> <strong><code>b</code></strong> <code><em>e</em></code></p>',
                '<p><a target="_blank" rel="noopener noreferrer" href="https://example.test"><code>c</code></a> '
                + '<strong><code>b</code></strong> <code><em>e</em></code></p>'],
            ['<ul><li><h2>x</h2></li><li><blockquote><p>q</p></blockquote></li></ul>',
                '<ul><li><h2>x</h2></li><li><blockquote><p>q</p></blockquote></li></ul>'],
        ];

        for (const [stored, posted] of cases) {
            expect(resave(stored), stored).toBe(posted);
        }
    });

    it('reloads a body exactly as it wrote it, once laravel-safe-html has stored it', () => {
        expect(canonical(EDITOR_BODY)).toBe(canonical(STORED_BODY));
        expect(resave(STORED_BODY)).toBe(EDITOR_BODY);
        expect(resave(EDITOR_BODY)).toBe(EDITOR_BODY);
    });

    it('shows what laravel-safe-html stores, without the attributes it drops or forces', () => {
        // Each body, then what laravel-safe-html 0.2.0 stores for it (SafeHtml::clean, run on it).
        const cases = [
            ['<ol start="3" type="a"><li><p>step</p></li></ol>', '<ol><li><p>step</p></li></ol>'],
            ['<ol style="list-style-type: lower-alpha"><li>a</li></ol>', '<ol><li><p>a</p></li></ol>'],
            ['<p><a href="https://example.test" target="_self" rel="nofollow" class="x" title="T">x</a></p>',
                '<p><a href="https://example.test" target="_blank" title="T" rel="noopener noreferrer">x</a></p>'],
            ['<pre><code class="language-js">block</code></pre>', '<pre><code>block</code></pre>'],
        ];

        for (const [body, stored] of cases) {
            expect(canonical(resave(body)), body).toBe(canonical(stored));
        }
    });

    it('posts an empty field for an empty editor', () => {
        expect(resave('')).toBe('');
        expect(resave('<p></p>')).toBe('');
    });

    it('writes every change into the textarea before any submit', () => {
        const {editor, textarea} = mount('<p>draft</p>');

        editor.commands.selectAll();
        editor.commands.toggleBold();

        expect(textarea.value).toBe('<p><strong>draft</strong></p>');
    });
});

describe('typing and pasting', () => {
    it('makes only what the toolbar makes as it is typed', () => {
        // The toolbar's formats keep their markdown...
        expect(typed('- item')).toBe('<ul><li><p>item</p></li></ul>');
        expect(typed('1. item')).toBe('<ol><li><p>item</p></li></ol>');
        expect(typed('**bold**')).toBe('<p><strong>bold</strong></p>');

        // ...the others, there for stored bodies and pastes, have none.
        expect(typed('# Head')).toBe('<p># Head</p>');
        expect(typed('> quote')).toBe('<p>&gt; quote</p>');
        expect(typed('``` ')).toBe('<p>``` </p>');
        expect(typed('---')).toBe('<p>---</p>');
        expect(typed('`code`')).toBe('<p>`code`</p>');
        expect(typed('~~struck~~')).toBe('<p>~~struck~~</p>');
    });

    it('continues a numbered list when its next number is typed after it, and starts one otherwise', () => {
        expect(typed('1. one\ntwo\n\n3. three')).toBe('<ol><li><p>one</p></li><li><p>two</p></li><li><p>three</p></li></ol>');
        expect(typed('1. one\n\n1. again')).toBe('<ol><li><p>one</p></li></ol><ol><li><p>again</p></li></ol>');
    });

    it('numbers a list typed from 3 as laravel-safe-html stores it: from 1', () => {
        expect(typed('3. step')).toBe('<ol><li><p>step</p></li></ol>');
        expect(editors.at(-1).editor.view.dom.querySelector('ol').attributes).toHaveLength(0);
    });

    it('keeps what laravel-safe-html keeps from a paste and flattens the rest', () => {
        const {editor, textarea} = mount('');

        editor.view.pasteHTML('<h2>Title</h2><table><tr><td><u>cell</u></td></tr></table><img src="x" onerror="alert(1)">');

        expect(textarea.value).toBe('<h2>Title</h2><p><u>cell</u></p>');
    });

    it('leaves a pasted URL as text: only the Link button makes a link', () => {
        const {editor, textarea} = mount('');

        editor.view.pasteText('see https://example.test/x now');
        editor.view.pasteHTML('<p>visit https://example.test/y</p>');

        expect(textarea.value).not.toContain('<a');
        expect(textarea.value).toContain('https://example.test/x');
        expect(textarea.value).toContain('https://example.test/y');
    });
});

describe('the toolbar', () => {
    it('drives the editor and reports its state', () => {
        const {textarea, button} = mount('<p>text</p>');
        const bar = document.querySelector('.editors-rich-toolbar');

        expect(bar.getAttribute('role')).toBe('toolbar');
        expect(bar.getAttribute('aria-label')).toBe('Formatting');

        for (const label of ['Bold', 'Italic', 'Numbered list', 'Bulleted list', 'Link', 'Clear formatting']) {
            expect(button(label).type, `${label} must not submit the form`).toBe('button');
            expect(button(label).querySelector('svg').getAttribute('aria-hidden')).toBe('true');
        }

        editors[0].editor.commands.selectAll();
        button('Bold').click();
        button('Bulleted list').click();

        expect(textarea.value).toBe('<ul><li><p><strong>text</strong></p></li></ul>');
        expect(button('Bold').getAttribute('aria-pressed')).toBe('true');
        expect(button('Italic').getAttribute('aria-pressed')).toBe('false');
        // Link opens a prompt whether or not the text is a link: an action, as clearing formatting is.
        expect(Array.from(bar.querySelectorAll('[aria-pressed]'), (format) => format.getAttribute('aria-label')))
            .toEqual(['Bold', 'Italic', 'Numbered list', 'Bulleted list']);

        button('Clear formatting').click();

        expect(textarea.value).toBe('<p>text</p>');
        expect(button('Bold').getAttribute('aria-pressed')).toBe('false');
    });

    it('words its buttons and link dialog with the labels it is given, English for the rest', () => {
        const {button, alerts} = linkAll('javascript:alert(1)', '<p>aide</p>', {
            labels: {toolbar: 'Mise en forme', bold: 'Gras', linkPrompt: 'Adresse du lien', linkRefused: 'Lien refusé'},
        });

        expect(document.querySelector('.editors-rich-toolbar').getAttribute('aria-label')).toBe('Mise en forme');
        expect(button('Gras').title).toBe('Gras');
        expect(button('Italic')).not.toBeNull();
        expect(window.prompt).toHaveBeenCalledWith('Adresse du lien', '');
        expect(alerts).toEqual(['Lien refusé']);
    });

    it('keeps the English for a label left undefined, as a missing translation is', () => {
        const {button, alerts} = linkAll('javascript:alert(1)', '<p>aide</p>', {
            labels: {bold: undefined, linkPrompt: undefined, linkRefused: null},
        });

        expect(button('Bold').title).toBe('Bold');
        expect(window.prompt.mock.calls[0][0]).toMatch(/^Link address/);
        expect(alerts[0]).toMatch(/^This address can't be kept as a link/);
    });
});

describe('links', () => {
    it('writes a link as laravel-safe-html keeps it', () => {
        const {textarea, button, alerts} = linkAll('  https://example.test/help  ');

        expect(alerts).toEqual([]);
        expect(textarea.value).toBe('<p><a target="_blank" rel="noopener noreferrer" href="https://example.test/help">help</a></p>');

        // An empty answer removes the link.
        answerPrompt('');
        button('Link').click();

        expect(textarea.value).toBe('<p>help</p>');
    });

    it('refuses a link laravel-safe-html would not keep, before it is set', () => {
        for (const href of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'tel:123']) {
            const {textarea, alerts} = linkAll(href);

            expect(alerts, href).toHaveLength(1);
            expect(textarea.value, href).toBe('<p>help</p>');
        }
    });

    it('takes every scheme laravel-safe-html keeps', () => {
        for (const href of ['http://example.test', 'https://example.test', 'mailto:team@example.test']) {
            const {textarea, alerts} = linkAll(href);

            expect(alerts, href).toEqual([]);
            expect(textarea.value, href).toContain(`href="${href}"`);
        }
    });

    it('accepts the relative links laravel-safe-html keeps, and never refuses its own default', () => {
        const {editor, textarea, button} = mount('<p><a href="/member/files">files</a> and more</p>');
        const alerts = answerPrompt((message, value) => value);

        editor.commands.setTextSelection(3);
        button('Link').click();

        expect(window.prompt).toHaveBeenCalledWith(expect.any(String), '/member/files');
        expect(alerts).toEqual([]);

        answerPrompt('/member/settings');
        button('Link').click();

        expect(alerts).toEqual([]);
        expect(textarea.value).toBe('<p><a target="_blank" rel="noopener noreferrer" href="/member/settings">files</a> and more</p>');
    });

    it('drops a stored link with a scheme laravel-safe-html refuses, not its text', () => {
        expect(resave('<p><a href="javascript:alert(1)">x</a> <a href="tel:1">y</a></p>')).toBe('<p>x y</p>');
    });

    it('keeps every stored link laravel-safe-html keeps', () => {
        for (const href of KEPT_HREFS) {
            expect(postedHref(resave(linked(href))), href).toBe(href);
        }
    });

    it('refuses a link no browser can follow, though laravel-safe-html would keep it', () => {
        for (const href of ['https://example.test:99999/', 'https://256.1.1.1/']) {
            expect(resave(linked(href)), href).toBe('<p>x</p>');
        }
    });

    it('takes a relative answer only as a path, query or fragment, so a bare domain is not taken for one', () => {
        for (const href of ['www.example.com', 'example.com/page', 'page.html']) {
            const {textarea, alerts} = linkAll(href);

            expect(alerts, href).toHaveLength(1);
            expect(textarea.value, href).toBe('<p>help</p>');
        }

        for (const href of ['/member/files', '//example.test/x', '?page=2', '#top', './next', '../up']) {
            const {textarea, alerts} = linkAll(href);

            expect(alerts, href).toEqual([]);
            expect(postedHref(textarea.value), href).toBe(href);
        }
    });

    it('links inline code', () => {
        const {textarea} = linkAll('https://example.test/docs', '<p><code>npm test</code></p>');

        expect(textarea.value).toBe('<p><a target="_blank" rel="noopener noreferrer" href="https://example.test/docs"><code>npm test</code></a></p>');
    });
});
