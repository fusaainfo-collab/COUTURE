type PdfOptions = {
  filename: string;
  title: string;
  lines: string[];
  width: number;
  height: number;
  margin: number;
  fontSize: number;
};

export const pdfSizes = {
  a4: { width: 595.28, height: 841.89, margin: 42, fontSize: 10 },
  receipt80: { width: 226.77, height: 640, margin: 12, fontSize: 8 },
  receipt58: { width: 164.41, height: 720, margin: 8, fontSize: 7 }
};

export function downloadSimplePdf({ filename, title, lines, width, height, margin, fontSize }: PdfOptions) {
  const safeTitle = sanitizePdfText(title);
  const safeLines = [safeTitle, "", ...lines.map(sanitizePdfText)];
  const leading = fontSize + 4;
  const maxLinesPerPage = Math.max(1, Math.floor((height - margin * 2) / leading));
  const pages = chunk(safeLines, maxLinesPerPage);

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const fontObjectId = 3;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[fontObjectId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const contentObjectId = 4 + index * 2;
    const pageObjectId = 5 + index * 2;
    pageObjectIds.push(pageObjectId);

    const text = [
      "BT",
      `/F1 ${fontSize} Tf`,
      `${margin} ${height - margin} Td`,
      `${leading} TL`,
      ...pageLines.map((line, lineIndex) => `${lineIndex === 0 ? "" : "T* "}${escapePdfString(line)} Tj`),
      "ET"
    ]
      .filter(Boolean)
      .join("\n");

    objects[contentObjectId] = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const orderedObjects = objects
    .map((body, index) => ({ id: index, body }))
    .filter((object) => object.id > 0 && Boolean(object.body));

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  orderedObjects.forEach((object) => {
    offsets[object.id] = pdf.length;
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  const maxId = Math.max(...orderedObjects.map((object) => object.id));
  pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function receiptHeight(lineCount: number, fontSize: number, margin: number) {
  return Math.max(260, margin * 2 + (lineCount + 4) * (fontSize + 4));
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfString(value: string) {
  return `(${value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

