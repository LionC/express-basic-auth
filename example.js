var express = require('express');

var app = express();

var basicAuth = require('./index.js');

/**
* express-basic-auth
*
* Example server. Just run in the same folder:
*
* npm install express express-basic-auth
*
* and then run this file with node ('node example.js')
*
* You can send GET requests to localhost:8080/async , /custom, /challenge or /static
* and see how it refuses or accepts your request matching the basic auth settings.
*/

//Requires basic auth with username 'Admin' and password 'secret1234'
var staticUserAuth = basicAuth({
    users: {
        'Admin': 'secret1234'
    },
    challenge: false
});

//Uses a custom (synchronous) authorizer function
var customAuthorizerAuth = basicAuth({
    authorizer: myAuthorizer
});

//Same, but sends a basic auth challenge header when authorization fails
var challengeAuth = basicAuth({
    authorizer: myAuthorizer,
    challenge: true
});

//Uses a custom asynchronous authorizer function
var asyncAuth = basicAuth({
    authorizer: myAsyncAuthorizer,
    authorizeAsync: true
});


app.get('/static', staticUserAuth, function(req, res) {
    res.status(200).send('You passed');
});

app.get('/custom', customAuthorizerAuth, function(req, res) {
    res.status(200).send('You passed');
});

app.get('/challenge', challengeAuth, function(req, res) {
    res.status(200).send('You passed');
});

app.get('/async', asyncAuth, function(req, res) {
    res.status(200).send('You passed');
});

app.listen(8080, function() {
    console.log("Listening!");
});

//Custom authorizer checking if the username starts with 'A' and the password with 'secret'
function myAuthorizer(username, password) {
    return username.startsWith('A') && password.startsWith('secret');
}

//Same but asynchronous
function myAsyncAuthorizer(username, password, cb) {
    if(username.startsWith('A') && password.startsWith('secret'))
        return cb(null, true);
    else
        return cb(null, false)
}
