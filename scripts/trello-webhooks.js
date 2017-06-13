module.exports = function(robot)  {
    robot.router.post('/hubot/trello-hooks', function(req, res) {
        res.status(200);
        res.send(200);  
    })

}