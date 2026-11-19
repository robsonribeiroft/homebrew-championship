interface Props {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}

export function Toggle({ label, checked, onChange, disabled, hint }: Props) {
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`} title={hint}>
      <span className="toggle__label">{label}</span>
      {hint && <span className="toggle__hint">{hint}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`toggle__switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__state">{checked ? 'ON' : 'OFF'}</span>
        <span className="toggle__knob" />
      </button>
    </label>
  );
}
