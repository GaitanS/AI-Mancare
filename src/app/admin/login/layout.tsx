export const metadata = {
  title: 'Login - Admin',
  description: 'Admin login page',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override parent layout - no sidebar for login page
  return (
    <div className="min-h-screen bg-neutral-950">
      {children}
    </div>
  );
}
