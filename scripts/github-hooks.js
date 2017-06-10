
module.exports = function(robot)  {
  robot.router.post('/hubot/github-hooks', function(req, res) {
    var data = null;
    data = req.body;
    console.log(data);

  });
}
