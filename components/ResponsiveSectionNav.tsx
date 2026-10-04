"use client";

import { useId } from "react";

export interface ResponsiveSectionNavProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export default function ResponsiveSectionNav<T extends string>({
  items,
  value,
  onChange,
  label,
  className = "",
}: ResponsiveSectionNavProps<T>) {
  const selectId = useId();

  return <>
    <nav className={`responsive-section-desktop ${className}`.trim()} aria-label={label}>
      {items.map((item) => <button
        key={item}
        type="button"
        className={value === item ? "active" : ""}
        aria-current={value === item ? "page" : undefined}
        onClick={() => onChange(item)}
      >{item}</button>)}
    </nav>
    <div className="responsive-section-mobile">
      <label htmlFor={selectId}>{label}</label>
      <select id={selectId} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {items.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  </>;
}
