import { useMemo, useState } from "react"

const baseState = {
  type: "income",
  description: "",
  amount: "",
  method: "cash",
}

function buildInitialState(initialValues) {
  if (!initialValues) return baseState
  return {
    type: initialValues.type,
    description: initialValues.description,
    amount: String(initialValues.amount ?? ""),
    method: initialValues.method,
  }
}

export default function TransactionForm({ onSubmit, initialValues, submitLabel = "Save transaction" }) {
  const [form, setForm] = useState(() => buildInitialState(initialValues))
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const methodOptions = useMemo(() => {
    if (form.type === "income") {
      return [
        { value: "cash", label: "Cash" },
        { value: "card", label: "Card (1.5% fee)" },
      ]
    }
    return [
      { value: "cash", label: "Cash" },
      { value: "bank", label: "Bank" },
    ]
  }, [form.type])

  function handleTypeChange(type) {
    setForm((current) => ({
      ...current,
      type,
      method: type === "income" ? "cash" : "cash",
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setErrorMessage("")
    setIsSaving(true)
    console.log("[TransactionForm] Submit clicked", form)

    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
      })
      console.log("[TransactionForm] Transaction saved successfully")
      if (!initialValues) {
        setForm(baseState)
      }
    } catch (error) {
      console.error("[TransactionForm] Failed to save transaction", error)
      setErrorMessage(error?.message || "Failed to save transaction. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="type">
          Type
        </label>
        <select
          id="type"
          value={form.type}
          onChange={(event) => handleTypeChange(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
          Name / Description
        </label>
        <input
          id="description"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring"
          placeholder="Product sale, rent, utility bill..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="amount">
          Amount (₾)
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₾</span>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            required
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none ring-slate-400 focus:ring"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="method">
          Payment Method
        </label>
        <select
          id="method"
          value={form.method}
          onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400 focus:ring"
        >
          {methodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
      {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
    </form>
  )
}
