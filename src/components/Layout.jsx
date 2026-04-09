import { NavLink } from "react-router-dom"

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/reports", label: "Reports" },
]

function navClassName({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"
  }`
}

export default function Layout({ children, onReset, isResetting }) {
  function handleResetClick() {
    if (!window.confirm("This will clear all balances and transactions. Continue?")) return
    onReset()
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Shop Ledger</h1>
            <p className="text-sm text-slate-500">Simple expense and income tracking</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClassName}>
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleResetClick}
              disabled={isResetting}
              className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResetting ? "Resetting..." : "Reset Data"}
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
