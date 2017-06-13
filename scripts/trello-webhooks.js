url = require('url');
querystring = require('querystring');

debug = true;

module.exports = function (robot) {
    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        robot.emit("trello-webhook-event", req.body, res);

        res.status(200).end() // best practice to respond with empty 200 status code

        robot.messageRoom("random", "trello-webhooks.js");	
        console.logger.info("trello-webhooks.js");
        try {
            res.status(200).send(); // best practice to respond with 200 status           
            res.sendStatus(200);
            res.status(200);
            res.send(200);
        } catch (e) {
            robot.logger.error("trello-hooks.js error: " + e.stack + "**" + "\n");
        }
    })

}