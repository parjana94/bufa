import { formatCurrency } from "../utils/format"

export default function SummaryCards({ cashBalance, bankBalance, totalIncome, totalExpenses }) {
  const cards = [
    { label: "Cash Balance", value: formatCurrency(cashBalance) },
    { label: "Bank Balance", value: formatCurrency(bankBalance) },
    { label: "Total Income", value: formatCurrency(totalIncome) },
    { label: "Total Expenses", value: formatCurrency(totalExpenses) },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((item) => (
        <article key={item.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
        </article>
      ))}
    </section>
  )
}
