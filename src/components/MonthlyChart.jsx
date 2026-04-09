import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency } from "../utils/format"

export default function MonthlyChart({ data }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        No chart data yet.
      </div>
    )
  }

  return (
    <div className="h-72 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="income" fill="#059669" />
          <Bar dataKey="expense" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
