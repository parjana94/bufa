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

const settingsRef = db ? doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID) : null
const transactionsRef = db ? collection(db, TRANSACTIONS_COLLECTION) : null

/** In-memory mirror of last Firestore snapshot (not persisted). Used for listener fan-out only. */
const stateStore = {
  settings: null,
  transactions: [],
}

const listeners = {
  setup: new Set(),
  transactions: new Set(),
}

function notifySetup() {
  listeners.setup.forEach((listener) => listener(stateStore.settings))
}

function notifyTransactions() {
  listeners.transactions.forEach((listener) => listener([...stateStore.transactions]))
}

function assertDb() {
  if (!db || !settingsRef || !transactionsRef) {
    throw new Error(
      "Firebase Firestore is not configured. Set all VITE_FIREBASE_* variables in your environment.",
    )
  }
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

export async function saveInitialBalances({ cashBalance, bankBalance }) {
  assertDb()
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
}

export async function addShopTransaction(input) {
  assertDb()
  const transactionPayload = normalizeTransactionInput({
    ...input,
    date: todayISO(),
  })
  const delta = calculateBalanceDelta(transactionPayload)

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
}

export async function updateShopTransaction(id, updates) {
  assertDb()
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id)

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
}

export async function deleteShopTransaction(id) {
  assertDb()
  const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id)

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
}

export async function resetAllData() {
  assertDb()
  const batch = writeBatch(db)
  const transactionsSnapshot = await getDocs(transactionsRef)
  transactionsSnapshot.forEach((transactionDoc) => {
    batch.delete(transactionDoc.ref)
  })
  batch.delete(settingsRef)
  await batch.commit()
}

export function subscribeToSetup(callback, onError) {
  if (!db || !settingsRef) {
    const err = new Error("Firebase Firestore is not configured. Set all VITE_FIREBASE_* variables.")
    console.error("[Transactions]", err.message)
    if (onError) onError(err)
    return () => {}
  }

  listeners.setup.add(callback)
  callback(stateStore.settings)

  const unsub = onSnapshot(
    settingsRef,
    (snapshot) => {
      stateStore.settings = snapshot.exists()
        ? {
            id: snapshot.id,
            ...snapshot.data(),
          }
        : null
      notifySetup()
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
  if (!db || !transactionsRef) {
    const err = new Error("Firebase Firestore is not configured. Set all VITE_FIREBASE_* variables.")
    console.error("[Transactions]", err.message)
    if (onError) onError(err)
    return () => {}
  }

  listeners.transactions.add(callback)
  callback([...stateStore.transactions])

  const transactionsQuery = query(transactionsRef, orderBy("date", "desc"), orderBy("createdAt", "desc"))
  const unsub = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      stateStore.transactions = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      notifyTransactions()
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
