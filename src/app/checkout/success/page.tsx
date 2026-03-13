export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f4f7fb", padding: 24 }}>
      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ maxWidth: 560, width: "100%", padding: 28 }}>
        <h1 className="admin-page-title">Payment Successful</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 8 }}>
          Your subscription has been recorded. You can now proceed to portal setup.
        </p>
      </div>
    </div>
  );
}
