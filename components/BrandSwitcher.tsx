"use client";

import type { BrandId, BrandProfile } from "@/lib/brandProfiles";

export default function BrandSwitcher({
  value,
  profiles,
  canSwitch,
  onChange,
}: {
  value: BrandId;
  profiles: BrandProfile[];
  canSwitch: boolean;
  onChange: (id: BrandId) => void;
}) {
  return (
    <label className="brand-switcher">
      <span>Workspace</span>
      <select
        aria-label="Choose business workspace"
        value={value}
        onChange={(event) => onChange(event.target.value as BrandId)}
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id} disabled={profile.id !== "omega-financial" && !canSwitch}>
            {profile.name}{profile.id !== "omega-financial" && !canSwitch ? " · owner access required" : ""}
          </option>
        ))}
      </select>
      {!canSwitch && <small>Sign in as the studio owner to use other brands.</small>}
    </label>
  );
}
