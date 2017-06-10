
module.exports = function(robot)  {
  robot.router.post('/hubot/github-hooks', function(req, res) {
    var data = null;

    robot.logger.info("Github post received: ", req);


    if(req.body) {
      try {
        data = JSON.parse(req.body);
      } 
      catch(e) {
        robot.logger.error("Invalid JSON submitted to /hubot/github-hooks");
        //res.send(422)
        res.send('You supplied an invalid JSON to this endpoint.');
        return;
      }
    } 
    else {
      robot.logger.error("Non-JSON submitted to  /hubot/github-hooks");
      //res.send(422)
      res.send('You supplied an invalid JSON to this endpoint.');
      return;
    }

    console.log(data);


  });
}
