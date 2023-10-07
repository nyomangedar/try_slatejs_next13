"use client";
import {
    Editor,
    createEditor,
    BaseEditor,
    Descendant,
    Element as SlateElement,
    Transforms,
} from "slate";
import {
    Slate,
    withReact,
    ReactEditor,
    Editable,
    useSlate,
    useSlateStatic,
} from "slate-react";
import { withHistory } from "slate-history";
import { useCallback, useMemo } from "react";
import isUrl from "is-url";
import imageExtensions from "image-extensions";

type ImageElement = {
    type: "image";
    url: string;
    children: EmptyText[];
};

type ParagraphElement = {
    type: "paragraph";
    align?: string;
    children: Descendant[];
};

type CustomElement = ImageElement | ParagraphElement;

type CustomText = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
};

type EmptyText = {
    text: string;
};

declare module "slate" {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor;
        Element: CustomElement;
        Text: CustomText | EmptyText;
    }
}

const LIST_TYPES = ["numbered-list", "bulleted-list"];
const TEXT_ALIGN_TYPES = ["left", "center", "right", "justify"];

const RichTextEditor = () => {
    const renderElement = useCallback((props) => <Element {...props} />, []);
    const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
    const editor = useMemo(
        () => withImages(withHistory(withReact(createEditor()))),
        []
    );
    const initialValue: Descendant[] = useMemo(
        () =>
            JSON.parse(localStorage.getItem("content")) || [
                {
                    type: "paragraph",
                    children: [{ text: "" }],
                },
                {
                    type: "image",
                    url: "https://source.unsplash.com/zOwZKwZOZq8",
                    children: [{ text: "" }],
                },
            ],
        []
    );

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
            <div className="flex gap-5">
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
                <InsertImageButton icon="insert_image" />
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

const InsertImageButton: React.FC<{
    icon: string;
}> = ({ icon }) => {
    const editor = useSlateStatic();
    return (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
                const url = window.prompt("Enter the url");
                if (url && !isImageUrl(url)) {
                    alert("URL is not an image");
                    return;
                }
                url && insertImage(editor, url);
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

const insertImage = (editor: any, url: string) => {
    const text = { text: "" };
    const image: ImageElement = { type: "image", url, children: [text] };
    Transforms.insertNodes(editor, image);
};

const isImageUrl = (url) => {
    if (!url) return false;
    if (!isUrl(url)) return false;
    const ext = new URL(url).pathname.split(".").pop();
    return imageExtensions.includes(ext);
};

const withImages = (editor: any) => {
    const { insertData, isVoid } = editor;

    editor.isVoid = (element) => {
        return element.type === "image" ? true : isVoid(element);
    };

    editor.insertData = (data) => {
        const text = data.getData("text/plain");
        const { files } = data;

        if (files && files.length > 0) {
            for (const file of files) {
                const reader = new FileReader();
                const [mime] = file.type.split("/");

                if (mime === "image") {
                    reader.addEventListener("load", () => {
                        const url = reader.result;
                        insertImage(editor, url);
                    });

                    reader.readAsDataURL(file);
                }
            }
        } else if (isImageUrl(text)) {
            insertImage(editor, text);
        } else {
            insertData(data);
        }
    };
    return editor;
};

export default RichTextEditor;
