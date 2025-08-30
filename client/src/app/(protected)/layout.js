/**
 * This layout wraps all pages within the (protected) route group.
 * Session management is handled by the root layout's SessionProvider.
 */
export default function ProtectedLayout({ children }) {
    // This layout can be used for protected-route-specific UI,
    // but session logic is handled globally.
    return <>{children}</>;
}