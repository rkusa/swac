var render = function(req, res, locals) {
	res.render('index', locals)
}

module.exports = function(path, callback) {
	app.get(path, function(req, res) {
		callback(render.bind(render, req, res))
	})
}