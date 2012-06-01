var route, app = {}
  , isBrowser = typeof window != 'undefined'
  , isServer  = !isBrowser
  , page = require('page')
  , Model = require('./model')

if (typeof window != 'undefined') {
	var ranges = []
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
				if (!ranges[id]) ranges[id] = document.createRange()
				if (res.index) /* closing */ ranges[id].setEndAfter(treeWalker.currentNode)
				else           /* opening */ ranges[id].setStartBefore(treeWalker.currentNode)
			}
		}
    Bindings.forEach(function(binding) {
      Model.models[binding.model].on(binding.event, refresh.bind(refresh, binding.block))
    })
    return
		for (var i = 1; i < ranges.length; ++i) {
			ranges[i].deleteContents()
			var fragment = document.createDocumentFragment()
        , tmp = document.createElement('div')
        , child
      tmp.innerHTML = Templates[i](app)
      while (child = tmp.firstChild) {
        fragment.appendChild(child)
      }
      ranges[i].insertNode(fragment)
		}
	}
}

function refresh (id) {
  ranges[id].deleteContents()
  var fragment = document.createDocumentFragment()
    , tmp = document.createElement('div')
    , child
  tmp.innerHTML = Templates[id](app)
  while (child = tmp.firstChild) {
    fragment.appendChild(child)
  }
  ranges[id].insertNode(fragment)
}

var bindings = []

app.state = new Model("State", function() {
  this.property('page')
})

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
		app._templates = []
    app._bindings = Model.bindings
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
