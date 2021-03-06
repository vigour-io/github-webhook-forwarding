'use strict'

var https = require('https')
var log = require('../../logger')
var _cloneDeep = require('lodash.clonedeep')
var _merge = require('lodash.merge')

var defaultPayload = {
  hostname: 'api.github.com',
  method: 'GET',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'vigour-git-spy'
  }
}

module.exports = exports = function (config, _options, data, expectedStatus, tag) {
  return new Promise(function (resolve, reject) {
    var options = cloneMerge(defaultPayload, _options)
    log.debug({req: options, data: data}, 'githubSendingRequest')
    var req = https.request(options, function (res) {
      var total = ''
      res.on('error', function (e) {
        log.error({err: e, req: options}, 'githubSendRequestError')
        reject(e)
      })
      res.on('data', function (chunk) {
        total += chunk
      })
      res.on('end', function () {
        if (expectedStatus && expectedStatus !== res.statusCode) {
          var defaultErrName = 'Unexpected response'
          var errName
          try {
            var parsed = JSON.parse(total)
            var msg = parsed.message
            errName = msg || defaultErrName
          } catch (e) {
            errName = defaultErrName + ' (not JSON)'
          }
          var error = new Error(errName)
          error.response = {
            statusCode: res.statusCode,
            expectedStatus: expectedStatus,
            headers: res.headers,
            body: total
          }
          log.error({
            req: options,
            err: error
          }, 'githubSendRequestError')
          reject(error)
        } else {
          var summary = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: total
          }
          // if (config.verbose) {
          //   log.info('response', summary)
          // }
          resolve(summary)
        }
      })
    })
    req.on('error', function (e) {
      log.error({err: e, req: options}, 'githubSendRequestError')
      reject(e)
    })
    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

function cloneMerge () {
  var args = [].slice.apply(arguments)
  var src = args.shift()
  var newObj = _cloneDeep(src)
  args.unshift(newObj)
  return _merge.apply(this, args)
}
