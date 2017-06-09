module.exports = function(robot)  {


	robot.router.post('/hubot/github-hooks', function(req, res) {
		res.send("Request is good");
	})


}