import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { AlertTriangle, ChevronRight, Loader } from 'lucide-react';

function Section({ title, fields, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!fields || fields.length === 0) return null;
  return (
    <div className="xml-section">
      <div className="xml-section-header" onClick={() => setOpen(o => !o)}>
        <ChevronRight className={`xml-section-icon ${open ? 'open' : ''}`} style={{ width: 14, height: 14 }} />
        <span className="xml-section-title">{title}</span>
      </div>
      {open && (
        <div className="xml-fields">
          {fields.map((f, i) => f.value ? (
            <div key={i} className={`xml-field ${f.full ? 'full' : ''}`}>
              <div className="xml-field-label">{f.label}</div>
              <div className={`xml-field-value ${f.mono !== false ? '' : 'normal'}`}>{f.value}</div>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

function getText(node, tag) {
  const el = node.querySelector ? node.querySelector(tag) : null;
  return el?.textContent?.trim() || '';
}

function parseBOL(doc) {
  const root = doc.documentElement;
  const get = tag => getText(root, tag);
  return [
    {
      title: 'Transport Document',
      fields: [
        { label: 'Document Reference', value: get('TransportDocumentReference') },
        { label: 'UCR', value: get('ContractQuotationReference') },
        { label: 'Issue Date', value: get('IssueDate') },
        { label: 'Shipped on Board', value: get('ShippedOnBoardDate') },
        { label: 'Issuer Code', value: get('IssuerCode') },
        { label: 'Invoice Reference', value: get('ServiceContractReference') },
      ],
    },
    {
      title: 'Shipper',
      fields: [
        { label: 'Name', value: get('Shipper PartyName'), full: true, mono: false },
        { label: 'Address', value: get('Shipper Address'), full: true, mono: false },
        { label: 'Registration Number', value: get('Shipper RegistrationNumber') },
        { label: 'Tax Identifier', value: get('Shipper TaxIdentifier') },
      ],
    },
    {
      title: 'Consignee',
      fields: [
        { label: 'Name', value: get('Consignee PartyName'), full: true, mono: false },
        { label: 'Address', value: get('Consignee Address'), full: true, mono: false },
        { label: 'Registration Number', value: get('Consignee RegistrationNumber') },
      ],
    },
    {
      title: 'Transport',
      fields: [
        { label: 'Vessel', value: get('VesselName') },
        { label: 'Voyage Number', value: get('VoyageNumber') },
        { label: 'IMO Number', value: get('IMONumber') },
        { label: 'Carrier', value: get('CarrierName') },
        { label: 'Port of Loading', value: get('PortOfLoading'), mono: false },
        { label: 'Port of Discharge', value: get('PortOfDischarge'), mono: false },
        { label: 'Estimated Arrival', value: get('EstimatedArrival') },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        { label: 'HS Code', value: get('HSCode') },
        { label: 'Description', value: get('DescriptionOfGoods'), full: true, mono: false },
        { label: 'Quantity', value: get('Quantity') ? `${get('Quantity')} ${get('QuantityUnit')}` : '' },
        { label: 'Gross Weight', value: get('GrossWeight') ? `${get('GrossWeight')} ${get('GrossWeightUnit')}` : '' },
        { label: 'Packages', value: get('NumberOfPackages') },
        { label: 'Declared Value', value: get('DeclaredValue') ? `${get('Currency')} ${Number(get('DeclaredValue')).toLocaleString()}` : '' },
      ],
    },
    {
      title: 'Terms',
      fields: [
        { label: 'Incoterms', value: get('Incoterms'), mono: false },
        { label: 'Freight Payable By', value: get('FreightPayableBy'), mono: false },
        { label: 'Originals (B/L)', value: get('NumberOfOriginalsBL') },
        { label: 'Issue Place & Date', value: get('IssuePlaceAndDate'), full: true, mono: false },
        { label: 'Signatory', value: get('SignatoryName'), mono: false },
      ],
    },
  ];
}

function parseCUSDEC(doc) {
  const root = doc.documentElement;
  const get = tag => getText(root, tag);
  return [
    {
      title: 'Declaration Header',
      fields: [
        { label: 'Declaration Number', value: get('DeclarationNumber') },
        { label: 'UCR', value: get('UCR') },
        { label: 'Declaration Date', value: get('DeclarationDate') },
        { label: 'Declaration Type', value: get('DeclarationType') },
        { label: 'Procedure Code', value: get('ProcedureCode') },
        { label: 'Country of Dispatch', value: get('CountryOfDispatch') },
        { label: 'Country of Destination', value: get('CountryOfDestination') },
        { label: 'Port of Export', value: get('PortOfExport'), mono: false },
        { label: 'Port of Destination', value: get('PortOfDestination'), mono: false },
      ],
    },
    {
      title: 'Exporter',
      fields: [
        { label: 'Name', value: get('Exporter Name'), full: true, mono: false },
        { label: 'Address', value: get('Exporter Address'), full: true, mono: false },
        { label: 'Identifier', value: get('Exporter Identifier') },
        { label: 'Tax Identifier', value: get('Exporter TaxIdentifier') },
      ],
    },
    {
      title: 'Consignee',
      fields: [
        { label: 'Name', value: get('Consignee Name'), full: true, mono: false },
        { label: 'Address', value: get('Consignee Address'), full: true, mono: false },
        { label: 'Identifier', value: get('Consignee Identifier') },
      ],
    },
    {
      title: 'Transport',
      fields: [
        { label: 'Transport Mode', value: get('TransportMode') === '1' ? '1 — Sea' : get('TransportMode') },
        { label: 'Vessel', value: get('VesselName') },
        { label: 'Voyage Number', value: get('VoyageNumber') },
        { label: 'IMO Number', value: get('IMONumber') },
        { label: 'Container', value: get('ContainerNumber'), mono: false },
        { label: 'Seal Number', value: get('SealNumber') },
      ],
    },
    {
      title: 'Goods Item',
      fields: [
        { label: 'HS Code', value: get('HSCode') },
        { label: 'Description', value: get('Description'), full: true, mono: false },
        { label: 'Quantity', value: get('Quantity') ? `${get('Quantity')} ${get('QuantityUnit')}` : '' },
        { label: 'Unit Price', value: get('UnitPrice') },
        { label: 'Customs Value', value: get('CustomsValue') ? `${get('Currency')} ${Number(get('CustomsValue')).toLocaleString()}` : '' },
        { label: 'Gross Mass', value: get('GrossMass') ? `${get('GrossMass')} MT` : '' },
        { label: 'Net Mass', value: get('NetMass') ? `${get('NetMass')} MT` : '' },
        { label: 'Country of Origin', value: get('CountryOfOrigin') },
        { label: 'Preference Code', value: get('PreferenceCode') },
      ],
    },
    {
      title: 'Commercial References',
      fields: [
        { label: 'Invoice Number', value: get('InvoiceNumber') },
        { label: 'Invoice Date', value: get('InvoiceDate') },
        { label: 'Invoice Total', value: get('InvoiceTotal') ? `${get('InvoiceCurrency')} ${Number(get('InvoiceTotal')).toLocaleString()}` : '' },
        { label: 'Incoterms', value: get('Incoterms'), mono: false },
        { label: 'Bill of Lading Ref', value: get('BillOfLadingRef') },
        { label: 'Certificate of Origin Ref', value: get('CertificateOfOriginRef') },
        { label: 'Insurance Ref', value: get('InsuranceCertificateRef') },
      ],
    },
    {
      title: 'Authentication',
      fields: [
        { label: 'Declarant', value: get('DeclarantName'), full: true, mono: false },
        { label: 'Declaration Location', value: get('DeclarationLocation'), mono: false },
        { label: 'Date', value: get('DeclarationAuthentication DeclarationDate') || get('DeclarationDate') },
        { label: 'Status', value: get('Status') },
      ],
    },
  ];
}

// ── Kenya Export Declaration (KRA SAD form) ───────────────────────────────
function parseKEExportDecl(doc) {
  const root = doc.documentElement;
  const get  = tag => getText(root, tag);
  const kes  = parseFloat(get('CustomsValue'));
  return [
    {
      title: 'Declaration Header',
      fields: [
        { label: 'Document Reference',  value: get('DocumentReference') },
        { label: 'System UCR',           value: get('SystemUCR') },
        { label: 'Export Date',          value: get('ExportDate'), mono: false },
        { label: 'Issuing Authority',    value: get('IssuingAuthority'), mono: false },
        { label: 'Declaration Agent',    value: get('DeclarationAgent'), mono: false },
      ],
    },
    {
      title: 'Exporter',
      fields: [
        { label: 'Name',    value: get('Exporter Name'),    full: true, mono: false },
        { label: 'Country', value: get('Exporter Country'), mono: false },
      ],
    },
    {
      title: 'Consignee',
      fields: [
        { label: 'Name',                value: get('Consignee Name'),                full: true, mono: false },
        { label: 'Destination Country', value: get('Consignee DestinationCountry'), mono: false },
      ],
    },
    {
      title: 'Commodity',
      fields: [
        { label: 'Description',      value: get('Commodity Description'),       mono: false },
        { label: 'HS Code',          value: get('Commodity HSCode') },
        { label: 'Gross Mass',       value: get('Commodity GrossMass') },
        { label: 'No. of Packages',  value: get('Commodity NumberOfPackages') },
      ],
    },
    {
      title: 'Transport',
      fields: [
        { label: 'Mode',                   value: get('Transport Mode'),                   mono: false },
        { label: 'Airport of Departure',   value: get('Transport AirportOfDeparture'),   mono: false },
        { label: 'Airport of Destination', value: get('Transport AirportOfDestination'), mono: false },
      ],
    },
    {
      title: 'Customs Valuation',
      fields: [
        { label: 'Customs Value (KES)', value: !isNaN(kes) ? `KES ${kes.toLocaleString()}` : get('CustomsValue') },
      ],
    },
  ];
}

// ── Kenya Phytosanitary Certificate (KEPHIS) ──────────────────────────────
function parseKEPhyto(doc) {
  const root = doc.documentElement;
  const get  = tag => getText(root, tag);
  return [
    {
      title: 'Certificate',
      fields: [
        { label: 'Certificate Number', value: get('CertificateNumber') },
        { label: 'System UCR',          value: get('SystemUCR') },
        { label: 'Issuing Authority',   value: get('IssuingAuthority'), mono: false },
        { label: 'Ministry',            value: get('Ministry'),          mono: false },
      ],
    },
    {
      title: 'Exporter',
      fields: [
        { label: 'Name',    value: get('Exporter Name'),    full: true, mono: false },
        { label: 'Country', value: get('Exporter Country'), mono: false },
      ],
    },
    {
      title: 'Consignee',
      fields: [
        { label: 'Name',                value: get('Consignee Name'),                full: true, mono: false },
        { label: 'Destination Country', value: get('Consignee DestinationCountry'), mono: false },
      ],
    },
    {
      title: 'Commodity',
      fields: [
        { label: 'Botanical Name',   value: get('Commodity Botanical'),        mono: false },
        { label: 'Common Name',      value: get('Commodity CommonName'),        mono: false },
        { label: 'Description',      value: get('Commodity Description'),       mono: false },
        { label: 'Quantity (Stems)', value: get('Commodity QuantityStems') },
        { label: 'Gross Mass (kg)',   value: get('Commodity GrossMassKg') },
        { label: 'No. of Packages',  value: get('Commodity NumberOfPackages') },
        { label: 'Place of Origin',  value: get('Commodity PlaceOfOrigin'),    mono: false },
      ],
    },
    {
      title: 'Inspection & Certification',
      fields: [
        { label: 'Inspection Date',    value: get('Phytosanitary InspectionDate'),   mono: false },
        { label: 'Inspector',          value: get('Phytosanitary Inspector'),         mono: false },
        { label: 'Authorized Officer', value: get('Phytosanitary AuthorizedOfficer'), mono: false },
        { label: 'Place of Issue',     value: get('Phytosanitary PlaceOfIssue'),      mono: false },
        { label: 'Declaration',        value: get('Phytosanitary Declaration'),        full: true, mono: false },
      ],
    },
    {
      title: 'Transport',
      fields: [
        { label: 'Means of Transport', value: get('Transport MeansOfTransport'), mono: false },
        { label: 'Port of Entry',      value: get('Transport PortOfEntry'),      mono: false },
      ],
    },
  ];
}

export default function XmlViewer({ docId, docType, errorType, errorDescription }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    api.getDocumentXml(docId)
      .then(({ content }) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'application/xml');
        const parseErr = xmlDoc.querySelector('parsererror');
        if (parseErr) throw new Error('Invalid XML');
        const rootTag = xmlDoc.documentElement.tagName;
        if (rootTag === 'TransportDocument')          setSections(parseBOL(xmlDoc));
        else if (rootTag === 'CustomsDeclaration')    setSections(parseCUSDEC(xmlDoc));
        else if (rootTag === 'ExportDeclaration')     setSections(parseKEExportDecl(xmlDoc));
        else if (rootTag === 'PhytosanitaryCertificate') setSections(parseKEPhyto(xmlDoc));
        else setSections([{ title: 'Raw Document', fields: [{ label: 'Content', value: content, full: true }] }]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [docId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
      <Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Loading XML document...
    </div>
  );

  if (error) return (
    <div style={{ padding: 16, color: '#991b1b', fontSize: 13, background: '#fef2f2', borderRadius: 8 }}>
      Failed to load XML: {error}
    </div>
  );

  return (
    <div className="xml-viewer">
      {errorType && (
        <div className="xml-error-banner">
          <AlertTriangle style={{ width: 16, height: 16, color: '#a16207', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="eb-type">⚠ {errorType.replace(/_/g, ' ')}</div>
            <div className="eb-desc">{errorDescription}</div>
          </div>
        </div>
      )}
      {sections.map((s, i) => (
        <Section key={i} title={s.title} fields={s.fields} defaultOpen={i < 2} />
      ))}
    </div>
  );
}
