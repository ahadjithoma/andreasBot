
module.exports = function(robot) {
  robot.router.head('/hubot/trello-webhooks', function(req, res) {
    robot.logger.info("trello post received: ");
    robot.emit("trello-webhook-event", req, res);
    res.send(200);
  });
}
