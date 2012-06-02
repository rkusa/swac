var route, app = require('./shared')
  , isBrowser = typeof window != 'undefined'
  , isServer  = !isBrowser
  , page = require('page')
  , Model = require('./model')
  , Fragment = require('./fragment')

if (typeof window != 'undefined') {
	window.onload = function() {
    page()
		var treeWalker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT, {
			acceptNode: function(node) {
				return node.nodeValue[0] == '-' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
			}
		})
		while(treeWalker.nextNode()) {
			var value = treeWalker.currentNode.nodeValue, res
			if (res = value.match(/\-(\{(\d+))|((\d+)\})/)) {
				var id = res[2] || res[4]
				if (res.index) /* closing */ fragments[id].DOMRange.setEndAfter(treeWalker.currentNode)
				else           /* opening */ fragments[id].DOMRange.setStartBefore(treeWalker.currentNode)
			}
		}
	}
}

app.register('state', new Model("State", function() {
  this.property('page')
}))

if (isBrowser) {
	var render = function(locals) {
	}
	route = function(path, callback) {
		page(path, function() {
			callback(render)
		})
	}
} else {
	var render = function(req, res, locals) {
		app._blockCount = 0
		app._fragments = []
		res.render('index', app)
	}
	route = function(path, callback) {
		express.get(path, function(req, res) {
			callback(render.bind(render, req, res))
		})
	}
}

route('/', function(render) {
	app.state.page = 1
	render()
})

route('/2', function(render) {
	app.state.page = 2
	render()
})
