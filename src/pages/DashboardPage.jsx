import MonthlyChart from "../components/MonthlyChart"
import SummaryCards from "../components/SummaryCards"

export default function DashboardPage({ cashBalance, bankBalance, totalIncome, totalExpenses, monthlySummary }) {
  return (
    <main className="space-y-4">
      <SummaryCards
        cashBalance={cashBalance}
        bankBalance={bankBalance}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
      />
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">ყოველთვიური შეჯამება</h2>
        <MonthlyChart data={monthlySummary} />
      </section>
    </main>
  )
}
