export function formatCurrency(value) {
  const formatted = new Intl.NumberFormat("ka-GE", {
    style: "currency",
    currency: "GEL",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0)

  return formatted.replace("GEL", "₾")
}

export function formatDate(dateString) {
  if (!dateString) return "-"
  return new Date(`${dateString}T00:00:00`).toLocaleDateString()
}

export function getMonthOptions(transactions) {
  const monthSet = new Set(
    transactions
      .filter((item) => item.date)
      .map((item) => item.date.slice(0, 7)),
  )
  return [...monthSet].sort((a, b) => (a < b ? 1 : -1))
}

export function monthLabel(value) {
  if (!value) return "All months"
  const [year, month] = value.split("-")
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}
