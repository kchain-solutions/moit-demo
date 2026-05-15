import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).reduce((a, c) => { const [k, v] = c.replace('--', '').split('='); a[k] = v; return a; }, {});
// Env vars take priority (Railway/cloud deployment), CLI args used for local dev
const PORT     = parseInt(process.env.PORT     || args.port || '4000');
const WS_PORT  = parseInt(process.env.WS_PORT  || args.ws   || '4010');
const NODE_ID  = process.env.NODE_ID   || args.id   || 'alpha';
const NODE_NAME= process.env.NODE_NAME || args.name || 'Node Alpha';
const PEER_URL = process.env.PEER_URL  || args.peer || null;
const NODE_IP  = `127.0.0.1:${PORT}`;

const DATA_DIR = path.join(__dirname, '../data');
const TANGLE_FILE = path.join(DATA_DIR, `tangle-${NODE_ID}.json`);

function loadTangleLog() {
  try {
    if (existsSync(TANGLE_FILE)) return JSON.parse(readFileSync(TANGLE_FILE, 'utf-8'));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to load tangle log:`, e.message); }
  return [];
}

function saveTangleLog() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(TANGLE_FILE, JSON.stringify(store.tangleLog, null, 2));
  } catch (e) { console.error(`[${NODE_NAME}] Failed to save tangle log:`, e.message); }
}

const genId = () => crypto.randomBytes(8).toString('hex');
const genHash = () => '0x' + crypto.randomBytes(16).toString('hex');
const genDID = () => 'did:iota:0x' + crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();


// ── Credential validation ──
const BLACKLISTED = ['MST-000000','BRN-000000','TIN-000000','KBN-000000','EIN-000000'];
const EXPIRED = ['MST-111111','BRN-111111'];
const SUSPENDED = ['MST-222222','BRN-222222'];

function validateCredential(regNumber) {
  const n = (regNumber || '').toUpperCase().trim();
  if (n.length < 6) return { valid: false, reason: 'Registration number too short (minimum 6 characters)', failStep: 0 };
  if (BLACKLISTED.includes(n)) return { valid: false, reason: 'Registration number is on the DENIED list — organisation not recognised by any registry', failStep: 1 };
  if (n.startsWith('X') || n.startsWith('0')) return { valid: false, reason: 'Invalid prefix — number not found in any recognised national or international registry', failStep: 1 };
  if (EXPIRED.includes(n)) return { valid: false, reason: 'Registration has EXPIRED — licence is no longer active. Organisation must renew before DID issuance.', failStep: 2 };
  if (SUSPENDED.includes(n)) return { valid: false, reason: 'Registration is SUSPENDED — organisation is under regulatory review. DID issuance blocked.', failStep: 2 };
  const prefix = n.split('-')[0];
  const typeMap = { MST: 'Vietnam Tax Code (Ma So Thue)', BRN: 'Business Registration Number', TIN: 'Tax Identification Number', LEI: 'Legal Entity Identifier', KBN: 'Korean Business Number', EIN: 'US Employer Identification Number', EORI: 'EU Economic Operator ID', DUNS: 'DUNS Number' };
  return { valid: true, type: typeMap[prefix] || 'National Registration Number', formatted: n };
}

// ── Store ──
const store = {
  orgs: NODE_ID === 'alpha' ? [
    { id: 'org1', name: 'TNG Investment & Trading JSC',          role: 'Manufacturer - Vietnam',                    username: 'tng',         password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org2', name: 'General Department of Vietnam Customs',  role: 'Customs Authority - Vietnam',               username: 'vncustoms',   password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org3', name: 'Ministry of Industry and Trade (MOIT)',  role: 'Certificate of Origin Authority - Vietnam', username: 'moit',        password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org4', name: 'Hyosung TNS Co., Ltd',                  role: 'Input Supplier - South Korea',              username: 'hyosung',     password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org7', name: 'Vietcombank',                            role: 'Financier - Vietnam',                       username: 'financier1',  password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org8', name: 'HSBC Vietnam',                           role: 'Financier - International',                 username: 'financier2',  password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org9', name: 'Bureau Veritas Vietnam',                 role: 'Quality Inspector - Vietnam',               username: 'bvinspector', password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org10', name: 'Cat Lai Port Authority',                role: 'Port Authority - Ho Chi Minh City',         username: 'catlaiport',  password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org11', name: 'Gemadept Logistics',                    role: 'Freight Forwarder - Vietnam',               username: 'gemadept',    password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org12', name: 'Maersk Vietnam',                        role: 'Carrier - Vietnam',                         username: 'maersk',      password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
  ] : [
    { id: 'org5', name: 'Nike Inc.',                              role: 'Importing Buyer - United States',           username: 'nike',        password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org6', name: 'Nike Europe B.V.',                       role: 'Importing Buyer - EU',                      username: 'nikeeu',      password: 'demo', orgType: 'private', did: null, verified: false, regNumber: null },
    { id: 'org13', name: 'US Customs and Border Protection',      role: 'Customs Authority - United States',         username: 'uscbp',       password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
    { id: 'org14', name: 'EU Customs (Netherlands)',               role: 'Customs Authority - EU',                    username: 'eucustoms',   password: 'demo', orgType: 'public',  did: null, verified: false, regNumber: null },
  ],
  consignments: [], documents: [], permissions: {}, docPermissions: {},
  payments: [], letterOfCredits: [], smartContracts: [], financePermissions: {},
  tangleLog: loadTangleLog(),
  peerOrgs: [], peerConnected: false,
};

function addLog(type, action, actor, details, extra = {}) {
  const entry = { id: genId(), timestamp: now(), hash: genHash(), type, action, actor, details, ...extra };
  store.tangleLog.unshift(entry);
  saveTangleLog();
  broadcastToClients({ type: 'TANGLE_UPDATE', log: store.tangleLog });
  const activePeer = [peerWs, peerInWs].find(w => w?.readyState === WebSocket.OPEN);
  if (store.peerConnected && activePeer) activePeer.send(JSON.stringify({ type: 'TANGLE_ENTRY', entry }));
  return entry;
}

// Idempotent seed helper — appends historical events without duplicating
function seedLog(type, action, actor, details, timestamp) {
  if (store.tangleLog.some(e => e.details === details)) return;
  store.tangleLog.push({ id: genId(), timestamp, hash: genHash(), type, action, actor, details });
}

// ── PDF generator for seeded documents ──
function makeSeedPdf(docType, ref, issuer, ucr, shipDate, exporter, importer, fromCountry, toCountry) {
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
      `All details are as agreed under the relevant sales contract.`,
    ],
    'Commercial Invoice (Inputs)': [
      `COMMERCIAL INVOICE (INPUT MATERIALS)`, ``,
      `Invoice No : ${ref}`,
      `Date       : ${shipDate}`,
      `Supplier   : Hyosung TNS Co., Ltd (South Korea)`,
      `Buyer      : ${exporter}`,
      `UCR        : ${ucr}`,
      ``, `Description: Spandex yarn (Creora 40D/70D) and nylon fabric`,
      `Origin: South Korea (CPTPP member)`,
      `Terms: CIF Cat Lai Terminal, Ho Chi Minh City`,
    ],
    'Packing List': [
      `PACKING LIST`, ``,
      `Reference  : ${ref}`,
      `Date       : ${shipDate}`,
      `Exporter   : ${exporter}`,
      `UCR        : ${ucr}`,
      ``, `Package details are as per the accompanying commercial invoice.`,
      `All goods have been inspected and packed in accordance with export requirements.`,
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
      `Carrier    : Maersk Line`,
      ``, `Received in apparent good order and condition the goods described herein.`,
    ],
    'Input Certificate of Origin': [
      `CERTIFICATE OF ORIGIN (INPUT MATERIALS)`, ``,
      `Certificate No : ${ref}`,
      `Date           : ${shipDate}`,
      `Issued by      : Korea Customs Service`,
      `Supplier       : Hyosung TNS Co., Ltd`,
      `UCR            : ${ucr}`,
      `Country of Origin : South Korea`,
      ``, `CPTPP cumulation eligible.`,
      `We certify that the materials described originate in the Republic of Korea`,
      `and qualify as non-third-country content under CPTPP cumulation rules.`,
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
    'MOIT Certificate of Origin': [
      `CERTIFICATE OF ORIGIN`, `(MOIT Electronic Certificate via eCoSys)`, ``,
      `Certificate No : ${ref}`,
      `Form Type      : EUR.1 (EVFTA) / CPTPP`,
      `Date           : ${shipDate}`,
      `Issued by      : Ministry of Industry and Trade, Vietnam`,
      `                 Multilateral Trade Policy Department`,
      ``,
      `Exporter       : ${exporter}`,
      `Consignee      : ${importer}`,
      `Country of Origin : Vietnam`,
      `Destination    : ${toCountry}`,
      `UCR            : ${ucr}`,
      ``,
      `Origin Criterion: RVC (Regional Value Content)`,
      `CPTPP cumulation applied. Korean fabric counts as non-third-country.`,
      `Vietnam content exceeds 55% threshold.`,
      ``,
      `Digital Signature: MOIT-eCoSys-2026`,
    ],
    'Bill of Material': [
      `BILL OF MATERIAL`, ``,
      `Reference    : ${ref}`,
      `Date         : ${shipDate}`,
      `Manufacturer : ${exporter}`,
      `UCR          : ${ucr}`,
      ``,
      `INPUT MATERIALS:`,
      `1. Cotton/synthetic fabric  - Hyosung Corp., South Korea`,
      `2. Thread and yarn          - Vietnam Thread Co., Vietnam`,
      `3. Zippers and buttons      - YKK Vietnam, Vietnam`,
      `4. Woven labels             - Saigon Labels, Vietnam`,
      `5. Elastic bands            - Zhejiang Elastic Co., China`,
      ``,
      `ORIGIN COMPOSITION:`,
      `Vietnam content: 65.5%`,
      `CPTPP member content (Korea): 30.0%`,
      `Third-country content (China): 4.5%`,
      ``,
      `This BOM certifies the input composition for the above production lot.`,
    ],
    'Inspection Report': [
      `QUALITY INSPECTION REPORT`, ``,
      `Report No    : ${ref}`,
      `Date         : ${shipDate}`,
      `Inspector    : Bureau Veritas Vietnam`,
      `Manufacturer : ${exporter}`,
      `UCR          : ${ucr}`,
      ``,
      `RESULT: PASS`,
      ``,
      `Tests performed:`,
      `- Fabric tensile strength: PASS`,
      `- Color fastness (washing): PASS`,
      `- Dimensional stability: PASS`,
      `- Fiber composition analysis: PASS (matches BOM)`,
      `- AZO dye test: PASS (EU REACH compliant)`,
      ``,
      `Inspector ID: BV-VN-2026-0847`,
    ],
    'Export Declaration': [
      `EXPORT DECLARATION`, ``,
      `Declaration No : ${ref}`,
      `Date           : ${shipDate}`,
      `Declarant      : General Department of Vietnam Customs`,
      `System         : VNACCS`,
      `Exporter       : ${exporter}`,
      `UCR            : ${ucr}`,
      `Country of Export : ${fromCountry}`,
      `Country of Destination : ${toCountry}`,
      ``, `This export declaration is filed via VNACCS in accordance with Vietnamese customs regulations.`,
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
  const carrier     = 'Maersk Line';
  const exporterAddr = m.fromCountry === 'Vietnam' ? 'Lien Chieu Industrial Zone, Thai Nguyen, Vietnam'
                     : m.fromCountry === 'South Korea' ? '235 Banpo-daero, Seocho-gu, Seoul, South Korea'
                     : 'Unknown';
  const importerAddr = m.toCountry === 'United States' ? 'One Bowerman Drive, Beaverton, OR 97005, USA'
                     : m.toCountry === 'Netherlands'    ? 'Colosseum 1, 1213 NL Hilversum, Netherlands'
                     : m.toCountry === 'Germany'         ? 'Tamara-Danz-Strasse 1, 10243 Berlin, Germany'
                     : m.toCountry === 'Japan'           ? '4-1 Nihonbashi-Muromachi, Chuo-ku, Tokyo, Japan'
                     : m.toCountry === 'Vietnam'         ? 'Lien Chieu Industrial Zone, Thai Nguyen, Vietnam'
                     : 'Unknown';

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
  <DeclarantName>General Department of Vietnam Customs (VNACCS)</DeclarantName>
  <DeclarationLocation>${e(m.originPort)}</DeclarationLocation>
  <Status>ACCEPTED</Status>
</CustomsDeclaration>`;
  }

  if (docType === 'Bill of Material') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<BillOfMaterial>
  <Reference>${e(ref)}</Reference>
  <UCR>${e(m.ucr)}</UCR>
  <Date>${m.shipDate}</Date>
  <Manufacturer>${e(m.exporter)}</Manufacturer>
  <Product>${e(m.product)}</Product>
  <HSCode>${e(m.hsCode)}</HSCode>
  <OriginComposition>
    <VietnamContentPercent>65.5</VietnamContentPercent>
    <CPTPPCumulationApplied>true</CPTPPCumulationApplied>
    <ThirdCountryContentPercent>4.5</ThirdCountryContentPercent>
    <InputMaterials>
      <Material><Name>Cotton/synthetic fabric</Name><Supplier>Hyosung Corp.</Supplier><Country>KR</Country><Percent>30.0</Percent><CPTPPMember>true</CPTPPMember></Material>
      <Material><Name>Thread and yarn</Name><Supplier>Vietnam Thread Co.</Supplier><Country>VN</Country><Percent>15.5</Percent><CPTPPMember>true</CPTPPMember></Material>
      <Material><Name>Zippers and buttons</Name><Supplier>YKK Vietnam</Supplier><Country>VN</Country><Percent>10.0</Percent><CPTPPMember>true</CPTPPMember></Material>
      <Material><Name>Cutting and sewing labor</Name><Supplier>${e(m.exporter)}</Supplier><Country>VN</Country><Percent>40.0</Percent><CPTPPMember>true</CPTPPMember></Material>
      <Material><Name>Elastic bands</Name><Supplier>Zhejiang Elastic Co.</Supplier><Country>CN</Country><Percent>4.5</Percent><CPTPPMember>false</CPTPPMember></Material>
    </InputMaterials>
  </OriginComposition>
</BillOfMaterial>`;
  }

  if (docType === 'MOIT Certificate of Origin') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<CertificateOfOrigin>
  <CertificateNumber>${e(ref)}</CertificateNumber>
  <FormType>EUR.1</FormType>
  <IssueDate>${m.shipDate}</IssueDate>
  <IssuingAuthority>Ministry of Industry and Trade, Vietnam</IssuingAuthority>
  <IssuingSystem>eCoSys</IssuingSystem>
  <Exporter><PartyName>${e(m.exporter)}</PartyName><Country>VN</Country></Exporter>
  <Consignee><PartyName>${e(m.importer)}</PartyName><Country>${m.toCountry.slice(0,2).toUpperCase()}</Country></Consignee>
  <Goods>
    <HSCode>${e(m.hsCode)}</HSCode>
    <Description>${e(m.product)}</Description>
    <OriginCriterion>RVC</OriginCriterion>
    <OriginCountry>VN</OriginCountry>
  </Goods>
  <CumulationDeclaration>
    <CPTPPCumulation>true</CPTPPCumulation>
    <CumulationPartnerCountry>KR</CumulationPartnerCountry>
    <CumulationMaterialType>Fabric and yarn</CumulationMaterialType>
  </CumulationDeclaration>
  <DigitalSignature>
    <SignerIdentity>MOIT-eCoSys</SignerIdentity>
    <Timestamp>${m.shipDate}T10:00:00.000Z</Timestamp>
    <Algorithm>Ed25519</Algorithm>
  </DigitalSignature>
</CertificateOfOrigin>`;
  }

  return null;
}

// ── Hardcoded demo consignments ──
const ALPHA_CONSIGNMENTS = [
  { ucr:'VN-2026-EXP-00101', product:"Men's Cotton Polo Shirts (Knitted)",          hsCode:'6105.10', quantity:'24,000 pcs', totalValue:168000, currency:'USD', exporter:'TNG Investment & Trading JSC', importer:'Nike Inc.',        fromCountry:'Vietnam', toCountry:'United States', originPort:'Cat Lai Terminal, Ho Chi Minh City', destinationPort:'Port of Los Angeles',  vessel:'MV Maersk Seletar',   shipDate:'2026-03-10', incoterms:'FOB', invoiceRef:'INV-2026-TNG-0101', declRef:'VN-EXP-2026-0101', status:'Delivered',    creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC' },
  { ucr:'VN-2026-EXP-00102', product:"Women's Cotton T-Shirts (Knitted)",           hsCode:'6109.10', quantity:'36,000 pcs', totalValue:216000, currency:'USD', exporter:'TNG Investment & Trading JSC', importer:'Nike Inc.',        fromCountry:'Vietnam', toCountry:'United States', originPort:'Cat Lai Terminal, Ho Chi Minh City', destinationPort:'Port of Los Angeles',  vessel:'MV Maersk Sentosa',   shipDate:'2026-03-18', incoterms:'FOB', invoiceRef:'INV-2026-TNG-0102', declRef:'VN-EXP-2026-0102', status:'In Transit',   creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC' },
  { ucr:'VN-2026-EXP-00103', product:"Men's Synthetic Windbreaker Jackets (Woven)", hsCode:'6201.93', quantity:'12,000 pcs', totalValue:264000, currency:'EUR', exporter:'TNG Investment & Trading JSC', importer:'Nike Europe B.V.', fromCountry:'Vietnam', toCountry:'Netherlands',  originPort:'Cat Lai Terminal, Ho Chi Minh City', destinationPort:'Port of Rotterdam',    vessel:'MV CMA CGM Mekong',   shipDate:'2026-03-25', incoterms:'CIF', invoiceRef:'INV-2026-TNG-0103', declRef:'VN-EXP-2026-0103', status:'Customs',      creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC' },
  { ucr:'VN-2026-EXP-00104', product:"Women's Knitted Sports Trousers",             hsCode:'6104.63', quantity:'18,000 pcs', totalValue:198000, currency:'EUR', exporter:'TNG Investment & Trading JSC', importer:'Nike Europe B.V.', fromCountry:'Vietnam', toCountry:'Germany',      originPort:'Hai Phong International Container Terminal', destinationPort:'Port of Hamburg',  vessel:'MV Evergreen Harmony', shipDate:'2026-04-02', incoterms:'CFR', invoiceRef:'INV-2026-TNG-0104', declRef:'VN-EXP-2026-0104', status:'Submitted',    creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC' },
  { ucr:'VN-2026-EXP-00105', product:"Athletic Running Shoes (Rubber/Plastic Upper)", hsCode:'6402.99', quantity:'8,400 pairs', totalValue:378000, currency:'USD', exporter:'TNG Investment & Trading JSC', importer:'Nike Inc.',    fromCountry:'Vietnam', toCountry:'United States', originPort:'Cat Lai Terminal, Ho Chi Minh City', destinationPort:'Port of Long Beach',   vessel:'MV Maersk Seletar',   shipDate:'2026-04-08', incoterms:'FOB', invoiceRef:'INV-2026-TNG-0105', declRef:'VN-EXP-2026-0105', status:'Released',     creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC' },
  { ucr:'VN-2026-EXP-00106', product:"Casual Canvas Sneakers (Textile Upper)",       hsCode:'6404.19', quantity:'6,000 pairs', totalValue:132000, currency:'USD', exporter:'TNG Investment & Trading JSC', importer:'ABC-Mart Inc.', fromCountry:'Vietnam', toCountry:'Japan',         originPort:'Hai Phong International Container Terminal', destinationPort:'Port of Yokohama', vessel:'MV ONE Commitment',    shipDate:'2026-04-15', incoterms:'CIF', invoiceRef:'INV-2026-TNG-0106', declRef:'VN-EXP-2026-0106', status:'In Transit',   creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC' },
  { ucr:'VN-2026-EXP-E001',  product:"Men's Cotton Dress Shirts (Woven)",           hsCode:'6205.20', quantity:'15,000 pcs', totalValue:225000, currency:'USD', exporter:'TNG Investment & Trading JSC', importer:'Nike Inc.',        fromCountry:'Vietnam', toCountry:'United States', originPort:'Cat Lai Terminal, Ho Chi Minh City', destinationPort:'Port of Los Angeles',  vessel:'MV Maersk Sentosa',   shipDate:'2026-02-20', incoterms:'FOB', invoiceRef:'INV-2026-TNG-E001', declRef:'VN-EXP-2026-E001', status:'Under Review', creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC', errorType:'HS Code Mismatch', errorDescription:'Export Declaration filed under HS 6205.30 (man-made fibres) but Commercial Invoice declares HS 6205.20 (cotton). Vietnam Customs (VNACCS) has flagged the shipment for reconciliation.' },
  { ucr:'VN-2026-EXP-E002',  product:"Knitted Fleece Hooded Sweatshirts",           hsCode:'6110.30', quantity:'20,000 pcs', totalValue:340000, currency:'USD', exporter:'TNG Investment & Trading JSC', importer:'Nike Inc.',        fromCountry:'Vietnam', toCountry:'United States', originPort:'Cat Lai Terminal, Ho Chi Minh City', destinationPort:'Port of Los Angeles',  vessel:'MV Maersk Seletar',   shipDate:'2026-02-28', incoterms:'FOB', invoiceRef:'INV-2026-TNG-E002', declRef:'VN-EXP-2026-E002', status:'Under Review', creatorOrgId:'org1', creatorOrgName:'TNG Investment & Trading JSC', errorType:'Origin Verification Failed', errorDescription:'Origin composition shows 38% Vietnamese value-added content (below 40% threshold). Fleece fabric from non-CPTPP supplier (China). UFLPA screening flag: supplier region requires additional documentation.' },
];

const BETA_CONSIGNMENTS = [
  { ucr:'KR-2026-EXP-00201', product:'Spandex Yarn (Creora, 40D/70D)',      hsCode:'5402.44', quantity:'45,000 kg',  totalValue:135000, currency:'USD', exporter:'Hyosung TNS Co., Ltd',  importer:'TNG Investment & Trading JSC', fromCountry:'South Korea', toCountry:'Vietnam', originPort:'Port of Busan', destinationPort:'Cat Lai Terminal, Ho Chi Minh City',           vessel:'MV HMM Promise',    shipDate:'2026-01-20', incoterms:'CIF', invoiceRef:'INV-2026-HYO-0201', declRef:'KR-EXP-2026-0201', status:'Delivered',   creatorOrgId:'org5', creatorOrgName:'Nike Inc.' },
  { ucr:'KR-2026-EXP-00202', product:'Nylon Woven Fabric (Ripstop, Dyed)',   hsCode:'5407.42', quantity:'32,000 kg',  totalValue:192000, currency:'USD', exporter:'Hyosung TNS Co., Ltd',  importer:'TNG Investment & Trading JSC', fromCountry:'South Korea', toCountry:'Vietnam', originPort:'Port of Busan', destinationPort:'Hai Phong International Container Terminal',  vessel:'MV HMM Algeciras',  shipDate:'2026-02-15', incoterms:'FOB', invoiceRef:'INV-2026-HYO-0202', declRef:'KR-EXP-2026-0202', status:'In Transit',  creatorOrgId:'org5', creatorOrgName:'Nike Inc.' },
  { ucr:'KR-2026-EXP-00203', product:'YKK Metal Zippers and Snap Buttons',   hsCode:'9607.11', quantity:'500,000 pcs', totalValue:45000,  currency:'USD', exporter:'YKK Korea Co., Ltd',    importer:'TNG Investment & Trading JSC', fromCountry:'South Korea', toCountry:'Vietnam', originPort:'Port of Busan', destinationPort:'Cat Lai Terminal, Ho Chi Minh City',           vessel:'MV HMM Promise',    shipDate:'2026-02-22', incoterms:'CIF', invoiceRef:'INV-2026-YKK-0203', declRef:'KR-EXP-2026-0203', status:'Customs',     creatorOrgId:'org6', creatorOrgName:'Nike Europe B.V.' },
];

function docsForConsignment(m) {
  if (NODE_ID === 'alpha') {
    return [
      { name:'Commercial Invoice (Inputs)',   docType:'Commercial Invoice (Inputs)',  issuer:'Hyosung TNS Co., Ltd',                         suffix:'CI-I' },
      { name:'Input Certificate of Origin',   docType:'Input Certificate of Origin',  issuer:'Korea Customs Service',                        suffix:'ICO' },
      { name:'Bill of Material',              docType:'Bill of Material',             issuer:m.creatorOrgName,                               suffix:'BOM' },
      { name:'Inspection Report',             docType:'Inspection Report',            issuer:'Bureau Veritas Vietnam',                       suffix:'IR'  },
      { name:'MOIT Certificate of Origin',    docType:'MOIT Certificate of Origin',   issuer:'Ministry of Industry and Trade (MOIT)',        suffix:'CO'  },
      { name:'Export Declaration',            docType:'Export Declaration',            issuer:'General Department of Vietnam Customs',        suffix:'ED'  },
      { name:'Commercial Invoice',            docType:'Commercial Invoice',           issuer:m.creatorOrgName,                               suffix:'INV' },
      { name:'Packing List',                  docType:'Packing List',                 issuer:'Gemadept Logistics',                           suffix:'PL'  },
      { name:'Bill of Lading',                docType:'Bill of Lading',               issuer:'Maersk Vietnam',                               suffix:'BL'  },
    ];
  }
  return [
    { name:'Commercial Invoice',    docType:'Commercial Invoice',   issuer:m.creatorOrgName,         suffix:'INV' },
    { name:'Packing List',          docType:'Packing List',          issuer:m.creatorOrgName,         suffix:'PL'  },
    { name:'Bill of Lading',        docType:'Bill of Lading',        issuer:'HMM Co., Ltd',           suffix:'BL'  },
    { name:'Certificate of Origin', docType:'Certificate of Origin', issuer:'Korea Customs Service',  suffix:'CO'  },
    { name:'Export Declaration',    docType:'Export Declaration',    issuer:'Korea Customs Service',  suffix:'ED'  },
  ];
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
        `${m.ucr} — Export clearance granted by Vietnam Customs (VNACCS). All documents verified.`,
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
  saveTangleLog();
  console.log(`[${NODE_NAME}] Seeded ${store.consignments.length} consignments`);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const publicDir = path.join(__dirname, 'public');
if (existsSync(publicDir)) app.use(express.static(publicDir));

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
  if (org.role?.includes('Vietnam'))        return 'General Department of Vietnam Customs';
  if (org.role?.includes('South Korea'))    return 'Korea Customs Service';
  if (org.role?.includes('United States'))  return 'US Customs and Border Protection';
  if (org.role?.includes('EU'))             return 'EU Customs Authority';
  return 'National Business Registry';
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

// Tangle
app.get('/api/tangle', (req, res) => res.json(store.tangleLog));
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
    case 'TANGLE_ENTRY': if (!store.tangleLog.some(e => e.id === m.entry.id)) { store.tangleLog.unshift(m.entry); broadcastToClients({ type: 'TANGLE_UPDATE', log: store.tangleLog }); } break;
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

  const c1 = store.consignments.find(c => c.ucr === 'VN-2026-EXP-00101');
  const c2 = store.consignments.find(c => c.ucr === 'VN-2026-EXP-00103');
  if (!c1 || !c2) return;

  const tng = 'org1';
  const vietcombank = 'org7';
  const hsbc = 'org8';
  const ts1 = '2026-03-10T09:00:00.000Z';
  const ts2 = '2026-03-25T11:30:00.000Z';

  store.financePermissions[c1.id][vietcombank] = 'viewer';
  store.financePermissions[c1.id][hsbc]        = 'viewer';
  store.financePermissions[c2.id][vietcombank] = 'viewer';
  store.financePermissions[c2.id][hsbc]        = 'viewer';

  const pay1 = {
    id: genId(), consignmentId: c1.id, ucr: c1.ucr,
    invoiceRef: 'INV-2026-TNG-0101', amount: 168000, currency: 'USD',
    dueDate: '2026-05-31', status: 'Partially Paid', paidAmount: 67200,
    paymentMethod: 'Letter of Credit',
    payorOrgId: 'org5', payeeOrgId: tng, creatorOrgId: tng,
    notes: 'First instalment (40%) received via LC. Balance due on B/L presentation and CBP clearance.', createdAt: ts1, updatedAt: ts1,
  };
  const pay2 = {
    id: genId(), consignmentId: c2.id, ucr: c2.ucr,
    invoiceRef: 'INV-2026-TNG-0103', amount: 264000, currency: 'EUR',
    dueDate: '2026-04-30', status: 'Overdue', paidAmount: 0,
    paymentMethod: 'Open Account',
    payorOrgId: 'org6', payeeOrgId: tng, creatorOrgId: tng,
    notes: 'Payment overdue. Nike Europe requested 30-day extension citing customs hold at Rotterdam. EVFTA preference verification pending.', createdAt: ts2, updatedAt: ts2,
  };
  store.payments.push(pay1, pay2);

  const docs1 = store.documents.filter(d => d.consignmentId === c1.id);
  const docs2 = store.documents.filter(d => d.consignmentId === c2.id);
  const lc1 = {
    id: genId(), consignmentId: c1.id, ucr: c1.ucr,
    lcNumber: 'LC-2026-VCB-0101',
    issuingBank: 'HSBC Vietnam', advisingBank: 'Vietcombank',
    beneficiary: 'TNG Investment & Trading JSC', applicant: 'Nike Inc.',
    amount: 168000, currency: 'USD', expiryDate: '2026-08-31',
    status: 'Confirmed',
    documentCompliance: docs1.map((d, i) => ({ docType: d.title, required: true, submitted: true, compliant: i < 5 ? true : null })),
    creatorOrgId: tng, createdAt: ts1,
  };
  const lc2 = {
    id: genId(), consignmentId: c2.id, ucr: c2.ucr,
    lcNumber: 'LC-2026-VCB-0102',
    issuingBank: 'HSBC Vietnam', advisingBank: 'Vietcombank',
    beneficiary: 'TNG Investment & Trading JSC', applicant: 'Nike Europe B.V.',
    amount: 264000, currency: 'EUR', expiryDate: '2026-07-31',
    status: 'Issued',
    documentCompliance: docs2.map(d => ({ docType: d.title, required: true, submitted: false, compliant: null })),
    creatorOrgId: tng, createdAt: ts2,
  };
  store.letterOfCredits.push(lc1, lc2);

  const hash1 = genHash();
  const hash2 = genHash();
  const sc1 = {
    id: genId(), consignmentId: c1.id, ucr: c1.ucr,
    contractRef: 'SC-2026-VN-0101', contractHash: hash1,
    payorOrgId: 'org5', payeeOrgId: tng,
    amount: 168000, currency: 'USD',
    conditions: [
      { id: 'cond-0', description: 'MOIT Certificate of Origin (EUR.1/CPTPP) issued and verified', docType: 'MOIT Certificate of Origin', met: true,  metAt: '2026-03-12T08:00:00.000Z' },
      { id: 'cond-1', description: 'Origin composition verified (Vietnam content >= 55%)',          docType: 'Bill of Material',            met: true,  metAt: '2026-03-12T09:15:00.000Z' },
      { id: 'cond-2', description: 'Bill of Lading (eBL) verified and presented',                   docType: 'Bill of Lading',              met: false, metAt: null },
      { id: 'cond-3', description: 'US CBP pre-clearance (no UFLPA hold)',                          docType: null,                          met: false, metAt: null },
    ],
    status: 'Active', autoRelease: true, creatorOrgId: tng,
    createdAt: ts1, settledAt: null,
  };
  const sc2 = {
    id: genId(), consignmentId: c2.id, ucr: c2.ucr,
    contractRef: 'SC-2026-VN-0102', contractHash: hash2,
    payorOrgId: 'org6', payeeOrgId: tng,
    amount: 264000, currency: 'EUR',
    conditions: [
      { id: 'cond-0', description: 'MOIT Certificate of Origin issued and EVFTA-compliant', docType: 'MOIT Certificate of Origin', met: false, metAt: null },
      { id: 'cond-1', description: 'Export Declaration cleared by Vietnam Customs (VNACCS)', docType: 'Export Declaration',          met: false, metAt: null },
      { id: 'cond-2', description: 'Bill of Lading verified and presented',                  docType: 'Bill of Lading',              met: false, metAt: null },
    ],
    status: 'Active', autoRelease: true, creatorOrgId: tng,
    createdAt: ts2, settledAt: null,
  };
  store.smartContracts.push(sc1, sc2);

  const seedTs = (t, ts) => { if (!store.tangleLog.some(e => e.details && e.details.includes(t))) store.tangleLog.push({ id: genId(), timestamp: ts, hash: genHash(), type: 'finance', action: 'Finance Seeded', actor: 'TNG Investment & Trading JSC', details: t }); };
  seedTs(`Payment INV-2026-TNG-0101 created for ${c1.ucr}. USD 168,000. Partially Paid.`, ts1);
  seedTs(`Payment INV-2026-TNG-0103 created for ${c2.ucr}. EUR 264,000. Overdue.`, ts2);
  seedTs(`LC LC-2026-VCB-0101 created for ${c1.ucr}. Amount: USD 168,000. Status: Confirmed.`, ts1);
  seedTs(`LC LC-2026-VCB-0102 created for ${c2.ucr}. Amount: EUR 264,000. Status: Issued.`, ts2);
  seedTs(`Contract SC-2026-VN-0101 deployed for ${c1.ucr}. 4 release conditions. Hash: ${hash1}.`, ts1);
  seedTs(`Contract SC-2026-VN-0102 deployed for ${c2.ucr}. 3 release conditions. Hash: ${hash2}.`, ts2);
  saveTangleLog();

  console.log(`[${NODE_NAME}] Seeded finance data: 2 payments, 2 LCs, 2 smart contracts`);
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
