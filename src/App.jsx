import { useEffect, useMemo, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import Layout from "./components/Layout"
import { isFirestoreAvailable } from "./lib/firebase"
import DashboardPage from "./pages/DashboardPage"
import FirebaseConfigPage from "./pages/FirebaseConfigPage"
import ReportsPage from "./pages/ReportsPage"
import SetupPage from "./pages/SetupPage"
import TransactionsPage from "./pages/TransactionsPage"
import {
  addShopTransaction,
  deleteShopTransaction,
  resetAllData,
  saveInitialBalances,
  subscribeToSetup,
  subscribeToTransactions,
  updateShopTransaction,
} from "./services/transactions"

function calculateTotals(transactions) {
  return transactions.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.totalIncome += Number(item.amount) || 0
      } else if (item.type === "expense") {
        acc.totalExpenses += Number(item.amount) || 0
      }
      return acc
    },
    { totalIncome: 0, totalExpenses: 0 },
  )
}

function buildMonthlySummary(transactions) {
  const byMonth = new Map()

  transactions.forEach((item) => {
    if (!item.date) return
    const monthKey = item.date.slice(0, 7)
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { month: monthKey, income: 0, expense: 0 })
    }
    const bucket = byMonth.get(monthKey)
    if (item.type === "income") {
      bucket.income += Number(item.amount) || 0
    }
    if (item.type === "expense") {
      bucket.expense += Number(item.amount) || 0
    }
  })

  return [...byMonth.values()].sort((a, b) => (a.month > b.month ? 1 : -1))
}

function App() {
  const [setup, setSetup] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    if (!isFirestoreAvailable) return

    let finished = false
    console.log("[App] Starting initial data subscriptions")

    const loadingTimeout = setTimeout(() => {
      if (finished) return
      console.warn("[App] Startup timeout reached. Unblocking UI.")
      setLoadError("Loading took too long. Check Firebase config/rules. Running with available data.")
      setLoading(false)
    }, 8000)

    const unsubSetup = subscribeToSetup(
      (value) => {
        console.log("[App] Setup snapshot received", value)
        setSetup(value)
        if (!finished) {
          finished = true
          setLoading(false)
        }
      },
      (error) => {
        console.error("[App] Setup subscription error", error)
        setLoadError(error?.message || "Failed to load setup data.")
        if (!finished) {
          finished = true
          setLoading(false)
        }
      },
    )

    const unsubTransactions = subscribeToTransactions(
      (items) => {
        console.log("[App] Transactions snapshot received", items.length)
        setTransactions(items)
      },
      (error) => {
        console.error("[App] Transactions subscription error", error)
        setLoadError((current) => current || error?.message || "Failed to load transactions.")
        if (!finished) {
          finished = true
          setLoading(false)
        }
      },
    )

    return () => {
      clearTimeout(loadingTimeout)
      unsubSetup()
      unsubTransactions()
    }
  }, [])

  const { totalIncome, totalExpenses } = useMemo(() => calculateTotals(transactions), [transactions])
  const monthlySummary = useMemo(() => buildMonthlySummary(transactions), [transactions])

  if (!isFirestoreAvailable) {
    return <FirebaseConfigPage />
  }

  async function handleInitialSave(payload) {
    try {
      console.log("[App] Triggering Firestore save for initial setup", payload)
      await saveInitialBalances(payload)
      console.log("[App] Firestore save completed for initial setup")
    } catch (error) {
      console.error("[App] Firestore save failed for initial setup", error)
      throw error
    }
  }

  async function handleResetData() {
    try {
      setIsResetting(true)
      setLoadError("")
      console.log("[App] Resetting all app data")
      await resetAllData()
      console.log("[App] App data reset complete")
    } catch (error) {
      console.error("[App] Failed to reset app data", error)
      setLoadError(error?.message || "Failed to reset app data.")
    } finally {
      setIsResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading shop ledger...
      </div>
    )
  }

  if (!setup?.initialized) {
    return (
      <>
        {loadError && (
          <div className="mx-auto mt-4 w-full max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </div>
        )}
        <SetupPage onSave={handleInitialSave} />
      </>
    )
  }

  const cashBalance = Number(setup.cashBalance) || 0
  const bankBalance = Number(setup.bankBalance) || 0

  return (
    <Layout onReset={handleResetData} isResetting={isResetting}>
      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError}
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              cashBalance={cashBalance}
              bankBalance={bankBalance}
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              monthlySummary={monthlySummary}
            />
          }
        />
        <Route
          path="/transactions"
          element={
            <TransactionsPage
              transactions={transactions}
              onAdd={addShopTransaction}
              onEdit={updateShopTransaction}
              onDelete={deleteShopTransaction}
            />
          }
        />
        <Route path="/reports" element={<ReportsPage transactions={transactions} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
