module.exports = function (robot) {


var html = `
<input type="button" value="Put Your Text Here" onclick="window.location.href='http://www.hyperlinkcode.com/button-links.php'" />
<button onclick=window.open("https://www.google.com")>Try it</button>
<button onClick=window.open(
		"www.google.com",
		'popUpWindow','height=300,width=450,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes')
        >Google Popup</button>`;
	robot.router.get('/hubot/html', function (req, res) {
        res.send(html);
    })
}