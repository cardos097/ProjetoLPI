import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';
import 'flatpickr/dist/flatpickr.min.css';

export function DateInput({ name, value, onChange, required, disabled, min, max, className, style, title, id }) {
    const ref = useRef(null);
    const fp  = useRef(null);

    useEffect(() => {
        fp.current = flatpickr(ref.current, {
            locale: Portuguese,
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd/m/Y',
            allowInput: true,
            minDate: min || null,
            maxDate: max || null,
            onChange([date]) {
                if (!date) return;
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                onChange({ target: { name, value: `${y}-${m}-${d}` } });
            },
        });
        return () => fp.current?.destroy();
    }, []);

    useEffect(() => {
        if (fp.current) fp.current.setDate(value || '', false);
    }, [value]);

    useEffect(() => {
        if (fp.current) {
            fp.current.set('minDate', min || null);
            fp.current.set('maxDate', max || null);
        }
    }, [min, max]);

    return (
        <input
            ref={ref}
            type="date"
            id={id}
            name={name}
            required={required}
            disabled={disabled}
            className={className}
            style={style}
            title={title}
        />
    );
}
