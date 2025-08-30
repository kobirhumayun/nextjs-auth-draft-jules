"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    // Call the backend to invalidate the refresh token
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/logout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!res.ok) {
        console.error("Logout failed on the backend.");
      }
    } catch (error) {
      console.error("Error during backend logout:", error);
    }

    // Sign out from NextAuth and redirect
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 text-white shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-300">
          Auth Portal
        </Link>
        <ul className="flex items-center space-x-4">
          {status === "loading" ? (
            <li>Loading...</li>
          ) : session ? (
            <>
              <li>
                <Link href="/user-info" className="hover:text-gray-300">
                  User Info
                </Link>
              </li>
              <li>
                <Link href="/user-plan" className="hover:text-gray-300">
                  My Plan
                </Link>
              </li>
              {session.user?.role === "admin" && (
                <li>
                  <Link href="/admin-dashboard" className="hover:text-gray-300">
                    Admin
                  </Link>
                </li>
              )}
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/login" className="hover:text-gray-300">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-gray-300">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
