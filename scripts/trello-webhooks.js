
module.exports = function (robot) {
    robot.router.head('/hubot/trello-webhooks', function (req, res) {
        robot.logger.info("trello head ");
        res.send(200);
    });


    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        robot.logger.info("trello post");
        robot.emit("trello-webhook-event", req, res);
        res.send(200);
    });
}
