import assert from 'assert';
import auth from 'basic-auth';
import { timingSafeEqual } from 'crypto';
import { NextFunction, RequestHandler, Response } from 'express';
import { BasicAuthMiddlewareOptions, IBasicAuthedRequest, IUnauthorizeOptions } from './express-basic-auth';


buildMiddleware.safeCompare = safeCompare;
module.exports = buildMiddleware;

function buildMiddleware(options: BasicAuthMiddlewareOptions): RequestHandler {
    const { challenge,
        authorizer,
        isAsync,
        getResponseBody,
        realm
    } = setupOptions(options);
    return function authMiddleware(req: IBasicAuthedRequest, res: Response, next: NextFunction): any {
        const unauthOpts: IUnauthorizeOptions = {
            challenge,
            getResponseBody,
            req,
            realm,
            res,
        };

        const authentication = auth(req);
        if (!authentication) {
            return unauthorized(unauthOpts);
        }

        req.auth = {
            user: authentication.name,
            password: authentication.pass
        }

        if (isAsync) {
            return authorizer(authentication.name, authentication.pass, (err: Error, approved: boolean) => {
                return authorizerCallback(err, approved, next, unauthOpts);
            });
        } else if (!authorizer(authentication.name, authentication.pass)) {
            return unauthorized(unauthOpts);
        }
        return next();
    }
}

function setupOptions(options: any) {
    const challenge = options.challenge === true;
    const users = options['users'] || {}; // tslint:disable-line
    const authorizer = options['authorizer'] || ((user: string, pass: string) => { return staticUsersAuthorizer(user, pass, users); });
    const isAsync = options['authorizeAsync'] === true;
    const getResponseBody = ensureFunction(options.unauthorizedResponse, '');
    const realm = ensureFunction(options['realm']);

    assert(typeof users === 'object', `Expected an object for the basic auth users, found ${typeof users} instead`);
    assert(typeof authorizer === 'function', `Expected a function for the basic auth authorizer, found ${typeof authorizer} instead`);

    return {
        challenge,
        users,
        authorizer,
        isAsync,
        getResponseBody,
        realm,
    };
}

function authorizerCallback(err: any, approved: boolean, next: NextFunction, options: IUnauthorizeOptions) {
    assert.ifError(err);
    if (approved) {
        return next();
    }
    return unauthorized(options);
}

function unauthorized({
    challenge,
    getResponseBody,
    req,
    realm,
    res
}: IUnauthorizeOptions) {
    if (challenge) {
        let challengeString = 'Basic'
        const realmName = realm(req);
        if (realmName) {
            challengeString = `${challengeString} realm="${realmName}"`;
        }
        res.set('WWW-Authenticate', challengeString);
    }

    //TODO: Allow response body to be JSON (maybe autodetect?)
    const response = getResponseBody(req);

    if (typeof response == 'string') {
        return res.status(401).send(response);
    }
    return res.status(401).json(response);
}

function ensureFunction(option: BasicAuthMiddlewareOptions, defaultValue: any = null) {
    if (option == undefined) {
        return () => { return defaultValue };
    }
    if (typeof option !== 'function') {
        return () => { return option };
    }
    return option;
}

function staticUsersAuthorizer(username: string, password: string, users: []): boolean {
    for (var currentUser in users) {
        const checkUser = safeCompare(username, currentUser);
        const checkPassword = safeCompare(password, users[currentUser]);
        if (checkUser && checkPassword) {
            return true
        }
    }
    return false
}

// Credits for the actual algorithm go to github/@Bruce17
// Thanks to github/@hraban for making me implement this
function safeCompare(userInput:string , secret: string) {
    const userInputLength = Buffer.byteLength(userInput)
    const secretLength = Buffer.byteLength(secret)

    const userInputBuffer = Buffer.alloc(userInputLength, 0, 'utf8')
    userInputBuffer.write(userInput)
    const secretBuffer = Buffer.alloc(userInputLength, 0, 'utf8')
    secretBuffer.write(secret)

    return !!(timingSafeEqual(userInputBuffer, secretBuffer) && (userInputLength === secretLength)) // tslint:disable-line
}
