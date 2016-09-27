var auth = require('basic-auth');
var assert = require('assert');

function buildMiddleware(options) {
    var challenge = options.challenge != undefined ? !!options.challenge : true;
    var users = options.users || {};
    var authorizer = options.authorizer || staticUsersAuthorizer;
    var isAsync = options.authorizeAsync != undefined ? !!options.authorizeAsync : false;

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

        if(isAsync)
            return authorizer(authentication.name, authentication.pass, authorizerCallback);
        else if(!authorizer(authentication.name, authentication.pass))
            return unauthorized();

        req.auth = {
            user: authentication.name,
            password: authentication.pass
        };

        next();

        function unauthorized() {
            res.status(401);

            if(challenge)
                res.set('WWW-Authenticate', 'Basic');

            return res.send('');
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
