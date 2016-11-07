var auth = require('basic-auth');
var assert = require('assert');

function buildMiddleware(options) {
    var challenge = options.challenge != undefined ? !!options.challenge : false;
    var users = options.users || {};
    var authorizer = options.authorizer || staticUsersAuthorizer;
    var isAsync = options.authorizeAsync != undefined ? !!options.authorizeAsync : false;
    var getResponseBody = options.unauthorizedResponse;

    if(!getResponseBody)
        getResponseBody = function() { return ''; };
    else if(typeof getResponseBody == 'string')
        getResponseBody = function() { return options.unauthorizedResponse };

    assert(typeof getResponseBody == 'function', 'Expected a string or function for the unauthorizedResponse option');
    assert(typeof users == 'object', 'Expected an object for the basic auth users, found ' + typeof users + ' instead');
    assert(typeof authorizer == 'function', 'Expected a function for the basic auth authorizer, found ' + typeof authorizer + ' instead');

    function staticUsersAuthorizer(username, password) {
        for(var i in users)
            if(username == i && password == users[i])
                return true;

        return false;
    }

    return function authMiddleware(req, res, next) {
        var authentication = auth(req);

        if(!authentication)
            return unauthorized();

        req.auth = {
            user: authentication.name,
            password: authentication.pass
        };

        if(isAsync)
            return authorizer(authentication.name, authentication.pass, authorizerCallback);
        else if(!authorizer(authentication.name, authentication.pass))
            return unauthorized();

        return next();

        function unauthorized() {
            //TODO: Allow to set realm for the challenge
            if(challenge)
                res.set('WWW-Authenticate', 'Basic');

            //TODO: Allow response body to be JSON (maybe autodetect?)
            return res.status(401).send(getResponseBody(req));
        }

        function authorizerCallback(err, approved) {
            assert.ifError(err);

            if(approved)
                return next();

            return unauthorized();
        }
    };
}

module.exports = buildMiddleware;
