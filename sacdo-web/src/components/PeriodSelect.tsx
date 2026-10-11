import { getPeriodOptions, type PeriodGroup, type PeriodOption } from '../services/invoices';

interface Props {
  value: string;
  onChange: (period: string) => void;
  className?: string;
}

/** Month picker for invoice generation: current month, last 6 and next 6. */
export default function PeriodSelect({ value, onChange, className }: Props) {
  const options = getPeriodOptions();

  const groups = options.reduce<{ group: PeriodGroup; options: PeriodOption[] }[]>((acc, opt) => {
    const last = acc[acc.length - 1];
    if (last && last.group === opt.group) last.options.push(opt);
    else acc.push({ group: opt.group, options: [opt] });
    return acc;
  }, []);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {groups.map(({ group, options: opts }) => (
        <optgroup key={group} label={group}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
