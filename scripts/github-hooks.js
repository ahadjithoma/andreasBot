module.exports = function(robot)  {


	robot.router.post('/hubot/github-hooks', function(req, res) {
		res.send("Request is good");

		var data = null;

	    if(req.body.payload) {
	      try {
	        data = JSON.parse(req.body.payload);
	      } catch(e) {
	        robot.logger.error("Invalid JSON submitted to /hubot/github-hooks");
	        //res.send(422)
	        res.send('You supplied invalid JSON to this endpoint.');
	        return;
	      }
	    } else {
	      robot.logger.error("Non-JSON submitted to /hubot/github-hooks");
	      //res.send(422)
	      res.send('You supplied invalid JSON to this endpoint.');
	      return;
	    }

	    console.logger.info(data);


	})


}