# Vite Inline i18n Editor Demo

React + Vite + i18next project that supports **inline translation editing on localhost**.

You can:

1. Run the app locally.
2. Switch language to Hebrew or Arabic.
3. Alt/Option-click translated text.
4. Edit the value in the popup.
5. Save directly into the local JSON file under `src/i18n/resources/<language>/<namespace>.json`.

No Chrome extension. No hosted translation service. 
No localization SaaS.

## Run

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal, usually:

```txt
http://localhost:5173
```

## Try the editor

1. Switch to Hebrew or Arabic using the language buttons.
2. Hold `Alt` / `Option` and click the large title, login button, or any highlighted translated text.
3. Edit the text.
4. Click **Save**, or press `Cmd/Ctrl + Enter`.
5. The matching JSON file updates, and the page reloads.

For example, editing the Hebrew login button updates:

```txt
src/i18n/resources/he/common.json
```

## File structure

```txt
src/
  App.jsx
  main.jsx
  styles.css
  i18n/
    i18n.js
    T.jsx
    resources/
      en/common.json
      he/common.json
      ar/common.json
    dev/
      I18nDevOverlay.jsx
      i18n-dev.css

scripts/
  vite-plugin-i18n-editor.js

vite.config.js
```

## The important pieces

### `src/i18n/T.jsx`

Use this instead of direct `{t('key')}` for visible text you want editable:

```jsx
<T k="auth.login.submit" />
<T k="auth.login.welcome" values={{ name: 'Amir' }} />
<T as="h1" k="app.title" />
```

In development, it renders data attributes like:

```html
<span
  data-i18n-editable="true"
  data-i18n-key="auth.login.submit"
  data-i18n-ns="common"
  data-i18n-locale="he"
>
  המשך
</span>
```

In production, it renders only the translated text.

### `src/i18n/dev/I18nDevOverlay.jsx`

Listens for `Alt/Option + click`, opens an editor popup, and calls the dev API.

### `scripts/vite-plugin-i18n-editor.js`

Adds Vite dev-server endpoints:

```txt
GET  /__i18n/value
POST /__i18n/update
```

These endpoints are dev-only because the plugin uses:

```js
apply: 'serve'
```

## Adapting to your app

Your existing setup uses:

```txt
src/i18n/resources/<language>/<namespace>.json
```

This demo already uses that structure.

In your app, copy these files:

```txt
src/i18n/T.jsx
src/i18n/dev/I18nDevOverlay.jsx
src/i18n/dev/i18n-dev.css
scripts/vite-plugin-i18n-editor.js
```

Then add the plugin to `vite.config.js`:

```js
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { i18nEditorPlugin } from './scripts/vite-plugin-i18n-editor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    i18nEditorPlugin({
      resourcesDir: path.resolve(__dirname, 'src/i18n/resources'),
      baseLanguage: 'en',
    }),
  ],
})
```

Mount the overlay once in `App.jsx`:

```jsx
<AuthProvider>
  <AppWithLocale />
  {import.meta.env.DEV && <I18nDevOverlay />}
</AuthProvider>
```

Convert visible translated text gradually:

```jsx
<Button>{t('auth.login.submit')}</Button>
```

becomes:

```jsx
<Button><T k="auth.login.submit" /></Button>
```

Keep `t(...)` for string-only props such as `placeholder`, `aria-label`, `title`, `alt`, validation messages, and toast strings unless the component explicitly accepts React nodes.

## Notes

- The plugin supports nested JSON keys like `auth.login.submit`.
- It also supports flat JSON keys like `{ "auth.login.submit": "Continue" }`.
- Interpolation variables such as `{{name}}` are protected. If the base string uses `{{name}}`, the edited translation must keep `{{name}}`.
- Rich text translations and plurals are intentionally not handled in v1.
