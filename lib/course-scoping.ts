export function pickFallbackCourse(enrolled: { course_id: string }[], seedCourseId: string): string {
  return enrolled[0]?.course_id ?? seedCourseId;
}

export function isPublicNotebookUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (!u.hostname.includes('notebooklm.google.com')) return false;
  // NotebookLM public-share links expose a sharing param. Treat its presence as public.
  return u.searchParams.has('sharing');
}