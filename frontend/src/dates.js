// datetime-local usa o fuso do navegador; a API recebe instantes ISO com fuso.
export function toApiDate(value) {
  return value ? new Date(value).toISOString() : null;
}

export function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = part => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
