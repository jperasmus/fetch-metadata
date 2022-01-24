import UrlPattern from 'url-pattern'
import { AllowedPath, Config, Request } from './types'

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

export const getConfigOptions = (config: Partial<Config>): Config => {
  return Object.assign({}, CONFIG_DEFAULTS, config)
}

const extractHeader = (req: Request, header: string): string => {
  const reqHeader = req.headers[header]
  return Array.isArray(reqHeader) ? reqHeader.join(',') : reqHeader || ''
}

export const getSecFetchHeaders = (req: Request) => {
  return {
    secFetchSite: extractHeader(req, 'sec-fetch-site').toLowerCase(),
    secFetchMode: extractHeader(req, 'sec-fetch-mode').toLowerCase(),
    secFetchDest: extractHeader(req, 'sec-fetch-dest').toLowerCase(),
  }
}

const isString = (str: any): str is string => {
  return typeof str === 'string'
}

export const matchAllowedURL = (
  list: (string | AllowedPath)[],
  req: Request
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
