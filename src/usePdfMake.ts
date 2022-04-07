import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";

export function usePdfMake() {
  let pdfMaker = pdfMake;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfMaker.vfs = pdfFonts.pdfMake.vfs;

  return pdfMaker;
}
