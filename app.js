var route, app = {}

if (typeof window != 'undefined') {
	var ranges = []
	window.onload = function() {
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
	
}

var Model = function(attrs) {
  var self = this
  this._fns = {}
  Object.keys(attrs).forEach(function(key) {
  	var value = attrs[key]
  	Object.defineProperty(self, key, {
  		get: function() {
  			var caller = arguments.callee.caller
  			self._fns[key] = function() {
  				ranges[caller.id].deleteContents()
					var fragment = document.createDocumentFragment()
		        , tmp = document.createElement('div')
		        , child
		      tmp.innerHTML = caller(app)
		      while (child = tmp.firstChild) {
		        fragment.appendChild(child)
		      }
		      ranges[caller.id].insertNode(fragment)
  			}
  			return value
  		},
  		set: function(newValue) {
  			if (value == newValue) return
  			value = newValue
  			self._fns[key]()
  		},
  		enumerable: true
  	})
  })
}

app.state = new Model({ page: 1 })

if ('undefined' == typeof module) {
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
