export interface Box {
  left: number;
  right: number;
}

export interface VisualLayoutSnapshot {
  viewportWidth: number;
  main: Box;
  heading?: Box;
  proseFontSize?: number;
  content: Array<Box & { label: string }>;
}

export function evaluateVisualLayout(snapshot: VisualLayoutSnapshot): string[] {
  const issues: string[] = [];
  const outside = (box: Box) => box.left < -2 || box.right > snapshot.viewportWidth + 2;
  if (outside(snapshot.main)) issues.push('main content extends outside the viewport');
  if (snapshot.heading && outside(snapshot.heading)) issues.push('page heading extends outside the viewport');
  if (snapshot.proseFontSize != null && snapshot.proseFontSize < 16) issues.push('article text is smaller than 16px');
  for (const item of snapshot.content) {
    if (outside(item)) issues.push(`${item.label} extends outside the viewport`);
  }
  return issues;
}
