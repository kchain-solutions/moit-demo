import { getConfig } from './config.js';
import { genId, genHash } from './utils.js';
import { store, NODE_ID, NODE_NAME, addLog, seedLog, saveLedgerLog } from './store.js';
import { makeSeedPdf } from './generators/pdf.js';
import { makeSeedXml } from './generators/xml.js';

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

export function seedConsignments() {
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
      `Digital twin created: ${m.ucr} \u2014 ${m.product}. Anchored on the ledger.`, createdAt);

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

    const shipTs = new Date(m.shipDate + 'T08:00:00.000Z');
    const day = 86400000;
    if (['Released', 'In Transit', 'Customs', 'Delivered'].includes(m.status)) {
      seedLog('logistics', 'Export Clearance', m.exporter,
        `${m.ucr} \u2014 Export clearance granted. All documents verified.`,
        new Date(shipTs.getTime() - 2 * day).toISOString());
      seedLog('logistics', 'Container Loaded', m.exporter,
        `${m.ucr} \u2014 Container loaded at ${m.originPort}. Container: TCKU${3000000 + (parseInt(m.ucr.replace(/\D/g,'').slice(-4)||'0') % 9999999)}, Seal: SL${10000 + (parseInt(m.ucr.replace(/\D/g,'').slice(-4)||'0') % 89999)}.`,
        new Date(shipTs.getTime() - 1 * day).toISOString());
      seedLog('logistics', 'In Port', m.exporter,
        `${m.ucr} \u2014 Cargo received at ${m.originPort}. Awaiting vessel ${m.vessel}.`,
        new Date(shipTs.getTime()).toISOString());
      seedLog('logistics', 'Cleared for Export', m.exporter,
        `${m.ucr} \u2014 Cleared for export. Customs seal verified. Loading onto ${m.vessel}.`,
        new Date(shipTs.getTime() + 4 * 3600000).toISOString());
      seedLog('logistics', 'Departed Port', m.exporter,
        `${m.ucr} \u2014 ${m.vessel} departed ${m.originPort} bound for ${m.destinationPort}.`,
        new Date(shipTs.getTime() + 12 * 3600000).toISOString());
    }
    if (m.status === 'Delivered') {
      seedLog('logistics', 'Arrived at Port', m.importer,
        `${m.ucr} \u2014 ${m.vessel} arrived at ${m.destinationPort}.`,
        new Date(shipTs.getTime() + 18 * day).toISOString());
      seedLog('logistics', 'Import Clearance', m.importer,
        `${m.ucr} \u2014 Import clearance granted at ${m.destinationPort}. Goods released to consignee.`,
        new Date(shipTs.getTime() + 20 * day).toISOString());
    }
  }
  saveLedgerLog();
  console.log(`[${NODE_NAME}] Seeded ${store.consignments.length} consignments`);
}

export function seedFinanceData() {
  if (NODE_ID !== 'alpha') return;
  if (store.payments.length > 0 || store.letterOfCredits.length > 0 || store.smartContracts.length > 0) return;

  const seedData = getConfig()?.finance?.seedData;

  const viewers = seedData?.financeViewers ?? {};
  for (const [ucr, orgIds] of Object.entries(viewers)) {
    const c = store.consignments.find(cs => cs.ucr === ucr);
    if (c && store.financePermissions[c.id]) {
      for (const orgId of orgIds) store.financePermissions[c.id][orgId] = 'viewer';
    }
  }

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
