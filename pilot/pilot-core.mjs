// Shared pure helpers. Invitation codes are credentials; never log them.
export const ADMIN_EMAIL = 'thanh.tran@dolenglish.vn';
export function teacherIdentity(user) {
  return !!user?.emailVerified && /@dolenglish\.vn$/i.test(user.email || '') &&
    user.providerData?.some(provider => provider.providerId === 'google.com');
}
export function parseRoster(text, existing = []) {
  const normalize = name => name.normalize('NFC').trim().replace(/\s+/g, ' ');
  const seen = new Set(existing.map(name => normalize(name).toLocaleLowerCase('vi')));
  return text.split(/\r?\n/).map(normalize).filter(Boolean).map(name => {
    const key = name.toLocaleLowerCase('vi');
    const error = name.length > 60 ? 'Tên dài quá 60 ký tự' : /[\t\x00-\x1f]/.test(name) ? 'Tên có ký tự không hợp lệ' : seen.has(key) ? 'Trùng tên — thêm tên đệm hoặc số để phân biệt' : '';
    seen.add(key);
    return { name, error };
  });
}
export function newCode() {
  // 128 random bits; fragment links avoid referrer/access-log disclosure.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function cleanCode(value) {
  return value.trim().replace(/[\s-]/g, '').toUpperCase();
}
export function displayCode(value) { return value.match(/.{1,4}/g)?.join('-') || ''; }
export function csvCell(value) {
  const s = String(value ?? '');
  // Spreadsheet formula injection protection, including leading whitespace.
  return '"' + (/^\s*[=+@-]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
}
export function rosterCSV(rows, baseURL) {
  return '\uFEFFTên học viên,Mã cá nhân,Link cá nhân\r\n' + rows.map(row =>
    [row.name, displayCode(row.invite), `${baseURL}#learner=${row.invite}`].map(csvCell).join(',')
  ).join('\r\n');
}
