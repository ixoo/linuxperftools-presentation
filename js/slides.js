(function() {
  var Util;

  Util = (function() {

    function Util() {
      this.ua = navigator.userAgent;
      this.isFF = parseFloat(this.ua.split("Firefox/")[1]) || void 0;
      this.isWK = parseFloat(this.ua.split("WebKit/")[1]) || void 0;
      this.isOpera = parseFloat(this.ua.split("Opera/")[1]) || void 0;
      this.transitionEnd = this.isWK ? "webkitTransitionEnd" : this.isFF ? "transitionend" : "OTransitionEnd";
    }

    return Util;

  })();

  window.Util = Util;

}).call(this);
(function() {
  var Background;

  Background = (function() {

    function Background(dom, manager) {
      this.dom = dom;
      this.manager = manager;
    }

    Background.prototype.dispatchEvent = function() {
      var evt, slide;
      evt = document.createEvent('Event');
      evt.initEvent('backgroundTransitioned', false, false);
      evt.background = this;
      slide = this.manager.getCurrent();
      return slide.dom.dispatchEvent(evt);
    };

    return Background;

  })();

  window.Background = Background;

}).call(this);
(function() {
  var Slide;

  Slide = (function() {

    function Slide(dom, manager, index, util) {
      var onTransition, styles, transitionProps;
      this.dom = dom;
      this.manager = manager;
      this.index = index;
      this.util = util;
      styles = window.getComputedStyle(dom, null);
      transitionProps = styles.getPropertyValue('-webkit-transition-property') || styles.getPropertyValue('-moz-transition-property');
      this.transitionPropertyCount = transitionProps.split(',').length;
      onTransition = this.onTransition.bind(this);
      this.dom.addEventListener(this.util.transitionEnd, onTransition, false);
      this.dom.addEventListener('backgroundTransitioned', this.onBackground, false);
    }

    Slide.prototype.onTransition = function(evt) {
      if (evt.target === this.dom) {
        this.transitionFinishedCount += 1;
        if (this.transitionFinishedCount >= this.transitionPropertyCount) {
          return this.dispatchEvent();
        }
      }
    };

    Slide.prototype.onBackground = function() {};

    Slide.prototype.setCurrentOffset = function(offset) {
      if (Math.abs(offset) <= 2) {
        if (this.dom.parentNode !== this.manager.domStage) {
          this.manager.domStage.appendChild(this.dom);
        }
        this.setClassIf(offset === -2, 'far-past');
        this.setClassIf(offset === -1, 'past');
        this.setClassIf(offset === 0, 'current');
        this.setClassIf(offset === 1, 'future');
        this.setClassIf(offset === 2, 'far-future');
      } else {
        if (this.dom.parentNode !== this.manager.domContent) {
          this.manager.domContent.appendChild(this.dom);
        }
      }
      return this.transitionFinishedCount = 0;
    };

    Slide.prototype.dispatchEvent = function() {
      var evt;
      evt = document.createEvent('Event');
      evt.slide = this;
      if (this.dom.classList.contains('current')) {
        evt.initEvent('slideIn', false, false);
      } else {
        evt.initEvent('slideOut', false, false);
      }
      return this.dom.dispatchEvent(evt);
    };

    Slide.prototype.setClassIf = function(cond, name) {
      if (cond) {
        return this.dom.classList.add(name);
      } else {
        return this.dom.classList.remove(name);
      }
    };

    Slide.prototype.addEventListener = function(evt, callback, cascade) {
      return this.dom.addEventListener.apply(this.dom, arguments);
    };

    Slide.prototype.getBackgroundId = function() {
      if (this.dom.dataset && this.dom.dataset.backgroundid) {
        return this.dom.dataset.backgroundid;
      } else if (this.dom.hasAttribute('data-backgroundid')) {
        return this.dom.getAttribute('data-backgroundid');
      } else {
        return null;
      }
    };

    return Slide;

  })();

  window.Slide = Slide;

}).call(this);
(function() {
  var SlideManager;

  SlideManager = (function() {

    function SlideManager() {
      var b, dombgds, domslides, idx, s, _i, _j, _len, _len2;
      this.util = new Util;
      this.slides = [];
      this.backgrounds = {};
      domslides = document.querySelectorAll('.slide');
      dombgds = document.querySelectorAll('.background');
      this.domStage = document.querySelector('#stage');
      this.domContent = document.querySelector('#content');
      this.domBackground = document.querySelector('#background');
      this.bgDefault = 'bg-white';
      idx = 0;
      for (_i = 0, _len = domslides.length; _i < _len; _i++) {
        s = domslides[_i];
        this.slides.push(new Slide(s, this, idx, this.util));
        idx += 1;
      }
      idx = 0;
      for (_j = 0, _len2 = dombgds.length; _j < _len2; _j++) {
        b = dombgds[_j];
        this.backgrounds[b.id] = new Background(b, this);
      }
      this.init_events();
      this.init_slide_in();
      this.parse_history();
    }

    SlideManager.prototype.next = function() {
      return this.setCurrent(this.current + 1);
    };

    SlideManager.prototype.prev = function() {
      return this.setCurrent(this.current - 1);
    };

    SlideManager.prototype.init_events = function() {
      return window.addEventListener('keydown', this.on_key_down.bind(this), false);
    };

    SlideManager.prototype.on_key_down = function(evt) {
      switch (evt.keyCode) {
        case 37:
          return this.prev();
        case 32:
        case 39:
          return this.next();
      }
    };

    SlideManager.prototype.init_slide_in = function() {
      var s, slides, _i, _j, _len, _len2, _ref, _results;
      _ref = this.slides;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        s = _ref[_i];
        s.addEventListener('slideIn', this.onSlideIn.bind(this), false);
      }
      slides = document.querySelectorAll('.slide-in');
      _results = [];
      for (_j = 0, _len2 = slides.length; _j < _len2; _j++) {
        s = slides[_j];
        s.classList.add('off');
        s.addEventListener('slideIn', function() {
          return s.classList.remove('off');
        }, false);
        _results.push(s.addEventListener('slideOut', function() {
          return s.classList.add('off');
        }, false));
      }
      return _results;
    };

    SlideManager.prototype.onSlideIn = function(evt) {
      return this.setBackground(this.getBackgroundId(evt.slide.index));
    };

    SlideManager.prototype.parse_history = function() {
      var parts;
      parts = window.location.href.split('#');
      this.current = 0;
      if (parts.length === 2) this.current = parseInt(parts[1]) - 1;
      this.setCurrent(this.current);
      return this.getCurrent().dispatchEvent();
    };

    SlideManager.prototype.setCurrent = function(idx) {
      var i, s, _i, _len, _ref, _results;
      this.current = idx;
      this.setHistory(idx);
      i = 0;
      _ref = this.slides;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        s = _ref[_i];
        s.setCurrentOffset(i - idx);
        _results.push(i += 1);
      }
      return _results;
    };

    SlideManager.prototype.getCurrent = function() {
      return this.slides[this.current];
    };

    SlideManager.prototype.setHistory = function(idx) {
      var path;
      path = window.location.pathname + '#' + (idx + 1);
      return window.history.pushState({}, null, path);
    };

    SlideManager.prototype.setBackground = function(id) {
      var current, last, next;
      current = this.backgrounds['active'];
      next = this.backgrounds[id];
      if (current !== next) {
        last = this.backgrounds['last'];
        if (last) {
          last.dom.classList.remove('last');
          this.domContent.appendChild(last.dom);
          this.backgrounds['last'] = null;
        }
        if (current) {
          current.dom.classList.add('last');
          this.backgrounds['last'] = current;
          current.dom.classList.remove('active');
          this.backgrounds['active'] = null;
        }
        if (next) {
          this.backgrounds['active'] = next;
          this.domBackground.appendChild(next.dom);
          return window.setTimeout(function() {
            return next.dom.classList.add('active');
          }, 0);
        }
      } else {
        return next.dispatchEvent();
      }
    };

    SlideManager.prototype.getBackgroundId = function(idx) {
      var bgid, i;
      i = idx;
      bgid = null;
      while (!(bgid = this.slides[i].getBackgroundId()) && i >= 0) {
        i -= 1;
      }
      return bgid || this.bgDefault;
    };

    return SlideManager;

  })();

  new SlideManager;

}).call(this);
