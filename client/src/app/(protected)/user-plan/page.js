import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getPlanData(accessToken) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plans/my-plan`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store', // Ensure fresh data is fetched on every request
        });

        if (!res.ok) {
            throw new Error('Failed to fetch plan data. Status: ' + res.status);
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching plan data:", error);
        return null; // Return null on error
    }
}

export default async function UserPlanPage() {
    const session = await auth();

    // Middleware should handle this, but it's good practice for server components too.
    if (!session) {
        redirect('/login');
    }

    // Handle token refresh error case
    if (session?.error === "RefreshAccessTokenError") {
        redirect('/login?error=SessionExpired');
    }

    const planData = await getPlanData(session.accessToken);

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Your Plan Details</h1>
            <p>This is a protected server-rendered page.</p>

            {planData ? (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold">My Plan from API:</h2>
                    <pre className="mt-2 bg-gray-100 p-3 rounded text-sm text-black">{JSON.stringify(planData, null, 2)}</pre>
                </div>
            ) : (
                <p className="mt-6 text-red-500">Could not load plan data. The session might be invalid or the server is down.</p>
            )}
        </div>
    );
}