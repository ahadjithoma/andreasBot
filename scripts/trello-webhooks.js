module.exports = function (robot) {

    robot.router.head('/hubot/trello-webhooks', function (req, res) {
        robot.logger.info(`trello-webhook HEAD. Status Code: ${res.statusCode}`);
        res.send(200);
    });

    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        var headers = req.headers
        res.send(200);

        // TODO: validate the webhook source

        var payload = req.body;
        var type = payload.action.type;
        var actionId = payload.action.id
        var room = req.query.room


        // BIG TODO
        // this is a users token ↙
        var token = '32005607708d42b1a23e3029e9c14c86897fb3899f6d735b8f97705b67138a8d'
        // must fetch it dynamically. when creating the webhook, must save this as well to be able to fetch it here later 

        var handled = robot.emit('postTrelloAction', token, actionId, room)
        if (!handled) {
            robot.logger.warning('No scripts handled the Trello Webhook Action.');
        }       
        
    });
}
