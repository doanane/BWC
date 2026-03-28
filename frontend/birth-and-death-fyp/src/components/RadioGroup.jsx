import './RadioGroup.css';

/**
 * RadioGroup — styled radio button group
 * props: name, value, onChange, options=[{value, label, description?, icon?}],
 *        layout='vertical'|'horizontal'|'card', label, required
 */
export default function RadioGroup({
  name, value, onChange, options = [],
  layout = 'vertical', label, required = false,
  className = '',
}) {
  return (
    <div className={`radio-group ${className}`}>
      {label && (
        <p className="radio-group-label">
          {label}{required && <span className="required"> *</span>}
        </p>
      )}
      <div className={`radio-options radio-options-${layout}`}>
        {options.map(opt => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`radio-option ${layout === 'card' ? 'radio-card' : ''} ${checked ? 'checked' : ''} ${opt.disabled ? 'disabled' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                className="radio-input"
              />
              <span className="radio-indicator" />
              <span className="radio-text">
                {opt.icon && <span className="radio-icon">{opt.icon}</span>}
                <span>
                  <span className="radio-label">{opt.label}</span>
                  {opt.description && (
                    <span className="radio-description">{opt.description}</span>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
