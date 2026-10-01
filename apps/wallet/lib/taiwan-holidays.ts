// 台灣國定假日（跟班表頁同一個資料來源：ruyut/TaiwanCalendar）。
// 只留 isHoliday 且有說明文字的日子——一般週六日也是 isHoliday，但沒有 description。
// 給伺服器端（月曆小工具 route）用，快取一天。
export async function fetchTaiwanHolidays(year: number): Promise<{ date: string; name: string }[]> {
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const data: { date: string; isHoliday: boolean; description: string }[] = await res.json()
    return data
      .filter(d => d.isHoliday && d.description !== '')
      .map(d => ({ date: `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`, name: d.description }))
  } catch {
    return []
  }
}
