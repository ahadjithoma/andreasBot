var apiai = require('apiai');
var util = require('util');
var path = require('path');
var cache = require('./cache.js').getCache()

var apiai_token = process.env.APIAI_TOKEN;
var errorChannel = process.env.HUBOT_ERRORS_CHANNEL;

var app = apiai(apiai_token, {});

module.exports = robot => {

    // ask api.ai
    robot.respond(/ai (.*)/i, res => {
        var msg = res.match[1];
        apiaiAsk(msg, res);
    })

    robot.catchAll(function (res) {
        // var regexp = new RegExp("^(?:" + robot.alias + "|" + robot.name + ") (.*)", "i");
        var regex = new RegExp(robot.name + " (.*)", "i")
        if (res.message.text.match(regex)) { // captures only direct messages and not messages in channels 
            var msg = res.message.text.match(regex)[1]
            console.log(msg)
            // apiaiAsk(msg, res);
        }

    });

    // robot.respond(/(.*)/, function(res){
    //     console.log('robot respond (.*)')
    // })

    // sending a msg to api.ai from other scripts
    robot.on('ask-api.ai', function (msg, res) {
        apiaiAsk(msg, res);
    })

    // trigger an event to api.ai from other scripts
    robot.on('event-api.ai', function (eventName, userId) {
        console.log(eventName, userId)
        apiaiEvent(eventName)
    })

    function apiaiAsk(msg, res) {
        var userId = res.message.user.id;

        var options = {
            sessionId: userId
        };

        var request = app.textRequest(msg, options)

        request.on('response', function (response) {
            var r = response.result;

            // if the action is completed, emit the data 
            var isComplete = !r.actionIncomplete;
            if (isComplete) {
                var handled = robot.emit(r.action, r, res);
                if (!handled) {
                    robot.logger.info('No scripts handled the api.ai action: ' + r.action);
                }
            }

            // reply back to user
            if (r.fulfillment.speech) {
                res.send(r.fulfillment.speech);
            }
        });

        request.on('error', function (error) {
            robot.messageRoom(errorChannel, `Error in ${path.basename(__filename)} script. Please check the Server Log for more details.`)
            robor.logger.error(error)
        });

        request.end();
    }


    function apiaiEvent(eventName, userId, data = {}) {
        var userId = userId;

        var event = {
            name: eventName,
            data: data
        };

        var options = {
            sessionId: userId
        };

        var request = app.eventRequest(event, options);

        request.on('response', function (response) {
            console.log(util.inspect(response, false, null));
            // TODO
        });

        request.on('error', function (error) {
            robot.messageRoom(errorChannel, `Error in ${path.basename(__filename)} script. Please check the Server Log for more details.`)
            robot.logger.error(error)
        });

        request.end();
    }
}