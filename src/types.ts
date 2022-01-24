import { IncomingMessage, ServerResponse } from 'http'

export type AllowedPath = {
  path: string
  method?: string
}

export type Request = IncomingMessage
export type Response = ServerResponse
export type NextFunction = (error?: Error) => void

export type Config = {
  allowedFetchSites: string[]
  disallowedNavigationRequests: string[]
  allowedPaths: (string | AllowedPath)[]
  errorStatusCode: number
  onError: (
    request: Request,
    response: Response,
    next: NextFunction,
    options: Config
  ) => void
}
