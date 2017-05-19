module.exports = function(robot) {
  robot.respond(/have a soda/i, function(res) {
    var sodasHad;
    sodasHad = robot.brain.get('totalSodas') * 1 || 0;
    if (sodasHad > 1) {
      res.reply("I'm too fizzy..");
    } else {
      res.reply('Sure!');
      robot.brain.set('totalSodas', sodasHad + 1);
    }
  });
  
  robot.respond(/sleep it off/i, function(res) {
    robot.brain.set('totalSodas', 0);
    res.reply('zzzzz');
  });
};