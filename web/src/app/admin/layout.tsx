/** Pass-through: auth gate lives in (console)/layout so /admin/forbidden stays public-to-signed-in users. */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
