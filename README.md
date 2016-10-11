# express-basic-auth

Simple plug & play HTTP basic auth middleware for Express.

## How to use

The module will export a function, that you can call with an options object to
get the middleware:

    var app = require('express')();
    var basicAuth = require('express-basic-auth');

    app.use(basicAuth({
        users: { 'admin': 'supersecret' }
    }));

The middleware will now check incoming requests to match the credentials
`admin:supersecret`.

## How it behaves

The middleware will check incoming requests for a basic auth (`Authorization`)
header, parse it and check if the credentials are legit.

**If a request is found to not be authorized**, it will respond with HTTP 401 and an empty body.

**If a request is successfully authorized**, an `auth` property will be added to the request,
containing an object with `user` and `password` properties, filled with the credentials.

If you simply want to check basic auth against one or multiple static credentials,
you can simply pass the credentials as in the example above:

    app.use(basicAuth({
        users: {
            'admin': 'supersecret',
            'adam': 'password1234',
            'eve': 'asdfghjkl'
        }
    }));

The middleware will check incoming requests to have a basic auth header matching
one of the three passed credentials.

Alternatively, you can pass your own `authorizer` function, to check the credentials
however you want. It will be called with a username and password and is expected to
return `true` or `false` to indicate that the credentials were approved or not:

    app.use(basicAuth( { authorizer: myAuthorizer } ));

    function myAuthorizer(username, password) {
        return username.startsWith('A') && password.startsWith('secret');
    }

This will authorize all requests with credentials where the username begins with
`'A'` and the password begins with `'secret'`. In an actual application you would
likely look up some data instead ;-)

Note that the `authorizer` function is expected to be synchronous here. This is
the default behavior, you can pass `authorizeAsync: true` in the options object to indicate
that your authorizer is asynchronous. In this case it will be passed a callback
as the third parameter, which is expected to be called by standard node convention
with an error and a boolean to indicate if the credentials have been approved or not.
Let's look at the same authorizer again, but this time asynchronous:

    app.use(basicAuth({
        authorizer: myAsyncAuthorizer,
        authorizeAsync: true
    }));

    function myAsyncAuthorizer(username, password, cb) {
        if(username.startsWith('A') && password.startsWith('secret'))
            return cb(null, true);
        else
            return cb(null, false)
    }
