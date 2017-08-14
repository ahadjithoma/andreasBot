var slackMsgs = require('./slackMsgs.js');
var url = require('url');
var Trello = require('node-trello');
var Promise = require('bluebird');
var request = require('request-promise');
var encryption = require('./encryption.js');
var mongo = require('mongoskin');
Promise.promisifyAll(mongo);

// config
var uri = process.env.MONGODB_URI;
var trelloKey = process.env.HUBOT_TRELLO_KEY;
var trello_url = 'https://api.trello.com'
var app_key = process.env.HUBOT_TRELLO_KEY;
var oauth_secret = process.env.HUBOT_TRELLO_OAUTH;
var host_url = process.env.HUBOT_HOST_URL

module.exports = function (robot) {

    var oauth_secrets = {};
    var loginCallback = `${host_url}/hubot/trello-token`;
    var scope = 'read,write,account'
    var expr = 'never' // expiration
    var TrelloOAuth = require('./trello-oauth.js')
    var tOAuth = new TrelloOAuth(app_key, oauth_secret, loginCallback, 'Hubot', scope, expr);

    robot.respond(/trello auth/, function (res) {
        let userId = res.message.user.id;
        tOAuth.getRequestToken(function (err, data) {
            oauth_secrets['username'] = res.message.user.name;
            oauth_secrets['id'] = res.message.user.id;
            oauth_secrets[data.oauth_token] = data.oauth_token_secret;

            res.reply(data.redirect);
        })
    })


    robot.respond(/do trello/, function (err, res) {

    })

    robot.router.get('/hubot/trello-token', function (req, res_r) {
        let args = req.query;
        let query = url.parse(req.url, true).query;
        let token = query.oauth_token;
        args['oauth_token_secret'] = oauth_secrets[token];
        tOAuth.getAccessToken(args, function (err, data) {
            if (err) throw err;
            let userName = oauth_secrets['username'];
            let userId = oauth_secrets['id'];

            var options = {
                method: 'GET',
                url: `${trello_url}/1/members/me?key=${trelloKey}&${data['oauth_access_token']}`
                // key: trelloKey,
                // token: data['oauth_access_token']
            }
            request(options).then(res => { console.log(res) }).catch(err => { console.log(err) })

            encryption.encrypt(data['oauth_access_token']).then(token => {
                var trelloUsername = data.username
                var db = mongo.MongoClient.connect(uri);
                db.bind('users');
                db.users.findAndModifyAsync(
                    { _id: userId },
                    [["_id", 1]],
                    { $set: { trello_token: token } },
                    { upsert: true })
                    .then(res => {
                        // console.log(res)
                    }).catch(err => { //TODO better error handling
                        console.log(err)
                    }).done(() => {
                        db.close();
                    })
            });
            // TODO: get trello username and save
            //TODO error

        })
        res_r.redirect('/a');
    });



    /**********************************************************/
    /* DEPRECATED */
    robot.respond(/trello get token/i, function (res_r) {

        let scope = 'read,write,account';
        let name = 'Hubot';
        let expr = '30days';
        let cb_method = 'fragment';
        let return_url = 'https://andreasbot.herokuapp.com/hubot/trello-token';
        let url = `https://trello.com/1/authorize?expiration=${expr}&name=${name}&scope=${scope}&key=${app_key}&response_type=token&callback_method=${cb_method}&return_url=${return_url}`;
        var msg = slackMsgs.basicMessage();

        msg.attachments[0].pretext = "Please get a token to authorize your Trello account";
        msg.attachments[0].title = "Trello Token";
        msg.attachments[0].title_link = url;
        msg.attachments[0].text = "Copy the token from the link above and run\n *trello add token <YOUR TOKEN>*";
        msg.attachments[0].footer = "Trello";
        msg.attachments[0].footer_icon = "https://d2k1ftgv7pobq7.cloudfront.net/meta/u/res/images/b428584f224c42e98d158dad366351b0/trello-mark-blue.png";
        res_r.send(msg);
    })

    /**********************************************************/
    /* DEPRECATED */
    robot.respond(/trello add token (.*)/i, function (res_r) {
        var token = res_r.match[1];
        //***IMPORTANT*** 
        // the .env assignment doesnt work with HEROKU!
        // must set up a heroku client and communicate through their api 
        process.env['HUBOT_TRELLO_TOKEN'] = token;
    })
}