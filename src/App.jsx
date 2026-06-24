import React from 'react'
import { useTranslation } from 'react-i18next'
import { T } from './i18n/T.jsx'
import { I18nDevOverlay } from './i18n/dev/I18nDevOverlay.jsx'
import { getDirection, normalizeLanguage } from './i18n/i18n.js'

function LanguageButton({ language, labelKey }) {
  const { i18n } = useTranslation()
  const activeLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language || 'en')
  const isActive = activeLanguage === language

  return (
    <button
      type="button"
      className={isActive ? 'language-button active' : 'language-button'}
      onClick={() => i18n.changeLanguage(language)}
    >
      <T k={labelKey} />
    </button>
  )
}

function LoginCard() {
  const { t } = useTranslation()

  return (
    <section className="login-card">
      <T as="h2" k="auth.login.title" />
      <p className="muted"><T k="auth.login.subtitle" /></p>

      <label className="field">
        <span><T k="auth.login.emailLabel" /></span>
        <input placeholder={t('auth.login.emailPlaceholder')} />
      </label>

      <label className="field">
        <span><T k="auth.login.passwordLabel" /></span>
        <input type="password" placeholder={t('auth.login.passwordPlaceholder')} />
      </label>

      <p className="welcome">
        <T k="auth.login.welcome" values={{ name: 'Amir' }} />
      </p>

      <button type="button" className="primary-button">
        <T k="auth.login.submit" />
      </button>

      <p className="tiny-note">
        Placeholder text still uses <code>t(...)</code> because native placeholders need strings, not React nodes.
      </p>
    </section>
  )
}

function InfoCards() {
  return (
    <div className="info-grid">
      <article className="info-card">
        <T as="h3" k="cards.whatItDoesTitle" />
        <p><T k="cards.whatItDoesBody" /></p>
      </article>

      <article className="info-card">
        <T as="h3" k="cards.safeTitle" />
        <p><T k="cards.safeBody" /></p>
      </article>
    </div>
  )
}

export function App() {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language || 'en')
  const direction = getDirection(language)

  return (
    <main className="app-shell" dir={direction}>
      <section className="hero">
        <div>
          <T as="h1" k="app.title" />
          <p className="hero-subtitle"><T k="app.subtitle" /></p>
        </div>

        <div className="language-switcher" dir="ltr">
          <LanguageButton language="en" labelKey="language.english" />
          <LanguageButton language="he" labelKey="language.hebrew" />
          <LanguageButton language="ar" labelKey="language.arabic" />
        </div>
      </section>

      <section className="instructions">
        <T as="h2" k="app.instructionsTitle" />
        <p><T k="app.instructionsBody" /></p>
        <p className="current-language">
          <T k="app.currentLanguage" values={{ language }} />
        </p>
      </section>

      <div className="content-grid">
        <LoginCard />
        <InfoCards />
      </div>

      {import.meta.env.DEV && <I18nDevOverlay />}
    </main>
  )
}
