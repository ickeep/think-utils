import { Application, Controller, Logic, think } from 'thinkjs'
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
      ajaxResult.msg = typeof ajaxResult.msg === 'undefined' ? '' : ajaxResult.msg
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
  const template = function(text: string, params: { [key: string]: string | number }) {
    return text.replace(/<%([\w_-])+%>/g, function(match) {
      const matchKey = ((match.slice && match.slice(2, -2)) || '').trim()
      return (
        (matchKey ? (typeof params[matchKey] === 'undefined' ? matchKey : params[matchKey]) : '') +
        ''
      )
    })
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
    httpOptions,
    template
  }

  const controller: any = {
    ...fn,
    getMsgLang(
      msg: number | string | { [key: string]: any },
      params?: { [key: string]: string | number }
    ) {
      const msgLangConf = think.config('msgLang')
      if (!msgLangConf) {
        if (params) {
          if (typeof msg === 'string') {
            return this.template(msg, params)
          }
          if (typeof msg === 'object') {
            const tmpObj: { [key: string]: any } = {}
            Object.keys(msg).forEach((key: string) => {
              tmpObj[key] =
                typeof msg[key] === 'string' ? this.template(msg[key], params) : msg[key]
            })
            return tmpObj
          }
        }
        return typeof msg === 'number' ? '' : msg
      }
      const { dfLang = 'zh_CN', mapKey = 'msgLangMap', headerKey = 'accept-language' } = msgLangConf
      const lang = this.header(headerKey) || dfLang
      const msgLangMap = think.config(mapKey)
      if (typeof msg === 'object') {
        const tmpMsgObj: { [key: string]: any } = {}
        Object.keys(msg).forEach((key: string) => {
          // @ts-ignore
          const tmpMsgMap = msgLangMap[msg[key]] || {}
          // @ts-ignore
          tmpMsgObj[key] = tmpMsgMap[lang] || tmpMsgMap[dfLang] || msg[key]
          if (typeof tmpMsgObj[key] === 'string' && params) {
            tmpMsgObj[key] = this.template(tmpMsgObj[key], params)
          }
        })
        return tmpMsgObj
      }
      const msgMap = (msg && msgLangMap[msg]) || {}
      let tmpMsg = msgMap[lang] || msgMap[dfLang] || msg || ''
      if (typeof tmpMsg === 'string' && params) {
        tmpMsg = this.template(tmpMsg, params)
      }
      return tmpMsg
    },
    fail(
      code: number,
      msg: string | object = '',
      data: any = '',
      params?: { [key: string]: string | number }
    ) {
      const codeKey = think.config('errnoField')
      const msgKey = think.config('errmsgField')
      const tmpObj: any = {}
      tmpObj[codeKey] = code

      tmpObj[msgKey] = this.getMsgLang(msg || code, params)

      tmpObj.data = data
      return this.json(tmpObj)
    },
    success(data: any, msg?: string | object, params?: { [key: string]: string | number }) {
      return this.fail(0, msg, data, params)
    },
    validateFail(msg?: any, data?: any, params?: { [key: string]: string | number }) {
      const validateCode = think.config('validateDefaultErrno')
      return this.fail(validateCode, msg, data, params)
    },
    handleResult(opt: IResult, params?: { [key: string]: string | number }) {
      const { code, msg = '', data = '' } = opt
      if (code !== 0) {
        return this.fail(code, msg, data, params)
      } else {
        return this.success(data, msg, params)
      }
    }
  }
  return {
    think: fn,
    context: fn,
    controller,
    logic: controller,
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
    fail(
      code: number,
      msg: string | number | object,
      params?: { [key: string]: string | number }
    ): void

    success(data: any, msg?: string | object, params?: { [key: string]: string | number }): void

    validateFail(
      msg?: string | { [key: string]: any },
      data?: any,
      params?: { [key: string]: string | number }
    ): any

    handleResult(opt: IResult, params?: { [key: string]: string | number }): any
  }

  interface Logic extends Controller {}
}

export async function loadMsgLang() {
  const serviceName = think.config('serviceName')
  const msgLangConf = think.config('msgLang')
  if (msgLangConf) {
    const { db = 'base', table = 'msg_lang', mapKey = 'msgLangMap' } = msgLangConf
    // @ts-ignore
    const msgLangRows = await think
      .model(table, db)
      .where({ service: ['in', `${serviceName},common`] })
      .select()
    const msgLangMap: { [key: string]: any } = {}
    msgLangRows.forEach((item: any) => {
      const { key, server, ...args } = item
      msgLangMap[key] = args
    })
    // @ts-ignore
    think.config(mapKey, msgLangMap)
  }
}
