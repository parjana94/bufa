import { useState } from "react"

export default function SetupPage({ onSave }) {
  const [cashBalance, setCashBalance] = useState("")
  const [bankBalance, setBankBalance] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(event) {
    event.preventDefault()

    console.log("[SetupPage] Save and Continue clicked via form submit")
    setErrorMessage("")
    setIsSaving(true)

    try {
      const payload = {
        cashBalance: Number(cashBalance),
        bankBalance: Number(bankBalance),
      }
      console.log("[SetupPage] Saving initial balances", payload)
      await onSave(payload)
      console.log("[SetupPage] Initial balances saved successfully")
    } catch (error) {
      console.error("[SetupPage] Failed to save initial balances", error)
      setErrorMessage(error?.message || "Failed to save balances. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <div className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Initial Setup</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your starting balances before tracking transactions.</p>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="cash-balance">
              Starting Cash Balance (₾)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₾</span>
              <input
                id="cash-balance"
                type="number"
                min="0"
                step="0.01"
                value={cashBalance}
                onChange={(event) => setCashBalance(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none ring-slate-400 focus:ring"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="bank-balance">
              Starting Bank Balance (₾)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₾</span>
              <input
                id="bank-balance"
                type="number"
                min="0"
                step="0.01"
                value={bankBalance}
                onChange={(event) => setBankBalance(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none ring-slate-400 focus:ring"
              />
            </div>
          </div>
          <button
            type="submit"
            onClick={() => console.log("[SetupPage] Save and Continue button onClick fired")}
            disabled={isSaving}
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Save and continue"}
          </button>
          {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
        </form>
      </div>
    </div>
  )
}
