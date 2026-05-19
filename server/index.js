import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { loadConfig, getConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load corridor configuration (before store init)
loadConfig();
const args = process.argv.slice(2).reduce((a, c) => { const [k, v] = c.replace('--', '').split('='); a[k] = v; return a; }, {});
// Env vars take priority (Railway/cloud deployment), CLI args used for local dev
const PORT     = parseInt(process.env.PORT     || args.port || '4000');
const WS_PORT  = parseInt(process.env.WS_PORT  || args.ws   || '4010');
const NODE_ID  = process.env.NODE_ID   || args.id   || 'alpha';
const NODE_NAME= process.env.NODE_NAME || args.name || 'Node Alpha';
const PEER_URL = process.env.PEER_URL  || args.peer || null;
const NODE_IP  = `127.0.0.1:${PORT}`;

const DATA_DIR = path.join(__dirname, '../data');
const LEDGER_FILE = path.join(DATA_DIR, `ledger-${NODE_ID}.json`);

function loadLedgerLog() {
  try {
    if (existsSync(LEDGER_FILE)) return JSON.parse(readFileSync(LEDGER_FILE, 'utf-8'));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to load ledger log:`, e.message); }
  return [];
}

function saveLedgerLog() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(LEDGER_FILE, JSON.stringify(store.ledgerLog, null, 2));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to save ledger log:`, e.message); }
}

const genId = () => crypto.randomBytes(8).toString('hex');
const genHash = () => '0x' + crypto.randomBytes(16).toString('hex');
const genDID = () => 'did:iota:0x' + crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();


// ── Credential validation (all lists from config, empty if no config) ──
const cfg = getConfig();
const BLACKLISTED = cfg?.credentials?.blacklisted ?? [];
const EXPIRED = cfg?.credentials?.expired ?? [];
const SUSPENDED = cfg?.credentials?.suspended ?? [];

function validateCredential(regNumber) {
  const n = (regNumber || '').toUpperCase().trim();
  if (n.length < 6) return { valid: false, reason: 'Registration number too short (minimum 6 characters)', failStep: 0 };
  if (BLACKLISTED.includes(n)) return { valid: false, reason: 'Registration number is on the DENIED list — organisation not recognised by any registry', failStep: 1 };
  if (n.startsWith('X') || n.startsWith('0')) return { valid: false, reason: 'Invalid prefix — number not found in any recognised national or international registry', failStep: 1 };
  if (EXPIRED.includes(n)) return { valid: false, reason: 'Registration has EXPIRED — licence is no longer active. Organisation must renew before DID issuance.', failStep: 2 };
  if (SUSPENDED.includes(n)) return { valid: false, reason: 'Registration is SUSPENDED — organisation is under regulatory review. DID issuance blocked.', failStep: 2 };
  const prefix = n.split('-')[0];
  const typeMap = cfg?.credentials?.registrationTypes ?? {};
  return { valid: true, type: typeMap[prefix] || 'National Registration Number', formatted: n };
}

// ── Store (all orgs from config, empty if no config) ──
function initOrgs() {
  const cfgOrgs = getConfig()?.nodes?.[NODE_ID]?.orgs;
  if (cfgOrgs) return cfgOrgs.map(o => ({ ...o, did: null, verified: false, regNumber: null }));
  return [];
}

const store = {
  orgs: initOrgs(),
  consignments: [], documents: [], permissions: {}, docPermissions: {},
  payments: [], letterOfCredits: [], smartContracts: [], financePermissions: {},
  ledgerLog: loadLedgerLog(),
  peerOrgs: [], peerConnected: false,
};

function addLog(type, action, actor, details, extra = {}) {
  const entry = { id: genId(), timestamp: now(), hash: genHash(), type, action, actor, details, ...extra };
  store.ledgerLog.unshift(entry);
  saveLedgerLog();
  broadcastToClients({ type: 'LEDGER_UPDATE', log: store.ledgerLog });
  const activePeer = [peerWs, peerInWs].find(w => w?.readyState === WebSocket.OPEN);
  if (store.peerConnected && activePeer) activePeer.send(JSON.stringify({ type: 'LEDGER_ENTRY', entry }));
  return entry;
}

// Idempotent seed helper — appends historical events without duplicating
function seedLog(type, action, actor, details, timestamp) {
  if (store.ledgerLog.some(e => e.details === details)) return;
  store.ledgerLog.push({ id: genId(), timestamp, hash: genHash(), type, action, actor, details });
}

// ── PDF generator for seeded documents ──
function makeSeedPdf(docType, ref, issuer, ucr, shipDate, exporter, importer, fromCountry, toCountry) {
  // Try config-based PDF template first
  const cfgTemplate = getConfig()?.documentTemplates?.pdfTemplates?.[docType];
  if (cfgTemplate?.lines) {
    const vars = { ref, shipDate, exporter, importer, ucr, fromCountry, toCountry, issuer };
    const templateLines = cfgTemplate.lines.map(line =>
      line.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? '')
    );
    // Build the PDF using templateLines instead of falling through
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

  // Fallback: generic templates (corridor-specific types must come from config)
  const lines = {
    'Commercial Invoice': [
      `COMMERCIAL INVOICE`, ``,
      `Invoice No : ${ref}`,
      `Date       : ${shipDate}`,
      `Exporter   : ${exporter}`,
      `Importer   : ${importer}`,
      `UCR        : ${ucr}`,
      `Route      : ${fromCountry} to ${toCountry}`,
      ``, `This document serves as the commercial invoice for the above shipment.`,
    ],
    'Packing List': [
      `PACKING LIST`, ``,
      `Reference  : ${ref}`,
      `Date       : ${shipDate}`,
      `Exporter   : ${exporter}`,
      `UCR        : ${ucr}`,
      ``, `Package details are as per the accompanying commercial invoice.`,
    ],
    'Bill of Lading': [
      `BILL OF LADING`, ``,
      `B/L No     : ${ref}`,
      `Date       : ${shipDate}`,
      `Shipper    : ${exporter}`,
      `Consignee  : ${importer}`,
      `UCR        : ${ucr}`,
      `Port of Loading    : ${fromCountry}`,
      `Port of Discharge  : ${toCountry}`,
      ``, `Received in apparent good order and condition the goods described herein.`,
    ],
    'Certificate of Origin': [
      `CERTIFICATE OF ORIGIN`, ``,
      `Certificate No : ${ref}`,
      `Date           : ${shipDate}`,
      `Issued by      : ${issuer}`,
      `Exporter       : ${exporter}`,
      `UCR            : ${ucr}`,
      `Country of Origin : ${fromCountry}`,
      ``, `We hereby certify that the goods described in this document`,
      `originate in ${fromCountry} and comply with all applicable regulations.`,
    ],
    'Export Declaration': [
      `EXPORT DECLARATION`, ``,
      `Declaration No : ${ref}`,
      `Date           : ${shipDate}`,
      `Declarant      : ${issuer}`,
      `Exporter       : ${exporter}`,
      `UCR            : ${ucr}`,
      `Country of Export : ${fromCountry}`,
      `Country of Destination : ${toCountry}`,
    ],
    'Inspection Report': [
      `QUALITY INSPECTION REPORT`, ``,
      `Report No    : ${ref}`,
      `Date         : ${shipDate}`,
      `Inspector    : ${issuer}`,
      `Manufacturer : ${exporter}`,
      `UCR          : ${ucr}`,
      ``, `RESULT: PASS`,
    ],
    'Bill of Material': [
      `BILL OF MATERIAL`, ``,
      `Reference    : ${ref}`,
      `Date         : ${shipDate}`,
      `Manufacturer : ${exporter}`,
      `UCR          : ${ucr}`,
    ],
  };
  const body = (lines[docType] || [`${docType}`, ``, `Reference: ${ref}`, `Issuer: ${issuer}`, `UCR: ${ucr}`])
    .map(l => `(${l.replace(/[()\\]/g, '\\$&')}) Tj T*`)
    .join('\n');

  const stream =
    `BT\n/F1 11 Tf\n72 720 Td\n14 TL\n` + body + `\nET`;
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

// ── XML generator for seeded BOL / Export Declaration documents ──
function escXml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function makeSeedXml(docType, m, ref) {
  // Deterministic fake values derived from the UCR so they're stable across restarts
  const seed = parseInt(m.ucr.replace(/\D/g, '').slice(-4) || '1234');
  const voyageNo  = `V${2600 + (seed % 99)}`;
  const imoNo     = `IMO${9000000 + (seed % 999999)}`;
  const blOriginals = '3';
  const containerNo = `TCKU${3000000 + (seed % 9999999)}`;
  const sealNo      = `SL${10000 + (seed % 89999)}`;
  const grossMass   = m.quantity.match(/[\d,]+/)?.[0]?.replace(',','') || '1000';
  const netMass     = Math.round(parseInt(grossMass) * 0.97);
  const arrival     = new Date(new Date(m.shipDate).getTime() + 14 * 86400000).toISOString().slice(0,10);
  const addrBook = getConfig()?.documentTemplates?.addressBook ?? {};
  const carrier  = getConfig()?.documentTemplates?.defaultCarrier ?? 'Carrier';
  const exporterAddr = addrBook[m.fromCountry] ?? 'Unknown';
  const importerAddr = addrBook[m.toCountry] ?? 'Unknown';

  const e = escXml;
  if (docType === 'Bill of Lading') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<TransportDocument>
  <TransportDocumentReference>${e(ref)}</TransportDocumentReference>
  <ContractQuotationReference>${e(m.ucr)}</ContractQuotationReference>
  <IssueDate>${m.shipDate}</IssueDate>
  <ShippedOnBoardDate>${m.shipDate}</ShippedOnBoardDate>
  <IssuerCode>NL-SHP-001</IssuerCode>
  <ServiceContractReference>${e(m.invoiceRef)}</ServiceContractReference>
  <Shipper>
    <PartyName>${e(m.exporter)}</PartyName>
    <Address>${e(exporterAddr)}</Address>
    <RegistrationNumber>REG-${m.fromCountry.slice(0,2).toUpperCase()}-${seed}</RegistrationNumber>
    <TaxIdentifier>TAX-${seed + 1000}</TaxIdentifier>
  </Shipper>
  <Consignee>
    <PartyName>${e(m.importer)}</PartyName>
    <Address>${e(importerAddr)}</Address>
    <RegistrationNumber>REG-${m.toCountry.slice(0,2).toUpperCase()}-${seed + 500}</RegistrationNumber>
  </Consignee>
  <VesselName>${e(m.vessel)}</VesselName>
  <VoyageNumber>${voyageNo}</VoyageNumber>
  <IMONumber>${imoNo}</IMONumber>
  <CarrierName>${e(carrier)}</CarrierName>
  <PortOfLoading>${e(m.originPort)}</PortOfLoading>
  <PortOfDischarge>${e(m.destinationPort)}</PortOfDischarge>
  <EstimatedArrival>${arrival}</EstimatedArrival>
  <HSCode>${e(m.hsCode)}</HSCode>
  <DescriptionOfGoods>${e(m.product)}</DescriptionOfGoods>
  <Quantity>${grossMass}</Quantity>
  <QuantityUnit>MT</QuantityUnit>
  <GrossWeight>${grossMass}</GrossWeight>
  <GrossWeightUnit>MT</GrossWeightUnit>
  <NumberOfPackages>${Math.ceil(parseInt(grossMass) / 25)}</NumberOfPackages>
  <DeclaredValue>${m.totalValue}</DeclaredValue>
  <Currency>${m.currency}</Currency>
  <Incoterms>${e(m.incoterms)}</Incoterms>
  <FreightPayableBy>${m.incoterms === 'FOB' ? 'Consignee' : 'Shipper'}</FreightPayableBy>
  <NumberOfOriginalsBL>${blOriginals}</NumberOfOriginalsBL>
  <IssuePlaceAndDate>${e(m.originPort)}, ${m.shipDate}</IssuePlaceAndDate>
  <SignatoryName>Captain, ${e(m.vessel)}</SignatoryName>
</TransportDocument>`;
  }

  if (docType === 'Export Declaration') {
    const edCfg = getConfig()?.documentTemplates?.xmlTemplates?.['Export Declaration'];
    const declarantName = edCfg?.declarantName ?? 'Customs Authority';
    return `<?xml version="1.0" encoding="UTF-8"?>
<CustomsDeclaration>
  <DeclarationNumber>${e(ref)}</DeclarationNumber>
  <UCR>${e(m.ucr)}</UCR>
  <DeclarationDate>${m.shipDate}</DeclarationDate>
  <DeclarationType>EX</DeclarationType>
  <ProcedureCode>1000</ProcedureCode>
  <CountryOfDispatch>${e(m.fromCountry)}</CountryOfDispatch>
  <CountryOfDestination>${e(m.toCountry)}</CountryOfDestination>
  <PortOfExport>${e(m.originPort)}</PortOfExport>
  <PortOfDestination>${e(m.destinationPort)}</PortOfDestination>
  <Exporter>
    <Name>${e(m.exporter)}</Name>
    <Address>${e(exporterAddr)}</Address>
    <Identifier>EXP-${m.fromCountry.slice(0,2).toUpperCase()}-${seed}</Identifier>
    <TaxIdentifier>TAX-${seed + 1000}</TaxIdentifier>
  </Exporter>
  <Consignee>
    <Name>${e(m.importer)}</Name>
    <Address>${e(importerAddr)}</Address>
    <Identifier>IMP-${m.toCountry.slice(0,2).toUpperCase()}-${seed + 500}</Identifier>
  </Consignee>
  <TransportMode>1</TransportMode>
  <VesselName>${e(m.vessel)}</VesselName>
  <VoyageNumber>${voyageNo}</VoyageNumber>
  <IMONumber>${imoNo}</IMONumber>
  <ContainerNumber>${containerNo}</ContainerNumber>
  <SealNumber>${sealNo}</SealNumber>
  <HSCode>${e(m.hsCode)}</HSCode>
  <Description>${e(m.product)}</Description>
  <Quantity>${grossMass}</Quantity>
  <QuantityUnit>MT</QuantityUnit>
  <UnitPrice>${Math.round(m.totalValue / parseInt(grossMass))}</UnitPrice>
  <CustomsValue>${m.totalValue}</CustomsValue>
  <Currency>${m.currency}</Currency>
  <GrossMass>${grossMass}</GrossMass>
  <NetMass>${netMass}</NetMass>
  <CountryOfOrigin>${e(m.fromCountry)}</CountryOfOrigin>
  <PreferenceCode>100</PreferenceCode>
  <InvoiceNumber>${e(m.invoiceRef)}</InvoiceNumber>
  <InvoiceDate>${m.shipDate}</InvoiceDate>
  <InvoiceTotal>${m.totalValue}</InvoiceTotal>
  <InvoiceCurrency>${m.currency}</InvoiceCurrency>
  <Incoterms>${e(m.incoterms)}</Incoterms>
  <BillOfLadingRef>BL-${ref.replace(/[A-Z]+-\d+-/,'')}</BillOfLadingRef>
  <CertificateOfOriginRef>CO-${ref.replace(/[A-Z]+-\d+-/,'')}</CertificateOfOriginRef>
  <InsuranceCertificateRef>INS-${seed}</InsuranceCertificateRef>
  <DeclarantName>${e(declarantName)}</DeclarantName>
  <DeclarationLocation>${e(m.originPort)}</DeclarationLocation>
  <Status>ACCEPTED</Status>
</CustomsDeclaration>`;
  }

  if (docType === 'Bill of Material') {
    const bomCfg = getConfig()?.documentTemplates?.xmlTemplates?.['Bill of Material']?.originComposition;
    const localPct = bomCfg?.localContentPercent ?? 0;
    const cumulationApplied = bomCfg?.cptppCumulationApplied ?? false;
    const thirdPct = bomCfg?.thirdCountryContentPercent ?? 0;
    const materials = bomCfg?.inputMaterials ?? [];
    const materialsXml = materials.map(mat =>
      `      <Material><Name>${e(mat.material)}</Name><Country>${e(mat.origin)}</Country><Percent>${mat.percent}</Percent></Material>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<BillOfMaterial>
  <Reference>${e(ref)}</Reference>
  <UCR>${e(m.ucr)}</UCR>
  <Date>${m.shipDate}</Date>
  <Manufacturer>${e(m.exporter)}</Manufacturer>
  <Product>${e(m.product)}</Product>
  <HSCode>${e(m.hsCode)}</HSCode>
  <OriginComposition>
    <LocalContentPercent>${localPct}</LocalContentPercent>
    <CPTPPCumulationApplied>${cumulationApplied}</CPTPPCumulationApplied>
    <ThirdCountryContentPercent>${thirdPct}</ThirdCountryContentPercent>
    <InputMaterials>
${materialsXml}
    </InputMaterials>
  </OriginComposition>
</BillOfMaterial>`;
  }

  // Corridor-specific Certificate of Origin (e.g., MOIT CO) — reads all fields from config
  const coCfg = getConfig()?.documentTemplates?.xmlTemplates?.[docType];
  if (coCfg?.issuingAuthority) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<CertificateOfOrigin>
  <CertificateNumber>${e(ref)}</CertificateNumber>
  <FormType>${coCfg.formType || 'Standard'}</FormType>
  <IssueDate>${m.shipDate}</IssueDate>
  <IssuingAuthority>${e(coCfg.issuingAuthority)}</IssuingAuthority>
  <IssuingSystem>${coCfg.issuingSystem || 'Manual'}</IssuingSystem>
  <Exporter><PartyName>${e(m.exporter)}</PartyName><Country>${m.fromCountry.slice(0,2).toUpperCase()}</Country></Exporter>
  <Consignee><PartyName>${e(m.importer)}</PartyName><Country>${m.toCountry.slice(0,2).toUpperCase()}</Country></Consignee>
  <Goods>
    <HSCode>${e(m.hsCode)}</HSCode>
    <Description>${e(m.product)}</Description>
    <OriginCriterion>${coCfg.originCriterion || 'WO'}</OriginCriterion>
    <OriginCountry>${m.fromCountry.slice(0,2).toUpperCase()}</OriginCountry>
  </Goods>
  <CumulationDeclaration>
    <CumulationApplied>${!!coCfg.cumulationPartnerCountry}</CumulationApplied>
    <CumulationPartnerCountry>${coCfg.cumulationPartnerCountry || ''}</CumulationPartnerCountry>
    <CumulationMaterialType>${e(coCfg.cumulationMaterialType || '')}</CumulationMaterialType>
  </CumulationDeclaration>
  <DigitalSignature>
    <SignerIdentity>${coCfg.issuingSystem || 'Authority'}</SignerIdentity>
    <Timestamp>${m.shipDate}T10:00:00.000Z</Timestamp>
    <Algorithm>Ed25519</Algorithm>
  </DigitalSignature>
</CertificateOfOrigin>`;
  }

  return null;
}

// ── Demo consignments (from config, empty if no config) ──
const ALPHA_CONSIGNMENTS = getConfig()?.consignments?.alpha ?? [];
const BETA_CONSIGNMENTS = getConfig()?.consignments?.beta ?? [];

function docsForConsignment(m) {
  const cfgDocs = getConfig()?.documents?.[NODE_ID];
  if (cfgDocs) {
    return cfgDocs.map(d => ({
      name: d.name,
      docType: d.docType,
      issuer: d.issuerOrgId === 'creator' ? m.creatorOrgName : (d.issuerName || m.creatorOrgName),
      suffix: d.suffix,
    }));
  }
  return [];
}

function seedConsignments() {
  if (store.consignments.length > 0) return;
  const list = NODE_ID === 'alpha' ? ALPHA_CONSIGNMENTS : BETA_CONSIGNMENTS;

  for (const m of list) {
    const cId = `seed-${m.ucr}`;
    const createdAt = m.shipDate + 'T08:00:00.000Z';
    const docs = docsForConsignment(m);
    const c = {
      id: cId, ucr: m.ucr,
      commercialInvoiceNo: m.invoiceRef, exportDeclarationNo: m.declRef,
      description: m.product, product: m.product,
      hsCode: m.hsCode, quantity: m.quantity, unit: '',
      totalValue: m.totalValue, currency: m.currency,
      exporter: m.exporter, importer: m.importer,
      fromCountry: m.fromCountry, toCountry: m.toCountry,
      originPort: m.originPort, destinationPort: m.destinationPort,
      vessel: m.vessel, shipDate: m.shipDate, incoterms: m.incoterms,
      errorType: m.errorType || null, errorDescription: m.errorDescription || null,
      creatorOrgId: m.creatorOrgId, creatorOrgName: m.creatorOrgName,
      createdAt, documentCount: docs.length, status: m.status,
    };
    store.consignments.push(c);
    store.permissions[cId] = { [m.creatorOrgId]: 'owner' };
    store.financePermissions[cId] = { [m.creatorOrgId]: 'owner' };
    seedLog('document', 'Consignment Anchored', m.exporter,
      `Digital twin created: ${m.ucr} — ${m.product}. Anchored on the ledger.`, createdAt);

    for (const d of docs) {
      const ref = d.suffix === 'INV' ? m.invoiceRef
                : d.suffix === 'ED'  ? m.declRef
                : `${d.suffix}-${m.ucr.split('-').pop()}`;
      const xmlContent = (d.suffix === 'BL' || d.suffix === 'ED' || d.suffix === 'BOM' || d.suffix === 'CO') ? makeSeedXml(d.docType, m, ref) : null;
      const fileBase64 = xmlContent
        ? Buffer.from(xmlContent, 'utf8').toString('base64')
        : makeSeedPdf(d.docType, ref, d.issuer, m.ucr, m.shipDate, m.exporter, m.importer, m.fromCountry, m.toCountry);
      const filename = xmlContent ? `${ref}.xml` : `${ref}.pdf`;
      const format   = xmlContent ? 'XML' : 'PDF';
      const fileSize = Buffer.from(fileBase64, 'base64').length;
      store.documents.push({
        id: `${cId}-${d.suffix}`, consignmentId: cId,
        title: d.name, docType: d.docType,
        filename, fileSize, fileBase64,
        hash: genHash(),
        creatorOrgId: m.creatorOrgId, creatorOrgName: m.creatorOrgName,
        timestamp: createdAt, reference: ref,
        format, issuer: d.issuer,
      });
      seedLog('document', 'Document Anchored', m.exporter,
        `"${d.name}" anchored to ${m.ucr}. Issued by ${d.issuer}.`, createdAt);
    }

    // Seed logistic status events based on consignment progress
    const shipTs = new Date(m.shipDate + 'T08:00:00.000Z');
    const day = 86400000;
    if (['Released', 'In Transit', 'Customs', 'Delivered'].includes(m.status)) {
      seedLog('logistics', 'Export Clearance', m.exporter,
        `${m.ucr} — Export clearance granted. All documents verified.`,
        new Date(shipTs.getTime() - 2 * day).toISOString());
      seedLog('logistics', 'Container Loaded', m.exporter,
        `${m.ucr} — Container loaded at ${m.originPort}. Container: TCKU${3000000 + (parseInt(m.ucr.replace(/\D/g,'').slice(-4)||'0') % 9999999)}, Seal: SL${10000 + (parseInt(m.ucr.replace(/\D/g,'').slice(-4)||'0') % 89999)}.`,
        new Date(shipTs.getTime() - 1 * day).toISOString());
      seedLog('logistics', 'In Port', m.exporter,
        `${m.ucr} — Cargo received at ${m.originPort}. Awaiting vessel ${m.vessel}.`,
        new Date(shipTs.getTime()).toISOString());
      seedLog('logistics', 'Cleared for Export', m.exporter,
        `${m.ucr} — Cleared for export. Customs seal verified. Loading onto ${m.vessel}.`,
        new Date(shipTs.getTime() + 4 * 3600000).toISOString());
      seedLog('logistics', 'Departed Port', m.exporter,
        `${m.ucr} — ${m.vessel} departed ${m.originPort} bound for ${m.destinationPort}.`,
        new Date(shipTs.getTime() + 12 * 3600000).toISOString());
    }
    if (m.status === 'Delivered') {
      seedLog('logistics', 'Arrived at Port', m.importer,
        `${m.ucr} — ${m.vessel} arrived at ${m.destinationPort}.`,
        new Date(shipTs.getTime() + 18 * day).toISOString());
      seedLog('logistics', 'Import Clearance', m.importer,
        `${m.ucr} — Import clearance granted at ${m.destinationPort}. Goods released to consignee.`,
        new Date(shipTs.getTime() + 20 * day).toISOString());
    }
  }
  saveLedgerLog();
  console.log(`[${NODE_NAME}] Seeded ${store.consignments.length} consignments`);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const publicDir = path.join(__dirname, 'public');
if (existsSync(publicDir)) app.use(express.static(publicDir));

// Public config (excludes passwords, blacklists, seed data)
app.get('/api/config', (req, res) => {
  const c = getConfig();
  if (!c) return res.json(null);
  res.json({
    corridor: c.corridor,
    branding: c.branding,
    theme: c.theme,
    geography: c.geography,
    credentials: { testCredentials: c.credentials?.testCredentials },
    finance: { currencies: c.finance?.currencies, paymentMethods: c.finance?.paymentMethods },
  });
});

// Auth
app.post('/api/login', (req, res) => {
  const org = store.orgs.find(o => o.username === req.body.username && o.password === req.body.password);
  if (!org) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ org: { ...org, password: undefined }, nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP });
});

// Node info
app.get('/api/node', (req, res) => res.json({ nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP, wsPort: WS_PORT, peerConnected: store.peerConnected, orgCount: store.orgs.length, peerOrgCount: store.peerOrgs.length }));

app.get('/api/node/discover', (req, res) => {
  if (!PEER_URL) return res.json([]);
  const peerWsPort = parseInt(PEER_URL.match(/:(\d+)/)?.[1] || '0');
  const peerHttpPort = peerWsPort - 10;
  res.json([{ id: NODE_ID === 'alpha' ? 'beta' : 'alpha', name: NODE_ID === 'alpha' ? 'Node Beta' : 'Node Alpha', ip: `127.0.0.1:${peerHttpPort}`, wsUrl: PEER_URL, connected: store.peerConnected }]);
});

app.post('/api/node/connect', (req, res) => {
  if (store.peerConnected) return res.json({ success: true, message: 'Already connected' });
  connectToPeer();
  setTimeout(() => res.json({ success: store.peerConnected, message: store.peerConnected ? 'Connected — organisations now discoverable' : 'Connection attempt sent. Peer may not be online yet.' }), 2500);
});
app.post('/api/node/disconnect', (req, res) => {
  if (peerWs) { const old = peerWs; peerWs = null; old.close(); }
  if (peerInWs) { const old = peerInWs; peerInWs = null; old.close(); }
  store.peerConnected = false; store.peerOrgs = [];
  broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] });
  addLog('network', 'Peer Disconnected', 'System', 'P2P connection terminated. Peer organisations no longer visible.');
  res.json({ success: true });
});

// Orgs
app.get('/api/orgs', (req, res) => res.json(store.orgs.map(o => ({ ...o, password: undefined }))));
app.get('/api/orgs/all', (req, res) => {
  const local = store.orgs.map(o => ({ ...o, password: undefined, nodeId: NODE_ID, nodeName: NODE_NAME, local: true }));
  const remote = store.peerConnected ? store.peerOrgs.map(o => ({ ...o, local: false })) : [];
  res.json([...local, ...remote]);
});
app.put('/api/orgs/:id', (req, res) => {
  store.orgs = store.orgs.map(o => o.id === req.params.id ? { ...o, name: req.body.name ?? o.name, role: req.body.role ?? o.role } : o);
  const org = store.orgs.find(o => o.id === req.params.id);
  if (org) syncOrgsToPeer();
  res.json({ ...org, password: undefined });
});

// DID registration
function getAttestingAuthority(org) {
  const authorities = getConfig()?.credentials?.attestationAuthorities;
  if (authorities) {
    const match = authorities.find(a => org.role?.includes(a.roleMatch));
    if (match) return match.authority;
  }
  return getConfig()?.credentials?.defaultAuthority ?? 'National Business Registry';
}

app.post('/api/orgs/:id/register', (req, res) => {
  const v = validateCredential(req.body.regNumber);
  if (!v.valid) return res.status(400).json({ error: v.reason, failStep: v.failStep });
  const did = genDID();
  const org0 = store.orgs.find(o => o.id === req.params.id);
  if (!org0) return res.status(404).json({ error: 'Org not found' });
  const attestedBy = getAttestingAuthority(org0);
  store.orgs = store.orgs.map(o => o.id === req.params.id ? { ...o, regNumber: v.formatted, did, verified: true, attestedBy } : o);
  const org = store.orgs.find(o => o.id === req.params.id);
  addLog('identity', 'DID Issued', org.name, `DID created for ${org.name} (${v.type}: ${v.formatted}). Attested by ${attestedBy}. Anchored on the ledger.`, { did, attestedBy });
  syncOrgsToPeer();
  res.json({ ...org, password: undefined });
});
app.post('/api/orgs/validate-credential', (req, res) => {
  const v = validateCredential(req.body.regNumber);
  // attach attestedBy based on orgId if provided
  if (v.valid && req.body.orgId) {
    const org = store.orgs.find(o => o.id === req.body.orgId);
    if (org) v.attestedBy = getAttestingAuthority(org);
  }
  res.json(v);
});

// Consignments
app.get('/api/consignments', (req, res) => {
  const { orgId } = req.query;
  res.json(store.consignments.filter(c => {
    const p = store.permissions[c.id] || {};
    return p[orgId] === 'owner' || p[orgId] === 'viewer';
  }));
});
app.post('/api/consignments', (req, res) => {
  const { ucr, commercialInvoiceNo, exportDeclarationNo, creatorOrgId, description } = req.body;
  const org = store.orgs.find(o => o.id === creatorOrgId);
  if (!org) return res.status(400).json({ error: 'Org not found' });
  const c = { id: genId(), ucr, commercialInvoiceNo: commercialInvoiceNo || '', exportDeclarationNo: exportDeclarationNo || '', description: description || '', creatorOrgId, creatorOrgName: org.name, createdAt: now(), documentCount: 0, status: 'Draft' };
  store.consignments.push(c);
  store.permissions[c.id] = { [creatorOrgId]: 'owner' };
  addLog('document', 'Consignment Created', org.name, `Digital twin created: ${ucr}. Anchored on the ledger.`);
  res.json(c);
});

// Documents
app.get('/api/documents', (req, res) => {
  const { orgId, consignmentId } = req.query;
  let docs = store.documents;
  if (consignmentId) docs = docs.filter(d => d.consignmentId === consignmentId);
  if (orgId) {
    docs = docs.filter(d => {
      const cp = store.permissions[d.consignmentId] || {};
      if (cp[orgId] === 'owner' || d.creatorOrgId === orgId) return true;
      const dp = store.docPermissions[d.id] || {};
      if (dp[orgId]) return true;
      const hasDLP = store.documents.filter(dd => dd.consignmentId === d.consignmentId).some(dd => Object.keys(store.docPermissions[dd.id] || {}).length > 0);
      if (hasDLP) return false;
      return cp[orgId] === 'viewer';
    });
  }
  res.json(docs.map(d => ({ ...d, fileBase64: undefined })));
});
app.post('/api/documents', upload.single('file'), (req, res) => {
  const { consignmentId, title, docType, creatorOrgId } = req.body;
  const org = store.orgs.find(o => o.id === creatorOrgId);
  const consignment = store.consignments.find(c => c.id === consignmentId);
  if (!org || !consignment) return res.status(400).json({ error: 'Not found' });
  let fileBase64 = null, filename = null, fileSize = 0;
  if (req.file) { fileBase64 = req.file.buffer.toString('base64'); filename = req.file.originalname; fileSize = req.file.size; }
  const doc = { id: genId(), consignmentId, title, docType: docType || 'General', filename, fileBase64, fileSize, hash: genHash(), creatorOrgId, creatorOrgName: org.name, timestamp: now() };
  store.documents.push(doc);
  consignment.documentCount = store.documents.filter(d => d.consignmentId === consignmentId).length;
  addLog('document', 'Document Anchored', org.name, `"${title}" anchored to ${consignment.ucr}. Anchored on the ledger.`);
  res.json({ ...doc, fileBase64: undefined });
});

app.get('/api/documents/:id/download', (req, res) => {
  const doc = store.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (!doc.fileBase64) return res.status(404).json({ error: 'File not stored — upload a real file to enable download' });
  res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
  res.send(Buffer.from(doc.fileBase64, 'base64'));
});

app.get('/api/documents/:id/xml', (req, res) => {
  const doc = store.documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.fileBase64 && doc.filename?.endsWith('.xml')) {
    return res.json({ content: Buffer.from(doc.fileBase64, 'base64').toString('utf-8'), docType: doc.docType });
  }
  res.status(400).json({ error: 'Not an XML file or not available' });
});

// Permissions
app.get('/api/permissions/:consignmentId', (req, res) => res.json(store.permissions[req.params.consignmentId] || {}));
app.post('/api/permissions/share', (req, res) => {
  const { consignmentId, recipientOrgId, recipientOrgName, sharerOrgName, shareMode, selectedDocIds } = req.body;
  const consignment = store.consignments.find(c => c.id === consignmentId);
  if (!consignment) return res.status(400).json({ error: 'Not found' });
  if (!store.permissions[consignmentId]) store.permissions[consignmentId] = {};
  store.permissions[consignmentId][recipientOrgId] = 'viewer';
  const allDocs = store.documents.filter(d => d.consignmentId === consignmentId);
  if (shareMode === 'selective' && selectedDocIds?.length > 0) {
    for (const docId of selectedDocIds) { if (!store.docPermissions[docId]) store.docPermissions[docId] = {}; store.docPermissions[docId][recipientOrgId] = 'viewer'; }
    const names = allDocs.filter(d => selectedDocIds.includes(d.id)).map(d => d.title).join(', ');
    addLog('permission', 'Selective Share', sharerOrgName, `${consignment.ucr}: shared ${selectedDocIds.length}/${allDocs.length} docs with ${recipientOrgName}. [${names}]`);
  } else {
    for (const doc of allDocs) { if (!store.docPermissions[doc.id]) store.docPermissions[doc.id] = {}; store.docPermissions[doc.id][recipientOrgId] = 'viewer'; }
    addLog('permission', 'Full Share', sharerOrgName, `"${consignment.ucr}" — all ${allDocs.length} docs shared with ${recipientOrgName}. Encrypted via TLIP.`);
  }
  const isPeer = store.peerOrgs.some(o => o.id === recipientOrgId);
  const peerSock = [peerWs, peerInWs].find(w => w?.readyState === WebSocket.OPEN);
  if (isPeer && peerSock) {
    const docsToSend = shareMode === 'selective' && selectedDocIds?.length ? allDocs.filter(d => selectedDocIds.includes(d.id)) : allDocs;
    peerSock.send(JSON.stringify({ type: 'SHARE_CONSIGNMENT', consignment, documents: docsToSend.map(d => ({ ...d, fileBase64: undefined })), permissions: store.permissions[consignmentId], docPermissions: Object.fromEntries(docsToSend.map(d => [d.id, store.docPermissions[d.id] || {}])) }));
  }
  res.json({ success: true });
});
app.post('/api/permissions/revoke', (req, res) => {
  const { consignmentId, recipientOrgId, recipientOrgName, revokerOrgName } = req.body;
  const c = store.consignments.find(c => c.id === consignmentId);
  if (store.permissions[consignmentId]) delete store.permissions[consignmentId][recipientOrgId];
  store.documents.filter(d => d.consignmentId === consignmentId).forEach(d => { if (store.docPermissions[d.id]) delete store.docPermissions[d.id][recipientOrgId]; });
  addLog('permission', 'Access Revoked', revokerOrgName, `Access to "${c?.ucr}" revoked for ${recipientOrgName}.`);
  // Propagate revoke to peer node so shared data is removed
  const isPeer = store.peerOrgs.some(o => o.id === recipientOrgId);
  if (isPeer) {
    const peerSock = [peerWs, peerInWs].find(w => w?.readyState === WebSocket.OPEN);
    if (peerSock) peerSock.send(JSON.stringify({ type: 'REVOKE_CONSIGNMENT', consignmentId, recipientOrgId }));
  }
  res.json({ success: true });
});

// ── Finance helpers ──────────────────────────────────────────────────────────
function hasFinanceAccess(consignmentId, orgId) {
  const fp = store.financePermissions[consignmentId] || {};
  return fp[orgId] === 'owner' || fp[orgId] === 'viewer';
}
function financeAccessibleIds(orgId) {
  return Object.keys(store.financePermissions).filter(cId => hasFinanceAccess(cId, orgId));
}

// Finance Permissions
app.get('/api/finance-permissions/:consignmentId', (req, res) =>
  res.json(store.financePermissions[req.params.consignmentId] || {}));
app.post('/api/finance-permissions/share', (req, res) => {
  const { consignmentId, targetOrgId, role, sharerOrgName, targetOrgName } = req.body;
  if (!store.financePermissions[consignmentId]) store.financePermissions[consignmentId] = {};
  store.financePermissions[consignmentId][targetOrgId] = role || 'viewer';
  const c = store.consignments.find(c => c.id === consignmentId);
  addLog('finance', 'Finance Access Granted', sharerOrgName,
    `Finance data for ${c?.ucr} shared with ${targetOrgName}.`);
  res.json({ success: true });
});

// Payments
app.get('/api/payments', (req, res) => {
  const { orgId, consignmentId } = req.query;
  if (consignmentId) {
    if (!hasFinanceAccess(consignmentId, orgId)) return res.json([]);
    return res.json(store.payments.filter(p => p.consignmentId === consignmentId));
  }
  const ids = financeAccessibleIds(orgId);
  res.json(store.payments.filter(p => ids.includes(p.consignmentId)));
});
app.post('/api/payments', (req, res) => {
  const { consignmentId, invoiceRef, amount, currency, dueDate, paymentMethod, payorOrgId, payeeOrgId, notes, creatorOrgId } = req.body;
  const fp = store.financePermissions[consignmentId] || {};
  if (fp[creatorOrgId] !== 'owner') return res.status(403).json({ error: 'Finance owner access required' });
  const c = store.consignments.find(c => c.id === consignmentId);
  const payment = { id: genId(), consignmentId, ucr: c?.ucr || '', invoiceRef, amount: Number(amount), currency,
    dueDate, status: 'Unpaid', paidAmount: 0, paymentMethod: paymentMethod || 'Bank Transfer',
    payorOrgId, payeeOrgId, creatorOrgId, notes: notes || '', createdAt: now(), updatedAt: now() };
  store.payments.push(payment);
  const org = store.orgs.find(o => o.id === creatorOrgId);
  addLog('payment', 'Payment Record Created', org?.name || creatorOrgId,
    `Payment of ${currency} ${Number(amount).toLocaleString()} created for ${c?.ucr}. Invoice: ${invoiceRef}. Due: ${dueDate}.`);
  res.json(payment);
});
app.put('/api/payments/:id/status', (req, res) => {
  const { status, paidAmount, orgId, orgName } = req.body;
  const payment = store.payments.find(p => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  const prev = payment.status;
  payment.status = status;
  if (paidAmount !== undefined) payment.paidAmount = Number(paidAmount);
  payment.updatedAt = now();
  addLog('payment', `Payment ${status}`, orgName || orgId,
    `${payment.ucr} (${payment.invoiceRef}): ${prev} → ${status}. Confirmed: ${payment.currency} ${payment.paidAmount.toLocaleString()}.`);
  res.json(payment);
});

// Letter of Credit
app.get('/api/lc', (req, res) => {
  const { orgId, consignmentId } = req.query;
  if (consignmentId) {
    if (!hasFinanceAccess(consignmentId, orgId)) return res.json([]);
    return res.json(store.letterOfCredits.filter(l => l.consignmentId === consignmentId));
  }
  const ids = financeAccessibleIds(orgId);
  res.json(store.letterOfCredits.filter(l => ids.includes(l.consignmentId)));
});
app.post('/api/lc', (req, res) => {
  const { consignmentId, issuingBank, advisingBank, applicant, amount, currency, expiryDate, creatorOrgId } = req.body;
  const fp = store.financePermissions[consignmentId] || {};
  if (fp[creatorOrgId] !== 'owner') return res.status(403).json({ error: 'Finance owner access required' });
  const c = store.consignments.find(c => c.id === consignmentId);
  const docs = store.documents.filter(d => d.consignmentId === consignmentId);
  const lcNumber = `LC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const lc = { id: genId(), consignmentId, ucr: c?.ucr || '', lcNumber, issuingBank, advisingBank,
    beneficiary: c?.exporter || '', applicant: applicant || c?.importer || '',
    amount: Number(amount), currency, expiryDate, status: 'Draft',
    documentCompliance: docs.map(d => ({ docType: d.title, required: true, submitted: true, compliant: null })),
    creatorOrgId, createdAt: now() };
  store.letterOfCredits.push(lc);
  const org = store.orgs.find(o => o.id === creatorOrgId);
  addLog('finance', 'LC Created', org?.name || creatorOrgId,
    `LC ${lcNumber} created for ${c?.ucr}. Amount: ${currency} ${Number(amount).toLocaleString()}. Bank: ${issuingBank}.`);
  res.json(lc);
});
app.put('/api/lc/:id/status', (req, res) => {
  const { status, orgId, orgName, docType, compliant } = req.body;
  const lc = store.letterOfCredits.find(l => l.id === req.params.id);
  if (!lc) return res.status(404).json({ error: 'Not found' });
  if (docType !== undefined) {
    const doc = lc.documentCompliance.find(d => d.docType === docType);
    if (doc) doc.compliant = compliant;
    return res.json(lc);
  }
  const prev = lc.status;
  lc.status = status;
  addLog('finance', `LC ${status}`, orgName || orgId,
    `LC ${lc.lcNumber} for ${lc.ucr}: ${prev} → ${status}.`);
  res.json(lc);
});

// Smart Contracts
app.get('/api/contracts', (req, res) => {
  const { orgId, consignmentId } = req.query;
  if (consignmentId) {
    if (!hasFinanceAccess(consignmentId, orgId)) return res.json([]);
    return res.json(store.smartContracts.filter(c => c.consignmentId === consignmentId));
  }
  const ids = financeAccessibleIds(orgId);
  res.json(store.smartContracts.filter(c => ids.includes(c.consignmentId)));
});
app.post('/api/contracts', (req, res) => {
  const { consignmentId, amount, currency, conditions, autoRelease, payorOrgId, payeeOrgId, creatorOrgId } = req.body;
  const fp = store.financePermissions[consignmentId] || {};
  if (fp[creatorOrgId] !== 'owner') return res.status(403).json({ error: 'Finance owner access required' });
  const c = store.consignments.find(c => c.id === consignmentId);
  const contractHash = genHash();
  const contractRef = `SC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const contract = { id: genId(), consignmentId, ucr: c?.ucr || '', contractRef, contractHash,
    payorOrgId, payeeOrgId, amount: Number(amount), currency,
    conditions: (conditions || []).map((cond, i) => ({ id: `cond-${i}`, description: cond.description, docType: cond.docType || null, met: false, metAt: null })),
    status: 'Active', autoRelease: autoRelease !== false, creatorOrgId, createdAt: now(), settledAt: null };
  store.smartContracts.push(contract);
  const org = store.orgs.find(o => o.id === creatorOrgId);
  addLog('finance', 'Smart Contract Deployed', org?.name || creatorOrgId,
    `Contract ${contractRef} deployed for ${c?.ucr}. ${contract.conditions.length} release conditions. Hash: ${contractHash}.`);
  res.json(contract);
});
app.put('/api/contracts/:id/condition/:condId', (req, res) => {
  const { orgId, orgName } = req.body;
  const contract = store.smartContracts.find(c => c.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Not found' });
  const cond = contract.conditions.find(c => c.id === req.params.condId);
  if (!cond) return res.status(404).json({ error: 'Condition not found' });
  cond.met = true; cond.metAt = now();
  addLog('finance', 'Condition Verified', orgName || orgId,
    `"${cond.description}" verified on contract ${contract.contractRef} (${contract.ucr}).`);
  const allMet = contract.conditions.every(c => c.met);
  if (allMet && contract.status === 'Active') {
    contract.status = 'Conditions Met';
    addLog('finance', 'All Conditions Met', orgName || orgId,
      `All ${contract.conditions.length} conditions satisfied on ${contract.contractRef}. ${contract.autoRelease ? 'Auto-releasing...' : 'Awaiting release.'}`);
    if (contract.autoRelease) {
      contract.status = 'Released'; contract.settledAt = now();
      addLog('finance', 'Payment Auto-Released', orgName || orgId,
        `Contract ${contract.contractRef} executed. ${contract.currency} ${contract.amount.toLocaleString()} released. Hash: ${contract.contractHash}.`);
    }
  }
  res.json(contract);
});
app.put('/api/contracts/:id/status', (req, res) => {
  const { status, orgId, orgName } = req.body;
  const contract = store.smartContracts.find(c => c.id === req.params.id);
  if (!contract) return res.status(404).json({ error: 'Not found' });
  const prev = contract.status;
  contract.status = status;
  if (status === 'Settled' || status === 'Released') contract.settledAt = now();
  addLog('finance', `Contract ${status}`, orgName || orgId,
    `Contract ${contract.contractRef} (${contract.ucr}): ${prev} → ${status}. Hash: ${contract.contractHash}.`);
  res.json(contract);
});

// Ledger
app.get('/api/ledger', (req, res) => res.json(store.ledgerLog));
app.get('/api/peer/orgs', (req, res) => {
  if (!store.peerConnected) return res.json([]);
  let orgs = store.peerOrgs;
  if (req.query.q) orgs = orgs.filter(o => o.name.toLowerCase().includes(req.query.q.toLowerCase()));
  res.json(orgs);
});
app.get('*', (req, res) => { const f = path.join(publicDir, 'index.html'); existsSync(f) ? res.sendFile(f) : res.status(404).json({ error: 'Build first' }); });

// ── WebSocket + P2P (disabled on Vercel — serverless can't hold sockets) ──
const IS_VERCEL = !!process.env.VERCEL;
const httpServer = http.createServer(app);
const clients = new Set();

function broadcastToClients(msg) {
  if (IS_VERCEL) return; // no persistent connections on serverless
  const d = JSON.stringify(msg);
  clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(d); });
}

let peerWs = null;
let peerInWs = null;  // inbound peer WebSocket (when the other node connects to us)
function connectToPeer() {}   // no-op stub (filled below if not Vercel)
function syncOrgsToPeer() {}  // no-op stub

if (!IS_VERCEL) {
  const wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/peer') { handlePeerIn(ws); } else { clients.add(ws); ws.on('close', () => clients.delete(ws)); ws.send(JSON.stringify({ type: 'NODE_INFO', nodeId: NODE_ID, nodeName: NODE_NAME })); }
  });

  // ── P2P ──
  connectToPeer = function() {
    if (!PEER_URL || peerWs?.readyState === WebSocket.OPEN || peerInWs?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(PEER_URL + '/peer');
      peerWs = ws;
      ws.on('open', () => {
        store.peerConnected = true;
        ws.send(JSON.stringify({ type: 'HANDSHAKE', nodeId: NODE_ID, nodeName: NODE_NAME, nodeIp: NODE_IP, orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) }));
        addLog('network', 'Peer Connected', 'System', `P2P handshake completed with peer at ${PEER_URL}. Organisations now discoverable.`);
        broadcastToClients({ type: 'PEER_STATUS', connected: true });
      });
      ws.on('message', d => handlePeerMsg(JSON.parse(d.toString())));
      ws.on('close', () => { if (peerWs !== ws) return; store.peerConnected = false; store.peerOrgs = []; broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] }); });
      ws.on('error', () => {});
    } catch (e) {}
  };

  syncOrgsToPeer = function() { const w = [peerWs, peerInWs].find(w => w?.readyState === WebSocket.OPEN); if (w) w.send(JSON.stringify({ type: 'ORG_UPDATE', orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) })); };
}

function handlePeerIn(ws) {
  peerInWs = ws;
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.type === 'HANDSHAKE') { store.peerOrgs = m.orgs || []; store.peerConnected = true; broadcastToClients({ type: 'PEER_STATUS', connected: true, peerOrgs: store.peerOrgs }); ws.send(JSON.stringify({ type: 'ORG_DIRECTORY', orgs: store.orgs.map(o => ({ id: o.id, name: o.name, role: o.role, did: o.did, verified: o.verified, nodeId: NODE_ID, nodeName: NODE_NAME })) })); addLog('network', 'Peer Connected', 'System', 'Inbound P2P connection accepted. Peer orgs now discoverable.'); } else handlePeerMsg(m); });
  ws.on('close', () => { if (peerInWs !== ws) return; peerInWs = null; store.peerConnected = false; store.peerOrgs = []; broadcastToClients({ type: 'PEER_STATUS', connected: false, peerOrgs: [] }); });
}
function handlePeerMsg(m) {
  switch (m.type) {
    case 'HANDSHAKE': store.peerOrgs = m.orgs || []; store.peerConnected = true; broadcastToClients({ type: 'PEER_STATUS', connected: true, peerOrgs: store.peerOrgs }); break;
    case 'ORG_DIRECTORY': case 'ORG_UPDATE': store.peerOrgs = m.orgs || []; broadcastToClients({ type: 'PEER_ORGS', peerOrgs: store.peerOrgs }); break;
    case 'LEDGER_ENTRY': if (!store.ledgerLog.some(e => e.id === m.entry.id)) { store.ledgerLog.unshift(m.entry); broadcastToClients({ type: 'LEDGER_UPDATE', log: store.ledgerLog }); } break;
    case 'SHARE_CONSIGNMENT': {
      const { consignment, documents, permissions, docPermissions } = m;
      if (!store.consignments.some(c => c.id === consignment.id)) store.consignments.push(consignment);
      for (const doc of documents) { if (!store.documents.some(d => d.id === doc.id)) store.documents.push(doc); }
      if (permissions) store.permissions[consignment.id] = { ...store.permissions[consignment.id], ...permissions };
      if (docPermissions) { for (const [did, p] of Object.entries(docPermissions)) { store.docPermissions[did] = { ...store.docPermissions[did], ...p }; } }
      broadcastToClients({ type: 'DATA_SYNC' }); break;
    }
    case 'REVOKE_CONSIGNMENT': {
      const { consignmentId } = m;
      // Cascade: the consignment originated from the peer, so revoke
      // removes ALL local access and deletes the data entirely.
      const docs = store.documents.filter(d => d.consignmentId === consignmentId);
      store.consignments = store.consignments.filter(c => c.id !== consignmentId);
      store.documents = store.documents.filter(d => d.consignmentId !== consignmentId);
      delete store.permissions[consignmentId];
      docs.forEach(d => delete store.docPermissions[d.id]);
      delete store.financePermissions[consignmentId];
      broadcastToClients({ type: 'DATA_SYNC' }); break;
    }
  }
}

function seedFinanceData() {
  if (NODE_ID !== 'alpha') return;
  if (store.payments.length > 0 || store.letterOfCredits.length > 0 || store.smartContracts.length > 0) return;

  const seedData = getConfig()?.finance?.seedData;

  // Apply finance viewer permissions from config
  const viewers = seedData?.financeViewers ?? {};
  for (const [ucr, orgIds] of Object.entries(viewers)) {
    const c = store.consignments.find(cs => cs.ucr === ucr);
    if (c && store.financePermissions[c.id]) {
      for (const orgId of orgIds) store.financePermissions[c.id][orgId] = 'viewer';
    }
  }

  // Seed payments
  const cfgPayments = seedData?.payments ?? [];

  for (const p of cfgPayments) {
    const c = store.consignments.find(cs => cs.ucr === p.consignmentUcr);
    if (!c) continue;
    store.payments.push({
      id: genId(), consignmentId: c.id, ucr: c.ucr,
      invoiceRef: p.invoiceRef, amount: p.amount, currency: p.currency,
      dueDate: p.dueDate, status: p.status, paidAmount: p.paidAmount,
      paymentMethod: p.paymentMethod,
      payorOrgId: p.payorOrgId, payeeOrgId: p.payeeOrgId,
      creatorOrgId: p.payeeOrgId,
      notes: p.notes, createdAt: p.createdAt, updatedAt: p.createdAt,
    });
  }

  // Seed Letters of Credit
  const cfgLCs = seedData?.letterOfCredits ?? [];

  for (const lc of cfgLCs) {
    const c = store.consignments.find(cs => cs.ucr === lc.consignmentUcr);
    if (!c) continue;
    const docs = store.documents.filter(d => d.consignmentId === c.id);
    store.letterOfCredits.push({
      id: genId(), consignmentId: c.id, ucr: c.ucr,
      lcNumber: lc.lcNumber,
      issuingBank: lc.issuingBank, advisingBank: lc.advisingBank,
      beneficiary: lc.beneficiary, applicant: lc.applicant,
      amount: lc.amount, currency: lc.currency, expiryDate: lc.expiryDate,
      status: lc.status,
      documentCompliance: docs.map((d, i) => ({ docType: d.title, required: true, submitted: lc.status === 'Confirmed', compliant: lc.status === 'Confirmed' ? (i < 5 ? true : null) : null })),
      creatorOrgId: lc.creatorOrgId, createdAt: lc.createdAt,
    });
  }

  // Seed Smart Contracts
  const cfgSCs = seedData?.smartContracts ?? [];

  for (const sc of cfgSCs) {
    const c = store.consignments.find(cs => cs.ucr === sc.consignmentUcr);
    if (!c) continue;
    store.smartContracts.push({
      id: genId(), consignmentId: c.id, ucr: c.ucr,
      contractRef: sc.contractRef, contractHash: genHash(),
      payorOrgId: sc.payorOrgId, payeeOrgId: sc.payeeOrgId,
      amount: sc.amount, currency: sc.currency,
      conditions: sc.conditions.map((cond, i) => ({ id: `cond-${i}`, ...cond })),
      status: sc.status, autoRelease: sc.autoRelease, creatorOrgId: sc.payeeOrgId,
      createdAt: sc.createdAt, settledAt: null,
    });
  }

  // Seed ledger log entries for finance
  const seedTs = (t, ts) => {
    if (!store.ledgerLog.some(e => e.details && e.details.includes(t)))
      store.ledgerLog.push({ id: genId(), timestamp: ts, hash: genHash(), type: 'finance', action: 'Finance Seeded', actor: 'System', details: t });
  };
  for (const p of store.payments) {
    const fmtAmt = `${p.currency} ${p.amount.toLocaleString()}`;
    seedTs(`Payment ${p.invoiceRef} created for ${p.ucr}. ${fmtAmt}. ${p.status}.`, p.createdAt);
  }
  for (const lc of store.letterOfCredits) {
    seedTs(`LC ${lc.lcNumber} created for ${lc.ucr}. Amount: ${lc.currency} ${lc.amount.toLocaleString()}. Status: ${lc.status}.`, lc.createdAt);
  }
  for (const sc of store.smartContracts) {
    seedTs(`Contract ${sc.contractRef} deployed for ${sc.ucr}. ${sc.conditions.length} release conditions. Hash: ${sc.contractHash}.`, sc.createdAt);
  }
  saveLedgerLog();

  console.log(`[${NODE_NAME}] Seeded finance data: ${store.payments.length} payments, ${store.letterOfCredits.length} LCs, ${store.smartContracts.length} smart contracts`);
}

// Seed demo data
seedConsignments();
seedFinanceData();

// Start server — skipped on Vercel (serverless handles the lifecycle)
if (!IS_VERCEL) {
  httpServer.listen(PORT, () => { console.log(`[${NODE_NAME}] Listening on port ${PORT} (HTTP + WS on same port)`); });
}

// Export for Vercel's @vercel/node runner
export default app;
