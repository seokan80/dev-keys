/** 브라우저 시간대의 오늘 'YYYY-MM-DD' (오답 반복 예정일 비교용) */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
