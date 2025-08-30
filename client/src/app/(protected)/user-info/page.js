'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UserInfoPage() {
    const { data: session, status } = useSession();
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // If the session has an error (e.g., RefreshAccessTokenError), it means tokens are invalid.
        // Redirect the user to the login page to re-authenticate.
        if (session?.error === 'RefreshAccessTokenError') {
            router.push('/login?error=SessionExpired');
        }

        if (status === 'unauthenticated') {
            // Should be handled by middleware, but as a fallback:
            router.push('/login?error=SessionExpired');
        }
    }, [session, status, router]);

    const handleFetchUserInfo = async () => {
        setLoading(true);
        setError('');
        setUserInfo(null);

        if (session) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, {
                    headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                    },
                    cache: 'no-store', // Prevent caching for client-side fetch
                });

                if (!res.ok) {
                    // Handle specific error for expired token, though our JWT callback should prevent this.
                    if (res.status === 401) {
                        setError("Session expired. Please log in again.");
                        // The session refresh logic in auth.js should ideally handle this.
                        // If it still fails, redirecting is a good fallback.
                        router.push('/login?error=SessionExpired');
                        return;
                    }
                    throw new Error('Failed to fetch user info');
                }

                const data = await res.json();
                setUserInfo(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        } else {
            setError("No active session.");
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return <p className="text-center">Loading session...</p>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Welcome, {session?.user?.username}!</h1>
            <p>This is a protected page. Only authenticated users can see this.</p>

            <div className="mt-6">
                <button
                    onClick={handleFetchUserInfo}
                    disabled={loading || status !== 'authenticated'}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                    {loading ? 'Fetching...' : 'Fetch User Info'}
                </button>
            </div>

            {error && <p className="mt-4 text-red-500">{error}</p>}

            {userInfo && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold">User Info from API:</h2>
                    <pre className="mt-2 bg-gray-100 p-3 rounded text-sm text-black">{JSON.stringify(userInfo, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}