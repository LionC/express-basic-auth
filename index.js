const auth = require('basic-auth')
const assert = require('assert')

function ensureFunction(option, defaultValue) {
    if(option == undefined)
        return function() { return defaultValue }

    if(typeof option != 'function')
        return function() { return option }

    return option
}

function buildMiddleware(options) {
    var challenge = options.challenge != undefined ? !!options.challenge : false
    var users = options.users || {}
    var authorizer = options.authorizer || staticUsersAuthorizer
    var isAsync = options.authorizeAsync != undefined ? !!options.authorizeAsync : false
    var getResponseBody = ensureFunction(options.unauthorizedResponse, '')
    var realm = ensureFunction(options.realm)

    assert(typeof users == 'object', 'Expected an object for the basic auth users, found ' + typeof users + ' instead')
    assert(typeof authorizer == 'function', 'Expected a function for the basic auth authorizer, found ' + typeof authorizer + ' instead')

    function staticUsersAuthorizer(username, password) {
        for(var i in users)
            if(username == i && password == users[i])
                return true

        return false
    }

    return function authMiddleware(req, res, next) {
        var authentication = auth(req)

        if(!authentication)
            return unauthorized()

        req.auth = {
            user: authentication.name,
            password: authentication.pass
        }

        if(isAsync)
            return authorizer(authentication.name, authentication.pass, authorizerCallback)
        else {
            var result = authorizer(authentication.name, authentication.pass)
            if (result && typeof result.then === 'function') {
                return result.then(function (isAuthorized) {
                    authorizerCallback(undefined, isAuthorized)
                }, function (error) {
                    authorizerCallback(error)
                }).catch(function (e) {
                    console.log('e', e)
                })
            } else if (!result) {
                return unauthorized()
            }
        }

        return next()

        function unauthorized() {
            if(challenge) {
                var challengeString = 'Basic'
                var realmName = realm(req)

                if(realmName)
                    challengeString += ' realm="' + realmName + '"'

                res.set('WWW-Authenticate', challengeString)
            }

            //TODO: Allow response body to be JSON (maybe autodetect?)
            const response = getResponseBody(req)

            if(typeof response == 'string')
                return res.status(401).send(response)

            return res.status(401).json(response)
        }

        function authorizerCallback(err, approved) {
            if (err) {
                return next(err)
            }

            if(approved)
                return next()

            return unauthorized()
        }
    }
}

module.exports = buildMiddleware
