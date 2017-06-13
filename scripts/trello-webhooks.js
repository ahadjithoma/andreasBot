url = require('url');
querystring = require('querystring');

debug = true;

module.exports = function (robot) {
    robot.router.post('/hubot/trello-hooks', function (req, res) {
        try {
            if (debug) {
                robot.logger.info("Trello post received: ", req);
            }
            eventBody = {
                payload: req.body,
                query: querystring.parse(url.parse(req.url).query)
            };
            res.send('json received');
            robot.emit("trello-webhook-event", eventBody);
        } catch (e) {
            // res.send('You supplied invalid JSON to this endpoint.');
            error = e;
            // robot.logger.error('Could not receive github response on github-hooks.js');	
            robot.logger.error("trello-hooks.js error: " + error.stack + "**" + "\n");
        }
    })

}