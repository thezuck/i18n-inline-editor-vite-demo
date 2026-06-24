import React from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeLanguage } from './i18n'

export function T({
  k,
  ns = 'common',
  values,
  as: Component = 'span',
  className,
}) {
  const { t, i18n } = useTranslation(ns)
  const text = t(k, values)
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language || 'en')

  if (!import.meta.env.DEV) {
    return <>{text}</>
  }

  return (
    <Component
      className={className}
      data-i18n-editable="true"
      data-i18n-key={k}
      data-i18n-ns={ns}
      data-i18n-locale={language}
    >
      {text}
    </Component>
  )
}
