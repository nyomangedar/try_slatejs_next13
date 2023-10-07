"use client";
import {
    Editor,
    createEditor,
    BaseEditor,
    Descendant,
    Element as SlateElement,
    Transforms,
} from "slate";
import { Slate, withReact, ReactEditor, Editable, useSlate } from "slate-react";
import { withHistory } from "slate-history";
import { useCallback, useMemo } from "react";

type CustomElementType = "paragraph";

type CustomElement = {
    type: CustomElementType;
    children: CustomText[];
};

type CustomText = {
    text: string;
};

declare module "slate" {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor;
        Element: CustomElement;
        Text: CustomText;
    }
}

const LIST_TYPES = ["numbered-list", "bulleted-list"];
const TEXT_ALIGN_TYPES = ["left", "center", "right", "justify"];

const RichTextEditor = () => {
    const renderElement = useCallback((props) => <Element {...props} />, []);
    const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
    const editor = useMemo(() => withHistory(withReact(createEditor())), []);

    return (
        <Slate
            editor={editor}
            initialValue={initialValue}
            onChange={(value) => {
                const isAstChange = editor.operations.some(
                    (op) => op.type !== "set_selection"
                );

                if (isAstChange) {
                    const content = JSON.stringify(value);
                    localStorage.setItem("content", content);
                }
            }}
        >
            <div>
                <MarkButton format="bold" icon="format_bold" />
                <MarkButton format="italic" icon="format_italic" />
                <MarkButton format="underline" icon="format_underlined" />
                <MarkButton format="code" icon="code" />
                <BlockButton format="heading-one" icon="looks_one" />
                <BlockButton format="heading-two" icon="looks_two" />
                <BlockButton format="block-quote" icon="format_quote" />
                <BlockButton
                    format="numbered-list"
                    icon="format_list_numbered"
                />
                <BlockButton
                    format="bulleted-list"
                    icon="format_list_bulleted"
                />
                <BlockButton format="left" icon="format_align_left" />
                <BlockButton format="center" icon="format_align_center" />
                <BlockButton format="right" icon="format_align_right" />
                <BlockButton format="justify" icon="format_align_justify" />
            </div>

            <Editable
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                spellCheck
                autoFocus
            />
        </Slate>
    );
};

const Element = ({ attributes, children, element }) => {
    const style = { textAlign: element.align };
    switch (element.type) {
        case "bulleted-list":
            return (
                <ul style={style} {...attributes}>
                    {children}
                </ul>
            );
        case "heading-one":
            return (
                <h1 style={style} {...attributes}>
                    {children}
                </h1>
            );
        case "heading-two":
            return (
                <h2 style={style} {...attributes}>
                    {children}
                </h2>
            );
        case "list-item":
            return (
                <li style={style} {...attributes}>
                    {children}
                </li>
            );
        case "numbered-list":
            return (
                <ol style={style} {...attributes}>
                    {children}
                </ol>
            );
        default:
            return (
                <p style={style} {...attributes}>
                    {children}
                </p>
            );
    }
};

const Leaf = ({ attributes, children, leaf }) => {
    if (leaf.bold) {
        children = <strong>{children}</strong>;
    }

    if (leaf.code) {
        children = <code>{children}</code>;
    }

    if (leaf.italic) {
        children = <em>{children}</em>;
    }

    if (leaf.underline) {
        children = <u>{children}</u>;
    }

    return <span {...attributes}>{children}</span>;
};

const MarkButton: React.FC<{
    format: any;
    icon: string;
}> = ({ format, icon }) => {
    const editor = useSlate();
    return (
        <button
            onMouseDown={(event) => {
                event.preventDefault();
                toggleMark(editor, format);
            }}
        >
            {icon}
        </button>
    );
};

const BlockButton: React.FC<{
    format: any;
    icon: string;
}> = ({ format, icon }) => {
    const editor = useSlate();
    return (
        <button
            onMouseDown={(event) => {
                event.preventDefault();
                toggleBlock(editor, format);
            }}
        >
            {icon}
        </button>
    );
};

const toggleMark = (editor: any, format: any) => {
    const isActive = () => {
        const marks = Editor.marks(editor);
        return marks ? marks[format] === true : false;
    };
    if (isActive()) {
        Editor.removeMark(editor, format);
    } else {
        Editor.addMark(editor, format, true);
    }
};

const toggleBlock = (editor: any, format: any) => {
    const isActive = isBlockActive(
        editor,
        format,
        TEXT_ALIGN_TYPES.includes(format) ? "align" : "type"
    );
    const isList = LIST_TYPES.includes(format);

    Transforms.unwrapNodes(editor, {
        match: (n) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            LIST_TYPES.includes(n.type) &&
            !TEXT_ALIGN_TYPES.includes(format),
        split: true,
    });
    let newProperties: Partial<SlateElement>;
    if (TEXT_ALIGN_TYPES.includes(format)) {
        newProperties = {
            align: isActive ? undefined : format,
        };
    } else {
        newProperties = {
            type: isActive ? "paragraph" : isList ? "list-item" : format,
        };
    }
    Transforms.setNodes<SlateElement>(editor, newProperties);
};

const isBlockActive = (
    editor: any,
    format: any,
    blocktype: string = "type"
) => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Array.from(
        Editor.nodes(editor, {
            at: Editor.unhangRange(editor, selection),
            match: (n) =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n[blocktype] === format,
        })
    );

    return !!match;
};

const initialValue: Descendant[] = [
    {
        type: "paragraph",
        children: [{ text: "test" }],
    },
];

export default RichTextEditor;
