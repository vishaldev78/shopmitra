import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-8xl mb-4">404</div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Page Not Found</h1>
      <p className="text-navy-500 mb-6">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link href="/" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition inline-block">Go Home</Link>
    </div>
  );
}
