/**
 * Splits items into columns for a masonry grid: each item, in order, joins the column that is
 * currently shortest (the leftmost on a tie), so columns stay balanced and reading order
 * runs left to right, top to bottom. Returns item indexes per column.
 */
export function masonryColumns(heights: readonly number[], columns: number, gap = 0): number[][] {
  const result: number[][] = Array.from({ length: columns }, () => []);
  const totals = new Array<number>(columns).fill(0);
  heights.forEach((height, index) => {
    const column = totals.indexOf(Math.min(...totals));
    result[column].push(index);
    totals[column] += height + gap;
  });
  return result;
}
