import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Ordering System</h1>
      <div className="flex gap-4">
        <Link href="/admin" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Admin Panel
        </Link>
        <Link href="/kitchen" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          Kitchen Dashboard
        </Link>
      </div>
    </main>
  );
}
