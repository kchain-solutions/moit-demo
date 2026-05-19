import crypto from 'crypto';

export const genId = () => crypto.randomBytes(8).toString('hex');
export const genHash = () => '0x' + crypto.randomBytes(16).toString('hex');
export const genDID = () => 'did:iota:0x' + crypto.randomBytes(12).toString('hex');
export const now = () => new Date().toISOString();
export const escXml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
