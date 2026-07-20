export function sanitizeText(value, replacements) {
  let output = value;
  for (const [sensitive, token] of replacements) {
    if (sensitive) output = output.split(sensitive).join(token);
  }
  output = output.replace(/gh[opsu]_[A-Za-z0-9_]{20,}/g, '<REDACTED_GITHUB_TOKEN>');
  output = output.replace(/sk-[A-Za-z0-9_-]{16,}/g, '<REDACTED_API_KEY>');
  output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<REDACTED_EMAIL>');
  return output;
}

export function sanitizeValue(value, replacements) {
  if (typeof value === 'string') return sanitizeText(value, replacements);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, replacements));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeValue(item, replacements)]),
    );
  }
  return value;
}

