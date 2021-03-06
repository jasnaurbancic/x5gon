// create proxy for api calls
const proxy = require('http-proxy-middleware');

// logger for proxying requests
const Logger = require('alias:lib/logger');


/**
 * @description Adds proxies to express app.
 * @param {Object} app - Express app.
 */
module.exports = function (app, config) {

    ////////////////////////////////////////
    // Recommender Engine Proxy
    ////////////////////////////////////////

    // redirect to the Recommendation System route
    // app.use('/api/v1/recommend', proxy('/api/v1/recommend', {
    //     target: `http://127.0.0.1:${config.recsys.port}`,
    //     logProvider: function (provider) {
    //         // create logger for sending requests
    //         return Logger.createInstance(`proxy`, 'info', 'platform', config.environment !== 'prod');
    //     }
    // }));

    // // redirect to the Recommendation System route
    // app.use('/api/v1/qa', proxy('/api/v1/qa', {
    //     target: `http://127.0.0.1:${config.quality.port}`,
    //     pathRewrite: {
    //         '^/api/v1/qa': '/api/v1/qa'
    //     },
    //     logProvider: function (provider) {
    //         // create logger for sending requests
    //         return Logger.createInstance(`proxy`, 'info', 'platform', config.environment !== 'prod');
    //     }
    // }));

};