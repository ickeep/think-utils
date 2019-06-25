import { Application } from 'thinkjs'

export default (app: Application) => {
  function objToStr(obj: { [key: string]: any }, dfVal: string = ''): string {
    try {
      return JSON.stringify(obj)
    } catch (e) {
      app.think.logger.error(`obj =====> ${obj}`)
      app.think.logger.error(e)
      return dfVal
    }
  }

  function strToObj(str: string, dfVal: any = {}): object {
    try {
      return JSON.parse(str)
    } catch (e) {
      app.think.logger.error(`str =====> ${str}`)
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

export interface IUtils {
  objToStr(obj: object, dfVal?: string): string

  strToObj(str: string, dfVal?: any): object
}

declare module 'thinkjs' {
  interface Think extends IUtils {}

  interface Context extends IUtils {}

  interface Service extends IUtils {}

  interface Controller extends IUtils {
    fail(code: number, msg: string | number | object): void
  }
}
