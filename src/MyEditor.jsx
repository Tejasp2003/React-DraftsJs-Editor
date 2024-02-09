import { useEffect, useState } from "react";
import {
  Editor,
  EditorState,
  RichUtils,
  convertToRaw,
  convertFromRaw,
} from "draft-js";
import "draft-js/dist/Draft.css";
import { Modifier } from "draft-js";

const MyEditor = () => {
  const [styleChar, setStyleChar] = useState(null);

  const styleMap = {
    UNDERLINE: {
      textDecoration: "underline",
    },
    HEADERONE: {
      fontSize: "2em",
      fontWeight: "bold",
    },
    REDLINE: {
      color: "red",
    },
  };

  const [editorState, setEditorState] = useState(() => {
    const savedContent = localStorage.getItem("draftEditorContent");
    if (savedContent) {
      return EditorState.createWithContent(
        convertFromRaw(JSON.parse(savedContent))
      );
    }
    return EditorState.createEmpty();
  });

  const handleChange = (newEditorState) => {
    setEditorState(newEditorState);
  };

  const handleKeyCommand = (command) => {
    // if split-block and style has headerone, remove it
    if (command === "split-block") {
      if (editorState.getCurrentInlineStyle().has("HEADERONE")) {
        const newEditorState = RichUtils.toggleInlineStyle(
          editorState,
          "HEADERONE"
        );
        handleChange(newEditorState);
        return "handled";
      }

      if (editorState.getCurrentInlineStyle().has("BOLD")) {
        const newEditorState = RichUtils.toggleInlineStyle(editorState, "BOLD");
        handleChange(newEditorState);
        return "handled";
      }

      if (editorState.getCurrentInlineStyle().has("REDLINE")) {
        const newEditorState = RichUtils.toggleInlineStyle(
          editorState,
          "REDLINE"
        );
        handleChange(newEditorState);
        return "handled";
      }

      if (editorState.getCurrentInlineStyle().has("UNDERLINE")) {
        const newEditorState = RichUtils.toggleInlineStyle(
          editorState,
          "UNDERLINE"
        );
        handleChange(newEditorState);
        return "handled";
      }
    }

    const newState = RichUtils.handleKeyCommand(editorState, command);

    if (newState) {
      handleChange(newState);
      return "handled";
    }
    return "not-handled";
  };

  const [editorTextLength, setEditorTextLength] = useState(0);
  const [editorText, setEditorText] = useState("");

  const [finalContentStateJSON, setFinalContentStateJSON] = useState();

  const handleSave = () => {
    const contentState = editorState.getCurrentContent();
    const contentStateJson = convertToRaw(contentState);
    const contentWithoutSpecialChars = contentStateJson.blocks.map((block) => {
      // Replace special characters while preserving inline styles
      let newText = block.text.replace(/#|\*|\*\*|\*\*\*/g, "");
      let newInlineStyleRanges = block.inlineStyleRanges;

      // Adjust inline style ranges due to removed characters
      if (newText.length !== block.text.length) {
        const removedCharsCount = block.text.length - newText.length;
        newInlineStyleRanges = block.inlineStyleRanges.map((range) => ({
          ...range,
          offset:
            range.offset >= removedCharsCount
              ? range.offset - removedCharsCount
              : 0,
        }));
      }

      return {
        ...block,
        text: newText,
        inlineStyleRanges: newInlineStyleRanges,
      };
    });

    contentStateJson.blocks = contentWithoutSpecialChars;
    setFinalContentStateJSON(contentStateJson);

    console.log(contentStateJson);

    // Create new editor state with modified content
    const newEditorState = EditorState.createWithContent(
      convertFromRaw(contentStateJson)
    );
    setEditorState(newEditorState);

    console.log("content: ", contentStateJson);
    console.log("content2: ", finalContentStateJSON);
  };

  const finalSave = () => {
    if (finalContentStateJSON) {
      localStorage.setItem(
        "draftEditorContent",
        JSON.stringify(finalContentStateJSON)
      );
    }
  };

  useEffect(() => {
    // get the length of the text in the editor
    const text = editorState.getCurrentContent().getPlainText("");
    setEditorText(text);
    setEditorTextLength(text.length);
  }, [editorState]); // Only trigger the effect when editorState changes

  useEffect(() => {
    const isTextWithSpecialChars =
      editorText.includes("#") || editorText.includes("*");

    //  if two or more asterisks are present, set variable multipleAsterisks to true

    const multipleAsterisks =
      editorText.includes("**") || editorText.includes("***");
    if (
      isTextWithSpecialChars &&
      !multipleAsterisks &&
      editorTextLength > 1 // Ignore the first character that is a special character
    ) {
      handleSave();
    }

    if (isTextWithSpecialChars && multipleAsterisks && editorTextLength > 3) {
      handleSave();
    }
  }, [editorTextLength]);

  const handleBeforeInput = (chars) => {
    if (chars === " ") {
      let newEditorState = editorState;
      if (styleChar === "#") {
        newEditorState = RichUtils.toggleInlineStyle(editorState, "HEADERONE");
      } else if (styleChar === "*") {
        newEditorState = RichUtils.toggleInlineStyle(editorState, "BOLD");
      } else if (styleChar === "**") {
        newEditorState = RichUtils.toggleInlineStyle(editorState, "REDLINE");
      } else if (styleChar === "***") {
        newEditorState = RichUtils.toggleInlineStyle(editorState, "UNDERLINE");
      }

      if (newEditorState !== editorState) {
        const selection = newEditorState.getSelection();
        const content = newEditorState.getCurrentContent();
        const newContent = Modifier.removeRange(content, selection, "backward");
        const newSelection = newContent.getSelectionAfter();
        const block = newContent.getBlockForKey(newSelection.getStartKey());
        const newData = block.getData().delete(styleChar);
        const newBlock = block.merge({ data: newData });
        const newContentFinal = newContent.merge({
          blockMap: newContent
            .getBlockMap()
            .set(newSelection.getStartKey(), newBlock),
          selectionAfter: newSelection,
        });
        setEditorState(
          EditorState.push(newEditorState, newContentFinal, "remove-range")
        );
        setStyleChar(null);
        return "handled";
      }
    } else if ("#".includes(chars)) {
      setStyleChar(chars);
      return "not-handled";
    } else if ("*".includes(chars)) {
      setStyleChar(styleChar ? styleChar + chars : chars);
      return "not-handled";
    } else if ("**".includes(chars)) {
      setStyleChar(styleChar ? styleChar + chars : chars);
      return "not-handled";
    } else if ("***".includes(chars)) {
      setStyleChar(styleChar ? styleChar + chars : chars);
      return "not-handled";
    }
    return "not-handled";
  };

  return (
    <div className="w-full mx-auto px-4 py-8 border-4 border-slate-300 relative rounded-xl">
      <button
        className="font-bold py-2 px-4 rounded absolute top-2 right-9 bg-rose-500 text-white hover:bg-rose-600 transition-all duration-300 ease-in-out"
        // onClick={handleSave}
        onClick={finalSave}
      >
        Save
      </button>

      <div className="p-4 h-[100vh] overflow-y-scroll">
        <Editor
          editorState={editorState}
          onChange={handleChange}
          handleKeyCommand={handleKeyCommand}
          handleBeforeInput={handleBeforeInput}
          customStyleMap={styleMap}
          placeholder="Start typing here..."
        />
      </div>
    </div>
  );
};

export default MyEditor;
