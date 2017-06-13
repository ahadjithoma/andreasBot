module.exports = function(robot)  {
    robot.router.post('/hubot/trello-hooks', function(req, res) {
        console.log(res);
    })

}