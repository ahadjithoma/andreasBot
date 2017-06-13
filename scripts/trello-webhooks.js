url = require('url');
querystring = require('querystring');

debug = true;

module.exports = function (robot) {
    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        res.status(200).send('OK');
        res.status(200).end() // best practice to respond with empty 200 status code
        res.sendStatus(200);

        
        
        robot.emit("trello-webhook-event", req.body, res);


        robot.messageRoom("random", "trello-webhooks.js");	
        console.logger.info("trello-webhooks.js");

    })

}