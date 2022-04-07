import React, { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import htmlToPdfmake from "html-to-pdfmake";
import { usePdfMake } from "./usePdfMake";
import { logo64, signature64 } from "./images";
import { API_KEY } from "../env";

/*
 * Constants
 */
const tenants = [
  {
    name: "John",
    amount: 320,
    garant: "Dad",
  },
  {
    name: "Betty",
    amount: 340,
    garant: "Cousin",
  },
  {
    name: "Albert",
    amount: 420,
    garant: "Mommy",
  },
];
const owner = {
  name: "Malkovich",
  address: "39, avenue Blonden, 3000, Liège.",
};
const REG = {
  LOGO: "{{logoImage}}",
  CENTERED_LOGO: "{{logoImage-centered}}",
  SIGNATURE: "{{signatureImage}}",
  CENTERED_SIGNATURE: "{{signatureImage-centered}}",
  PAGEBREAK: "{{pageBreak}}",
  TABLE_OF_CONTENT: "{{toc}}",
  TOC_ITEM: "{{tocItem->}}",
  LOOP_START: "{{loop}}",
  LOOP_END: "{{loopEnd}}",
  LOOP_N: "{{loop-n}}",
  TENANT: "{{tenantName}}",
  AMOUNT: "{{tenantAmount}}",
  GARANT: "{{tenantWarrantor}}",
  OWNER: "{{owner}}",
};

/*
 * Takes in a REG value and an index and returns corresponding value from store
 * Ex : @param regex = '{{tenantName}} && @param i = 2
 * returns : tenants[i].name
 */
const getValue = (regex, i) => {
  switch (regex) {
    case REG.TENANT:
      return tenants[i].name;
    case REG.AMOUNT:
      return tenants[i].amount;
    case REG.GARANT:
      return tenants[i].garant;
    case REG.OWNER:
      return owner.name;
    case REG.LOOP_N:
      return tenants.length - i;
    default:
      throw new Error(`Can't find a value for ${regex}`);
  }
};

/*
 * Takes in the JSON object representing the document
 * and returns either true or false depending on if there is
 * exactly as many loopStarts as loopEnds
 */
const checkLoops = (formattedHTML) => {
  let loopStartIndexes: number[] = [];
  let loopEndIndexes: number[] = [];
  formattedHTML.content.forEach((node, i) => {
    if (node.text === REG.LOOP_START) loopStartIndexes.push(i);
    if (node.text === REG.LOOP_END) loopEndIndexes.push(i);
  });
  return loopStartIndexes.length === loopEndIndexes.length;
};

/*
 * Takes in the document and checks if there is still a loop to be made
 */
const isThereALoop = (formattedHTML) => {
  for (let node of formattedHTML.content) {
    if (node.text === REG.LOOP_START) return true;
  }
  return false;
};
/*
 * First function that replaces block level items
 * (logo, signature, pagebreak, table of content, ...)
 */
const replaceVars = (formattedHTML) => {
  const replaced = {
    ...formattedHTML,
    content: formattedHTML.content.map((node, i) => {
      if (node.text === REG.LOGO)
        return {
          image: logo64,
          width: 150,
        };
      if (node.text === REG.CENTERED_LOGO)
        return {
          image: logo64,
          width: 150,
          style: "center",
        };
      if (node.text === REG.SIGNATURE)
        return {
          image: signature64,
          width: 150,
        };
      if (node.text === REG.CENTERED_SIGNATURE)
        return {
          image: signature64,
          width: 150,
          style: "center",
        };
      if (node.text === REG.PAGEBREAK)
        return {
          text: "",
          pageBreak: "after",
        };
      if (node.text === REG.TABLE_OF_CONTENT)
        return {
          toc: {
            title: { text: "INDEX", style: "header" },
          },
          pageBreak: "after",
        };
      if (node.text.includes(REG.TOC_ITEM))
        return {
          ...node,
          text: node.text.replace(REG.TOC_ITEM, ""),
          tocItem: true,
        };
      if (node.text.includes(REG.OWNER))
        return {
          ...node,
          text: node.text.replace(REG.OWNER, owner.name),
        };
      return node;
    }),
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        alignment: "justify",
        margin: [0, 20, 0, 20],
      },
      center: {
        alignment: "center",
      },
    },
  };
  return replaced;
};

/*
 * Takes a string and replace all occurences of variables
 * with actual values
 */
const replaceVarsInString = (string, x) => {
  let replaced = string;
  Object.keys(REG).forEach((regex) => {
    if (string.includes(REG[regex])) {
      replaced = replaced.replace(REG[regex], getValue(REG[regex], x));
    }
  });
  return replaced;
};

/*
 * Takes in the document and :
 *   1 : Records first loop start and first loop end
 *   2 : Creates an array of all the items in between the two loop markers
 *   3 : Replaces the variables inside of that block
 *   4 : Inserts block back into document as many times as there is tenants
 * Then returns the document
 */
const replaceLoops = (formattedHTML) => {
  let loopStart;
  let loopEnd;
  formattedHTML.content.forEach((node, i) => {
    if (loopStart !== undefined && loopEnd !== undefined) return;
    if (node.text === REG.LOOP_START) loopStart = i;
    if (node.text === REG.LOOP_END) loopEnd = i;
  });
  let blockToAdd = [];
  for (let y = loopStart + 1; y < loopEnd; y++) {
    blockToAdd.push(formattedHTML.content[y]);
  }
  formattedHTML.content.splice(loopStart, loopEnd - loopStart + 1);
  for (let x = 0; x <= tenants.length - 1; x++) {
    let replacedBlock = blockToAdd.map((node) => {
      let replacedString = replaceVarsInString(node.text, x);

      return {
        ...node,
        text: replacedString,
      };
    });
    formattedHTML.content.splice(loopStart, 0, ...replacedBlock);
  }
  return formattedHTML;
};

export default function App() {
  const pdfMake = usePdfMake();
  const editorRef = useRef(null);
  const makePDF = async () => {
    if (editorRef.current) {
      let rawHTML = editorRef.current.getContent();
      //console.log(html);

      const formattedHTML = {
        content: await htmlToPdfmake(rawHTML),
      };

      const isLoopsOk = checkLoops(formattedHTML);
      if (!isLoopsOk) {
        alert(
          "There is not as many loop start as loop ends. Please check your template and try again."
        );
        return;
      }
      console.log(formattedHTML);
      const replacedVars = replaceVars(formattedHTML);
      /* console.log("REPLACED VARIABLES");
      console.log(replacedVars); */
      let replacedLoops = replacedVars;
      while (isThereALoop(replacedLoops)) {
        replacedLoops = replaceLoops(replacedVars);
      }
      const pdf = pdfMake.createPdf(replacedLoops);

      console.log(pdf);

      pdf.open();
    }
  };
  return (
    <>
      <Editor
        apiKey={API_KEY}
        onInit={(evt, editor) => (editorRef.current = editor)}
        initialValue=""
        init={{
          height: 500,
          menubar: false,
          plugins: [
            "advlist autolink lists link image charmap print preview anchor",
            "searchreplace visualblocks code fullscreen",
            "insertdatetime media table paste code help wordcount",
          ],
          toolbar:
            "undo redo | formatselect | " +
            "bold italic forecolor | alignleft aligncenter " +
            "alignright | bullist numlist | " +
            "addPageBreak toc loop | variables images | help test",
          content_style:
            "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
          color_cols: 5,
          image_description: false,
          setup: (e) => {
            e.ui.registry.addButton("test", {
              text: "TEST",
              onAction: () => e.execCommand("mceInsertNewLine", false),
            });
            e.ui.registry.addButton("addPageBreak", {
              text: "",
              icon: "page-break",
              onAction: () => {
                e.insertContent("{{pageBreak}}");
                e.execCommand("mceInsertNewLine", false);
              },
            });
            e.ui.registry.addMenuButton("toc", {
              text: "T.O.C.",
              icon: "bookmark",
              fetch: function (callback) {
                let items: {}[] = [
                  {
                    type: "menuitem",
                    text: "Table-of-content",
                    icon: "document-properties",
                    onAction: function () {
                      e.insertContent("{{toc}}");
                      e.execCommand("mceInsertNewLine", false);
                    },
                  },
                  {
                    type: "menuitem",
                    text: "Toc-item",
                    icon: "link",
                    onAction: function () {
                      e.insertContent("{{tocItem->}}");
                    },
                  },
                ];
                callback(items);
              },
            });
            e.ui.registry.addMenuButton("loop", {
              text: "Loop",
              icon: "code-sample",
              fetch: function (callback) {
                let items: {}[] = [
                  {
                    type: "menuitem",
                    text: "Loop-start",
                    onAction: function () {
                      e.insertContent("{{loop}}");
                      e.execCommand("mceInsertNewLine", false);
                    },
                  },
                  {
                    type: "menuitem",
                    text: "Loop-end",
                    onAction: function () {
                      e.insertContent("{{loopEnd}}");
                      e.execCommand("mceInsertNewLine", false);
                    },
                  },
                  {
                    type: "menuitem",
                    text: "Loop n value",
                    onAction: function () {
                      e.insertContent("{{loop-n}}");
                      e.execCommand("mceInsertNewLine", false);
                    },
                  },
                ];
                callback(items);
              },
            });
            e.ui.registry.addMenuButton("variables", {
              text: "Variables",
              icon: "edit-block",
              fetch: function (callback) {
                let items: {}[] = [
                  {
                    type: "nestedmenuitem",
                    text: "Tenants",
                    icon: "user",
                    getSubmenuItems: function () {
                      return [
                        {
                          type: "menuitem",
                          text: "Name",
                          icon: "format",
                          onAction: function () {
                            e.insertContent("{{tenantName}}");
                          },
                        },
                        {
                          type: "menuitem",
                          text: "Amount",
                          icon: "notice",
                          onAction: function () {
                            e.insertContent("{{tenantAmount}}");
                          },
                        },
                      ];
                    },
                  },
                  {
                    type: "menuitem",
                    text: "Owner",
                    icon: "preview",
                    onAction: function () {
                      e.insertContent("{{owner}}");
                    },
                  },
                ];
                callback(items);
              },
            });
            e.ui.registry.addMenuButton("images", {
              text: "Images",
              icon: "image",
              fetch: function (callback) {
                let items: {}[] = [
                  {
                    type: "nestedmenuitem",
                    text: "Logo",
                    getSubmenuItems: function () {
                      return [
                        {
                          type: "menuitem",
                          text: "Centered Logo",
                          icon: "align-center",
                          onAction: function () {
                            e.insertContent("{{logoImage-centered}}");
                            e.execCommand("mceInsertNewLine", false);
                          },
                        },
                        {
                          type: "menuitem",
                          text: "Logo",
                          icon: "align-left",
                          onAction: function () {
                            e.insertContent("{{logoImage}}");
                            e.execCommand("mceInsertNewLine", false);
                          },
                        },
                      ];
                    },
                  },
                  {
                    type: "nestedmenuitem",
                    text: "Signature",
                    getSubmenuItems: function () {
                      return [
                        {
                          type: "menuitem",
                          text: "Centered Signature",
                          icon: "align-center",
                          onAction: function () {
                            e.insertContent("{{signatureImage-centered}}");
                            e.execCommand("mceInsertNewLine", false);
                          },
                        },
                        {
                          type: "menuitem",
                          text: "Signature",
                          icon: "align-left",
                          onAction: function () {
                            e.insertContent("{{signatureImage}}");
                            e.execCommand("mceInsertNewLine", false);
                          },
                        },
                      ];
                    },
                  },
                ];
                callback(items);
              },
            });
          },
          content_css: "/mycss.css",
        }}
      />
      <button onClick={makePDF}>Log editor content</button>
    </>
  );
}
