/**
 * Ô nhập liệu dùng chung cho toàn bộ form. Khi focus, 4 "ngoặc lấy nét"
 * (giống điểm AF trên khung ngắm máy ảnh) sẽ sáng lên quanh viền input.
 */
export default function FocusField({
  label,
  error,
  hint,
  labelAction,
  icon,
  className = "",
  ...inputProps
}) {
  return (
    <label className="field">
      {label && (
        <span className="field__label">
          <span>{label}</span>
          {labelAction}
        </span>
      )}
      <div className={`focus-frame ${icon ? "field--has-icon" : ""} ${className}`}>
        <input className="focus-frame__input" data-invalid={!!error} {...inputProps} />
        <span className="focus-frame__bracket focus-frame__bracket--tl" />
        <span className="focus-frame__bracket focus-frame__bracket--tr" />
        <span className="focus-frame__bracket focus-frame__bracket--bl" />
        <span className="focus-frame__bracket focus-frame__bracket--br" />
        {icon}
      </div>
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </label>
  );
}
