import { Config, Request, Response, NextFunction } from './types'
import {
  getConfigOptions,
  getSecFetchHeaders,
  matchAllowedURL,
} from './helpers'

export function fetchMetadata(config: Partial<Config> = {}) {
  const options = getConfigOptions(config)

  return function middleware(req: Request, res: Response, next: NextFunction) {
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
