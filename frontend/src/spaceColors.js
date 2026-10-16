// A cor depende do id: renomear ou excluir outro espaço não muda sua identidade.
export function spaceColor(id) {
  if (id == null) return '#aaa4b4';
  const hue = (265 + (Number(id) - 1) * 137.508) % 360;
  return `hsl(${hue.toFixed(2)} 48% 61%)`;
}
