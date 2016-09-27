var auth = require('basic-auth');
var assert = require('assert');

function buildMiddleware(options) {
    var challenge = options.challenge != undefined ? !!options.challenge : true;
    var users = options.users || {};
    var authorizer = options.authorizer || staticUsersAuthorizer;

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

        if(!authentication || !authorizer(authentication.name, authentication.pass)) {
            res.status(401);

            if(challenge)
                res.set('WWW-Authenticate', 'Basic');

            return res.send('');
        }

        req.auth = {
            user: authentication.name,
            password: authentication.pass
        };

        next();
    };
}

module.exports = buildMiddleware;
