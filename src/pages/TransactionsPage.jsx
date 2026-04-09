import TransactionForm from "../components/TransactionForm"
import TransactionList from "../components/TransactionList"

export default function TransactionsPage({ transactions, onAdd, onEdit, onDelete }) {
  return (
    <main className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-1">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Add Daily Transaction</h2>
        <TransactionForm onSubmit={onAdd} />
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Transactions</h2>
        <TransactionList items={transactions} onEdit={onEdit} onDelete={onDelete} />
      </section>
    </main>
  )
}
