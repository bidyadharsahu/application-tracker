import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Briefcase, CheckCircle2, Bell, Settings } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function TabBar({ urgentCount }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const path = location.pathname;

  // Hide tab bar on admin screens
  if (path.startsWith("/admin")) return null;

  const tab = new URLSearchParams(location.search).get("tab");

  const tabs = [
    { to: "/",             icon: Briefcase,    key: "home",    labelKey: "nav_home",    on: !tab },
    { to: "/?tab=applied", icon: CheckCircle2, key: "applied", labelKey: "nav_applied", on: tab === "applied" },
    { to: "/?tab=notices", icon: Bell,         key: "notices", labelKey: "nav_notices", on: tab === "notices" },
    { to: "/admin/login",  icon: Settings,     key: "admin",   labelKey: "nav_admin",   on: false },
  ];

  return (
    <nav className="tab-bar" role="navigation" aria-label="Main navigation">
      {tabs.map(({ to, icon: Icon, key, labelKey, on }) => (
        <button
          key={key}
          type="button"
          className={"tab-item" + (on ? " active" : "")}
          onClick={() => navigate(to)}
          aria-current={on ? "page" : undefined}
          aria-label={t(labelKey)}
        >
          <div className="tab-icon-wrap">
            <Icon
              size={23}
              strokeWidth={on ? 2.2 : 1.6}
              color={on ? "var(--ios-blue)" : "var(--label-3)"}
            />
          </div>
          <span className="tab-label">{t(labelKey)}</span>
          {key === "home" && urgentCount > 0 && !on && (
            <span className="tab-badge">{urgentCount > 9 ? "9+" : urgentCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
