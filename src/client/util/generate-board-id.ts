export function generateLegacyWhiteboardId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from(
      { length: 3 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  return `${part()}-${part()}-${part()}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const BOARD_ID_REGEX = /^[a-z0-9-]{3,50}$/;
