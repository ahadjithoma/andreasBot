var slackToken = process.env.HUBOT_SLACK_VERIFY_TOKEN;

module.exports = function(robot)  {
  robot.router.post('/hubot/github-hooks', function(req, res) {
    var data = null;

    console.log(data);

  });
}
