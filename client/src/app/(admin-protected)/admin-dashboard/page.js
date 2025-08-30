'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminDashboardPage() {
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentFetch, setCurrentFetch] = useState('');

    const fetchData = async (endpoint, type) => {
        setLoading(true);
        setError('');
        setData(null);
        setCurrentFetch(type);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch ${type}`);
            }
            const result = await res.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            <p>This page is only accessible to users with the admin role.</p>

            <div className="flex space-x-4 my-6">
                <button
                    onClick={() => fetchData('/api/auth/user-profile?identifier=kobirhumayun1', 'User Profile')}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                    Fetch User Profile
                </button>
                <button
                    onClick={() => fetchData('/api/plans/payment?status=pending', 'Pending Payments')}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                    Fetch Pending Payments
                </button>
            </div>

            <div className="mt-6 min-h-[200px] p-4 border rounded-lg bg-gray-50">
                {loading && <p className="text-center">Loading...</p>}
                {error && <p className="text-center text-red-500">Error: {error}</p>}
                {data && (
                    <div>
                        <h2 className="text-xl font-semibold">Result for: {currentFetch}</h2>
                        <pre className="mt-2 bg-gray-100 p-3 rounded text-sm text-black">{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}