import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "../lib/firebase"

const SETTINGS_COLLECTION = "settings"
const SETTINGS_DOC_ID = "main"
const TRANSACTIONS_COLLECTION = "transactions"
const CARD_FEE_RATE = 0.015
const LOCAL_STORAGE_KEY = "shop-ledger-state"

const settingsRef = db ? doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID) : null
const transactionsRef = db ? collection(db, TRANSACTIONS_COLLECTION) : null

const stateStore = {
  settings: null,
  transactions: [],
}

const listeners = {
  setup: new Set(),
  transactions: new Set(),
}
let forceLocalMode = !db

function loadLocalState() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    stateStore.settings = parsed?.settings ?? null
    stateStore.transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : []
  } catch (error) {
    console.warn("[Transactions] Failed to load local state cache", error)
  }
}

function saveLocalState() {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        settings: stateStore.settings,
        transactions: stateStore.transactions,
      }),
    )
  } catch (error) {
    console.warn("[Transactions] Failed to persist local state cache", error)
  }
}

loadLocalState()

function emitSetup() {
  saveLocalState()
  listeners.setup.forEach((listener) => listener(stateStore.settings))
}

function emitTransactions() {
  saveLocalState()
  listeners.transactions.forEach((listener) => listener([...stateStore.transactions]))
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100
}

export function calculateBalanceDelta(transaction) {
  const amount = toNumber(transaction.amount)
  const type = transaction.type
  const method = transaction.method
  let cashDelta = 0
  let bankDelta = 0

  if (type === "income") {
    if (method === "cash") {
      cashDelta += amount
    } else if (method === "card") {
      bankDelta += roundCurrency(amount * (1 - CARD_FEE_RATE))
    }
  }

  if (type === "expense") {
    if (method === "cash") {
      cashDelta -= amount
    } else if (method === "bank") {
      bankDelta -= amount
    }
  }

  return {
    cashDelta: roundCurrency(cashDelta),
    bankDelta: roundCurrency(bankDelta),
  }
}

function invertDelta(delta) {
  return {
    cashDelta: -delta.cashDelta,
    bankDelta: -delta.bankDelta,
  }
}

function applyDelta(current, delta) {
  return {
    cashBalance: roundCurrency(toNumber(current.cashBalance) + delta.cashDelta),
    bankBalance: roundCurrency(toNumber(current.bankBalance) + delta.bankDelta),
  }
}

function normalizeTransactionInput(input) {
  return {
    type: input.type,
    description: input.description?.trim() || "",
    amount: roundCurrency(toNumber(input.amount)),
    method: input.method,
    date: input.date,
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function shouldFallbackToMock(error) {
  const code = error?.code || ""
  return (
    code.includes("permission-denied") ||
    code.includes("failed-precondition") ||
    code.includes("unavailable") ||
    code.includes("unimplemented")
  )
}

function isLocalMode() {
  return !db || forceLocalMode
}

function enableForceLocalMode(reason, error) {
  if (!forceLocalMode) {
    console.warn(`[Transactions] Switching to forced local mode: ${reason}`, error)
  }
  forceLocalMode = true
}

export async function saveInitialBalances({ cashBalance, bankBalance }) {
  if (isLocalMode()) {
    stateStore.settings = {
      id: SETTINGS_DOC_ID,
      cashBalance: roundCurrency(toNumber(cashBalance)),
      bankBalance: roundCurrency(toNumber(bankBalance)),
      initialized: true,
    }
    emitSetup()
    return
  }

  try {
    await setDoc(
      settingsRef,
      {
        cashBalance: roundCurrency(toNumber(cashBalance)),
        bankBalance: roundCurrency(toNumber(bankBalance)),
        initialized: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[Transactions] saveInitialBalances failed", error)
    if (!shouldFallbackToMock(error)) throw error
    enableForceLocalMode("saveInitialBalances failed", error)
    stateStore.settings = {
      id: SETTINGS_DOC_ID,
      cashBalance: roundCurrency(toNumber(cashBalance)),
      bankBalance: roundCurrency(toNumber(bankBalance)),
      initialized: true,
    }
    emitSetup()
  }
}

export async function addShopTransaction(input) {
  const transactionPayload = normalizeTransactionInput({
    ...input,
    date: todayISO(),
  })
  const delta = calculateBalanceDelta(transactionPayload)

  if (isLocalMode()) {
    const currentSettings = stateStore.settings ?? {
      id: SETTINGS_DOC_ID,
      cashBalance: 0,
      bankBalance: 0,
      initialized: true,
    }
    const nextBalances = applyDelta(currentSettings, delta)
    stateStore.settings = {
      ...currentSettings,
      ...nextBalances,
      initialized: true,
    }

    stateStore.transactions = [
      {
        id: `mock-${Date.now()}`,
        ...transactionPayload,
      },
      ...stateStore.transactions,
    ]

    emitSetup()
    emitTransactions()
    return
  }

  try {
    await runTransaction(db, async (tx) => {
      const settingsSnap = await tx.get(settingsRef)
      const currentSettings = settingsSnap.exists() ? settingsSnap.data() : { cashBalance: 0, bankBalance: 0 }
      const nextBalances = applyDelta(currentSettings, delta)

      tx.set(
        settingsRef,
        {
          ...nextBalances,
          initialized: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      const newTransactionRef = doc(transactionsRef)
      tx.set(newTransactionRef, {
        ...transactionPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error("[Transactions] addShopTransaction failed", error)
    if (!shouldFallbackToMock(error)) throw error
    enableForceLocalMode("addShopTransaction failed", error)
    const currentSettings = stateStore.settings ?? {
      id: SETTINGS_DOC_ID,
      cashBalance: 0,
      bankBalance: 0,
      initialized: true,
    }
    const nextBalances = applyDelta(currentSettings, delta)
    stateStore.settings = {
      ...currentSettings,
      ...nextBalances,
      initialized: true,
    }
    stateStore.transactions = [
      {
        id: `mock-${Date.now()}`,
        ...transactionPayload,
      },
      ...stateStore.transactions,
    ]
    emitSetup()
    emitTransactions()
  }
}

export async function updateShopTransaction(id, updates) {
  if (isLocalMode()) {
    const existing = stateStore.transactions.find((item) => item.id === id)
    if (!existing) {
      throw new Error("Transaction no longer exists.")
    }
    const merged = normalizeTransactionInput({ ...existing, ...updates })
    const currentSettings = stateStore.settings ?? {
      id: SETTINGS_DOC_ID,
      cashBalance: 0,
      bankBalance: 0,
      initialized: true,
    }
    const removeOld = invertDelta(calculateBalanceDelta(existing))
    const applyNew = calculateBalanceDelta(merged)
    stateStore.settings = {
      ...currentSettings,
      ...applyDelta(applyDelta(currentSettings, removeOld), applyNew),
      initialized: true,
    }
    stateStore.transactions = stateStore.transactions.map((item) => (item.id === id ? { ...item, ...merged } : item))
    emitSetup()
    emitTransactions()
    return
  }

  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id)

  try {
    await runTransaction(db, async (tx) => {
      const settingsSnap = await tx.get(settingsRef)
      const transactionSnap = await tx.get(transactionRef)
      if (!transactionSnap.exists()) {
        throw new Error("Transaction no longer exists.")
      }

      const currentTransaction = transactionSnap.data()
      const mergedTransaction = normalizeTransactionInput({
        ...currentTransaction,
        ...updates,
      })

      const currentSettings = settingsSnap.exists() ? settingsSnap.data() : { cashBalance: 0, bankBalance: 0 }
      const removeOld = invertDelta(calculateBalanceDelta(currentTransaction))
      const applyNew = calculateBalanceDelta(mergedTransaction)
      const nextBalances = applyDelta(applyDelta(currentSettings, removeOld), applyNew)

      tx.set(
        settingsRef,
        {
          ...nextBalances,
          initialized: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      tx.update(transactionRef, {
        ...mergedTransaction,
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error("[Transactions] updateShopTransaction failed", error)
    if (!shouldFallbackToMock(error)) throw error
    enableForceLocalMode("updateShopTransaction failed", error)
    const existing = stateStore.transactions.find((item) => item.id === id)
    if (!existing) {
      throw new Error("Transaction no longer exists.")
    }
    const merged = normalizeTransactionInput({ ...existing, ...updates })
    const currentSettings = stateStore.settings ?? {
      id: SETTINGS_DOC_ID,
      cashBalance: 0,
      bankBalance: 0,
      initialized: true,
    }
    const removeOld = invertDelta(calculateBalanceDelta(existing))
    const applyNew = calculateBalanceDelta(merged)
    stateStore.settings = {
      ...currentSettings,
      ...applyDelta(applyDelta(currentSettings, removeOld), applyNew),
      initialized: true,
    }
    stateStore.transactions = stateStore.transactions.map((item) => (item.id === id ? { ...item, ...merged } : item))
    emitSetup()
    emitTransactions()
  }
}

export async function deleteShopTransaction(id) {
  if (isLocalMode()) {
    const existing = stateStore.transactions.find((item) => item.id === id)
    if (!existing) {
      return
    }
    const currentSettings = stateStore.settings ?? {
      id: SETTINGS_DOC_ID,
      cashBalance: 0,
      bankBalance: 0,
      initialized: true,
    }
    const reverseDelta = invertDelta(calculateBalanceDelta(existing))
    stateStore.settings = {
      ...currentSettings,
      ...applyDelta(currentSettings, reverseDelta),
      initialized: true,
    }
    stateStore.transactions = stateStore.transactions.filter((item) => item.id !== id)
    emitSetup()
    emitTransactions()
    return
  }

  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id)

  try {
    await runTransaction(db, async (tx) => {
      const settingsSnap = await tx.get(settingsRef)
      const transactionSnap = await tx.get(transactionRef)
      if (!transactionSnap.exists()) {
        return
      }

      const existingTransaction = transactionSnap.data()
      const reverseDelta = invertDelta(calculateBalanceDelta(existingTransaction))
      const currentSettings = settingsSnap.exists() ? settingsSnap.data() : { cashBalance: 0, bankBalance: 0 }
      const nextBalances = applyDelta(currentSettings, reverseDelta)

      tx.set(
        settingsRef,
        {
          ...nextBalances,
          initialized: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      tx.delete(transactionRef)
    })
  } catch (error) {
    console.error("[Transactions] deleteShopTransaction failed", error)
    if (!shouldFallbackToMock(error)) throw error
    enableForceLocalMode("deleteShopTransaction failed", error)
    const existing = stateStore.transactions.find((item) => item.id === id)
    if (!existing) return
    const currentSettings = stateStore.settings ?? {
      id: SETTINGS_DOC_ID,
      cashBalance: 0,
      bankBalance: 0,
      initialized: true,
    }
    const reverseDelta = invertDelta(calculateBalanceDelta(existing))
    stateStore.settings = {
      ...currentSettings,
      ...applyDelta(currentSettings, reverseDelta),
      initialized: true,
    }
    stateStore.transactions = stateStore.transactions.filter((item) => item.id !== id)
    emitSetup()
    emitTransactions()
  }
}

export async function resetAllData() {
  if (isLocalMode()) {
    stateStore.settings = null
    stateStore.transactions = []
    emitSetup()
    emitTransactions()
    return
  }

  const batch = writeBatch(db)
  const transactionsSnapshot = await getDocs(transactionsRef)
  transactionsSnapshot.forEach((transactionDoc) => {
    batch.delete(transactionDoc.ref)
  })
  batch.delete(settingsRef)
  await batch.commit()

  stateStore.settings = null
  stateStore.transactions = []
  emitSetup()
  emitTransactions()
}

export function subscribeToSetup(callback, onError) {
  listeners.setup.add(callback)
  callback(stateStore.settings)

  if (isLocalMode()) {
    return () => {
      listeners.setup.delete(callback)
    }
  }

  const unsub = onSnapshot(
    settingsRef,
    (snapshot) => {
      if (forceLocalMode) return
      stateStore.settings = snapshot.exists()
        ? {
            id: snapshot.id,
            ...snapshot.data(),
          }
        : null
      emitSetup()
    },
    (error) => {
      console.error("[Transactions] Setup subscription failed", error)
      if (onError) onError(error)
    },
  )

  return () => {
    listeners.setup.delete(callback)
    unsub()
  }
}

export function subscribeToTransactions(callback, onError) {
  listeners.transactions.add(callback)
  callback([...stateStore.transactions])

  if (isLocalMode()) {
    return () => {
      listeners.transactions.delete(callback)
    }
  }

  const transactionsQuery = query(transactionsRef, orderBy("date", "desc"), orderBy("createdAt", "desc"))
  const unsub = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      if (forceLocalMode) return
      stateStore.transactions = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      emitTransactions()
    },
    (error) => {
      console.error("[Transactions] Transactions subscription failed", error)
      if (onError) onError(error)
    },
  )

  return () => {
    listeners.transactions.delete(callback)
    unsub()
  }
}
