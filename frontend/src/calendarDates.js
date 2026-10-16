export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function readDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(year, month, 1 - offset + index));
}

export function dueLabel(value, today) {
  if (!value) return '';
  if (value === today) return 'Hoje';
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(readDate(value));
}
