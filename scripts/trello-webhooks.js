url = require('url');
querystring = require('querystring');

debug = true;

module.exports = function (robot) {
    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        robot.messageRoom("random", "trello-webhooks.js");	
        console.logger.info("trello-webhooks.js");
        try {
            res.status(200).end(); // best practice to respond with 200 status           
            res.send(200);
            res.send('OK');
            robot.emit("trello-webhook-event", req.body);
        } catch (e) {
            robot.logger.error("trello-hooks.js error: " + e.stack + "**" + "\n");
        }
    })

}