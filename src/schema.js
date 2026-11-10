// The schema holds every element laravel-safe-html keeps, and nothing it drops, so a stored body re-saves unchanged.

import {Mark, wrappingInputRule} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {isAllowedLink} from './link.js';

const KIT_OPTIONS = {
    // It appends an empty paragraph after a closing list, changing stored bodies on every re-save.
    trailingNode: false,
    // laravel-safe-html drops the language-* class.
    codeBlock: {languageClassPrefix: null},
    link: {
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        // laravel-safe-html forces both on every link.
        HTMLAttributes: {target: '_blank', rel: 'noopener noreferrer'},
        isAllowedUri: isAllowedLink,
    },
};

/** `3. ` starts a numbered list, or continues the one before it when 3 is its next number. */
const ORDERED_LIST_INPUT = /^(\d+)\.\s$/;

/** Changes to StarterKit's extensions, by name. */
const OVERRIDES = {
    // laravel-safe-html stores a bare <ol>, so a list typed from 3 or pasted as a, b, c shows as 1, 2, 3. The stock
    // input rule reads `start` to continue a list, so this one counts items instead.
    orderedList: {
        addAttributes: () => ({}),
        addInputRules() {
            return [wrappingInputRule({
                find: ORDERED_LIST_INPUT,
                type: this.type,
                joinPredicate: (match, list) => list.childCount + 1 === Number(match[1]),
            })];
        },
    },
    // target and rel always come from HTMLAttributes, whatever a paste brought.
    link: {
        addAttributes() {
            const {href, title} = this.parent();

            return {href, title};
        },
    },
    // laravel-safe-html keeps a link or format around inline code.
    code: {excludes: ''},
    // laravel-safe-html lets any block open an item; the stock `paragraph block*` lifts a heading out of the list.
    listItem: {content: 'block+'},
};

const StoredKit = StarterKit.extend({
    addExtensions() {
        return this.parent().map((extension) => extension.name in OVERRIDES
            ? extension.extend(OVERRIDES[extension.name])
            : extension);
    },
});

/** A mark that is only its tag. */
const tagMark = (name, tag) => Mark.create({name, parseHTML: () => [{tag}], renderHTML: () => [tag, 0]});

/** StarterKit as stored, plus the two marks laravel-safe-html keeps that it lacks. */
export const EXTENSIONS = [StoredKit.configure(KIT_OPTIONS), tagMark('subscript', 'sub'), tagMark('superscript', 'sup')];
