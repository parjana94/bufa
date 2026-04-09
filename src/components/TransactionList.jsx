import { useState } from "react"
import { formatCurrency, formatDate } from "../utils/format"
import TransactionForm from "./TransactionForm"

function methodLabel(method) {
  if (method === "card") return "Card"
  if (method === "bank") return "Bank"
  return "Cash"
}

export default function TransactionList({ items, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null)

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        No transactions yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isEditing = editingId === item.id
        return (
          <article key={item.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            {!isEditing ? (
              <div className="grid gap-3 sm:grid-cols-5 sm:items-center">
                <div className="sm:col-span-2">
                  <p className="font-medium text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-500">
                    {item.type === "income" ? "Income" : "Expense"} • {methodLabel(item.method)}
                  </p>
                </div>
                <p className={`font-semibold ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </p>
                <p className="text-sm text-slate-500">{formatDate(item.date)}</p>
                <div className="flex gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <TransactionForm
                  initialValues={item}
                  submitLabel="Update transaction"
                  onSubmit={(values) => {
                    onEdit(item.id, values)
                    setEditingId(null)
                  }}
                />
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
