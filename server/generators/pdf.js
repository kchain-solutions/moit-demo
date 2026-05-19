import { getConfig } from '../config.js';

export function makeSeedPdf(docType, ref, issuer, ucr, shipDate, exporter, importer, fromCountry, toCountry) {
  const cfgTemplate = getConfig()?.documentTemplates?.pdfTemplates?.[docType];
  if (cfgTemplate?.lines) {
    const vars = { ref, shipDate, exporter, importer, ucr, fromCountry, toCountry, issuer };
    const templateLines = cfgTemplate.lines.map(line =>
      line.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? '')
    );
    const body = templateLines
      .map(l => `(${l.replace(/[()\\]/g, '\\$&')}) Tj T*`)
      .join('\n');
    const stream = `BT\n/F1 11 Tf\n72 720 Td\n14 TL\n` + body + `\nET`;
    const streamLen = Buffer.byteLength(stream, 'utf8');
    const pdf =
      `%PDF-1.4\n` +
      `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
      `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
      `3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n` +
      `4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
      `5 0 obj<</Length ${streamLen}>>\nstream\n${stream}\nendstream\nendobj\n` +
      `xref\n0 6\n0000000000 65535 f \n` +
      `trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8').toString('base64');
  }

  const lines = {
    'Commercial Invoice': [
      `COMMERCIAL INVOICE`, ``,
      `Invoice No : ${ref}`, `Date       : ${shipDate}`,
      `Exporter   : ${exporter}`, `Importer   : ${importer}`,
      `UCR        : ${ucr}`, `Route      : ${fromCountry} to ${toCountry}`,
      ``, `This document serves as the commercial invoice for the above shipment.`,
    ],
    'Packing List': [
      `PACKING LIST`, ``,
      `Reference  : ${ref}`, `Date       : ${shipDate}`,
      `Exporter   : ${exporter}`, `UCR        : ${ucr}`,
      ``, `Package details are as per the accompanying commercial invoice.`,
    ],
    'Bill of Lading': [
      `BILL OF LADING`, ``,
      `B/L No     : ${ref}`, `Date       : ${shipDate}`,
      `Shipper    : ${exporter}`, `Consignee  : ${importer}`,
      `UCR        : ${ucr}`,
      `Port of Loading    : ${fromCountry}`, `Port of Discharge  : ${toCountry}`,
      ``, `Received in apparent good order and condition the goods described herein.`,
    ],
    'Certificate of Origin': [
      `CERTIFICATE OF ORIGIN`, ``,
      `Certificate No : ${ref}`, `Date           : ${shipDate}`,
      `Issued by      : ${issuer}`, `Exporter       : ${exporter}`,
      `UCR            : ${ucr}`, `Country of Origin : ${fromCountry}`,
      ``, `We hereby certify that the goods described in this document`,
      `originate in ${fromCountry} and comply with all applicable regulations.`,
    ],
    'Export Declaration': [
      `EXPORT DECLARATION`, ``,
      `Declaration No : ${ref}`, `Date           : ${shipDate}`,
      `Declarant      : ${issuer}`, `Exporter       : ${exporter}`,
      `UCR            : ${ucr}`,
      `Country of Export : ${fromCountry}`, `Country of Destination : ${toCountry}`,
    ],
    'Inspection Report': [
      `QUALITY INSPECTION REPORT`, ``,
      `Report No    : ${ref}`, `Date         : ${shipDate}`,
      `Inspector    : ${issuer}`, `Manufacturer : ${exporter}`,
      `UCR          : ${ucr}`, ``, `RESULT: PASS`,
    ],
    'Bill of Material': [
      `BILL OF MATERIAL`, ``,
      `Reference    : ${ref}`, `Date         : ${shipDate}`,
      `Manufacturer : ${exporter}`, `UCR          : ${ucr}`,
    ],
  };
  const body = (lines[docType] || [`${docType}`, ``, `Reference: ${ref}`, `Issuer: ${issuer}`, `UCR: ${ucr}`])
    .map(l => `(${l.replace(/[()\\]/g, '\\$&')}) Tj T*`)
    .join('\n');

  const stream = `BT\n/F1 11 Tf\n72 720 Td\n14 TL\n` + body + `\nET`;
  const streamLen = Buffer.byteLength(stream, 'utf8');

  const pdf =
    `%PDF-1.4\n` +
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
    `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
    `3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n` +
    `4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
    `5 0 obj<</Length ${streamLen}>>\nstream\n${stream}\nendstream\nendobj\n` +
    `xref\n0 6\n0000000000 65535 f \n` +
    `trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8').toString('base64');
}
