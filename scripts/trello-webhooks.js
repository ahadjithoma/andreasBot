url = require('url');
querystring = require('querystring');

debug = true;

module.exports = function (robot) {
    robot.router.post('/hubot/trello-hooks', function (req, res) {
        res.statusCode(200);
    })

}