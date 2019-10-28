import {
  ApiRequest,
  RequestSendResponse,
  Variable,
  Headers
} from "../model/model";

import http from "http";
import https from "https";

export default async function send(
  request: ApiRequest,
  variables: Variable[]
): Promise<RequestSendResponse> {
  const isHttps = request.url.toLowerCase().startsWith("https");
  return new Promise((resolve, reject) => {
    (isHttps ? https : http)
      .request(
        varReplace(request.url, variables),
        {
          method: varReplace(request.method, variables),
          headers: varHeaderReplace(request.headers, variables)
        },
        resp => {
          let body = "";
          resp
            .on("data", d => {
              body += d;
            })
            .on("end", () => {
              const ret = new RequestSendResponse();
              ret.statusCode = resp.statusCode || 0;
              ret.headers = (resp.headers as any) as {
                [index: string]: string;
              };
              ret.body = body;
              resolve(ret);
            });
        }
      )
      .on("error", e => {
        reject(e);
      })
      .end();
  });
}

function varReplace(str: string, variables: Variable[]): string {
  return replaceStrWithVariables(str, variables);
}

function varHeaderReplace(headers: Headers, variables: Variable[]): Headers {
  const ret: Headers = {};
  for (const key of Object.keys(headers)) {
    ret[key] = replaceStrWithVariables(headers[key], variables);
  }
  return ret;
}

function replaceStrWithVariables(str: string, variables: Variable[]) {
  let newStr = str;
  for (const curr of variables) {
    newStr = replaceStrWithAll(newStr, curr.key, curr.value);
  }
  return newStr;
}

function replaceStrWithAll(str: string, key: string, value: string) {
  const regex = new RegExp("\\${" + key + "}", "g");
  return str.replace(regex, value);
}
