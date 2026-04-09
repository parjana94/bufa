import { useMemo, useState } from "react"
import MonthlyChart from "../components/MonthlyChart"
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

  const filteredTransactions = useMemo(() => {
    const rangeStart = dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom
    const rangeEnd = dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo

    return transactions.filter((item) => {
      if (!item.date) return false
      if (selectedMonth && !item.date.startsWith(selectedMonth)) return false
      if (rangeStart && item.date < rangeStart) return false
      if (rangeEnd && item.date > rangeEnd) return false
      return true
    })
  }, [dateFrom, dateTo, selectedMonth, transactions])

  const filteredExpenses = useMemo(
    () => filteredTransactions.filter((item) => item.type === "expense"),
    [filteredTransactions],
  )
  const filteredIncome = useMemo(
    () => filteredTransactions.filter((item) => item.type === "income"),
    [filteredTransactions],
  )

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, item) => {
        if (item.type === "income") acc.income += Number(item.amount) || 0
        if (item.type === "expense") acc.expense += Number(item.amount) || 0
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [filteredTransactions])

  const chartData = useMemo(() => {
    const byMonth = new Map()
    filteredTransactions.forEach((item) => {
      const month = item.date.slice(0, 7)
      if (!byMonth.has(month)) {
        byMonth.set(month, { month, income: 0, expense: 0 })
      }
      const bucket = byMonth.get(month)
      if (item.type === "income") bucket.income += Number(item.amount) || 0
      if (item.type === "expense") bucket.expense += Number(item.amount) || 0
    })
    return [...byMonth.values()].sort((a, b) => (a.month > b.month ? 1 : -1))
  }, [filteredTransactions])

  return (
    <main className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Income & Expense Report</h2>
            <p className="text-sm text-slate-500">Filter transactions by month or custom date range across months.</p>
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
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Income Total</p>
              <p className="text-lg font-semibold text-emerald-700">{formatCurrency(totals.income)}</p>
            </article>
            <article className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Expense Total</p>
              <p className="text-lg font-semibold text-rose-700">{formatCurrency(totals.expense)}</p>
            </article>
            <article className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Net (Income - Expense)</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(totals.income - totals.expense)}</p>
            </article>
          </div>
          <p className="text-xs text-slate-500">
            Showing {filteredIncome.length} income and {filteredExpenses.length} expense transaction(s).
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Monthly Breakdown</h3>
        <MonthlyChart data={chartData} />
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">Expense Transactions</h3>
        </div>
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

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">Income Transactions</h3>
        </div>
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
              {filteredIncome.map((item) => (
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
        {filteredIncome.length === 0 && <p className="p-4 text-sm text-slate-500">No income matches this filter.</p>}
      </section>
    </main>
  )
}
