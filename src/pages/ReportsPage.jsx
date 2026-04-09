import { useMemo, useState } from "react"
import { formatCurrency, formatDate, getMonthOptions, monthLabel } from "../utils/format"

function methodLabel(method) {
  if (method === "card") return "Card"
  if (method === "bank") return "Bank"
  return "Cash"
}

export default function ReportsPage({ transactions }) {
  const monthOptions = useMemo(() => getMonthOptions(transactions), [transactions])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filteredExpenses = useMemo(() => {
    const rangeStart = dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom
    const rangeEnd = dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo

    return transactions.filter((item) => {
      const isExpense = item.type === "expense"
      if (!isExpense) return false
      if (!item.date) return false
      if (selectedMonth && !item.date.startsWith(selectedMonth)) return false
      if (rangeStart && item.date < rangeStart) return false
      if (rangeEnd && item.date > rangeEnd) return false
      return true
    })
  }, [dateFrom, dateTo, selectedMonth, transactions])

  return (
    <main className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Expenses Report</h2>
            <p className="text-sm text-slate-500">Filter expenses by month or by custom date range across months.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring"
            >
              <option value="">All months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              max={dateTo || undefined}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              min={dateFrom || undefined}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedMonth("")
                setDateFrom("")
                setDateTo("")
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear filters
            </button>
          </div>
          <p className="text-xs text-slate-500">Showing {filteredExpenses.length} expense transaction(s).</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment Method</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3">{methodLabel(item.method)}</td>
                  <td className="px-4 py-3">{formatDate(item.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && <p className="p-4 text-sm text-slate-500">No expenses match this filter.</p>}
      </section>
    </main>
  )
}
