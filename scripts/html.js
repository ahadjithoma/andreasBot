module.exports = function (robot) {


var html = `
<input type="button" value="Put Your Text Here" onclick="window.location.href='http://www.hyperlinkcode.com/button-links.php'" />
<button onclick=window.open("https://www.google.com", "popUpWindow")>Try it</button> 
`;
	robot.router.get('/hubot/html', function (req, res) {
        res.send(html);
    })
}