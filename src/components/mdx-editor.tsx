"use client";

import {
  MDXEditor,
  toolbarPlugin,
  listsPlugin,
  UndoRedo,
  Separator,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  CodeToggle,
  ListsToggle,
} from "@mdxeditor/editor";

export default function MdxEditorInner({
  value,
  onChange,
  placeholder,
  resetKey,
  contentEditableClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resetKey?: string;
  contentEditableClassName: string;
}) {
  return (
    <MDXEditor
      key={resetKey}
      markdown={value}
      onChange={onChange}
      placeholder={placeholder}
      contentEditableClassName={contentEditableClassName}
      plugins={[
        listsPlugin(),
        toolbarPlugin({
          toolbarClassName: "mdx-toolbar",
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
              <StrikeThroughSupSubToggles options={["Strikethrough"]} />
              <Separator />
              <CodeToggle />
              <Separator />
              <ListsToggle />
            </>
          ),
        }),
      ]}
    />
  );
}
