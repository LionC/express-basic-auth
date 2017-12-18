const auth = require('basic-auth')
const assert = require('assert')

function ensureFunction(option, defaultValue) {
    if(option === undefined)
        return function() { return defaultValue }

    if(typeof option != 'function')
        return function() { return option }

    return option
}

function buildMiddleware(options) {
    var challenge = options.challenge != undefined ? !!options.challenge : false
    var users = options.users || {}
    var isAsync = options.hasOwnProperty(authorizeAsync) && !!options.authorizeAsync
    var getResponseBody = ensureFunction(options.unauthorizedResponse, '')
    var realm = ensureFunction(options.realm)
    var authorizer

    if(options.hasOwnProperty('users')) {
        assert(typeof users == 'object', 'Expected an object for the basic auth users, found ' + typeof users + ' instead')
        assert(!options.authorizer, 'An users object cannot be combined with a custom authorizer')
        authorizer = function(username, password) {
            return users.indexOf(username) !== -1 && password === users[username]
        }
    } else {
        assert(typeof options.authorizer == 'function', 'Expected a function for the basic auth authorizer, found ' + typeof authorizer + ' instead')
        authorizer = options.authorizer
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
        else if(authorizer(authentication.name, authentication.pass) !== true)
            return unauthorized()

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
            assert.ifError(err)

            if(approved)
                return next()

            return unauthorized()
        }
    }
}

module.exports = buildMiddleware
