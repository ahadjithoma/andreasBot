# Description
#   Do things on twitter through hubot, as your logged in user after authenticating with an oauth pin.
#
# Configuration:
#   HUBOT_TWITTER_CONSUMER_KEY - API key for hubot app registered on dev.twitter.com
#   HUBOT_TWITTER_CONSUMER_SECRET - API secret for hubot app registered on dev.twitter.com
#
# Commands:
#   hubot t auth <pin_code> - authenticate with pin code
#   hubot t clear my credentials - forget any authentication tokens
#   hubot t set up auth - authenticate or reauthenticate
#   hubot t search <query> - search twitter
#   hubot t tweet <twwet> - tweet as your user
#
# Notes:
#   You will need to sign in to https://dev.twitter.com and create a new
#   application for your hubot. Then set the appropriate environment variables
#
# Author:
#   Ben P <ben at megatron dot org>

OAuth = require 'oauth'
querystring = require 'querystring'

authorizeUrl = 'https://api.twitter.com/oauth/authorize'

oauth = new OAuth.OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  process.env.HUBOT_TWITTER_CONSUMER_KEY,
  process.env.HUBOT_TWITTER_CONSUMER_SECRET,
  '1.0A',
  'oob',
  'HMAC-SHA1'
)

setupRequestToken = (robot, msg) ->
  user_id = msg.envelope.user.id
  oauth.getOAuthRequestToken( (error, oauth_token, oauth_token_secret, results) ->
    if (error)
      console.log error
    else
      robot.brain.data.users[user_id].oauth_token = oauth_token
      robot.brain.data.users[user_id].oauth_token_secret = oauth_token_secret
      msg.send authorizeUrl + '?oauth_token=' + oauth_token + "\n"
    )

getAccessToken = (robot, msg, pin) ->
  user_id = msg.envelope.user.id
  oauth_token = robot.brain.data.users[user_id].oauth_token
  oauth_token_secret = robot.brain.data.users[user_id].oauth_token_secret
  oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, pin, (error, oauth_access_token, oauth_access_token_secret, results) ->
    if (error)
      console.log error
    else
      robot.brain.data.users[user_id].oauth_access_token = oauth_access_token
      robot.brain.data.users[user_id].oauth_access_token_secret = oauth_access_token_secret
      robot.brain.data.users[user_id].oauth_token = ''
      robot.brain.data.users[user_id].oauth_token_secret = ''
      msg.send 'You have authenticated'
  )

wipeCredentials = (robot, msg) ->
  user_id = msg.envelope.user.id
  for field in ['oauth_token', 'oauth_token_secret', 'oauth_access_token', 'oauth_access_token_secret']
    do (field) ->
      robot.brain.data.users[user_id][field] = ''
  msg.send 'credentials cleared'

apiCall = (robot, msg, uri, cb, verb='get', post_body) ->
  user_id = msg.envelope.user.id
  oauth_access_token = robot.brain.data.users[user_id].oauth_access_token
  oauth_access_token_secret = robot.brain.data.users[user_id].oauth_access_token_secret
  switch verb  # need to dry this
    when 'get'
      oauth.get(uri, oauth_access_token, oauth_access_token_secret, (error, data, res) ->
        if (error)
          console.log data
          throw error
        else
          cb JSON.parse data
      )
    when 'post'
      oauth.post(uri, oauth_access_token, oauth_access_token_secret, post_body, 'application/x-www-form-urlencoded', (error, data, res) ->
        if (error)
          console.log data
          throw error
        else
          cb JSON.parse data
      )

module.exports = (robot) ->
  robot.respond /t auth\ (\d+)/i, (msg) ->
    pin = msg.match[1]
    getAccessToken(robot, msg, pin)

  robot.respond /t set\s?up\s?auth/i, (msg) ->
    setupRequestToken(robot, msg)

  robot.respond /t search (.*)/i, (msg) ->
    query = querystring.stringify({q: "#{msg.match[1]}"})
    uri = "https://api.twitter.com/1.1/search/tweets.json?#{query}"
    apiCall robot, msg, uri, (data) ->
      for status in data['statuses']
        do (status) ->
          msg.send "#{status.created_at} @#{status.user.screen_name}: #{status.text}"

  robot.respond /t clear.*credentials/i, (msg) ->
    wipeCredentials(robot, msg)

  robot.respond /t tweet (.*)/i, (msg) ->
    query = querystring.stringify({status: "#{msg.match[1]}"})
    uri = "https://api.twitter.com/1.1/statuses/update.json?#{query}"
    apiCall robot, msg, uri, (data) ->
      console.log data
    , 'post'
