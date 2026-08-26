export default function Alert({ type = "error", children, action }) {
  return (
    <div className={`alert alert--${type}`} role={type === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {action && <span className="alert__action">{action}</span>}
    </div>
  );
}
