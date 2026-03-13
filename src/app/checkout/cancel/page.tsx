export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f4f7fb", padding: 24 }}>
      <div className="bg-white rounded-2xl border border-[var(--border)]" style={{ maxWidth: 560, width: "100%", padding: 28 }}>
        <h1 className="admin-page-title">Payment Cancelled</h1>
        <p className="admin-page-subtitle" style={{ marginTop: 8 }}>
          No charge was made. You can return to pricing and choose a plan anytime.
        </p>
      </div>
    </div>
  );
}
