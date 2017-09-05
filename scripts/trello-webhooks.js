module.exports = function (robot) {

    robot.router.head('/hubot/trello-webhooks', function (req, res) {
        robot.logger.info(`Trello webhook creation. Callback: /hubot/trello-webhooks. Status Code: ${res.statusCode}`);
        res.send(200);

        // save trello id and user
    });

    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        var headers = req.headers
        res.send(200);

        // TODO: validate the webhook source

        var payload = req.body;
        var type = payload.action.type;
        var actionId = payload.action.id
        var room = req.query.room
        var modelId = payload.model.id

        /* Notes: 
         * Every webhook is a unique compination of callback_url, model_id and user_token.
         * The callback_url contains the webhook's room for chat client (i.e. slack channel) to post the updates
         * where callback body is the same for all webhooks (callback body is actually the bot host url). 
         * So getting the room name && model_id we can regocnize the user who created the webhook 
         * and use his token for the GET trello action request.  
         */

        
         // BIG TODO
        // this is a users token ↙
        // must fetch it dynamically. when creating the webhook, must save this as well to be able to fetch it here later 

        var handled = robot.emit('postTrelloAction', modelId, room, actionId)
        if (!handled) {
            robot.logger.warning('No scripts handled the Trello Webhook Action.');
        }

    });
}
