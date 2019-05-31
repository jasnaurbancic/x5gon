// external modules
const router = require('express').Router();
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const url = require('url');
const cors = require('cors');
const csp = require('helmet-csp');

// internal modules
const KafkaProducer = require('alias:lib/kafka-producer');
const validator = require('alias:lib/schema-validator')({
    userActivitySchema: require('alias:platform_schemas/user-activity-schema')
});

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    // parameters used within the routes
    const x5gonCookieName = 'x5gonTrack';

    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);

    /**
     * @api {GET} /api/v1/snippet/tracker On-premise user cookie generation
     * @apiDescription Sets the user cookie if repository uses the on-premise
     * snippet version
     * @apiPrivate The API is meant to be be used in combination with the on-premise snippet version.
     * @apiName GetSnippetTracker
     * @apiGroup UserActivity
     * @apiVersion 1.0.0
     *
     * @apiParam {String} callbackURL - The URL to which the tracker will redirect once the cookie
     * is set.
     *
     * @apiParamExample {json} User Activity Information:
     *  {
     *      "callbackURL": "https://platform.x5gon.org/redirect",
     *  }
     */
    router.get('/snippet/tracker', (req, res) => {
        // TODO: validate the parameters

        // get query parameters
        let query = req.query;
        // create a handlebars compiler
        let activityTracker = fs.readFileSync(path.join(__dirname, '../../../snippet/templates/tracker.hbs'));
        let hbs = handlebars.compile(activityTracker.toString('utf-8'));

        // send the website with cookie generation
        return res.send(hbs({ callbackURL: query.callbackURL, x5gonCookieName }));
    });

    /**
     * @api {GET} /api/v1/snippet/log User activity acquisition
     * @apiDescription Send user activity snippet information. All parameters should
     * be encoded by the `encodeURIComponent` function
     * @apiName GetSnippetLog
     * @apiGroup UserActivity
     * @apiVersion 1.0.0
     *
     * @apiParam {Boolean} x5gonValidated - Notifies if the user is validated by the X5GON platform.
     * @apiParam {String} dt - The URI date-time.
     * @apiParam {String} rq - The URL from which the request was sent.
     * @apiParam {String} rf - The referrer URL.
     * @apiParam {String} cid - The provider token generated by the X5GON platform.
     * @apiParam {Boolean} [test=false] - Notifies if the request was sent to test the snippet integration.
     *
     * @apiParamExample {json} User Activity Information:
     *  {
     *    "x5gonValidated": true,
     *    "dt": "2018-10-04T10%3A19%3A45Z",
     *    "rq": "https://platform.x5gon.org/example",
     *    "rf": null,
     *    "cid": "x5gonTokenXYZ",
     *    "test": true
     *  }
     *
     * @apiSuccessExample {text} Success-Response:
     *  HTTP/1.1 200 OK Image of a pixel with the following headers:
     *      "x-snippet-status": "success"
     *      "x-snippet-message": null
     *
     * @apiErrorExample {text} Error-Response:
     *  HTTP/1.1 200 OK Image of a pixel with the following headers:
     *      "x-snippet-status": "failure"
     *      "x-snippet-message": "check if all parameters are set and if the date-time is in the correct format"
     */
    router.get('/snippet/log', (req, res) => {
        // check and convert to boolean
        const testing = req.query.test === 'true' || false;
        if (testing) {
            // development environment
            res.redirect(url.format({
                pathname: '/api/v1/snippet/log/development',
                query: req.query
            }));
        } else {
            // production environment
            res.redirect(url.format({
                pathname: '/api/v1/snippet/log/production',
                query: req.query
            }));
        }
    });

    /**
     * @description Validates the user requests and returns the options/headers for the beacon image
     * & the user parameters
     * @param {Object} req - The express request object.
     * @returns {Object} The options and user parameters.
     * @private
     */
    function _evaluateLog(req) {
        // get query parameters
        let userParameters = { };

        userParameters.x5gonValidated = decodeURIComponent(req.query.x5gonValidated);
        userParameters.dt = decodeURIComponent(req.query.dt);
        userParameters.rq = decodeURIComponent(req.query.rq);
        userParameters.rf = decodeURIComponent(req.query.rf);
        userParameters.cid = decodeURIComponent(req.query.cid);

        // set the snippet status headers
        // notifying the user about the success or failure
        let options = {
            headers: {
                'x-snippet-date': new Date(),
                'x-snippet-status': 'success',
                'x-snippet-message': null
            }
        };

        // calidate the request parameters with the user activity schema
        const validation = validator.validateSchema(userParameters, validator.schemas.userActivitySchema);

        // validate query schema
        if (!Object.keys(userParameters).length || !validation.matching) {
            options.headers['x-snippet-status'] = 'failure';
            // TODO: add a good description of what went wrong
            options.headers['x-snippet-message'] = 'check if all parameters are set and if the date-time is in the correct format';
        }
        // return options and user parameters
        return { options, userParameters, validation };
    }

    /**
     * @description Checks if the request has been povided by a bot.
     * @param {Object} req - The express request object.
     * @returns {Boolean} True if the request was given by a bot.
     * @private
     */
    function _isBot(req) {
        let userAgent = req.get('user-agent').toLowerCase();
        return userAgent.includes('bot') || userAgent.includes('preview');
    }

    /**
     * @api {GET} /api/v1/snippet/log/development User activity acquisition for testing
     * @apiDescription Sends user activity snippet information FOR TESTING.
     * All parameters should be encoded by the `encodeURIComponent` function
     * @apiName GetSnippetLogDevelopment
     * @apiGroup UserActivity
     * @apiVersion 1.0.0
     *
     * @apiPrivate The API is meant to be used through the `/api/v1/snippet/log`
     *
     * @apiParam {Boolean} x5gonValidated - Notifies if the user is validated by the X5GON platform.
     * @apiParam {String} dt - The URI date-time.
     * @apiParam {String} rq - The URL from which the request was sent.
     * @apiParam {String} rf - The referrer URL.
     * @apiParam {String} cid - The provider token generated by the X5GON platform.
     * @apiParam {Boolean} [test=false] - Notifies if the request was sent to test the snippet integration.
     *
     * @apiParamExample {json} User Activity Information:
     *  {
     *    "x5gonValidated": true,
     *    "dt": "2018-10-04T10%3A19%3A45Z",
     *    "rq": "https://platform.x5gon.org/example",
     *    "rf": null,
     *    "cid": "x5gonTokenXYZ",
     *    "test": true
     *  }
     */
    router.get('/snippet/log/development', (req, res) => {
        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, '../../../snippet/images/beacon.png');
        // get the options - snippet status headers
        const { options } = _evaluateLog(req);
        // send beacon image to user
        return res.sendFile(beaconPath, options);
    });

    /**
     * @api {GET} /api/v1/snippet/log/production User activity acquisition for production
     * @apiDescription Sends user activity snippet information FOR PRODUCTION.
     * All parameters should be encoded by the `encodeURIComponent` function
     * @apiName GetSnippetLogProduction
     * @apiGroup UserActivity
     * @apiVersion 1.0.0
     *
     * @apiPrivate The API is meant to be used through the `/api/v1/snippet/log`
     *
     * @apiParam {Boolean} x5gonValidated - Notifies if the user is validated by the X5GON platform.
     * @apiParam {String} dt - The URI date-time.
     * @apiParam {String} rq - The URL from which the request was sent.
     * @apiParam {String} rf - The referrer URL.
     * @apiParam {String} cid - The provider token generated by the X5GON platform.
     * @apiParam {Boolean} [test=false] - Notifies if the request was sent to test the snippet integration.
     *
     * @apiParamExample {json} User Activity Information:
     *  {
     *    "x5gonValidated": true,
     *    "dt": "2018-10-04T10%3A19%3A45Z",
     *    "rq": "https://platform.x5gon.org/example",
     *    "rf": null,
     *    "cid": "x5gonTokenXYZ",
     *    "test": true
     *  }
     */
    router.get(['/connect/visit', '/snippet/log/production'], (req, res) => {

        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, '../../../snippet/images/beacon.png');
        // get the options - snippet status headers
        const { options, userParameters, validation } = _evaluateLog(req);
        // the user parameters object is either empty or is not in correct schema
        const provider = userParameters.cid ? userParameters.cid : 'unknown';
        // validate query schema
        if (!validation.matching) {
            // log user parameters error
            logger.error('[error] client activity logging not in correct format',
                logger.formatRequest(req, {
                    error: { validation: validation.errors },
                    provider
                })
            );
            // send beacon image to user
            return res.sendFile(beaconPath, options);
        }

        if (_isBot(req)) {
            // log user parameters error
            logger.warn('[warn] client is a bot',
                logger.formatRequest(req, {
                    provider,
                    userAgent: req.get('user-agent')
                })
            );
            // send beacon image to user
            return res.sendFile(beaconPath, options);
        }

        let uuid;
        // generate a the tracker cookie - if not exists
        if (!req.cookies[x5gonCookieName]) {
            // generate the cookie value
            let cookieValue = Math.random().toString().substr(2) + "X" + Date.now();
            // set expiration date for the cookie
            let expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 3650);
            // set the cookie for the user
            res.cookie(x5gonCookieName, cookieValue, {
                expires: expirationDate,
                domain: '.x5gon.org',
                httpOnly: true
            });

            // set uuid of the user
            uuid = cookieValue;
        }

        if (!uuid) {
            // get the user id from the X5GON tracker
            uuid = req.cookies[x5gonCookieName] ?
                req.cookies[x5gonCookieName] :
                'unknown';
        }

        // prepare the acitivity object
        let activity = {
            uuid: uuid,
            provider: userParameters.cid,
            url: userParameters.rq,
            referrer: userParameters.rf,
            visitedOn: userParameters.dt,
            userAgent: req.get('user-agent'),
            language: req.get('accept-language'),
            type: 'visit'
        };

        // redirect activity to information retrievers
        producer.send('STORING.USERACTIVITY.VISIT', activity);
        // send beacon image to user
        return res.sendFile(beaconPath, options);


    });

    /**
     * @api {GET} /api/v1/snippet/log/video Video activities acquisition
     * @apiDescription Sends video activity information FOR PRODUCTION.
     * All parameters should be encoded by the `encodeURIComponent` function
     * @apiName GetSnippetLogVideoActivity
     * @apiGroup UserActivity
     * @apiVersion 1.0.0
     */
    router.get(['/connect/video', '/snippet/log/video'], (req, res) => {
        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, '../../../snippet/images/beacon.png');
        // get the options - snippet status headers
        const { options, userParameters } = _evaluateLog(req);
        // the user parameters object is either empty or is not in correct schema
        const provider = userParameters.cid ? userParameters.cid : 'unknown';

        if (_isBot(req)) {
            // log user parameters error
            logger.warn('[warn] client is a bot',
                logger.formatRequest(req, {
                    provider,
                    userAgent: req.get('user-agent')
                })
            );
            // send beacon image to user
            return res.sendFile(beaconPath, options);
        }

        // get the user id from the X5GON tracker
        const uuid = req.cookies[x5gonCookieName] ?
            req.cookies[x5gonCookieName] :
            'unknown';

        // create video activity object
        const video = {
            uuid,
            userAgent: req.get('user-agent'),
            language: req.get('accept-language'),
            type: 'video'
        };

        // copy all query parameters to the object
        for (let key in req.query) {
            video[key] = req.query[key];
        }

        // redirect activity to information retrievers
        producer.send('STORING.USERACTIVITY.VIDEO', video);
        // send beacon image to user
        return res.sendFile(beaconPath, options);

    });

    /**
     * @api {GET} /api/v1/snippet/:version/x5gon-log(.min)?.js User activity acquisition library
     * @apiDescription Gets the snippet library directly from the server
     * @apiName GetSnippetLibrary
     * @apiGroup UserActivity
     * @apiVersion 1.0.0
     *
     * @apiParam {String="v1","v2","latest"} version - The version of the library.
     *
     * @apiExample {html} Example usage:
     *      <script type="text/javascript" src="https://platform.x5gon.org/api/v1/snippet/latest/x5gon-log.min.js"></script>
     */
    router.get('/snippet/:version/x5gon-log(.min)?.js', cors(), (req, res) => {
        // TODO: check if the parameters are valid

        // get the version parameter
        const version = req.params.version;
        // get the file name
        let originalUrl = req.originalUrl.split('/');
        const file = originalUrl[originalUrl.length - 1].split('?')[0];

        // create the file path
        const filePath = path.join(__dirname, `../../../snippet/global/${version}/${file}`);

        // send the file of the appropriate version
        res.sendFile(filePath);
    });

    return router;
};
