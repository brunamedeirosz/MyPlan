// A cor depende do id: renomear ou excluir outro espaço não muda sua identidade.
export function spaceColor(id) {
  if (id == null) return 'var(--muted)';
  const hue = (265 + (Number(id) - 1) * 137.508) % 360;
  return `hsl(${hue.toFixed(2)} var(--space-saturation, 48%) var(--space-lightness, 61%))`;
}
