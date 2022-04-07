import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import htmlToPdfmake from "html-to-pdfmake";
import { usePdfMake } from "./usePdfMake";
import { logo64, signature64 } from "./images";
import { API_KEY } from "../env";
import { example } from "../example";

/*
 * Constants
 */
const tenants = [
  {
    name: "John Quelquechose",
    amount: 320,
    garant: "Son père",
    nn: "52.18.94-648.12",
    blocation: "Liège",
    adress: "12, rue des parfums, Anderlecht, Bruxelles",
    cellphone: "0487/92.15.74",
  },
  {
    name: "Betty Boop",
    amount: 340,
    garant: "Sa cousine",
    nn: "22.11.66-481.26",
    blocation: "Liège",
    adress: "25, avenue ici, Jette, Bruxelles",
    cellphone: "0495/78.12.64",
  },
  {
    name: "Albert Jacob",
    amount: 420,
    garant: "Sa mère",
    nn: "19.12.72-192.22",
    blocation: "Liège",
    adress: "96, clos des lilas, Namur",
    cellphone: "0472/12.64.28",
  },
];
const owner = {
  name: "Ivan Malkovich",
  nn: "19.12.47-648.11",
  blocation: "Liège",
  cellphone: "0448/11.66.11",
  adress: "39, avenue Blonden, 3000, Liège.",
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
  TENANT_NAME: "{{tenantName}}",
  TENANT_NN: "{{tenantNN}}",
  TENANT_BLOCATION: "{{tenantBornLocation}}",
  TENANT_ADRESS: "{{tenantAdress}}",
  TENANT_CELLPHONE: "{{tenantTelephone}}",

  AMOUNT: "{{tenantAmount}}",
  GARANT: "{{tenantWarrantor}}",
  OWNER_NAME: "{{ownerName}}",
  OWNER_NN: "{{ownerNN}}",
  OWNER_BLOCATION: "{{ownerBornLocation}}",
  OWNER_ADRESS: "{{ownerAdress}}",
  OWNER_CELLPHONE: "{{ownerTelephone}}",
};

/*
 * Takes in a REG value and an index and returns corresponding value from store
 * Ex : @param regex = '{{tenantName}} && @param i = 2
 * returns : tenants[i].name
 */
const getValue = (regex, i) => {
  switch (regex) {
    case REG.TENANT_NAME:
      return tenants[i].name;
    case REG.TENANT_NN:
      return tenants[i].nn;
    case REG.TENANT_BLOCATION:
      return tenants[i].blocation;
    case REG.TENANT_ADRESS:
      return tenants[i].adress;
    case REG.TENANT_CELLPHONE:
      return tenants[i].cellphone;
    case REG.AMOUNT:
      return tenants[i].amount;
    case REG.GARANT:
      return tenants[i].garant;
    case REG.OWNER_NAME:
      return owner.name;
    case REG.OWNER_NN:
      return owner.nn;
    case REG.OWNER_BLOCATION:
      return owner.blocation;
    case REG.OWNER_ADRESS:
      return owner.adress;
    case REG.OWNER_CELLPHONE:
      return owner.cellphone;
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
    content: formattedHTML.content.map((node) => {
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
const replaceVarsInString = (string, x?) => {
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
      const replacedVars = replaceVars(formattedHTML);
      /* console.log("REPLACED VARIABLES");
      console.log(replacedVars); */
      let replacedLoops = replacedVars;
      while (isThereALoop(replacedLoops)) {
        replacedLoops = replaceLoops(replacedVars);
      }
      const finalDoc = {
        ...replacedLoops,
        content: replacedLoops.content.map((node) => {
          if (!node.text) return node;
          return {
            ...node,
            text: replaceVarsInString(node.text),
          };
        }),
      };
      const pdf = pdfMake.createPdf(finalDoc);

      console.log(pdf);

      pdf.open();
    }
  };
  return (
    <>
      <Editor
        apiKey={API_KEY}
        onInit={(evt, editor) => (editorRef.current = editor)}
        initialValue={example}
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
      <button onClick={makePDF}>View PDF</button>
    </>
  );
}
