import fs from 'node:fs/promises'
import path from 'node:path'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sanitizePathSegment(value, fieldName) {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}`)
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}. Only letters, numbers, underscore and dash are allowed.`)
  }

  return value
}

function getResourceJsonPath(resourcesDir, language, namespace) {
  const safeLanguage = sanitizePathSegment(language, 'language')
  const safeNamespace = sanitizePathSegment(namespace, 'namespace')

  const filePath = path.resolve(resourcesDir, safeLanguage, `${safeNamespace}.json`)
  const resolvedResourcesDir = path.resolve(resourcesDir)

  if (!filePath.startsWith(resolvedResourcesDir + path.sep)) {
    throw new Error('Resolved translation file path is outside resourcesDir.')
  }

  return filePath
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function writeJsonFile(filePath, json) {
  await fs.writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
}

function getValueByKey(obj, key) {
  // Support flat keys first: { "auth.login.submit": "Continue" }
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key]
  }

  // Then support nested keys: { auth: { login: { submit: "Continue" } } }
  const parts = key.split('.')
  let current = obj

  for (const part of parts) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return undefined
    }

    current = current[part]
  }

  return current
}

function setValueByKey(obj, key, value) {
  // Preserve flat-key files if key already exists flat.
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    obj[key] = value
    return
  }

  // Otherwise write nested.
  const parts = key.split('.')
  let current = obj

  for (const part of parts.slice(0, -1)) {
    if (
      current[part] === null ||
      typeof current[part] !== 'object' ||
      Array.isArray(current[part])
    ) {
      current[part] = {}
    }

    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}

function extractInterpolations(value) {
  if (typeof value !== 'string') return []

  const matches = value.matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)
  return Array.from(new Set(Array.from(matches).map((match) => match[1]))).sort()
}

function diffArrays(required, actual) {
  return required.filter((item) => !actual.includes(item))
}

async function handleGetValue(options, req, res) {
  const host = req.headers.host || 'localhost'
  const url = new URL(req.url || '', `http://${host}`)

  const locale = url.searchParams.get('locale') || ''
  const namespace = url.searchParams.get('namespace') || 'common'
  const key = url.searchParams.get('key') || ''

  if (!key) {
    sendJson(res, 400, { ok: false, error: 'Missing key.' })
    return
  }

  try {
    const filePath = getResourceJsonPath(options.resourcesDir, locale, namespace)
    const basePath = getResourceJsonPath(options.resourcesDir, options.baseLanguage, namespace)

    const [json, baseJson] = await Promise.all([
      readJsonFile(filePath),
      readJsonFile(basePath).catch(() => ({})),
    ])

    const value = getValueByKey(json, key)
    const baseValue = getValueByKey(baseJson, key)

    sendJson(res, 200, {
      ok: true,
      value: typeof value === 'string' ? value : '',
      baseValue: typeof baseValue === 'string' ? baseValue : '',
    })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error.',
    })
  }
}

async function handleUpdate(server, options, req, res) {
  try {
    const body = await readRequestBody(req)
    const payload = JSON.parse(body)

    if (!payload.key || typeof payload.key !== 'string') {
      sendJson(res, 400, { ok: false, error: 'Invalid key.' })
      return
    }

    if (typeof payload.value !== 'string') {
      sendJson(res, 400, { ok: false, error: 'Invalid value.' })
      return
    }

    const namespace = payload.namespace || 'common'
    const filePath = getResourceJsonPath(options.resourcesDir, payload.locale, namespace)
    const basePath = getResourceJsonPath(options.resourcesDir, options.baseLanguage, namespace)

    const json = await readJsonFile(filePath)
    const baseJson = await readJsonFile(basePath).catch(() => ({}))

    const oldValueRaw = getValueByKey(json, payload.key)
    const baseValueRaw = getValueByKey(baseJson, payload.key)

    const oldValue = typeof oldValueRaw === 'string' ? oldValueRaw : ''
    const baseValue = typeof baseValueRaw === 'string' ? baseValueRaw : ''

    // Prefer the base language as the source of required variables. If unavailable,
    // fall back to the old translated string.
    const sourceForVariables = baseValue || oldValue
    const requiredInterpolations = extractInterpolations(sourceForVariables)
    const actualInterpolations = extractInterpolations(payload.value)

    const missingInterpolations = diffArrays(requiredInterpolations, actualInterpolations)
    const extraInterpolations = diffArrays(actualInterpolations, requiredInterpolations)

    if (missingInterpolations.length > 0 || extraInterpolations.length > 0) {
      sendJson(res, 400, {
        ok: false,
        error: 'Interpolation variables changed. Keep the same {{variables}} in the translation.',
        missingInterpolations,
        extraInterpolations,
      })
      return
    }

    setValueByKey(json, payload.key, payload.value)
    await writeJsonFile(filePath, json)

    server.watcher.emit('change', filePath)

    sendJson(res, 200, { ok: true, value: payload.value })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error.',
    })
  }
}

export function i18nEditorPlugin(rawOptions) {
  const options = {
    baseLanguage: rawOptions.baseLanguage || 'en',
    resourcesDir: rawOptions.resourcesDir,
  }

  return {
    name: 'vite-plugin-i18n-editor',
    apply: 'serve',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next()
          return
        }

        if (req.url.startsWith('/__i18n/value')) {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'Method not allowed.' })
            return
          }

          await handleGetValue(options, req, res)
          return
        }

        if (req.url.startsWith('/__i18n/update')) {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'Method not allowed.' })
            return
          }

          await handleUpdate(server, options, req, res)
          return
        }

        next()
      })
    },
  }
}
