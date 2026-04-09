export default function FirebaseConfigPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Firebase required</h1>
        <p className="mt-2 text-sm text-slate-600">
          This app stores balances and transactions in Cloud Firestore so every device sees the same data. Configure your Firebase web app
          credentials in environment variables and redeploy.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to <code className="rounded bg-slate-100 px-1">.env</code> locally.</li>
          <li>Fill all <code className="rounded bg-slate-100 px-1">VITE_FIREBASE_*</code> values from the Firebase console.</li>
          <li>Enable Firestore and set security rules appropriate for your use case.</li>
          <li>On Vercel/Netlify/Firebase Hosting, add the same variables in project settings.</li>
        </ul>
      </div>
    </div>
  )
}
