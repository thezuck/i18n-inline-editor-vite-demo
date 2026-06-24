import { useEffect, useMemo, useState } from 'react'
import './i18n-dev.css'

const CARD_MAX_WIDTH = 420;
const CARD_MAX_HEIGHT = 620;
const VIEWPORT_MARGIN = 12;
const CARD_OFFSET = 8;

function isEditableI18nElement(target) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-i18n-editable='true']");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCardPositionForElement(element) {
  const rect = element.getBoundingClientRect();
  const cardWidth = Math.min(CARD_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const cardHeight = Math.min(CARD_MAX_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2);
  const maxX = window.innerWidth - cardWidth - VIEWPORT_MARGIN;
  const maxY = window.innerHeight - cardHeight - VIEWPORT_MARGIN;
  const rightX = rect.right + CARD_OFFSET;
  const leftX = rect.left - cardWidth - CARD_OFFSET;
  const hasRoomOnRight = rightX + cardWidth <= window.innerWidth - VIEWPORT_MARGIN;

  return {
    x: clamp(hasRoomOnRight ? rightX : leftX, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxX)),
    y: clamp(rect.top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxY)),
  };
}

export function I18nDevOverlay() {
  const [selected, setSelected] = useState(null);
  const [value, setValue] = useState("");
  const [baseValue, setBaseValue] = useState("");
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isOpen = Boolean(selected);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function onClick(event) {
      const isModifierPressed = event.altKey || event.metaKey;
      if (!isModifierPressed) return;

      const el = isEditableI18nElement(event.target);
      if (!el) return;

      event.preventDefault();
      event.stopPropagation();

      const key = el.dataset.i18nKey;
      const namespace = el.dataset.i18nNs || "common";
      const locale = el.dataset.i18nLocale || "en";

      if (!key) return;

      const position = getCardPositionForElement(el);

      setSelected({
        key,
        namespace,
        locale,
        renderedValue: el.textContent || "",
        x: position.x,
        y: position.y,
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!selected) return;

    let cancelled = false;

    async function loadRawValue() {
      setError(null);
      setValue(selected.renderedValue);
      setBaseValue("");

      const params = new URLSearchParams({
        locale: selected.locale,
        namespace: selected.namespace,
        key: selected.key,
      });

      try {
        const res = await fetch(`/__i18n/value?${params.toString()}`);
        const json = await res.json();

        if (cancelled) return;

        if (!json.ok) {
          setError(json.error || "Failed to load translation value.");
          return;
        }

        setValue(json.value ?? selected.renderedValue);
        setBaseValue(json.baseValue ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load translation value.");
        }
      }
    }

    loadRawValue();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setSelected(null);
        setError(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const title = useMemo(() => {
    if (!selected) return "";
    return `${selected.locale}/${selected.namespace}: ${selected.key}`;
  }, [selected]);

  async function save() {
    if (!selected) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/__i18n/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale: selected.locale,
          namespace: selected.namespace,
          key: selected.key,
          value,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        if (json.missingInterpolations?.length || json.extraInterpolations?.length) {
          setError(
            [
              json.error || "Interpolation mismatch.",
              json.missingInterpolations?.length
                ? `Missing: ${json.missingInterpolations.join(", ")}`
                : "",
              json.extraInterpolations?.length
                ? `Extra: ${json.extraInterpolations.join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          );
        } else {
          setError(json.error || "Failed to save translation.");
        }

        return;
      }

      setSelected(null);

      // Simple and reliable. Later you can replace this with i18next.reloadResources().
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save translation.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!selected) return null;

  return (
    <div className="i18n-dev-overlay" dir="ltr">
      <div className="i18n-dev-card" style={{ left: selected.x, top: selected.y }}>
        <div className="i18n-dev-header">
          <div>
            <div className="i18n-dev-title">Edit translation</div>
            <div className="i18n-dev-key">{title}</div>
          </div>

          <button
            type="button"
            className="i18n-dev-close"
            onClick={() => {
              setSelected(null);
              setError(null);
            }}
            aria-label="Close translation editor"
          >
            ×
          </button>
        </div>

        {baseValue ? (
          <div className="i18n-dev-base">
            <div className="i18n-dev-label">Base English</div>
            <div className="i18n-dev-base-text" dir="auto">
              {baseValue}
            </div>
          </div>
        ) : null}

        <label className="i18n-dev-label" htmlFor="i18n-dev-textarea">
          Translation
        </label>

        <textarea
          id="i18n-dev-textarea"
          className="i18n-dev-textarea"
          value={value}
          dir="auto"
          autoFocus
          rows={5}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        />

        {error ? <pre className="i18n-dev-error">{error}</pre> : null}

        <div className="i18n-dev-actions">
          <button
            type="button"
            className="i18n-dev-button i18n-dev-secondary"
            onClick={() => {
              setSelected(null);
              setError(null);
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="i18n-dev-button i18n-dev-primary"
            disabled={isSaving}
            onClick={save}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="i18n-dev-hint">
          Alt/Option-click text to edit. Cmd/Ctrl+Enter saves. Esc closes.
        </div>
      </div>
    </div>
  );
}