/** RFC 5545 TEXT encoding; also protects exports of older stored values. */
export function escapeCalendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function mailSubject(value: string) {
  return value.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ");
}
