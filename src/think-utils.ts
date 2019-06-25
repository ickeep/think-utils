import { Application } from 'thinkjs'

export default (app: Application) => {
  function objToStr(obj: { [key: string]: any }): string {
    try {
      return JSON.stringify(obj)
    } catch (e) {
      app.think.logger.error(e)
      return ''
    }
  }

  function strToObj(str: string, dfVal: any = {}): object {
    try {
      return JSON.parse(str)
    } catch (e) {
      app.think.logger.error(str)
      app.think.logger.error(e)
      return dfVal
    }
  }

  return {
    think: {
      objToStr,
      strToObj
    },
    context: {
      objToStr,
      strToObj
    },
    controller: {
      objToStr,
      strToObj
    },
    service: {
      objToStr,
      strToObj
    }
  }
}

declare module 'thinkjs' {
  interface Think extends IUtils {}

  interface Context extends IUtils {}

  interface Service extends IUtils {}

  interface Controller extends IUtils {
    fail(code: number, msg: string | number | object): void
  }
}

export interface IUtils {
  objToStr(obj: object): string

  strToObj(str: string, dfVal?: any): object
}
