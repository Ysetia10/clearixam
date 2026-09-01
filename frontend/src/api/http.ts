import { API_CONFIG } from '../config/apiConfig'
import { setApiWaking } from './apiWake'

const WAKE_BANNER_AFTER_MS = 2_500

export class ApiRequestError extends Error {
  status: number
  timedOut: boolean
  network: boolean

  constructor(message: string, options?: { status?: number; timedOut?: boolean; network?: boolean }) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = options?.status ?? 0
    this.timedOut = options?.timedOut ?? false
    this.network = options?.network ?? false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) {
    return false
  }
  if (error.status === 429) {
    return false
  }
  return error.timedOut || error.network
}

function toRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiRequestError('This is taking longer than usual. Try again in a moment.', {
      timedOut: true,
    })
  }

  if (error instanceof TypeError) {
    return new ApiRequestError(
      "We couldn't connect right now. The API may be starting up — try again in a moment.",
      { network: true },
    )
  }

  return new ApiRequestError(error instanceof Error ? error.message : 'Request failed')
}

export async function apiFetch(url: string, options?: RequestInit, retryCount = 0): Promise<Response> {
  const wakeTimer = window.setTimeout(() => setApiWaking(true), WAKE_BANNER_AFTER_MS)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_CONFIG.timeout)

  const onAbort = () => controller.abort()
  options?.signal?.addEventListener('abort', onAbort)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    window.clearTimeout(wakeTimer)
    setApiWaking(false)
    return response
  } catch (error) {
    window.clearTimeout(wakeTimer)
    const mapped = toRequestError(error)

    if (isRetryable(mapped) && retryCount < API_CONFIG.maxNetworkRetries) {
      setApiWaking(true)
      await sleep(1_000 * 2 ** retryCount)
      return apiFetch(url, options, retryCount + 1)
    }

    setApiWaking(false)
    throw mapped
  } finally {
    window.clearTimeout(timeout)
    options?.signal?.removeEventListener('abort', onAbort)
  }
}

export async function prefetchApiHealth(): Promise<void> {
  if (!import.meta.env.PROD) {
    return
  }

  try {
    await apiFetch(API_CONFIG.healthURL, { method: 'GET' })
  } catch {
    // Query retries and the wake banner handle a sleeping API.
  }
}
