# @ismailnakkar/rich-text-editor

A [Tiptap 3](https://tiptap.dev) rich-text editor that replaces a `<textarea>` and writes only the HTML
[laravel-safe-html](https://github.com/ismailnakkar/laravel-safe-html) keeps. The textarea stays in the form, hidden,
and holds the editor's HTML, so the form still posts it, works without JavaScript, and old input refills it.

To edit HTML source instead, use [@ismailnakkar/code-editor](https://github.com/ismailnakkar/code-editor).

## Install

```bash
npm i @ismailnakkar/rich-text-editor
```

npm also installs the peer dependencies `@tiptap/core`, `@tiptap/pm` and `@tiptap/starter-kit` (`^3.33.0`). Type
declarations are included.

## Usage

```blade
<label for="content">Content</label>
<textarea id="content" name="content" class="rich-text">{{ old('content', $post->content) }}</textarea>
```

Tiptap weighs a few hundred kB, so load the editor only on pages that have a field. Pass your app's wording as
`labels`:

```js
const fields = document.querySelectorAll('textarea.rich-text');

if (fields.length > 0) {
    import('@ismailnakkar/rich-text-editor/style.css');
    const {richTextEditor} = await import('@ismailnakkar/rich-text-editor');

    fields.forEach((field) => richTextEditor(field, {labels: {bold: 'Gras', italic: 'Italique'}}));
}
```

`richTextEditor(textarea, options?)` returns `{editor, destroy}`:

- `editor` is the Tiptap `Editor`.
- `destroy()` removes the editor and shows the textarea again, holding the last edit.

The editor goes after the textarea, or after a `<label>` that wraps it. Every edit is written to the textarea, and again
on `submit`. An empty editor posts an empty string. The textarea's `dir` and `lang` carry over, so an Arabic field on a
left-to-right page is typed right to left.

> [!IMPORTANT]
> The editor is not a sanitizer. Clean the posted HTML on the server (with laravel-safe-html) before printing it. A
> hidden field can't show the browser's `required` message, so validate `required` on the server too.

## Labels

`labels` is merged over these English defaults. A label left out, `undefined` or `null` keeps its default.

| Label | Default | Used for |
| --- | --- | --- |
| `toolbar` | Formatting | The toolbar's `aria-label` |
| `bold` | Bold | Each button's `aria-label` and `title` |
| `italic` | Italic | |
| `orderedList` | Numbered list | |
| `bulletList` | Bulleted list | |
| `link` | Link | |
| `clearFormatting` | Clear formatting | |
| `linkPrompt` | Link address: http://, https://, mailto: or a path on this site. Leave it empty to remove the link. | The Link button's `window.prompt` |
| `linkRefused` | This address can't be kept as a link. Start it with http://, https://, mailto: or /. | The `window.alert` when an address is refused |

## Styling

Import `@ismailnakkar/rich-text-editor/style.css` once, then override these on `:root` or any ancestor of the field.
The shared ones have the same name in @ismailnakkar/code-editor, so an app using both sets them once.

| Property | Default | Styles | Shared |
| --- | --- | --- | --- |
| `--editors-border` | `1px solid #ced4da` | The frame and the line under the toolbar | Yes |
| `--editors-radius` | `.375rem` | The frame and the toolbar buttons | Yes |
| `--editors-focus-color` | `#2563eb` | Focus rings, a hovered button's border, and a pressed button's border and icon | Yes |
| `--editors-rich-min-height` | `12rem` | The text | |
| `--editors-toolbar-background` | `#f8f9fa` | The toolbar | |
| `--editors-pressed-background` | `#dbe4ff` | A pressed button | |

For anything else, target `.editors-rich` (the frame), `.editors-rich-toolbar`, `.editors-rich-button` or
`.editors-rich-content` (the text). The stylesheet uses logical properties only, so a right-to-left field mirrors.

## The HTML it writes

The editor mirrors the policy of laravel-safe-html **0.2.0** without depending on it, so what it writes is stored as
written and reloads unchanged.

- **Elements**: `p`, `br`, `hr`, `strong`, `em`, `u`, `s`, `sub`, `sup`, `code`, `ul`, `ol`, `li`, `blockquote`,
  `pre`, `h1` to `h6` and `a`. `b`, `i` and `strike` become `strong`, `em` and `s`, a list item's text is wrapped in
  `p`, and `pre` becomes `<pre><code>`. Any other element is unwrapped to its text.
- **Attributes**: only a link's `href` and `title`, plus the `target="_blank"` and `rel="noopener noreferrer"` the
  policy forces. Lists are bare, so one typed from 3 or pasted as a, b, c shows numbered 1, 2, 3, as it will be stored.
- **Links**: `http:`, `https:`, `mailto:` and relative hrefs a browser can parse. A link with any other scheme keeps
  its text and loses the link. The Link button refuses such an address, and a relative one not starting with `/`, `?`,
  `#` or `.`, so `www.example.com` isn't linked as a path on this site. The check is looser than the policy on purpose,
  so the editor never drops a stored link the policy keeps. A link only the policy refuses (a backslash or Unicode
  space in it, a space in its host) loses its link on save.
- **Typing**: markdown shortcuts work only for the toolbar's formats (`**bold**`, `*italic*`, `- `, `1. `). Typing
  `3. ` right after a two-item list continues it. `# `, `> `, backticks and the rest stay text, and a paste runs no
  rules, so a pasted URL stays text.

## Accessibility

- The text has `role="textbox"` and `aria-multiline="true"`. It takes the textarea's `aria-*` attributes (so its
  `aria-describedby` hint or error and `aria-invalid` reach it), and `aria-required` when the textarea is `required`.
  These are read once, when the editor is created.
- Without `aria-labelledby` or `aria-label`, the text is named by the textarea's labels, minus any `hidden` or
  `aria-hidden` content. Clicking a label focuses the text.
- The toolbar has `role="toolbar"` and is named by `labels.toolbar`. Each button is a `<button type="button">` named by
  its label, with its icon hidden from assistive technology. Bold, Italic and the two lists report `aria-pressed`;
  Link and Clear formatting are actions. Each button is a tab stop (there is no arrow-key navigation).
- A focused button has its own `:focus-visible` ring. The frame is ringed only while the text has focus.
- Tab nests a list item and Shift+Tab lifts it. Anywhere else, Tab leaves the editor.

## Testing

The editor needs a DOM, so run your app's tests in happy-dom or jsdom (Vitest: `environment: 'happy-dom'`). Outside
Vitest, set jsdom's `window`, `document`, `Node`, `HTMLElement`, `DOMParser`, `MutationObserver` and
`requestAnimationFrame` globals before importing the editor, because ProseMirror reads them at import. To drive the
Link button, stub `window.prompt` and `window.alert`.

Run this package's suite with `npm test`.

## Upgrading

Nothing yet: 1.0.0 is the first release.
