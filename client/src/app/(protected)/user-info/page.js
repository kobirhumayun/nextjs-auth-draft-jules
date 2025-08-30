import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getUserInfo(accessToken) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store', // Ensure fresh data is fetched on every request
        });

        if (!res.ok) {
            // This error will be caught by the parent component or Next.js error boundary
            throw new Error('Failed to fetch user info. Status: ' + res.status);
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching user info:", error);
        // In a server component, we can't redirect here, but we can return null
        // and let the page component handle the UI for the error state.
        return null;
    }
}

export default async function UserInfoPage() {
    const session = await auth();

    // Middleware should handle this, but it's good practice for server components too.
    if (!session) {
        redirect('/login');
    }

    // Handle token refresh error case, which the auth() helper populates
    if (session?.error === "RefreshAccessTokenError") {
        redirect('/login?error=SessionExpired');
    }

    // Fetch user info using the (potentially refreshed) access token from the session
    const userInfo = await getUserInfo(session.accessToken);

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Welcome, {session?.user?.username}!</h1>
            <p>This is a protected page. Only authenticated users can see this.</p>
            <p>The user info below is fetched on the server when the page loads.</p>

            {userInfo ? (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold">User Info from API:</h2>
                    <pre className="mt-2 bg-gray-100 p-3 rounded text-sm text-black">{JSON.stringify(userInfo, null, 2)}</pre>
                </div>
            ) : (
                <div className="mt-6 p-4 border rounded-lg bg-red-50 text-red-700">
                    <h2 className="text-xl font-semibold">Error</h2>
                    <p>Could not load user information. The session might be invalid or the API server is down.</p>
                </div>
            )}
        </div>
    );
}