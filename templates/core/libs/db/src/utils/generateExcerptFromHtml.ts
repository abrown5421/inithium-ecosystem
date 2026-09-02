// Strips tags and takes the first 3 sentences, for a post's excerpt when one isn't supplied.
// No HTML-entity decoding (e.g. literal "&amp;" stays as-is) - acceptable for excerpt use, not
// meant to be a general-purpose HTML-to-text converter.
export const generateExcerptFromHtml = (html: string): string => {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, 3).join(' ').trim();
};
