'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'SessionExpired') {
            setError('Your session has expired. Please log in again.');
        }
        // Note: This message will be replaced by "Invalid credentials" if a login attempt fails.
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const result = await signIn('credentials', {
                redirect: false, // Do not redirect automatically
                identifier,
                password,
            });

            if (result.error) {
                // The error message comes from the `authorize` function's thrown error
                setError('Invalid credentials. Please try again.');
                console.error('Sign-in error:', result.error);
            } else if (result.ok) {
                // Redirect to a protected page on successful login
                router.push('/user-info');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            console.error('Caught exception during sign-in:', err);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
            <form onSubmit={handleSubmit}>
                {error && <p className="mb-4 text-center text-red-500">{error}</p>}
                <div className="mb-4">
                    <label className="block text-gray-700">Username or Email</label>
                    <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-black"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-black"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                    Login
                </button>
            </form>
        </div>
    );
}