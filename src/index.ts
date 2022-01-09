import { IncomingMessage, ServerResponse } from 'http'
import UrlPattern from 'url-pattern'

type AllowedPath = {
  path: string
  method?: string
}

type NextFn = (error?: Error) => void

type Config = {
  allowedFetchSites: string[]
  disallowedNavigationRequests: string[]
  allowedPaths: (string | AllowedPath)[]
  errorStatusCode: number
  onError: (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFn,
    options: Config
  ) => void
}

const CONFIG_DEFAULTS: Config = {
  allowedFetchSites: ['same-origin', 'same-site', 'none'],
  disallowedNavigationRequests: ['object', 'embed'],
  allowedPaths: [],
  errorStatusCode: 403,
  // @ts-expect-error
  onError: (req, res, next, options) => {
    res.statusCode = options.errorStatusCode
    res.end()
  },
}

const extractHeader = (req: IncomingMessage, header: string): string => {
  const reqHeader = req.headers[header]
  return Array.isArray(reqHeader) ? reqHeader.join(',') : reqHeader || ''
}

const getSecFetchHeaders = (req: IncomingMessage) => {
  return {
    secFetchSite: extractHeader(req, 'sec-fetch-site').toLowerCase(),
    secFetchMode: extractHeader(req, 'sec-fetch-mode').toLowerCase(),
    secFetchDest: extractHeader(req, 'sec-fetch-dest').toLowerCase(),
  }
}

const isString = (str: any): str is string => {
  return typeof str === 'string'
}

const matchAllowedURL = (
  list: (string | AllowedPath)[],
  req: IncomingMessage
): boolean => {
  if (!Array.isArray(list)) return false

  let { url = '', method = '' } = req

  method = method.toUpperCase()

  const match = list.find(item => {
    const allowedPath: AllowedPath = isString(item) ? { path: item } : item

    if (isString(allowedPath.method)) {
      if (allowedPath.method.toUpperCase() !== method) {
        return false
      }
    }

    const pattern = new UrlPattern(allowedPath.path)
    return !!pattern.match(url)
  })

  return !!match
}

function middlewareWrapper(config: Partial<Config> = {}) {
  const options = Object.assign(CONFIG_DEFAULTS, config)

  return function middleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFn
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
    if (matchAllowedURL(options.allowedPaths, req)) {
      return next()
    }

    options.onError(req, res, next, options)
  }
}

module.exports = middlewareWrapper
export default middlewareWrapper
