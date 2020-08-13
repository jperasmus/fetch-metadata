import { IncomingMessage, ServerResponse } from 'http'

const extractHeader = (req: IncomingMessage, header: string): string => {
  const reqHeader = req.headers[header]
  return Array.isArray(reqHeader) ? reqHeader.join(',') : reqHeader || ''
}

const getSecFetchHeaders = (req: IncomingMessage) => {
  return {
    secFetchSite: extractHeader(req, 'sec-fetch-site'),
    secFetchMode: extractHeader(req, 'sec-fetch-mode'),
    secFetchDest: extractHeader(req, 'sec-fetch-dest'),
  }
}

type Config = {
  allowedFetchSites: string[]
  disallowedNavigationRequests: string[]
  allowedPaths: string[]
  errorStatusCode: number
}

const CONFIG_DEFAULTS: Config = {
  allowedFetchSites: ['same-origin', 'same-site', 'none'],
  disallowedNavigationRequests: ['object', 'embed'],
  allowedPaths: [],
  errorStatusCode: 403,
}

function middlewareWrapper(config: Partial<Config> = {}) {
  const options = Object.assign(CONFIG_DEFAULTS, config)

  return function middleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const { secFetchSite, secFetchMode, secFetchDest } = getSecFetchHeaders(req)

    // Backwards compatibility for older browsers not supporting fetch metadata headers
    if (!secFetchSite) {
      return next()
    }

    // Allow requests from same full- or sub-domain as well as direct navigation
    if (
      Array.isArray(options.allowedFetchSites) &&
      options.allowedFetchSites.includes(secFetchSite)
    ) {
      return next()
    }

    // Allow simple top-level navigation and iframing (except for <object> and <embed> nav requests by default)
    if (
      secFetchMode === 'navigate' &&
      req.method?.toUpperCase() === 'GET' &&
      Array.isArray(options.disallowedNavigationRequests) &&
      !options.disallowedNavigationRequests.includes(secFetchDest)
    ) {
      return next()
    }

    // Explicitly allowed paths
    // TODO: Improve this to match dynamic paths with optional patterns
    if (
      Array.isArray(options.allowedPaths) &&
      options.allowedPaths.includes(req.url || '')
    ) {
      return next()
    }

    res.statusCode = options.errorStatusCode
    res.end()
  }
}

module.exports = middlewareWrapper
export default middlewareWrapper
