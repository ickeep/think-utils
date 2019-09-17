import { Application, Controller } from 'thinkjs'
import Axios from 'axios'
import Querystring from 'querystring'

export interface IResult {
  code: number | string
  msg?: string
  data?: any
  status?: number
  headers?: { [key: string]: any }
}

type TMethod = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch'

export interface IMethod {
  (url: string, data?: Object | string, conf?: Object): Promise<IResult>
}

export default (app: Application) => {
  const think = app.think
  const objToStr = (obj: { [key: string]: any }, dfVal: string = ''): string => {
    try {
      return JSON.stringify(obj)
    } catch (e) {
      app.think.logger.error(`obj =====> ${obj}`)
      app.think.logger.error(e)
      return dfVal
    }
  }

  const strToObj = (str: string, dfVal: any = {}): object => {
    try {
      return JSON.parse(str)
    } catch (e) {
      app.think.logger.error(`str =====> ${str}`)
      app.think.logger.error(e)
      return dfVal
    }
  }

  const conf = think.config('http') || {}
  const axiox = Axios.create({
    timeout: 30000,
    responseType: 'json',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    ...conf
  })
  const AjaxFn = async function(
    method: TMethod,
    url: string,
    data: object = {},
    conf: { [key: string]: any } = {}
  ): Promise<IResult> {
    // @ts-ignore
    const fn = axiox[method]
    let result: IResult = { code: 1, msg: '', data: '' }
    let ajaxResult
    try {
      if (['get', 'delete', 'head', 'options'].indexOf(method) >= 0) {
        ajaxResult = await fn(url, { ...conf, params: data })
      } else {
        const { headers = {} } = conf
        if (
          headers['Content-Type'] === 'application/x-www-form-urlencoded' ||
          headers['content-type'] === 'application/x-www-form-urlencoded'
        ) {
          ajaxResult = await fn(url, Querystring.stringify(data), conf)
        } else {
          ajaxResult = await fn(url, data, conf)
        }
      }
      if (typeof ajaxResult.code === 'undefined' && ajaxResult.status === 200) {
        ajaxResult.code = 0
      }
    } catch (e) {
      if (!e.response) {
        result.msg = e.message
        result.code = 600 // 网络错误
        result.status = 600 // 网络错误
        return result
      } else {
        const { status, statusText, headers, data = {} } = e.response
        result.code = (data && data.code) || status
        result.msg = (data && data.msg) || statusText
        result.headers = headers
        result.status = status
      }
      return result
    }
    return ajaxResult
  }

  const httpGet: IMethod = async function(url, data: Object = {}, conf: Object = {}) {
    return AjaxFn('get', url, data, conf)
  }
  const httpPost: IMethod = async function(url: string, data: Object = {}, conf: Object = {}) {
    return AjaxFn('post', url, data, conf)
  }
  const httpPatch: IMethod = async function(url: string, data: Object = {}, conf: Object = {}) {
    return AjaxFn('patch', url, data, conf)
  }
  const httpPut: IMethod = async function(url: string, data: Object = {}, conf: Object = {}) {
    return AjaxFn('put', url, data, conf)
  }
  const httpDel: IMethod = async function(url: string, data: Object = {}, conf: Object = {}) {
    return AjaxFn('delete', url, data, conf)
  }
  const httpHead: IMethod = async function(url: string, data: Object = {}, conf: Object = {}) {
    return AjaxFn('head', url, data, conf)
  }
  const httpOptions: IMethod = async function(url: string, data: Object = {}, conf: Object = {}) {
    return AjaxFn('options', url, data, conf)
  }
  const fn = {
    objToStr,
    strToObj,
    httpGet,
    httpPost,
    httpPatch,
    httpPut,
    httpDel,
    httpHead,
    httpOptions
  }
  const errCodeConf = think.config('errCode') || {}
  const validateCode = think.config('validateDefaultErrno')
  const controller: any = {
    ...fn,
    validateFail(msg?: any, data?: any) {
      return this.fail(validateCode, msg, data)
    },
    handleResult(opt: IResult) {
      const { code, msg, data = '' } = opt
      if (code !== 0) {
        return this.fail(code, msg ? msg : errCodeConf[code] || '', data)
      } else {
        return this.success(data)
      }
    }
  }
  return {
    think: fn,
    context: fn,
    controller,
    service: fn
  }
}

export interface IUtils {
  objToStr(obj: object, dfVal?: string): string

  strToObj(str: string, dfVal?: any): object

  httpGet: IMethod
  httpPost: IMethod
  httpPatch: IMethod
  httpPut: IMethod
  httpDel: IMethod
  httpHead: IMethod
  httpOptions: IMethod
}

declare module 'thinkjs' {
  interface Think extends IUtils {}

  interface Context extends IUtils {}

  interface Service extends IUtils {}

  interface Controller extends IUtils {
    fail(code: number, msg: string | number | object): void

    validateFail(msg?: string | { [key: string]: any }, data?: any): any

    handleResult(opt: IResult): any
  }
}
