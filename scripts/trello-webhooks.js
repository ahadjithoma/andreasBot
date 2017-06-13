url = require('url');
querystring = require('querystring');

debug = true;

module.exports = function (robot) {
    robot.router.post('/hubot/trello-hooks', function (req, res) {
        try {
            res.send(200);
            res.send('OK');
            robot.emit("trello-webhook-event", req.body);
        } catch (e) {
            robot.logger.error("trello-hooks.js error: " + e.stack + "**" + "\n");
        }
    })

}