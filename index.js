"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const basic_auth_1 = __importDefault(require("basic-auth"));
const crypto_1 = require("crypto");
buildMiddleware.safeCompare = safeCompare;
module.exports = buildMiddleware;
function buildMiddleware(options) {
    const { challenge, authorizer, isAsync, getResponseBody, realm } = setupOptions(options);
    return function authMiddleware(req, res, next) {
        const unauthOpts = {
            challenge,
            getResponseBody,
            req,
            realm,
            res,
        };
        const authentication = basic_auth_1.default(req);
        if (!authentication) {
            return unauthorized(unauthOpts);
        }
        req.auth = {
            user: authentication.name,
            password: authentication.pass
        };
        if (isAsync) {
            return authorizer(authentication.name, authentication.pass, (err, approved) => {
                return authorizerCallback(err, approved, next, unauthOpts);
            });
        }
        else if (!authorizer(authentication.name, authentication.pass)) {
            return unauthorized(unauthOpts);
        }
        return next();
    };
}
function setupOptions(options) {
    const challenge = options.challenge === true;
    const users = options['users'] || {};
    const authorizer = options['authorizer'] || ((user, pass) => { return staticUsersAuthorizer(user, pass, users); });
    const isAsync = options['authorizeAsync'] === true;
    const getResponseBody = ensureFunction(options.unauthorizedResponse, '');
    const realm = ensureFunction(options['realm']);
    assert_1.default(typeof users === 'object', `Expected an object for the basic auth users, found ${typeof users} instead`);
    assert_1.default(typeof authorizer === 'function', `Expected a function for the basic auth authorizer, found ${typeof authorizer} instead`);
    return {
        challenge,
        users,
        authorizer,
        isAsync,
        getResponseBody,
        realm,
    };
}
function authorizerCallback(err, approved, next, options) {
    assert_1.default.ifError(err);
    if (approved) {
        return next();
    }
    return unauthorized(options);
}
function unauthorized({ challenge, getResponseBody, req, realm, res }) {
    if (challenge) {
        let challengeString = 'Basic';
        const realmName = realm(req);
        if (realmName) {
            challengeString = `${challengeString} realm="${realmName}"`;
        }
        res.set('WWW-Authenticate', challengeString);
    }
    const response = getResponseBody(req);
    if (typeof response == 'string') {
        return res.status(401).send(response);
    }
    return res.status(401).json(response);
}
function ensureFunction(option, defaultValue = null) {
    if (option == undefined) {
        return () => { return defaultValue; };
    }
    if (typeof option !== 'function') {
        return () => { return option; };
    }
    return option;
}
function staticUsersAuthorizer(username, password, users) {
    for (var currentUser in users) {
        const checkUser = safeCompare(username, currentUser);
        const checkPassword = safeCompare(password, users[currentUser]);
        if (checkUser && checkPassword) {
            return true;
        }
    }
    return false;
}
function safeCompare(userInput, secret) {
    const userInputLength = Buffer.byteLength(userInput);
    const secretLength = Buffer.byteLength(secret);
    const userInputBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
    userInputBuffer.write(userInput);
    const secretBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
    secretBuffer.write(secret);
    return !!(crypto_1.timingSafeEqual(userInputBuffer, secretBuffer) && (userInputLength === secretLength));
}
//# sourceMappingURL=index.js.map