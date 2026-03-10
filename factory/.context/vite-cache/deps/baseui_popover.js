import {
  es2015_exports,
  init_es2015,
  require_focusVisible,
  require_layer
} from "./chunk-YWHAM2RJ.js";
import {
  require_overrides,
  require_styles
} from "./chunk-K5FSULMP.js";
import "./chunk-TFDFHE5Q.js";
import "./chunk-JD3UC7WK.js";
import {
  require_react
} from "./chunk-776SV3ZX.js";
import {
  __commonJS,
  __esm,
  __export,
  __toCommonJS,
  __toESM
} from "./chunk-V4OQ3NZ2.js";

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/constants.js
var require_constants = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.TRIGGER_TYPE = exports.STATE_CHANGE_TYPE = exports.POPOVER_MARGIN = exports.PLACEMENT = exports.ARROW_WIDTH = exports.ARROW_SIZE = exports.ANIMATE_OUT_TIME = exports.ANIMATE_IN_TIME = exports.ACCESSIBILITY_TYPE = void 0;
    var PLACEMENT = exports.PLACEMENT = {
      auto: "auto",
      topLeft: "topLeft",
      top: "top",
      topRight: "topRight",
      rightTop: "rightTop",
      right: "right",
      rightBottom: "rightBottom",
      bottomRight: "bottomRight",
      bottom: "bottom",
      bottomLeft: "bottomLeft",
      leftBottom: "leftBottom",
      left: "left",
      leftTop: "leftTop"
    };
    var TRIGGER_TYPE = exports.TRIGGER_TYPE = {
      click: "click",
      hover: "hover"
    };
    var STATE_CHANGE_TYPE = exports.STATE_CHANGE_TYPE = {
      open: "open",
      close: "close"
    };
    var ACCESSIBILITY_TYPE = exports.ACCESSIBILITY_TYPE = {
      none: "none",
      menu: "menu",
      tooltip: "tooltip"
    };
    var POPOVER_MARGIN = exports.POPOVER_MARGIN = 8;
    var ARROW_SIZE = exports.ARROW_SIZE = 6;
    var ANIMATE_OUT_TIME = exports.ANIMATE_OUT_TIME = 0;
    var ANIMATE_IN_TIME = exports.ANIMATE_IN_TIME = 20;
    var ARROW_WIDTH = exports.ARROW_WIDTH = Math.ceil(Math.sqrt((ARROW_SIZE * 2) ** 2 / 2));
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/stateful-container.js
var require_stateful_container = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/stateful-container.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var React13 = _interopRequireWildcard(require_react());
    var _constants = require_constants();
    var _focusVisible = require_focusVisible();
    function _getRequireWildcardCache(e) {
      if ("function" != typeof WeakMap) return null;
      var r = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(e2) {
        return e2 ? t : r;
      })(e);
    }
    function _interopRequireWildcard(e, r) {
      if (!r && e && e.__esModule) return e;
      if (null === e || "object" != typeof e && "function" != typeof e) return { default: e };
      var t = _getRequireWildcardCache(r);
      if (t && t.has(e)) return t.get(e);
      var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) {
        var i = a ? Object.getOwnPropertyDescriptor(e, u) : null;
        i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u];
      }
      return n.default = e, t && t.set(e, n), n;
    }
    function _defineProperty2(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == typeof i ? i : String(i);
    }
    function _toPrimitive(t, r) {
      if ("object" != typeof t || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != typeof i) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    var defaultStateReducer = (type, nextState) => nextState;
    var StatefulContainer = class extends React13.Component {
      constructor(...args) {
        super(...args);
        _defineProperty2(this, "state", {
          isOpen: false,
          ...this.props.initialState
        });
        _defineProperty2(this, "onBlur", (e) => {
          if (this.props.onBlur) {
            this.props.onBlur(e);
          }
          if (this.props.focusLock || this.props.autoFocus) {
            return;
          }
          this.close();
        });
        _defineProperty2(this, "onClick", (e) => {
          if (this.props.onClick) {
            this.props.onClick(e);
          }
          if (this.state.isOpen) {
            this.close();
          } else {
            this.open();
          }
        });
        _defineProperty2(this, "onClickOutside", () => {
          this.close();
        });
        _defineProperty2(this, "onEsc", () => {
          this.close();
        });
        _defineProperty2(this, "onFocus", (e) => {
          if (this.props.onFocus) {
            this.props.onFocus(e);
          }
          if ((0, _focusVisible.isFocusVisible)(e)) {
            this.open();
          }
        });
        _defineProperty2(this, "onMouseEnter", (e) => {
          if (this.props.onMouseEnter) {
            this.props.onMouseEnter(e);
          }
          this.open();
        });
        _defineProperty2(this, "onMouseLeave", (e) => {
          if (this.props.onMouseLeave) {
            this.props.onMouseLeave(e);
          }
          this.close();
        });
        _defineProperty2(this, "onContentClose", () => {
          this.close();
        });
        _defineProperty2(this, "renderContent", () => {
          const {
            content
          } = this.props;
          if (typeof content === "function") {
            return content({
              close: this.onContentClose
            });
          }
          return content;
        });
      }
      open() {
        this.internalSetState(_constants.STATE_CHANGE_TYPE.open, {
          isOpen: true
        });
        if (this.props.onOpen) {
          this.props.onOpen();
        }
      }
      close() {
        this.internalSetState(_constants.STATE_CHANGE_TYPE.close, {
          isOpen: false
        });
        if (this.props.onClose) {
          this.props.onClose();
        }
      }
      internalSetState(type, changes) {
        const {
          stateReducer
        } = this.props;
        if (typeof stateReducer !== "function") {
          this.setState(changes);
          return;
        }
        this.setState((prevState) => stateReducer(type, changes, prevState));
      }
      render() {
        const {
          accessibilityType,
          autoFocus,
          animateOutTime,
          dismissOnClickOutside,
          dismissOnEsc,
          focusLock,
          ignoreBoundary,
          mountNode,
          onBlur: onBlur3,
          onClick,
          onFocus: onFocus3,
          onMouseEnter,
          onMouseLeave,
          onMouseEnterDelay,
          onMouseLeaveDelay,
          overrides,
          placement,
          popperOptions,
          renderAll,
          returnFocus,
          showArrow,
          triggerType,
          popoverMargin,
          focusOptions
        } = this.props;
        const popoverProps = {
          accessibilityType,
          animateOutTime,
          autoFocus,
          content: this.renderContent,
          focusLock,
          ignoreBoundary,
          isOpen: this.state.isOpen,
          mountNode,
          onBlur: onBlur3,
          onClick,
          onFocus: onFocus3,
          onMouseEnter,
          onMouseLeave,
          onMouseEnterDelay,
          onMouseLeaveDelay,
          overrides,
          placement,
          popperOptions,
          renderAll,
          returnFocus,
          showArrow,
          triggerType,
          popoverMargin,
          focusOptions
        };
        if (dismissOnClickOutside) {
          popoverProps.onClickOutside = this.onClickOutside;
        }
        if (dismissOnEsc) {
          popoverProps.onEsc = this.onEsc;
        }
        if (triggerType === _constants.TRIGGER_TYPE.hover) {
          popoverProps.onBlur = this.onBlur;
          popoverProps.onFocus = this.onFocus;
          popoverProps.onMouseEnter = this.onMouseEnter;
          popoverProps.onMouseLeave = this.onMouseLeave;
        } else {
          popoverProps.onClick = this.onClick;
        }
        return this.props.children(popoverProps);
      }
    };
    _defineProperty2(StatefulContainer, "defaultProps", {
      accessibilityType: _constants.ACCESSIBILITY_TYPE.menu,
      ignoreBoundary: false,
      overrides: {},
      onMouseEnterDelay: 200,
      onMouseLeaveDelay: 200,
      placement: _constants.PLACEMENT.auto,
      popperOptions: {},
      showArrow: false,
      triggerType: _constants.TRIGGER_TYPE.click,
      dismissOnClickOutside: true,
      dismissOnEsc: true,
      stateReducer: defaultStateReducer,
      popoverMargin: _constants.POPOVER_MARGIN
    });
    var _default = exports.default = StatefulContainer;
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
var init_objectWithoutPropertiesLoose = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js"() {
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
var init_extends = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/extends.js"() {
  }
});

// ../../../node_modules/.pnpm/react-is@16.13.1/node_modules/react-is/cjs/react-is.development.js
var require_react_is_development = __commonJS({
  "../../../node_modules/.pnpm/react-is@16.13.1/node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    if (true) {
      (function() {
        "use strict";
        var hasSymbol = typeof Symbol === "function" && Symbol.for;
        var REACT_ELEMENT_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.element") : 60103;
        var REACT_PORTAL_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.portal") : 60106;
        var REACT_FRAGMENT_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.fragment") : 60107;
        var REACT_STRICT_MODE_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.strict_mode") : 60108;
        var REACT_PROFILER_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.profiler") : 60114;
        var REACT_PROVIDER_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.provider") : 60109;
        var REACT_CONTEXT_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.context") : 60110;
        var REACT_ASYNC_MODE_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.async_mode") : 60111;
        var REACT_CONCURRENT_MODE_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.concurrent_mode") : 60111;
        var REACT_FORWARD_REF_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.forward_ref") : 60112;
        var REACT_SUSPENSE_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.suspense") : 60113;
        var REACT_SUSPENSE_LIST_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.suspense_list") : 60120;
        var REACT_MEMO_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.memo") : 60115;
        var REACT_LAZY_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.lazy") : 60116;
        var REACT_BLOCK_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.block") : 60121;
        var REACT_FUNDAMENTAL_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.fundamental") : 60117;
        var REACT_RESPONDER_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.responder") : 60118;
        var REACT_SCOPE_TYPE = hasSymbol ? /* @__PURE__ */ Symbol.for("react.scope") : 60119;
        function isValidElementType(type) {
          return typeof type === "string" || typeof type === "function" || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
          type === REACT_FRAGMENT_TYPE || type === REACT_CONCURRENT_MODE_TYPE || type === REACT_PROFILER_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || typeof type === "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_RESPONDER_TYPE || type.$$typeof === REACT_SCOPE_TYPE || type.$$typeof === REACT_BLOCK_TYPE);
        }
        function typeOf(object2) {
          if (typeof object2 === "object" && object2 !== null) {
            var $$typeof = object2.$$typeof;
            switch ($$typeof) {
              case REACT_ELEMENT_TYPE:
                var type = object2.type;
                switch (type) {
                  case REACT_ASYNC_MODE_TYPE:
                  case REACT_CONCURRENT_MODE_TYPE:
                  case REACT_FRAGMENT_TYPE:
                  case REACT_PROFILER_TYPE:
                  case REACT_STRICT_MODE_TYPE:
                  case REACT_SUSPENSE_TYPE:
                    return type;
                  default:
                    var $$typeofType = type && type.$$typeof;
                    switch ($$typeofType) {
                      case REACT_CONTEXT_TYPE:
                      case REACT_FORWARD_REF_TYPE:
                      case REACT_LAZY_TYPE:
                      case REACT_MEMO_TYPE:
                      case REACT_PROVIDER_TYPE:
                        return $$typeofType;
                      default:
                        return $$typeof;
                    }
                }
              case REACT_PORTAL_TYPE:
                return $$typeof;
            }
          }
          return void 0;
        }
        var AsyncMode = REACT_ASYNC_MODE_TYPE;
        var ConcurrentMode = REACT_CONCURRENT_MODE_TYPE;
        var ContextConsumer = REACT_CONTEXT_TYPE;
        var ContextProvider = REACT_PROVIDER_TYPE;
        var Element = REACT_ELEMENT_TYPE;
        var ForwardRef = REACT_FORWARD_REF_TYPE;
        var Fragment4 = REACT_FRAGMENT_TYPE;
        var Lazy = REACT_LAZY_TYPE;
        var Memo = REACT_MEMO_TYPE;
        var Portal = REACT_PORTAL_TYPE;
        var Profiler = REACT_PROFILER_TYPE;
        var StrictMode = REACT_STRICT_MODE_TYPE;
        var Suspense = REACT_SUSPENSE_TYPE;
        var hasWarnedAboutDeprecatedIsAsyncMode = false;
        function isAsyncMode(object2) {
          {
            if (!hasWarnedAboutDeprecatedIsAsyncMode) {
              hasWarnedAboutDeprecatedIsAsyncMode = true;
              console["warn"]("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update your code to use ReactIs.isConcurrentMode() instead. It has the exact same API.");
            }
          }
          return isConcurrentMode(object2) || typeOf(object2) === REACT_ASYNC_MODE_TYPE;
        }
        function isConcurrentMode(object2) {
          return typeOf(object2) === REACT_CONCURRENT_MODE_TYPE;
        }
        function isContextConsumer(object2) {
          return typeOf(object2) === REACT_CONTEXT_TYPE;
        }
        function isContextProvider(object2) {
          return typeOf(object2) === REACT_PROVIDER_TYPE;
        }
        function isElement(object2) {
          return typeof object2 === "object" && object2 !== null && object2.$$typeof === REACT_ELEMENT_TYPE;
        }
        function isForwardRef(object2) {
          return typeOf(object2) === REACT_FORWARD_REF_TYPE;
        }
        function isFragment(object2) {
          return typeOf(object2) === REACT_FRAGMENT_TYPE;
        }
        function isLazy(object2) {
          return typeOf(object2) === REACT_LAZY_TYPE;
        }
        function isMemo(object2) {
          return typeOf(object2) === REACT_MEMO_TYPE;
        }
        function isPortal(object2) {
          return typeOf(object2) === REACT_PORTAL_TYPE;
        }
        function isProfiler(object2) {
          return typeOf(object2) === REACT_PROFILER_TYPE;
        }
        function isStrictMode(object2) {
          return typeOf(object2) === REACT_STRICT_MODE_TYPE;
        }
        function isSuspense(object2) {
          return typeOf(object2) === REACT_SUSPENSE_TYPE;
        }
        exports.AsyncMode = AsyncMode;
        exports.ConcurrentMode = ConcurrentMode;
        exports.ContextConsumer = ContextConsumer;
        exports.ContextProvider = ContextProvider;
        exports.Element = Element;
        exports.ForwardRef = ForwardRef;
        exports.Fragment = Fragment4;
        exports.Lazy = Lazy;
        exports.Memo = Memo;
        exports.Portal = Portal;
        exports.Profiler = Profiler;
        exports.StrictMode = StrictMode;
        exports.Suspense = Suspense;
        exports.isAsyncMode = isAsyncMode;
        exports.isConcurrentMode = isConcurrentMode;
        exports.isContextConsumer = isContextConsumer;
        exports.isContextProvider = isContextProvider;
        exports.isElement = isElement;
        exports.isForwardRef = isForwardRef;
        exports.isFragment = isFragment;
        exports.isLazy = isLazy;
        exports.isMemo = isMemo;
        exports.isPortal = isPortal;
        exports.isProfiler = isProfiler;
        exports.isStrictMode = isStrictMode;
        exports.isSuspense = isSuspense;
        exports.isValidElementType = isValidElementType;
        exports.typeOf = typeOf;
      })();
    }
  }
});

// ../../../node_modules/.pnpm/react-is@16.13.1/node_modules/react-is/index.js
var require_react_is = __commonJS({
  "../../../node_modules/.pnpm/react-is@16.13.1/node_modules/react-is/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_is_development();
    }
  }
});

// ../../../node_modules/.pnpm/object-assign@4.1.1/node_modules/object-assign/index.js
var require_object_assign = __commonJS({
  "../../../node_modules/.pnpm/object-assign@4.1.1/node_modules/object-assign/index.js"(exports, module) {
    "use strict";
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;
    function toObject(val) {
      if (val === null || val === void 0) {
        throw new TypeError("Object.assign cannot be called with null or undefined");
      }
      return Object(val);
    }
    function shouldUseNative() {
      try {
        if (!Object.assign) {
          return false;
        }
        var test1 = new String("abc");
        test1[5] = "de";
        if (Object.getOwnPropertyNames(test1)[0] === "5") {
          return false;
        }
        var test2 = {};
        for (var i = 0; i < 10; i++) {
          test2["_" + String.fromCharCode(i)] = i;
        }
        var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
          return test2[n];
        });
        if (order2.join("") !== "0123456789") {
          return false;
        }
        var test3 = {};
        "abcdefghijklmnopqrst".split("").forEach(function(letter) {
          test3[letter] = letter;
        });
        if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
          return false;
        }
        return true;
      } catch (err) {
        return false;
      }
    }
    module.exports = shouldUseNative() ? Object.assign : function(target, source) {
      var from;
      var to = toObject(target);
      var symbols;
      for (var s = 1; s < arguments.length; s++) {
        from = Object(arguments[s]);
        for (var key in from) {
          if (hasOwnProperty.call(from, key)) {
            to[key] = from[key];
          }
        }
        if (getOwnPropertySymbols) {
          symbols = getOwnPropertySymbols(from);
          for (var i = 0; i < symbols.length; i++) {
            if (propIsEnumerable.call(from, symbols[i])) {
              to[symbols[i]] = from[symbols[i]];
            }
          }
        }
      }
      return to;
    };
  }
});

// ../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/ReactPropTypesSecret.js
var require_ReactPropTypesSecret = __commonJS({
  "../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/ReactPropTypesSecret.js"(exports, module) {
    "use strict";
    var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
    module.exports = ReactPropTypesSecret;
  }
});

// ../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/has.js
var require_has = __commonJS({
  "../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/has.js"(exports, module) {
    module.exports = Function.call.bind(Object.prototype.hasOwnProperty);
  }
});

// ../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/checkPropTypes.js
var require_checkPropTypes = __commonJS({
  "../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/checkPropTypes.js"(exports, module) {
    "use strict";
    var printWarning = function() {
    };
    if (true) {
      ReactPropTypesSecret = require_ReactPropTypesSecret();
      loggedTypeFailures = {};
      has = require_has();
      printWarning = function(text) {
        var message = "Warning: " + text;
        if (typeof console !== "undefined") {
          console.error(message);
        }
        try {
          throw new Error(message);
        } catch (x) {
        }
      };
    }
    var ReactPropTypesSecret;
    var loggedTypeFailures;
    var has;
    function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
      if (true) {
        for (var typeSpecName in typeSpecs) {
          if (has(typeSpecs, typeSpecName)) {
            var error;
            try {
              if (typeof typeSpecs[typeSpecName] !== "function") {
                var err = Error(
                  (componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`."
                );
                err.name = "Invariant Violation";
                throw err;
              }
              error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret);
            } catch (ex) {
              error = ex;
            }
            if (error && !(error instanceof Error)) {
              printWarning(
                (componentName || "React class") + ": type specification of " + location + " `" + typeSpecName + "` is invalid; the type checker function must return `null` or an `Error` but returned a " + typeof error + ". You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument)."
              );
            }
            if (error instanceof Error && !(error.message in loggedTypeFailures)) {
              loggedTypeFailures[error.message] = true;
              var stack = getStack ? getStack() : "";
              printWarning(
                "Failed " + location + " type: " + error.message + (stack != null ? stack : "")
              );
            }
          }
        }
      }
    }
    checkPropTypes.resetWarningCache = function() {
      if (true) {
        loggedTypeFailures = {};
      }
    };
    module.exports = checkPropTypes;
  }
});

// ../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/factoryWithTypeCheckers.js
var require_factoryWithTypeCheckers = __commonJS({
  "../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/factoryWithTypeCheckers.js"(exports, module) {
    "use strict";
    var ReactIs = require_react_is();
    var assign = require_object_assign();
    var ReactPropTypesSecret = require_ReactPropTypesSecret();
    var has = require_has();
    var checkPropTypes = require_checkPropTypes();
    var printWarning = function() {
    };
    if (true) {
      printWarning = function(text) {
        var message = "Warning: " + text;
        if (typeof console !== "undefined") {
          console.error(message);
        }
        try {
          throw new Error(message);
        } catch (x) {
        }
      };
    }
    function emptyFunctionThatReturnsNull() {
      return null;
    }
    module.exports = function(isValidElement, throwOnDirectAccess) {
      var ITERATOR_SYMBOL = typeof Symbol === "function" && Symbol.iterator;
      var FAUX_ITERATOR_SYMBOL = "@@iterator";
      function getIteratorFn(maybeIterable) {
        var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
        if (typeof iteratorFn === "function") {
          return iteratorFn;
        }
      }
      var ANONYMOUS = "<<anonymous>>";
      var ReactPropTypes = {
        array: createPrimitiveTypeChecker("array"),
        bigint: createPrimitiveTypeChecker("bigint"),
        bool: createPrimitiveTypeChecker("boolean"),
        func: createPrimitiveTypeChecker("function"),
        number: createPrimitiveTypeChecker("number"),
        object: createPrimitiveTypeChecker("object"),
        string: createPrimitiveTypeChecker("string"),
        symbol: createPrimitiveTypeChecker("symbol"),
        any: createAnyTypeChecker(),
        arrayOf: createArrayOfTypeChecker,
        element: createElementTypeChecker(),
        elementType: createElementTypeTypeChecker(),
        instanceOf: createInstanceTypeChecker,
        node: createNodeChecker(),
        objectOf: createObjectOfTypeChecker,
        oneOf: createEnumTypeChecker,
        oneOfType: createUnionTypeChecker,
        shape: createShapeTypeChecker,
        exact: createStrictShapeTypeChecker
      };
      function is(x, y) {
        if (x === y) {
          return x !== 0 || 1 / x === 1 / y;
        } else {
          return x !== x && y !== y;
        }
      }
      function PropTypeError(message, data) {
        this.message = message;
        this.data = data && typeof data === "object" ? data : {};
        this.stack = "";
      }
      PropTypeError.prototype = Error.prototype;
      function createChainableTypeChecker(validate) {
        if (true) {
          var manualPropTypeCallCache = {};
          var manualPropTypeWarningCount = 0;
        }
        function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
          componentName = componentName || ANONYMOUS;
          propFullName = propFullName || propName;
          if (secret !== ReactPropTypesSecret) {
            if (throwOnDirectAccess) {
              var err = new Error(
                "Calling PropTypes validators directly is not supported by the `prop-types` package. Use `PropTypes.checkPropTypes()` to call them. Read more at http://fb.me/use-check-prop-types"
              );
              err.name = "Invariant Violation";
              throw err;
            } else if (typeof console !== "undefined") {
              var cacheKey = componentName + ":" + propName;
              if (!manualPropTypeCallCache[cacheKey] && // Avoid spamming the console because they are often not actionable except for lib authors
              manualPropTypeWarningCount < 3) {
                printWarning(
                  "You are manually calling a React.PropTypes validation function for the `" + propFullName + "` prop on `" + componentName + "`. This is deprecated and will throw in the standalone `prop-types` package. You may be seeing this warning due to a third-party PropTypes library. See https://fb.me/react-warning-dont-call-proptypes for details."
                );
                manualPropTypeCallCache[cacheKey] = true;
                manualPropTypeWarningCount++;
              }
            }
          }
          if (props[propName] == null) {
            if (isRequired) {
              if (props[propName] === null) {
                return new PropTypeError("The " + location + " `" + propFullName + "` is marked as required " + ("in `" + componentName + "`, but its value is `null`."));
              }
              return new PropTypeError("The " + location + " `" + propFullName + "` is marked as required in " + ("`" + componentName + "`, but its value is `undefined`."));
            }
            return null;
          } else {
            return validate(props, propName, componentName, location, propFullName);
          }
        }
        var chainedCheckType = checkType.bind(null, false);
        chainedCheckType.isRequired = checkType.bind(null, true);
        return chainedCheckType;
      }
      function createPrimitiveTypeChecker(expectedType) {
        function validate(props, propName, componentName, location, propFullName, secret) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== expectedType) {
            var preciseType = getPreciseType(propValue);
            return new PropTypeError(
              "Invalid " + location + " `" + propFullName + "` of type " + ("`" + preciseType + "` supplied to `" + componentName + "`, expected ") + ("`" + expectedType + "`."),
              { expectedType }
            );
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createAnyTypeChecker() {
        return createChainableTypeChecker(emptyFunctionThatReturnsNull);
      }
      function createArrayOfTypeChecker(typeChecker) {
        function validate(props, propName, componentName, location, propFullName) {
          if (typeof typeChecker !== "function") {
            return new PropTypeError("Property `" + propFullName + "` of component `" + componentName + "` has invalid PropType notation inside arrayOf.");
          }
          var propValue = props[propName];
          if (!Array.isArray(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected an array."));
          }
          for (var i = 0; i < propValue.length; i++) {
            var error = typeChecker(propValue, i, componentName, location, propFullName + "[" + i + "]", ReactPropTypesSecret);
            if (error instanceof Error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createElementTypeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          if (!isValidElement(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected a single ReactElement."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createElementTypeTypeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          if (!ReactIs.isValidElementType(propValue)) {
            var propType = getPropType(propValue);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected a single ReactElement type."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createInstanceTypeChecker(expectedClass) {
        function validate(props, propName, componentName, location, propFullName) {
          if (!(props[propName] instanceof expectedClass)) {
            var expectedClassName = expectedClass.name || ANONYMOUS;
            var actualClassName = getClassName(props[propName]);
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + actualClassName + "` supplied to `" + componentName + "`, expected ") + ("instance of `" + expectedClassName + "`."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createEnumTypeChecker(expectedValues) {
        if (!Array.isArray(expectedValues)) {
          if (true) {
            if (arguments.length > 1) {
              printWarning(
                "Invalid arguments supplied to oneOf, expected an array, got " + arguments.length + " arguments. A common mistake is to write oneOf(x, y, z) instead of oneOf([x, y, z])."
              );
            } else {
              printWarning("Invalid argument supplied to oneOf, expected an array.");
            }
          }
          return emptyFunctionThatReturnsNull;
        }
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          for (var i = 0; i < expectedValues.length; i++) {
            if (is(propValue, expectedValues[i])) {
              return null;
            }
          }
          var valuesString = JSON.stringify(expectedValues, function replacer(key, value) {
            var type = getPreciseType(value);
            if (type === "symbol") {
              return String(value);
            }
            return value;
          });
          return new PropTypeError("Invalid " + location + " `" + propFullName + "` of value `" + String(propValue) + "` " + ("supplied to `" + componentName + "`, expected one of " + valuesString + "."));
        }
        return createChainableTypeChecker(validate);
      }
      function createObjectOfTypeChecker(typeChecker) {
        function validate(props, propName, componentName, location, propFullName) {
          if (typeof typeChecker !== "function") {
            return new PropTypeError("Property `" + propFullName + "` of component `" + componentName + "` has invalid PropType notation inside objectOf.");
          }
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== "object") {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type " + ("`" + propType + "` supplied to `" + componentName + "`, expected an object."));
          }
          for (var key in propValue) {
            if (has(propValue, key)) {
              var error = typeChecker(propValue, key, componentName, location, propFullName + "." + key, ReactPropTypesSecret);
              if (error instanceof Error) {
                return error;
              }
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createUnionTypeChecker(arrayOfTypeCheckers) {
        if (!Array.isArray(arrayOfTypeCheckers)) {
          true ? printWarning("Invalid argument supplied to oneOfType, expected an instance of array.") : void 0;
          return emptyFunctionThatReturnsNull;
        }
        for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
          var checker = arrayOfTypeCheckers[i];
          if (typeof checker !== "function") {
            printWarning(
              "Invalid argument supplied to oneOfType. Expected an array of check functions, but received " + getPostfixForTypeWarning(checker) + " at index " + i + "."
            );
            return emptyFunctionThatReturnsNull;
          }
        }
        function validate(props, propName, componentName, location, propFullName) {
          var expectedTypes = [];
          for (var i2 = 0; i2 < arrayOfTypeCheckers.length; i2++) {
            var checker2 = arrayOfTypeCheckers[i2];
            var checkerResult = checker2(props, propName, componentName, location, propFullName, ReactPropTypesSecret);
            if (checkerResult == null) {
              return null;
            }
            if (checkerResult.data && has(checkerResult.data, "expectedType")) {
              expectedTypes.push(checkerResult.data.expectedType);
            }
          }
          var expectedTypesMessage = expectedTypes.length > 0 ? ", expected one of type [" + expectedTypes.join(", ") + "]" : "";
          return new PropTypeError("Invalid " + location + " `" + propFullName + "` supplied to " + ("`" + componentName + "`" + expectedTypesMessage + "."));
        }
        return createChainableTypeChecker(validate);
      }
      function createNodeChecker() {
        function validate(props, propName, componentName, location, propFullName) {
          if (!isNode2(props[propName])) {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` supplied to " + ("`" + componentName + "`, expected a ReactNode."));
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function invalidValidatorError(componentName, location, propFullName, key, type) {
        return new PropTypeError(
          (componentName || "React class") + ": " + location + " type `" + propFullName + "." + key + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + type + "`."
        );
      }
      function createShapeTypeChecker(shapeTypes) {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== "object") {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type `" + propType + "` " + ("supplied to `" + componentName + "`, expected `object`."));
          }
          for (var key in shapeTypes) {
            var checker = shapeTypes[key];
            if (typeof checker !== "function") {
              return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
            }
            var error = checker(propValue, key, componentName, location, propFullName + "." + key, ReactPropTypesSecret);
            if (error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function createStrictShapeTypeChecker(shapeTypes) {
        function validate(props, propName, componentName, location, propFullName) {
          var propValue = props[propName];
          var propType = getPropType(propValue);
          if (propType !== "object") {
            return new PropTypeError("Invalid " + location + " `" + propFullName + "` of type `" + propType + "` " + ("supplied to `" + componentName + "`, expected `object`."));
          }
          var allKeys = assign({}, props[propName], shapeTypes);
          for (var key in allKeys) {
            var checker = shapeTypes[key];
            if (has(shapeTypes, key) && typeof checker !== "function") {
              return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
            }
            if (!checker) {
              return new PropTypeError(
                "Invalid " + location + " `" + propFullName + "` key `" + key + "` supplied to `" + componentName + "`.\nBad object: " + JSON.stringify(props[propName], null, "  ") + "\nValid keys: " + JSON.stringify(Object.keys(shapeTypes), null, "  ")
              );
            }
            var error = checker(propValue, key, componentName, location, propFullName + "." + key, ReactPropTypesSecret);
            if (error) {
              return error;
            }
          }
          return null;
        }
        return createChainableTypeChecker(validate);
      }
      function isNode2(propValue) {
        switch (typeof propValue) {
          case "number":
          case "string":
          case "undefined":
            return true;
          case "boolean":
            return !propValue;
          case "object":
            if (Array.isArray(propValue)) {
              return propValue.every(isNode2);
            }
            if (propValue === null || isValidElement(propValue)) {
              return true;
            }
            var iteratorFn = getIteratorFn(propValue);
            if (iteratorFn) {
              var iterator = iteratorFn.call(propValue);
              var step;
              if (iteratorFn !== propValue.entries) {
                while (!(step = iterator.next()).done) {
                  if (!isNode2(step.value)) {
                    return false;
                  }
                }
              } else {
                while (!(step = iterator.next()).done) {
                  var entry = step.value;
                  if (entry) {
                    if (!isNode2(entry[1])) {
                      return false;
                    }
                  }
                }
              }
            } else {
              return false;
            }
            return true;
          default:
            return false;
        }
      }
      function isSymbol(propType, propValue) {
        if (propType === "symbol") {
          return true;
        }
        if (!propValue) {
          return false;
        }
        if (propValue["@@toStringTag"] === "Symbol") {
          return true;
        }
        if (typeof Symbol === "function" && propValue instanceof Symbol) {
          return true;
        }
        return false;
      }
      function getPropType(propValue) {
        var propType = typeof propValue;
        if (Array.isArray(propValue)) {
          return "array";
        }
        if (propValue instanceof RegExp) {
          return "object";
        }
        if (isSymbol(propType, propValue)) {
          return "symbol";
        }
        return propType;
      }
      function getPreciseType(propValue) {
        if (typeof propValue === "undefined" || propValue === null) {
          return "" + propValue;
        }
        var propType = getPropType(propValue);
        if (propType === "object") {
          if (propValue instanceof Date) {
            return "date";
          } else if (propValue instanceof RegExp) {
            return "regexp";
          }
        }
        return propType;
      }
      function getPostfixForTypeWarning(value) {
        var type = getPreciseType(value);
        switch (type) {
          case "array":
          case "object":
            return "an " + type;
          case "boolean":
          case "date":
          case "regexp":
            return "a " + type;
          default:
            return type;
        }
      }
      function getClassName(propValue) {
        if (!propValue.constructor || !propValue.constructor.name) {
          return ANONYMOUS;
        }
        return propValue.constructor.name;
      }
      ReactPropTypes.checkPropTypes = checkPropTypes;
      ReactPropTypes.resetWarningCache = checkPropTypes.resetWarningCache;
      ReactPropTypes.PropTypes = ReactPropTypes;
      return ReactPropTypes;
    };
  }
});

// ../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/index.js
var require_prop_types = __commonJS({
  "../../../node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/index.js"(exports, module) {
    if (true) {
      ReactIs = require_react_is();
      throwOnDirectAccess = true;
      module.exports = require_factoryWithTypeCheckers()(ReactIs.isElement, throwOnDirectAccess);
    } else {
      module.exports = null();
    }
    var ReactIs;
    var throwOnDirectAccess;
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/constants.js
var FOCUS_GROUP, FOCUS_DISABLED, FOCUS_ALLOW, FOCUS_AUTO, FOCUS_NO_AUTOFOCUS;
var init_constants = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/constants.js"() {
    FOCUS_GROUP = "data-focus-lock";
    FOCUS_DISABLED = "data-focus-lock-disabled";
    FOCUS_ALLOW = "data-no-focus-lock";
    FOCUS_AUTO = "data-autofocus-inside";
    FOCUS_NO_AUTOFOCUS = "data-no-autofocus";
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/assignRef.js
function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
  return ref;
}
var init_assignRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/assignRef.js"() {
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/useRef.js
function useCallbackRef(initialValue, callback) {
  var ref = (0, import_react.useState)(function() {
    return {
      // value
      value: initialValue,
      // last callback
      callback,
      // "memoized" public interface
      facade: {
        get current() {
          return ref.value;
        },
        set current(value) {
          var last = ref.value;
          if (last !== value) {
            ref.value = value;
            ref.callback(value, last);
          }
        }
      }
    };
  })[0];
  ref.callback = callback;
  return ref.facade;
}
var import_react;
var init_useRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/useRef.js"() {
    import_react = __toESM(require_react());
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/createRef.js
var init_createRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/createRef.js"() {
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/mergeRef.js
var init_mergeRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/mergeRef.js"() {
    init_assignRef();
    init_createRef();
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/useMergeRef.js
function useMergeRefs(refs, defaultValue) {
  var callbackRef = useCallbackRef(defaultValue || null, function(newValue) {
    return refs.forEach(function(ref) {
      return assignRef(ref, newValue);
    });
  });
  useIsomorphicLayoutEffect(function() {
    var oldValue = currentValues.get(callbackRef);
    if (oldValue) {
      var prevRefs_1 = new Set(oldValue);
      var nextRefs_1 = new Set(refs);
      var current_1 = callbackRef.current;
      prevRefs_1.forEach(function(ref) {
        if (!nextRefs_1.has(ref)) {
          assignRef(ref, null);
        }
      });
      nextRefs_1.forEach(function(ref) {
        if (!prevRefs_1.has(ref)) {
          assignRef(ref, current_1);
        }
      });
    }
    currentValues.set(callbackRef, refs);
  }, [refs]);
  return callbackRef;
}
var React, useIsomorphicLayoutEffect, currentValues;
var init_useMergeRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/useMergeRef.js"() {
    React = __toESM(require_react());
    init_assignRef();
    init_useRef();
    useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
    currentValues = /* @__PURE__ */ new WeakMap();
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/useTransformRef.js
var init_useTransformRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/useTransformRef.js"() {
    init_assignRef();
    init_useRef();
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/transformRef.js
var init_transformRef = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/transformRef.js"() {
    init_assignRef();
    init_createRef();
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/refToCallback.js
var init_refToCallback = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/refToCallback.js"() {
  }
});

// ../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/index.js
var init_es20152 = __esm({
  "../../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.27_react@19.2.4/node_modules/use-callback-ref/dist/es2015/index.js"() {
    init_assignRef();
    init_useRef();
    init_createRef();
    init_mergeRef();
    init_useMergeRef();
    init_useTransformRef();
    init_transformRef();
    init_refToCallback();
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/FocusGuard.js
var import_react2, import_prop_types, hiddenGuard, InFocusGuard, FocusGuard_default;
var init_FocusGuard = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/FocusGuard.js"() {
    import_react2 = __toESM(require_react());
    import_prop_types = __toESM(require_prop_types());
    hiddenGuard = {
      width: "1px",
      height: "0px",
      padding: 0,
      overflow: "hidden",
      position: "fixed",
      top: "1px",
      left: "1px"
    };
    InFocusGuard = function InFocusGuard2(_ref2) {
      var _ref$children = _ref2.children, children = _ref$children === void 0 ? null : _ref$children;
      return import_react2.default.createElement(import_react2.Fragment, null, import_react2.default.createElement("div", {
        key: "guard-first",
        "data-focus-guard": true,
        "data-focus-auto-guard": true,
        style: hiddenGuard
      }), children, children && import_react2.default.createElement("div", {
        key: "guard-last",
        "data-focus-guard": true,
        "data-focus-auto-guard": true,
        style: hiddenGuard
      }));
    };
    InFocusGuard.propTypes = true ? {
      children: import_prop_types.default.node
    } : {};
    FocusGuard_default = InFocusGuard;
  }
});

// ../../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
var __assign;
var init_tslib_es6 = __esm({
  "../../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs"() {
    __assign = function() {
      __assign = Object.assign || function __assign2(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
  }
});

// ../../../node_modules/.pnpm/detect-node-es@1.1.0/node_modules/detect-node-es/esm/browser.js
var init_browser = __esm({
  "../../../node_modules/.pnpm/detect-node-es@1.1.0/node_modules/detect-node-es/esm/browser.js"() {
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/env.js
var init_env = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/env.js"() {
    init_browser();
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/hook.js
var import_react3;
var init_hook = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/hook.js"() {
    import_react3 = __toESM(require_react());
    init_env();
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/hoc.js
var React3;
var init_hoc = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/hoc.js"() {
    init_tslib_es6();
    React3 = __toESM(require_react());
    init_hook();
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/config.js
var init_config = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/config.js"() {
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/medium.js
function ItoI(a) {
  return a;
}
function innerCreateMedium(defaults, middleware) {
  if (middleware === void 0) {
    middleware = ItoI;
  }
  var buffer = [];
  var assigned = false;
  var medium = {
    read: function() {
      if (assigned) {
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      }
      if (buffer.length) {
        return buffer[buffer.length - 1];
      }
      return defaults;
    },
    useMedium: function(data) {
      var item = middleware(data, assigned);
      buffer.push(item);
      return function() {
        buffer = buffer.filter(function(x) {
          return x !== item;
        });
      };
    },
    assignSyncMedium: function(cb) {
      assigned = true;
      while (buffer.length) {
        var cbs = buffer;
        buffer = [];
        cbs.forEach(cb);
      }
      buffer = {
        push: function(x) {
          return cb(x);
        },
        filter: function() {
          return buffer;
        }
      };
    },
    assignMedium: function(cb) {
      assigned = true;
      var pendingQueue = [];
      if (buffer.length) {
        var cbs = buffer;
        buffer = [];
        cbs.forEach(cb);
        pendingQueue = buffer;
      }
      var executeQueue = function() {
        var cbs2 = pendingQueue;
        pendingQueue = [];
        cbs2.forEach(cb);
      };
      var cycle = function() {
        return Promise.resolve().then(executeQueue);
      };
      cycle();
      buffer = {
        push: function(x) {
          pendingQueue.push(x);
          cycle();
        },
        filter: function(filter) {
          pendingQueue = pendingQueue.filter(filter);
          return buffer;
        }
      };
    }
  };
  return medium;
}
function createMedium(defaults, middleware) {
  if (middleware === void 0) {
    middleware = ItoI;
  }
  return innerCreateMedium(defaults, middleware);
}
function createSidecarMedium(options) {
  if (options === void 0) {
    options = {};
  }
  var medium = innerCreateMedium(null);
  medium.options = __assign({ async: true, ssr: false }, options);
  return medium;
}
var init_medium = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/medium.js"() {
    init_tslib_es6();
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/renderProp.js
var React4, import_react4;
var init_renderProp = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/renderProp.js"() {
    init_tslib_es6();
    React4 = __toESM(require_react());
    import_react4 = __toESM(require_react());
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/exports.js
var React5, SideCar;
var init_exports = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/exports.js"() {
    init_tslib_es6();
    React5 = __toESM(require_react());
    SideCar = function(_a) {
      var sideCar2 = _a.sideCar, rest = __rest(_a, ["sideCar"]);
      if (!sideCar2) {
        throw new Error("Sidecar: please provide `sideCar` property to import the right car");
      }
      var Target = sideCar2.read();
      if (!Target) {
        throw new Error("Sidecar medium not found");
      }
      return React5.createElement(Target, __assign({}, rest));
    };
    SideCar.isSideCarExport = true;
  }
});

// ../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/index.js
var init_es20153 = __esm({
  "../../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.27_react@19.2.4/node_modules/use-sidecar/dist/es2015/index.js"() {
    init_hoc();
    init_hook();
    init_config();
    init_medium();
    init_renderProp();
    init_exports();
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/medium.js
var mediumFocus, mediumBlur, mediumEffect, mediumSidecar;
var init_medium2 = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/medium.js"() {
    init_es20153();
    mediumFocus = createMedium({}, function(_ref2) {
      var target = _ref2.target, currentTarget = _ref2.currentTarget;
      return {
        target,
        currentTarget
      };
    });
    mediumBlur = createMedium();
    mediumEffect = createMedium();
    mediumSidecar = createSidecarMedium({
      async: true,
      ssr: typeof document !== "undefined"
    });
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/scope.js
var import_react5, focusScope;
var init_scope = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/scope.js"() {
    import_react5 = __toESM(require_react());
    focusScope = (0, import_react5.createContext)(void 0);
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/Lock.js
var import_react6, import_prop_types2, emptyArray, FocusLock, Lock_default;
var init_Lock = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/Lock.js"() {
    init_extends();
    import_react6 = __toESM(require_react());
    import_prop_types2 = __toESM(require_prop_types());
    init_constants();
    init_es20152();
    init_FocusGuard();
    init_medium2();
    init_scope();
    emptyArray = [];
    FocusLock = (0, import_react6.forwardRef)(function FocusLockUI(props, parentRef) {
      var _extends2;
      var _useState = (0, import_react6.useState)(), realObserved = _useState[0], setObserved = _useState[1];
      var observed = (0, import_react6.useRef)();
      var isActive = (0, import_react6.useRef)(false);
      var originalFocusedElement = (0, import_react6.useRef)(null);
      var _useState2 = (0, import_react6.useState)({}), update = _useState2[1];
      var children = props.children, _props$disabled = props.disabled, disabled = _props$disabled === void 0 ? false : _props$disabled, _props$noFocusGuards = props.noFocusGuards, noFocusGuards = _props$noFocusGuards === void 0 ? false : _props$noFocusGuards, _props$persistentFocu = props.persistentFocus, persistentFocus = _props$persistentFocu === void 0 ? false : _props$persistentFocu, _props$crossFrame = props.crossFrame, crossFrame = _props$crossFrame === void 0 ? true : _props$crossFrame, _props$autoFocus = props.autoFocus, autoFocus = _props$autoFocus === void 0 ? true : _props$autoFocus, allowTextSelection = props.allowTextSelection, group = props.group, className = props.className, whiteList = props.whiteList, hasPositiveIndices = props.hasPositiveIndices, _props$shards = props.shards, shards = _props$shards === void 0 ? emptyArray : _props$shards, _props$as = props.as, Container = _props$as === void 0 ? "div" : _props$as, _props$lockProps = props.lockProps, containerProps = _props$lockProps === void 0 ? {} : _props$lockProps, SideCar2 = props.sideCar, _props$returnFocus = props.returnFocus, shouldReturnFocus = _props$returnFocus === void 0 ? false : _props$returnFocus, focusOptions = props.focusOptions, onActivationCallback = props.onActivation, onDeactivationCallback = props.onDeactivation;
      var _useState3 = (0, import_react6.useState)({}), id = _useState3[0];
      var onActivation = (0, import_react6.useCallback)(function(_ref2) {
        var captureFocusRestore2 = _ref2.captureFocusRestore;
        if (!originalFocusedElement.current) {
          var _document;
          var activeElement = (_document = document) == null ? void 0 : _document.activeElement;
          originalFocusedElement.current = activeElement;
          if (activeElement !== document.body) {
            originalFocusedElement.current = captureFocusRestore2(activeElement);
          }
        }
        if (observed.current && onActivationCallback) {
          onActivationCallback(observed.current);
        }
        isActive.current = true;
        update();
      }, [onActivationCallback]);
      var onDeactivation = (0, import_react6.useCallback)(function() {
        isActive.current = false;
        if (onDeactivationCallback) {
          onDeactivationCallback(observed.current);
        }
        update();
      }, [onDeactivationCallback]);
      var returnFocus = (0, import_react6.useCallback)(function(allowDefer) {
        var focusRestore = originalFocusedElement.current;
        if (focusRestore) {
          var returnFocusTo = (typeof focusRestore === "function" ? focusRestore() : focusRestore) || document.body;
          var howToReturnFocus = typeof shouldReturnFocus === "function" ? shouldReturnFocus(returnFocusTo) : shouldReturnFocus;
          if (howToReturnFocus) {
            var returnFocusOptions = typeof howToReturnFocus === "object" ? howToReturnFocus : void 0;
            originalFocusedElement.current = null;
            if (allowDefer) {
              Promise.resolve().then(function() {
                return returnFocusTo.focus(returnFocusOptions);
              });
            } else {
              returnFocusTo.focus(returnFocusOptions);
            }
          }
        }
      }, [shouldReturnFocus]);
      var onFocus3 = (0, import_react6.useCallback)(function(event) {
        if (isActive.current) {
          mediumFocus.useMedium(event);
        }
      }, []);
      var onBlur3 = mediumBlur.useMedium;
      var setObserveNode = (0, import_react6.useCallback)(function(newObserved) {
        if (observed.current !== newObserved) {
          observed.current = newObserved;
          setObserved(newObserved);
        }
      }, []);
      if (true) {
        if (typeof allowTextSelection !== "undefined") {
          console.warn("React-Focus-Lock: allowTextSelection is deprecated and enabled by default");
        }
        (0, import_react6.useEffect)(function() {
          if (!observed.current && typeof Container !== "string") {
            console.error("FocusLock: could not obtain ref to internal node");
          }
        }, []);
      }
      var lockProps = _extends((_extends2 = {}, _extends2[FOCUS_DISABLED] = disabled && "disabled", _extends2[FOCUS_GROUP] = group, _extends2), containerProps);
      var hasLeadingGuards = noFocusGuards !== true;
      var hasTailingGuards = hasLeadingGuards && noFocusGuards !== "tail";
      var mergedRef = useMergeRefs([parentRef, setObserveNode]);
      var focusScopeValue = (0, import_react6.useMemo)(function() {
        return {
          observed,
          shards,
          enabled: !disabled,
          get active() {
            return isActive.current;
          }
        };
      }, [disabled, isActive, shards, observed]);
      return import_react6.default.createElement(import_react6.Fragment, null, hasLeadingGuards && [
        import_react6.default.createElement("div", {
          key: "guard-first",
          "data-focus-guard": true,
          tabIndex: disabled ? -1 : 0,
          style: hiddenGuard
        }),
        hasPositiveIndices ? import_react6.default.createElement("div", {
          key: "guard-nearest",
          "data-focus-guard": true,
          tabIndex: disabled ? -1 : 1,
          style: hiddenGuard
        }) : null
      ], !disabled && import_react6.default.createElement(SideCar2, {
        id,
        sideCar: mediumSidecar,
        observed: realObserved,
        disabled,
        persistentFocus,
        crossFrame,
        autoFocus,
        whiteList,
        shards,
        onActivation,
        onDeactivation,
        returnFocus,
        focusOptions,
        noFocusGuards
      }), import_react6.default.createElement(Container, _extends({
        ref: mergedRef
      }, lockProps, {
        className,
        onBlur: onBlur3,
        onFocus: onFocus3
      }), import_react6.default.createElement(focusScope.Provider, {
        value: focusScopeValue
      }, children)), hasTailingGuards && import_react6.default.createElement("div", {
        "data-focus-guard": true,
        tabIndex: disabled ? -1 : 0,
        style: hiddenGuard
      }));
    });
    FocusLock.propTypes = true ? {
      children: import_prop_types2.node,
      disabled: import_prop_types2.bool,
      returnFocus: (0, import_prop_types2.oneOfType)([import_prop_types2.bool, import_prop_types2.object, import_prop_types2.func]),
      focusOptions: import_prop_types2.object,
      noFocusGuards: import_prop_types2.bool,
      hasPositiveIndices: import_prop_types2.bool,
      allowTextSelection: import_prop_types2.bool,
      autoFocus: import_prop_types2.bool,
      persistentFocus: import_prop_types2.bool,
      crossFrame: import_prop_types2.bool,
      group: import_prop_types2.string,
      className: import_prop_types2.string,
      whiteList: import_prop_types2.func,
      shards: (0, import_prop_types2.arrayOf)(import_prop_types2.any),
      as: (0, import_prop_types2.oneOfType)([import_prop_types2.string, import_prop_types2.func, import_prop_types2.object]),
      lockProps: import_prop_types2.object,
      onActivation: import_prop_types2.func,
      onDeactivation: import_prop_types2.func,
      sideCar: import_prop_types2.any.isRequired
    } : {};
    Lock_default = FocusLock;
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function _setPrototypeOf(t, e) {
  return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
    return t2.__proto__ = e2, t2;
  }, _setPrototypeOf(t, e);
}
var init_setPrototypeOf = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js"() {
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function _inheritsLoose(t, o) {
  t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o);
}
var init_inheritsLoose = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/inheritsLoose.js"() {
    init_setPrototypeOf();
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
var init_typeof = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/typeof.js"() {
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/toPrimitive.js
function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var init_toPrimitive = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/toPrimitive.js"() {
    init_typeof();
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/toPropertyKey.js
function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : i + "";
}
var init_toPropertyKey = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/toPropertyKey.js"() {
    init_typeof();
    init_toPrimitive();
  }
});

// ../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}
var init_defineProperty = __esm({
  "../../../node_modules/.pnpm/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/esm/defineProperty.js"() {
    init_toPropertyKey();
  }
});

// ../../../node_modules/.pnpm/react-clientside-effect@1.2.8_react@19.2.4/node_modules/react-clientside-effect/lib/index.es.js
function withSideEffect(reducePropsToState2, handleStateChangeOnClient2) {
  if (true) {
    if (typeof reducePropsToState2 !== "function") {
      throw new Error("Expected reducePropsToState to be a function.");
    }
    if (typeof handleStateChangeOnClient2 !== "function") {
      throw new Error("Expected handleStateChangeOnClient to be a function.");
    }
  }
  function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || "Component";
  }
  return function wrap(WrappedComponent) {
    if (true) {
      if (typeof WrappedComponent !== "function") {
        throw new Error("Expected WrappedComponent to be a React component.");
      }
    }
    var mountedInstances = [];
    var state;
    function emitChange() {
      state = reducePropsToState2(mountedInstances.map(function(instance) {
        return instance.props;
      }));
      handleStateChangeOnClient2(state);
    }
    var SideEffect = (function(_PureComponent) {
      _inheritsLoose(SideEffect2, _PureComponent);
      function SideEffect2() {
        return _PureComponent.apply(this, arguments) || this;
      }
      SideEffect2.peek = function peek() {
        return state;
      };
      var _proto = SideEffect2.prototype;
      _proto.componentDidMount = function componentDidMount() {
        mountedInstances.push(this);
        emitChange();
      };
      _proto.componentDidUpdate = function componentDidUpdate() {
        emitChange();
      };
      _proto.componentWillUnmount = function componentWillUnmount() {
        var index = mountedInstances.indexOf(this);
        mountedInstances.splice(index, 1);
        emitChange();
      };
      _proto.render = function render() {
        return import_react7.default.createElement(WrappedComponent, this.props);
      };
      return SideEffect2;
    })(import_react7.PureComponent);
    _defineProperty(SideEffect, "displayName", "SideEffect(" + getDisplayName(WrappedComponent) + ")");
    return SideEffect;
  };
}
var import_react7, index_es_default;
var init_index_es = __esm({
  "../../../node_modules/.pnpm/react-clientside-effect@1.2.8_react@19.2.4/node_modules/react-clientside-effect/lib/index.es.js"() {
    init_inheritsLoose();
    init_defineProperty();
    import_react7 = __toESM(require_react());
    index_es_default = withSideEffect;
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/array.js
var toArray, asArray, getFirst;
var init_array = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/array.js"() {
    toArray = function(a) {
      var ret = Array(a.length);
      for (var i = 0; i < a.length; ++i) {
        ret[i] = a[i];
      }
      return ret;
    };
    asArray = function(a) {
      return Array.isArray(a) ? a : [a];
    };
    getFirst = function(a) {
      return Array.isArray(a) ? a[0] : a;
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/is.js
var isElementHidden, getParentNode, isTopNode, isInert, isVisibleUncached, isVisibleCached, isAutoFocusAllowedUncached, isAutoFocusAllowedCached, getDataset, isHTMLButtonElement, isHTMLInputElement, isRadioElement, notHiddenInput, isAutoFocusAllowed, isGuard, isNotAGuard, isDefined;
var init_is = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/is.js"() {
    init_constants();
    isElementHidden = function(node2) {
      if (node2.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      var computedStyle = window.getComputedStyle(node2, null);
      if (!computedStyle || !computedStyle.getPropertyValue) {
        return false;
      }
      return computedStyle.getPropertyValue("display") === "none" || computedStyle.getPropertyValue("visibility") === "hidden";
    };
    getParentNode = function(node2) {
      return node2.parentNode && node2.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node2.parentNode.host
      ) : node2.parentNode;
    };
    isTopNode = function(node2) {
      return node2 === document || node2 && node2.nodeType === Node.DOCUMENT_NODE;
    };
    isInert = function(node2) {
      return node2.hasAttribute("inert");
    };
    isVisibleUncached = function(node2, checkParent) {
      return !node2 || isTopNode(node2) || !isElementHidden(node2) && !isInert(node2) && checkParent(getParentNode(node2));
    };
    isVisibleCached = function(visibilityCache, node2) {
      var cached = visibilityCache.get(node2);
      if (cached !== void 0) {
        return cached;
      }
      var result = isVisibleUncached(node2, isVisibleCached.bind(void 0, visibilityCache));
      visibilityCache.set(node2, result);
      return result;
    };
    isAutoFocusAllowedUncached = function(node2, checkParent) {
      return node2 && !isTopNode(node2) ? isAutoFocusAllowed(node2) ? checkParent(getParentNode(node2)) : false : true;
    };
    isAutoFocusAllowedCached = function(cache, node2) {
      var cached = cache.get(node2);
      if (cached !== void 0) {
        return cached;
      }
      var result = isAutoFocusAllowedUncached(node2, isAutoFocusAllowedCached.bind(void 0, cache));
      cache.set(node2, result);
      return result;
    };
    getDataset = function(node2) {
      return node2.dataset;
    };
    isHTMLButtonElement = function(node2) {
      return node2.tagName === "BUTTON";
    };
    isHTMLInputElement = function(node2) {
      return node2.tagName === "INPUT";
    };
    isRadioElement = function(node2) {
      return isHTMLInputElement(node2) && node2.type === "radio";
    };
    notHiddenInput = function(node2) {
      return !((isHTMLInputElement(node2) || isHTMLButtonElement(node2)) && (node2.type === "hidden" || node2.disabled));
    };
    isAutoFocusAllowed = function(node2) {
      var attribute = node2.getAttribute(FOCUS_NO_AUTOFOCUS);
      return ![true, "true", ""].includes(attribute);
    };
    isGuard = function(node2) {
      var _a;
      return Boolean(node2 && ((_a = getDataset(node2)) === null || _a === void 0 ? void 0 : _a.focusGuard));
    };
    isNotAGuard = function(node2) {
      return !isGuard(node2);
    };
    isDefined = function(x) {
      return Boolean(x);
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/tabOrder.js
var tabSort, getTabIndex, orderByTabIndex;
var init_tabOrder = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/tabOrder.js"() {
    init_array();
    tabSort = function(a, b) {
      var aTab = Math.max(0, a.tabIndex);
      var bTab = Math.max(0, b.tabIndex);
      var tabDiff = aTab - bTab;
      var indexDiff = a.index - b.index;
      if (tabDiff) {
        if (!aTab) {
          return 1;
        }
        if (!bTab) {
          return -1;
        }
      }
      return tabDiff || indexDiff;
    };
    getTabIndex = function(node2) {
      if (node2.tabIndex < 0) {
        if (!node2.hasAttribute("tabindex")) {
          return 0;
        }
      }
      return node2.tabIndex;
    };
    orderByTabIndex = function(nodes, filterNegative, keepGuards) {
      return toArray(nodes).map(function(node2, index) {
        var tabIndex = getTabIndex(node2);
        return {
          node: node2,
          index,
          tabIndex: keepGuards && tabIndex === -1 ? (node2.dataset || {}).focusGuard ? 0 : -1 : tabIndex
        };
      }).filter(function(data) {
        return !filterNegative || data.tabIndex >= 0;
      }).sort(tabSort);
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/tabbables.js
var tabbables;
var init_tabbables = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/tabbables.js"() {
    tabbables = [
      "button:enabled",
      "select:enabled",
      "textarea:enabled",
      "input:enabled",
      // elements with explicit roles will also use explicit tabindex
      // '[role="button"]',
      "a[href]",
      "area[href]",
      "summary",
      "iframe",
      "object",
      "embed",
      "audio[controls]",
      "video[controls]",
      "[tabindex]",
      "[contenteditable]",
      "[autofocus]"
    ];
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/tabUtils.js
var queryTabbables, queryGuardTabbables, getFocusablesWithShadowDom, getFocusablesWithIFrame, getFocusables, getParentAutofocusables;
var init_tabUtils = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/tabUtils.js"() {
    init_constants();
    init_array();
    init_tabbables();
    queryTabbables = tabbables.join(",");
    queryGuardTabbables = "".concat(queryTabbables, ", [data-focus-guard]");
    getFocusablesWithShadowDom = function(parent, withGuards) {
      return toArray((parent.shadowRoot || parent).children).reduce(function(acc, child) {
        return acc.concat(child.matches(withGuards ? queryGuardTabbables : queryTabbables) ? [child] : [], getFocusablesWithShadowDom(child));
      }, []);
    };
    getFocusablesWithIFrame = function(parent, withGuards) {
      var _a;
      if (parent instanceof HTMLIFrameElement && ((_a = parent.contentDocument) === null || _a === void 0 ? void 0 : _a.body)) {
        return getFocusables([parent.contentDocument.body], withGuards);
      }
      return [parent];
    };
    getFocusables = function(parents, withGuards) {
      return parents.reduce(function(acc, parent) {
        var _a;
        var focusableWithShadowDom = getFocusablesWithShadowDom(parent, withGuards);
        var focusableWithIframes = (_a = []).concat.apply(_a, focusableWithShadowDom.map(function(node2) {
          return getFocusablesWithIFrame(node2, withGuards);
        }));
        return acc.concat(
          // add all tabbables inside and within shadow DOMs in DOM order
          focusableWithIframes,
          // add if node is tabbable itself
          parent.parentNode ? toArray(parent.parentNode.querySelectorAll(queryTabbables)).filter(function(node2) {
            return node2 === parent;
          }) : []
        );
      }, []);
    };
    getParentAutofocusables = function(parent) {
      var parentFocus = parent.querySelectorAll("[".concat(FOCUS_AUTO, "]"));
      return toArray(parentFocus).map(function(node2) {
        return getFocusables([node2]);
      }).reduce(function(acc, nodes) {
        return acc.concat(nodes);
      }, []);
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/DOMutils.js
var filterFocusable, filterAutoFocusable, getTabbableNodes, getFocusableNodes, parentAutofocusables, contains;
var init_DOMutils = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/DOMutils.js"() {
    init_array();
    init_is();
    init_tabOrder();
    init_tabUtils();
    filterFocusable = function(nodes, visibilityCache) {
      return toArray(nodes).filter(function(node2) {
        return isVisibleCached(visibilityCache, node2);
      }).filter(function(node2) {
        return notHiddenInput(node2);
      });
    };
    filterAutoFocusable = function(nodes, cache) {
      if (cache === void 0) {
        cache = /* @__PURE__ */ new Map();
      }
      return toArray(nodes).filter(function(node2) {
        return isAutoFocusAllowedCached(cache, node2);
      });
    };
    getTabbableNodes = function(topNodes, visibilityCache, withGuards) {
      return orderByTabIndex(filterFocusable(getFocusables(topNodes, withGuards), visibilityCache), true, withGuards);
    };
    getFocusableNodes = function(topNodes, visibilityCache) {
      return orderByTabIndex(filterFocusable(getFocusables(topNodes), visibilityCache), false);
    };
    parentAutofocusables = function(topNode, visibilityCache) {
      return filterFocusable(getParentAutofocusables(topNode), visibilityCache);
    };
    contains = function(scope, element) {
      if (scope.shadowRoot) {
        return contains(scope.shadowRoot, element);
      } else {
        if (Object.getPrototypeOf(scope).contains !== void 0 && Object.getPrototypeOf(scope).contains.call(scope, element)) {
          return true;
        }
        return toArray(scope.children).some(function(child) {
          var _a;
          if (child instanceof HTMLIFrameElement) {
            var iframeBody = (_a = child.contentDocument) === null || _a === void 0 ? void 0 : _a.body;
            if (iframeBody) {
              return contains(iframeBody, element);
            }
            return false;
          }
          return contains(child, element);
        });
      }
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/all-affected.js
var filterNested, getTopParent, getAllAffectedNodes;
var init_all_affected = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/all-affected.js"() {
    init_constants();
    init_array();
    filterNested = function(nodes) {
      var contained = /* @__PURE__ */ new Set();
      var l = nodes.length;
      for (var i = 0; i < l; i += 1) {
        for (var j = i + 1; j < l; j += 1) {
          var position = nodes[i].compareDocumentPosition(nodes[j]);
          if ((position & Node.DOCUMENT_POSITION_CONTAINED_BY) > 0) {
            contained.add(j);
          }
          if ((position & Node.DOCUMENT_POSITION_CONTAINS) > 0) {
            contained.add(i);
          }
        }
      }
      return nodes.filter(function(_, index) {
        return !contained.has(index);
      });
    };
    getTopParent = function(node2) {
      return node2.parentNode ? getTopParent(node2.parentNode) : node2;
    };
    getAllAffectedNodes = function(node2) {
      var nodes = asArray(node2);
      return nodes.filter(Boolean).reduce(function(acc, currentNode) {
        var group = currentNode.getAttribute(FOCUS_GROUP);
        acc.push.apply(acc, group ? filterNested(toArray(getTopParent(currentNode).querySelectorAll("[".concat(FOCUS_GROUP, '="').concat(group, '"]:not([').concat(FOCUS_DISABLED, '="disabled"])')))) : [currentNode]);
        return acc;
      }, []);
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/safe.js
var safeProbe;
var init_safe = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/safe.js"() {
    safeProbe = function(cb) {
      try {
        return cb();
      } catch (e) {
        return void 0;
      }
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/getActiveElement.js
var getActiveElement;
var init_getActiveElement = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/getActiveElement.js"() {
    init_safe();
    getActiveElement = function(inDocument) {
      if (inDocument === void 0) {
        inDocument = document;
      }
      if (!inDocument || !inDocument.activeElement) {
        return void 0;
      }
      var activeElement = inDocument.activeElement;
      return activeElement.shadowRoot ? getActiveElement(activeElement.shadowRoot) : activeElement instanceof HTMLIFrameElement && safeProbe(function() {
        return activeElement.contentWindow.document;
      }) ? getActiveElement(activeElement.contentWindow.document) : activeElement;
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusInside.js
var focusInFrame, focusInsideIframe, focusInside;
var init_focusInside = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusInside.js"() {
    init_DOMutils();
    init_all_affected();
    init_array();
    init_getActiveElement();
    focusInFrame = function(frame, activeElement) {
      return frame === activeElement;
    };
    focusInsideIframe = function(topNode, activeElement) {
      return Boolean(toArray(topNode.querySelectorAll("iframe")).some(function(node2) {
        return focusInFrame(node2, activeElement);
      }));
    };
    focusInside = function(topNode, activeElement) {
      if (activeElement === void 0) {
        activeElement = getActiveElement(getFirst(topNode).ownerDocument);
      }
      if (!activeElement || activeElement.dataset && activeElement.dataset.focusGuard) {
        return false;
      }
      return getAllAffectedNodes(topNode).some(function(node2) {
        return contains(node2, activeElement) || focusInsideIframe(node2, activeElement);
      });
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusIsHidden.js
var focusIsHidden;
var init_focusIsHidden = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusIsHidden.js"() {
    init_constants();
    init_DOMutils();
    init_array();
    init_getActiveElement();
    focusIsHidden = function(inDocument) {
      if (inDocument === void 0) {
        inDocument = document;
      }
      var activeElement = getActiveElement(inDocument);
      if (!activeElement) {
        return false;
      }
      return toArray(inDocument.querySelectorAll("[".concat(FOCUS_ALLOW, "]"))).some(function(node2) {
        return contains(node2, activeElement);
      });
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/correctFocus.js
var findSelectedRadio, correctNode, correctNodes;
var init_correctFocus = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/correctFocus.js"() {
    init_is();
    findSelectedRadio = function(node2, nodes) {
      return nodes.filter(isRadioElement).filter(function(el) {
        return el.name === node2.name;
      }).filter(function(el) {
        return el.checked;
      })[0] || node2;
    };
    correctNode = function(node2, nodes) {
      if (isRadioElement(node2) && node2.name) {
        return findSelectedRadio(node2, nodes);
      }
      return node2;
    };
    correctNodes = function(nodes) {
      var resultSet = /* @__PURE__ */ new Set();
      nodes.forEach(function(node2) {
        return resultSet.add(correctNode(node2, nodes));
      });
      return nodes.filter(function(node2) {
        return resultSet.has(node2);
      });
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/firstFocus.js
var pickFirstFocus, pickFocusable;
var init_firstFocus = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/firstFocus.js"() {
    init_correctFocus();
    pickFirstFocus = function(nodes) {
      if (nodes[0] && nodes.length > 1) {
        return correctNode(nodes[0], nodes);
      }
      return nodes[0];
    };
    pickFocusable = function(nodes, node2) {
      return nodes.indexOf(correctNode(node2, nodes));
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/solver.js
var NEW_FOCUS, newFocus;
var init_solver = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/solver.js"() {
    init_correctFocus();
    init_firstFocus();
    init_is();
    NEW_FOCUS = "NEW_FOCUS";
    newFocus = function(innerNodes, innerTabbables, outerNodes, activeElement, lastNode) {
      var cnt = innerNodes.length;
      var firstFocus = innerNodes[0];
      var lastFocus = innerNodes[cnt - 1];
      var isOnGuard = isGuard(activeElement);
      if (activeElement && innerNodes.indexOf(activeElement) >= 0) {
        return void 0;
      }
      var activeIndex = activeElement !== void 0 ? outerNodes.indexOf(activeElement) : -1;
      var lastIndex = lastNode ? outerNodes.indexOf(lastNode) : activeIndex;
      var lastNodeInside = lastNode ? innerNodes.indexOf(lastNode) : -1;
      if (activeIndex === -1) {
        if (lastNodeInside !== -1) {
          return lastNodeInside;
        }
        return NEW_FOCUS;
      }
      if (lastNodeInside === -1) {
        return NEW_FOCUS;
      }
      var indexDiff = activeIndex - lastIndex;
      var firstNodeIndex = outerNodes.indexOf(firstFocus);
      var lastNodeIndex = outerNodes.indexOf(lastFocus);
      var correctedNodes = correctNodes(outerNodes);
      var currentFocusableIndex = activeElement !== void 0 ? correctedNodes.indexOf(activeElement) : -1;
      var previousFocusableIndex = lastNode ? correctedNodes.indexOf(lastNode) : currentFocusableIndex;
      var tabbableNodes = correctedNodes.filter(function(node2) {
        return node2.tabIndex >= 0;
      });
      var currentTabbableIndex = activeElement !== void 0 ? tabbableNodes.indexOf(activeElement) : -1;
      var previousTabbableIndex = lastNode ? tabbableNodes.indexOf(lastNode) : currentTabbableIndex;
      var focusIndexDiff = currentTabbableIndex >= 0 && previousTabbableIndex >= 0 ? (
        // old/new are tabbables, measure distance in tabbable space
        previousTabbableIndex - currentTabbableIndex
      ) : (
        // or else measure in focusable space
        previousFocusableIndex - currentFocusableIndex
      );
      if (!indexDiff && lastNodeInside >= 0) {
        return lastNodeInside;
      }
      if (innerTabbables.length === 0) {
        return lastNodeInside;
      }
      var returnFirstNode = pickFocusable(innerNodes, innerTabbables[0]);
      var returnLastNode = pickFocusable(innerNodes, innerTabbables[innerTabbables.length - 1]);
      if (activeIndex <= firstNodeIndex && isOnGuard && Math.abs(indexDiff) > 1) {
        return returnLastNode;
      }
      if (activeIndex >= lastNodeIndex && isOnGuard && Math.abs(indexDiff) > 1) {
        return returnFirstNode;
      }
      if (indexDiff && Math.abs(focusIndexDiff) > 1) {
        return lastNodeInside;
      }
      if (activeIndex <= firstNodeIndex) {
        return returnLastNode;
      }
      if (activeIndex > lastNodeIndex) {
        return returnFirstNode;
      }
      if (indexDiff) {
        if (Math.abs(indexDiff) > 1) {
          return lastNodeInside;
        }
        return (cnt + lastNodeInside + indexDiff) % cnt;
      }
      return void 0;
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/auto-focus.js
var findAutoFocused, pickAutofocus;
var init_auto_focus = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/auto-focus.js"() {
    init_DOMutils();
    init_firstFocus();
    init_is();
    findAutoFocused = function(autoFocusables) {
      return function(node2) {
        var _a;
        var autofocus = (_a = getDataset(node2)) === null || _a === void 0 ? void 0 : _a.autofocus;
        return (
          // @ts-expect-error
          node2.autofocus || //
          autofocus !== void 0 && autofocus !== "false" || //
          autoFocusables.indexOf(node2) >= 0
        );
      };
    };
    pickAutofocus = function(nodesIndexes, orderedNodes, groups) {
      var nodes = nodesIndexes.map(function(_a) {
        var node2 = _a.node;
        return node2;
      });
      var autoFocusable = filterAutoFocusable(nodes.filter(findAutoFocused(groups)));
      if (autoFocusable && autoFocusable.length) {
        return pickFirstFocus(autoFocusable);
      }
      return pickFirstFocus(filterAutoFocusable(orderedNodes));
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/parenting.js
var getParents, getCommonParent, getTopCommonParent, allParentAutofocusables;
var init_parenting = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/utils/parenting.js"() {
    init_DOMutils();
    init_DOMutils();
    init_array();
    getParents = function(node2, parents) {
      if (parents === void 0) {
        parents = [];
      }
      parents.push(node2);
      if (node2.parentNode) {
        getParents(node2.parentNode.host || node2.parentNode, parents);
      }
      return parents;
    };
    getCommonParent = function(nodeA, nodeB) {
      var parentsA = getParents(nodeA);
      var parentsB = getParents(nodeB);
      for (var i = 0; i < parentsA.length; i += 1) {
        var currentParent = parentsA[i];
        if (parentsB.indexOf(currentParent) >= 0) {
          return currentParent;
        }
      }
      return false;
    };
    getTopCommonParent = function(baseActiveElement, leftEntry, rightEntries) {
      var activeElements = asArray(baseActiveElement);
      var leftEntries = asArray(leftEntry);
      var activeElement = activeElements[0];
      var topCommon = false;
      leftEntries.filter(Boolean).forEach(function(entry) {
        topCommon = getCommonParent(topCommon || entry, entry) || topCommon;
        rightEntries.filter(Boolean).forEach(function(subEntry) {
          var common = getCommonParent(activeElement, subEntry);
          if (common) {
            if (!topCommon || contains(common, topCommon)) {
              topCommon = common;
            } else {
              topCommon = getCommonParent(common, topCommon);
            }
          }
        });
      });
      return topCommon;
    };
    allParentAutofocusables = function(entries, visibilityCache) {
      return entries.reduce(function(acc, node2) {
        return acc.concat(parentAutofocusables(node2, visibilityCache));
      }, []);
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusSolver.js
var reorderNodes, focusSolver;
var init_focusSolver = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusSolver.js"() {
    init_solver();
    init_DOMutils();
    init_all_affected();
    init_array();
    init_auto_focus();
    init_getActiveElement();
    init_is();
    init_parenting();
    reorderNodes = function(srcNodes, dstNodes) {
      var remap = /* @__PURE__ */ new Map();
      dstNodes.forEach(function(entity) {
        return remap.set(entity.node, entity);
      });
      return srcNodes.map(function(node2) {
        return remap.get(node2);
      }).filter(isDefined);
    };
    focusSolver = function(topNode, lastNode) {
      var activeElement = getActiveElement(asArray(topNode).length > 0 ? document : getFirst(topNode).ownerDocument);
      var entries = getAllAffectedNodes(topNode).filter(isNotAGuard);
      var commonParent = getTopCommonParent(activeElement || topNode, topNode, entries);
      var visibilityCache = /* @__PURE__ */ new Map();
      var anyFocusable = getFocusableNodes(entries, visibilityCache);
      var innerElements = anyFocusable.filter(function(_a) {
        var node2 = _a.node;
        return isNotAGuard(node2);
      });
      if (!innerElements[0]) {
        return void 0;
      }
      var outerNodes = getFocusableNodes([commonParent], visibilityCache).map(function(_a) {
        var node2 = _a.node;
        return node2;
      });
      var orderedInnerElements = reorderNodes(outerNodes, innerElements);
      var innerFocusables = orderedInnerElements.map(function(_a) {
        var node2 = _a.node;
        return node2;
      });
      var innerTabbable = orderedInnerElements.filter(function(_a) {
        var tabIndex = _a.tabIndex;
        return tabIndex >= 0;
      }).map(function(_a) {
        var node2 = _a.node;
        return node2;
      });
      var newId = newFocus(innerFocusables, innerTabbable, outerNodes, activeElement, lastNode);
      if (newId === NEW_FOCUS) {
        var focusNode = (
          // first try only tabbable, and the fallback to all focusable, as long as at least one element should be picked for focus
          pickAutofocus(anyFocusable, innerTabbable, allParentAutofocusables(entries, visibilityCache)) || pickAutofocus(anyFocusable, innerFocusables, allParentAutofocusables(entries, visibilityCache))
        );
        if (focusNode) {
          return { node: focusNode };
        } else {
          console.warn("focus-lock: cannot find any node to move focus into");
          return void 0;
        }
      }
      if (newId === void 0) {
        return newId;
      }
      return orderedInnerElements[newId];
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusables.js
var expandFocusableNodes;
var init_focusables = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/focusables.js"() {
    init_all_affected();
    init_is();
    init_parenting();
    init_tabOrder();
    init_tabUtils();
    expandFocusableNodes = function(topNode) {
      var entries = getAllAffectedNodes(topNode).filter(isNotAGuard);
      var commonParent = getTopCommonParent(topNode, topNode, entries);
      var outerNodes = orderByTabIndex(getFocusables([commonParent], true), true, true);
      var innerElements = getFocusables(entries, false);
      return outerNodes.map(function(_a) {
        var node2 = _a.node, index = _a.index;
        return {
          node: node2,
          index,
          lockItem: innerElements.indexOf(node2) >= 0,
          guard: isGuard(node2)
        };
      });
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/commands.js
var focusOn;
var init_commands = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/commands.js"() {
    focusOn = function(target, focusOptions) {
      if (!target) {
        return;
      }
      if ("focus" in target) {
        target.focus(focusOptions);
      }
      if ("contentWindow" in target && target.contentWindow) {
        target.contentWindow.focus();
      }
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/moveFocusInside.js
var guardCount, lockDisabled, moveFocusInside;
var init_moveFocusInside = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/moveFocusInside.js"() {
    init_commands();
    init_focusSolver();
    guardCount = 0;
    lockDisabled = false;
    moveFocusInside = function(topNode, lastNode, options) {
      if (options === void 0) {
        options = {};
      }
      var focusable = focusSolver(topNode, lastNode);
      if (lockDisabled) {
        return;
      }
      if (focusable) {
        if (guardCount > 2) {
          console.error("FocusLock: focus-fighting detected. Only one focus management system could be active. See https://github.com/theKashey/focus-lock/#focus-fighting");
          lockDisabled = true;
          setTimeout(function() {
            lockDisabled = false;
          }, 1);
          return;
        }
        guardCount++;
        focusOn(focusable.node, options.focusOptions);
        guardCount--;
      }
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/return-focus.js
function weakRef(value) {
  if (!value)
    return null;
  if (typeof WeakRef === "undefined") {
    return function() {
      return value || null;
    };
  }
  var w = value ? new WeakRef(value) : null;
  return function() {
    return (w === null || w === void 0 ? void 0 : w.deref()) || null;
  };
}
var recordElementLocation, restoreFocusTo, captureFocusRestore;
var init_return_focus = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/return-focus.js"() {
    init_DOMutils();
    recordElementLocation = function(element) {
      if (!element) {
        return null;
      }
      var stack = [];
      var currentElement = element;
      while (currentElement && currentElement !== document.body) {
        stack.push({
          current: weakRef(currentElement),
          parent: weakRef(currentElement.parentElement),
          left: weakRef(currentElement.previousElementSibling),
          right: weakRef(currentElement.nextElementSibling)
        });
        currentElement = currentElement.parentElement;
      }
      return {
        element: weakRef(element),
        stack,
        ownerDocument: element.ownerDocument
      };
    };
    restoreFocusTo = function(location) {
      var _a, _b, _c, _d, _e;
      if (!location) {
        return void 0;
      }
      var stack = location.stack, ownerDocument = location.ownerDocument;
      var visibilityCache = /* @__PURE__ */ new Map();
      for (var _i = 0, stack_1 = stack; _i < stack_1.length; _i++) {
        var line = stack_1[_i];
        var parent_1 = (_a = line.parent) === null || _a === void 0 ? void 0 : _a.call(line);
        if (parent_1 && ownerDocument.contains(parent_1)) {
          var left = (_b = line.left) === null || _b === void 0 ? void 0 : _b.call(line);
          var savedCurrent = line.current();
          var current = parent_1.contains(savedCurrent) ? savedCurrent : void 0;
          var right = (_c = line.right) === null || _c === void 0 ? void 0 : _c.call(line);
          var focusables = getTabbableNodes([parent_1], visibilityCache);
          var aim = (
            // that is element itself
            (_e = (_d = current !== null && current !== void 0 ? current : (
              // or something in it's place
              left === null || left === void 0 ? void 0 : left.nextElementSibling
            )) !== null && _d !== void 0 ? _d : (
              // or somebody to the right, still close enough
              right
            )) !== null && _e !== void 0 ? _e : (
              // or somebody to the left, something?
              left
            )
          );
          while (aim) {
            for (var _f = 0, focusables_1 = focusables; _f < focusables_1.length; _f++) {
              var focusable = focusables_1[_f];
              if (aim === null || aim === void 0 ? void 0 : aim.contains(focusable.node)) {
                return focusable.node;
              }
            }
            aim = aim.nextElementSibling;
          }
          if (focusables.length) {
            return focusables[0].node;
          }
        }
      }
      return void 0;
    };
    captureFocusRestore = function(targetElement) {
      var location = recordElementLocation(targetElement);
      return function() {
        return restoreFocusTo(location);
      };
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/sibling.js
var getRelativeFocusable, getBoundary, defaultOptions, moveFocus, focusNextElement, focusPrevElement, pickBoundary, focusFirstElement, focusLastElement;
var init_sibling = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/sibling.js"() {
    init_commands();
    init_DOMutils();
    init_array();
    getRelativeFocusable = function(element, scope, useTabbables) {
      if (!element || !scope) {
        console.error("no element or scope given");
        return {};
      }
      var shards = asArray(scope);
      if (shards.every(function(shard) {
        return !contains(shard, element);
      })) {
        console.error("Active element is not contained in the scope");
        return {};
      }
      var focusables = useTabbables ? getTabbableNodes(shards, /* @__PURE__ */ new Map()) : getFocusableNodes(shards, /* @__PURE__ */ new Map());
      var current = focusables.findIndex(function(_a) {
        var node2 = _a.node;
        return node2 === element;
      });
      if (current === -1) {
        return void 0;
      }
      return {
        prev: focusables[current - 1],
        next: focusables[current + 1],
        first: focusables[0],
        last: focusables[focusables.length - 1]
      };
    };
    getBoundary = function(shards, useTabbables) {
      var set = useTabbables ? getTabbableNodes(asArray(shards), /* @__PURE__ */ new Map()) : getFocusableNodes(asArray(shards), /* @__PURE__ */ new Map());
      return {
        first: set[0],
        last: set[set.length - 1]
      };
    };
    defaultOptions = function(options) {
      return Object.assign({
        scope: document.body,
        cycle: true,
        onlyTabbable: true
      }, options);
    };
    moveFocus = function(fromElement, options, cb) {
      if (options === void 0) {
        options = {};
      }
      var newOptions = defaultOptions(options);
      var solution = getRelativeFocusable(fromElement, newOptions.scope, newOptions.onlyTabbable);
      if (!solution) {
        return;
      }
      var target = cb(solution, newOptions.cycle);
      if (target) {
        focusOn(target.node, newOptions.focusOptions);
      }
    };
    focusNextElement = function(fromElement, options) {
      if (options === void 0) {
        options = {};
      }
      moveFocus(fromElement, options, function(_a, cycle) {
        var next = _a.next, first = _a.first;
        return next || cycle && first;
      });
    };
    focusPrevElement = function(fromElement, options) {
      if (options === void 0) {
        options = {};
      }
      moveFocus(fromElement, options, function(_a, cycle) {
        var prev = _a.prev, last = _a.last;
        return prev || cycle && last;
      });
    };
    pickBoundary = function(scope, options, what) {
      var _a;
      var boundary = getBoundary(scope, (_a = options.onlyTabbable) !== null && _a !== void 0 ? _a : true);
      var node2 = boundary[what];
      if (node2) {
        focusOn(node2.node, options.focusOptions);
      }
    };
    focusFirstElement = function(scope, options) {
      if (options === void 0) {
        options = {};
      }
      pickBoundary(scope, options, "first");
    };
    focusLastElement = function(scope, options) {
      if (options === void 0) {
        options = {};
      }
      pickBoundary(scope, options, "last");
    };
  }
});

// ../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/index.js
var init_es20154 = __esm({
  "../../../node_modules/.pnpm/focus-lock@1.3.6/node_modules/focus-lock/dist/es2015/index.js"() {
    init_constants();
    init_focusInside();
    init_focusIsHidden();
    init_focusSolver();
    init_focusables();
    init_moveFocusInside();
    init_return_focus();
    init_sibling();
    init_DOMutils();
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/util.js
function deferAction(action) {
  setTimeout(action, 1);
}
var inlineProp, extractRef;
var init_util = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/util.js"() {
    inlineProp = function inlineProp2(name, value) {
      var obj = {};
      obj[name] = value;
      return obj;
    };
    extractRef = function extractRef2(ref) {
      return ref && "current" in ref ? ref.current : ref;
    };
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/Trap.js
function autoGuard(startIndex, end, step, allNodes) {
  var lastGuard = null;
  var i = startIndex;
  do {
    var item = allNodes[i];
    if (item.guard) {
      if (item.node.dataset.focusAutoGuard) {
        lastGuard = item;
      }
    } else if (item.lockItem) {
      if (i !== startIndex) {
        return;
      }
      lastGuard = null;
    } else {
      break;
    }
  } while ((i += step) !== end);
  if (lastGuard) {
    lastGuard.node.tabIndex = 0;
  }
}
function reducePropsToState(propsList) {
  return propsList.filter(function(_ref6) {
    var disabled = _ref6.disabled;
    return !disabled;
  });
}
function handleStateChangeOnClient(traps) {
  var trap = traps.slice(-1)[0];
  if (trap && !lastActiveTrap) {
    attachHandler();
  }
  var lastTrap = lastActiveTrap;
  var sameTrap = lastTrap && trap && trap.id === lastTrap.id;
  lastActiveTrap = trap;
  if (lastTrap && !sameTrap) {
    lastTrap.onDeactivation();
    if (!traps.filter(function(_ref7) {
      var id = _ref7.id;
      return id === lastTrap.id;
    }).length) {
      lastTrap.returnFocus(!trap);
    }
  }
  if (trap) {
    lastActiveFocus = null;
    if (!sameTrap || lastTrap.observed !== trap.observed) {
      trap.onActivation(focusLockAPI);
    }
    activateTrap(true);
    deferAction(activateTrap);
  } else {
    detachHandler();
    lastActiveFocus = null;
  }
}
var import_react8, import_prop_types3, focusOnBody, isFreeFocus, lastActiveTrap, lastActiveFocus, tryRestoreFocus, lastPortaledElement, focusWasOutsideWindow, windowFocused, defaultWhitelist, focusWhitelisted, recordPortal, focusIsPortaledPair, focusWasOutside, checkInHost, withinHost, getNodeFocusables, isNotFocusable, activateTrap, onTrap, onBlur, onFocus, FocusWatcher, FocusTrap, onWindowFocus, onWindowBlur, attachHandler, detachHandler, focusLockAPI, Trap_default;
var init_Trap = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/Trap.js"() {
    import_react8 = __toESM(require_react());
    import_prop_types3 = __toESM(require_prop_types());
    init_index_es();
    init_es20154();
    init_util();
    init_medium2();
    focusOnBody = function focusOnBody2() {
      return document && document.activeElement === document.body;
    };
    isFreeFocus = function isFreeFocus2() {
      return focusOnBody() || focusIsHidden();
    };
    lastActiveTrap = null;
    lastActiveFocus = null;
    tryRestoreFocus = function tryRestoreFocus2() {
      return null;
    };
    lastPortaledElement = null;
    focusWasOutsideWindow = false;
    windowFocused = false;
    defaultWhitelist = function defaultWhitelist2() {
      return true;
    };
    focusWhitelisted = function focusWhitelisted2(activeElement) {
      return (lastActiveTrap.whiteList || defaultWhitelist)(activeElement);
    };
    recordPortal = function recordPortal2(observerNode, portaledElement) {
      lastPortaledElement = {
        observerNode,
        portaledElement
      };
    };
    focusIsPortaledPair = function focusIsPortaledPair2(element) {
      return lastPortaledElement && lastPortaledElement.portaledElement === element;
    };
    focusWasOutside = function focusWasOutside2(crossFrameOption) {
      if (crossFrameOption) {
        return Boolean(focusWasOutsideWindow);
      }
      return focusWasOutsideWindow === "meanwhile";
    };
    checkInHost = function checkInHost2(check, el, boundary) {
      return el && (el.host === check && (!el.activeElement || boundary.contains(el.activeElement)) || el.parentNode && checkInHost2(check, el.parentNode, boundary));
    };
    withinHost = function withinHost2(activeElement, workingArea) {
      return workingArea.some(function(area) {
        return checkInHost(activeElement, area, area);
      });
    };
    getNodeFocusables = function getNodeFocusables2(nodes) {
      return getFocusableNodes(nodes, /* @__PURE__ */ new Map());
    };
    isNotFocusable = function isNotFocusable2(node2) {
      return !getNodeFocusables([node2.parentNode]).some(function(el) {
        return el.node === node2;
      });
    };
    activateTrap = function activateTrap2() {
      var result = false;
      if (lastActiveTrap) {
        var _lastActiveTrap = lastActiveTrap, observed = _lastActiveTrap.observed, persistentFocus = _lastActiveTrap.persistentFocus, autoFocus = _lastActiveTrap.autoFocus, shards = _lastActiveTrap.shards, crossFrame = _lastActiveTrap.crossFrame, focusOptions = _lastActiveTrap.focusOptions, noFocusGuards = _lastActiveTrap.noFocusGuards;
        var workingNode = observed || lastPortaledElement && lastPortaledElement.portaledElement;
        if (focusOnBody() && lastActiveFocus && lastActiveFocus !== document.body) {
          if (!document.body.contains(lastActiveFocus) || isNotFocusable(lastActiveFocus)) {
            var newTarget = tryRestoreFocus();
            if (newTarget) {
              newTarget.focus();
            }
          }
        }
        var activeElement = document && document.activeElement;
        if (workingNode) {
          var workingArea = [workingNode].concat(shards.map(extractRef).filter(Boolean));
          var shouldForceRestoreFocus = function shouldForceRestoreFocus2() {
            if (!focusWasOutside(crossFrame) || !noFocusGuards || !lastActiveFocus || windowFocused) {
              return false;
            }
            var nodes = getNodeFocusables(workingArea);
            var lastIndex = nodes.findIndex(function(_ref2) {
              var node2 = _ref2.node;
              return node2 === lastActiveFocus;
            });
            return lastIndex === 0 || lastIndex === nodes.length - 1;
          };
          if (!activeElement || focusWhitelisted(activeElement)) {
            if (persistentFocus || shouldForceRestoreFocus() || !isFreeFocus() || !lastActiveFocus && autoFocus) {
              if (workingNode && !(focusInside(workingArea) || activeElement && withinHost(activeElement, workingArea) || focusIsPortaledPair(activeElement, workingNode))) {
                if (document && !lastActiveFocus && activeElement && !autoFocus) {
                  if (activeElement.blur) {
                    activeElement.blur();
                  }
                  document.body.focus();
                } else {
                  result = moveFocusInside(workingArea, lastActiveFocus, {
                    focusOptions
                  });
                  lastPortaledElement = {};
                }
              }
              lastActiveFocus = document && document.activeElement;
              if (lastActiveFocus !== document.body) {
                tryRestoreFocus = captureFocusRestore(lastActiveFocus);
              }
              focusWasOutsideWindow = false;
            }
          }
          if (document && activeElement !== document.activeElement && document.querySelector("[data-focus-auto-guard]")) {
            var newActiveElement = document && document.activeElement;
            var allNodes = expandFocusableNodes(workingArea);
            var focusedIndex = allNodes.map(function(_ref2) {
              var node2 = _ref2.node;
              return node2;
            }).indexOf(newActiveElement);
            if (focusedIndex > -1) {
              allNodes.filter(function(_ref3) {
                var guard = _ref3.guard, node2 = _ref3.node;
                return guard && node2.dataset.focusAutoGuard;
              }).forEach(function(_ref4) {
                var node2 = _ref4.node;
                return node2.removeAttribute("tabIndex");
              });
              autoGuard(focusedIndex, allNodes.length, 1, allNodes);
              autoGuard(focusedIndex, -1, -1, allNodes);
            }
          }
        }
      }
      return result;
    };
    onTrap = function onTrap2(event) {
      if (activateTrap() && event) {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    onBlur = function onBlur2() {
      return deferAction(activateTrap);
    };
    onFocus = function onFocus2(event) {
      var source = event.target;
      var currentNode = event.currentTarget;
      if (!currentNode.contains(source)) {
        recordPortal(currentNode, source);
      }
    };
    FocusWatcher = function FocusWatcher2() {
      return null;
    };
    FocusTrap = function FocusTrap2(_ref5) {
      var children = _ref5.children;
      return import_react8.default.createElement("div", {
        onBlur,
        onFocus
      }, children);
    };
    FocusTrap.propTypes = true ? {
      children: import_prop_types3.default.node.isRequired
    } : {};
    onWindowFocus = function onWindowFocus2() {
      windowFocused = true;
    };
    onWindowBlur = function onWindowBlur2() {
      windowFocused = false;
      focusWasOutsideWindow = "just";
      deferAction(function() {
        focusWasOutsideWindow = "meanwhile";
      });
    };
    attachHandler = function attachHandler2() {
      document.addEventListener("focusin", onTrap);
      document.addEventListener("focusout", onBlur);
      window.addEventListener("focus", onWindowFocus);
      window.addEventListener("blur", onWindowBlur);
    };
    detachHandler = function detachHandler2() {
      document.removeEventListener("focusin", onTrap);
      document.removeEventListener("focusout", onBlur);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
    };
    focusLockAPI = {
      moveFocusInside,
      focusInside,
      focusNextElement,
      focusPrevElement,
      focusFirstElement,
      focusLastElement,
      captureFocusRestore
    };
    mediumFocus.assignSyncMedium(onFocus);
    mediumBlur.assignMedium(onBlur);
    mediumEffect.assignMedium(function(cb) {
      return cb(focusLockAPI);
    });
    Trap_default = index_es_default(reducePropsToState, handleStateChangeOnClient)(FocusWatcher);
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/Combination.js
var import_react9, FocusLockCombination, _ref, sideCar, propTypes, Combination_default;
var init_Combination = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/Combination.js"() {
    init_objectWithoutPropertiesLoose();
    init_extends();
    import_react9 = __toESM(require_react());
    init_Lock();
    init_Trap();
    FocusLockCombination = (0, import_react9.forwardRef)(function FocusLockUICombination(props, ref) {
      return import_react9.default.createElement(Lock_default, _extends({
        sideCar: Trap_default,
        ref
      }, props));
    });
    _ref = Lock_default.propTypes || {};
    sideCar = _ref.sideCar;
    propTypes = _objectWithoutPropertiesLoose(_ref, ["sideCar"]);
    FocusLockCombination.propTypes = true ? propTypes : {};
    Combination_default = FocusLockCombination;
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/AutoFocusInside.js
var import_react10, import_prop_types4, AutoFocusInside, AutoFocusInside_default;
var init_AutoFocusInside = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/AutoFocusInside.js"() {
    init_extends();
    import_react10 = __toESM(require_react());
    import_prop_types4 = __toESM(require_prop_types());
    init_constants();
    init_util();
    AutoFocusInside = function AutoFocusInside2(_ref2) {
      var _ref$disabled = _ref2.disabled, disabled = _ref$disabled === void 0 ? false : _ref$disabled, children = _ref2.children, _ref$className = _ref2.className, className = _ref$className === void 0 ? void 0 : _ref$className;
      return import_react10.default.createElement("div", _extends({}, inlineProp(FOCUS_AUTO, !disabled), {
        className
      }), children);
    };
    AutoFocusInside.propTypes = true ? {
      children: import_prop_types4.default.node.isRequired,
      disabled: import_prop_types4.default.bool,
      className: import_prop_types4.default.string
    } : {};
    AutoFocusInside_default = AutoFocusInside;
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/MoveFocusInside.js
function MoveFocusInside(_ref2) {
  var _ref$disabled = _ref2.disabled, isDisabled = _ref$disabled === void 0 ? false : _ref$disabled, className = _ref2.className, children = _ref2.children;
  var ref = (0, import_react11.useRef)(null);
  useFocusInside(isDisabled ? void 0 : ref);
  return import_react11.default.createElement("div", _extends({}, inlineProp(FOCUS_AUTO, !isDisabled), {
    ref,
    className
  }), children);
}
var import_react11, import_prop_types5, useFocusInside, MoveFocusInside_default;
var init_MoveFocusInside = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/MoveFocusInside.js"() {
    init_extends();
    import_react11 = __toESM(require_react());
    import_prop_types5 = __toESM(require_prop_types());
    init_constants();
    init_util();
    init_medium2();
    useFocusInside = function useFocusInside2(observedRef) {
      (0, import_react11.useEffect)(function() {
        var enabled = true;
        mediumEffect.useMedium(function(car) {
          var observed = observedRef && observedRef.current;
          if (enabled && observed) {
            if (!car.focusInside(observed)) {
              car.moveFocusInside(observed, null);
            }
          }
        });
        return function() {
          enabled = false;
        };
      }, [observedRef]);
    };
    MoveFocusInside.propTypes = true ? {
      children: import_prop_types5.default.node.isRequired,
      disabled: import_prop_types5.default.bool,
      className: import_prop_types5.default.string
    } : {};
    MoveFocusInside_default = MoveFocusInside;
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/FreeFocusInside.js
var import_react12, import_prop_types6, FreeFocusInside, FreeFocusInside_default;
var init_FreeFocusInside = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/FreeFocusInside.js"() {
    init_extends();
    import_react12 = __toESM(require_react());
    import_prop_types6 = __toESM(require_prop_types());
    init_constants();
    init_util();
    FreeFocusInside = function FreeFocusInside2(_ref2) {
      var children = _ref2.children, className = _ref2.className;
      return import_react12.default.createElement("div", _extends({}, inlineProp(FOCUS_ALLOW, true), {
        className
      }), children);
    };
    FreeFocusInside.propTypes = true ? {
      children: import_prop_types6.default.node.isRequired,
      className: import_prop_types6.default.string
    } : {};
    FreeFocusInside_default = FreeFocusInside;
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/use-focus-scope.js
var import_react13, collapseRefs, withMedium, useFocusController, useFocusScope;
var init_use_focus_scope = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/use-focus-scope.js"() {
    init_extends();
    import_react13 = __toESM(require_react());
    init_scope();
    init_medium2();
    init_util();
    collapseRefs = function collapseRefs2(shards) {
      return shards.map(extractRef).filter(Boolean);
    };
    withMedium = function withMedium2(fn) {
      return new Promise(function(resolve) {
        return mediumEffect.useMedium(function() {
          resolve(fn.apply(void 0, arguments));
        });
      });
    };
    useFocusController = function useFocusController2() {
      for (var _len = arguments.length, shards = new Array(_len), _key = 0; _key < _len; _key++) {
        shards[_key] = arguments[_key];
      }
      if (!shards.length) {
        throw new Error("useFocusController requires at least one target element");
      }
      var ref = (0, import_react13.useRef)(shards);
      ref.current = shards;
      return (0, import_react13.useMemo)(function() {
        return {
          autoFocus: function autoFocus(focusOptions) {
            if (focusOptions === void 0) {
              focusOptions = {};
            }
            return withMedium(function(car) {
              return car.moveFocusInside(collapseRefs(ref.current), null, focusOptions);
            });
          },
          focusNext: function focusNext(options) {
            return withMedium(function(car) {
              car.moveFocusInside(collapseRefs(ref.current), null);
              car.focusNextElement(document.activeElement, _extends({
                scope: collapseRefs(ref.current)
              }, options));
            });
          },
          focusPrev: function focusPrev(options) {
            return withMedium(function(car) {
              car.moveFocusInside(collapseRefs(ref.current), null);
              car.focusPrevElement(document.activeElement, _extends({
                scope: collapseRefs(ref.current)
              }, options));
            });
          },
          focusFirst: function focusFirst(options) {
            return withMedium(function(car) {
              car.focusFirstElement(collapseRefs(ref.current), options);
            });
          },
          focusLast: function focusLast(options) {
            return withMedium(function(car) {
              car.focusLastElement(collapseRefs(ref.current), options);
            });
          }
        };
      }, []);
    };
    useFocusScope = function useFocusScope2() {
      var scope = (0, import_react13.useContext)(focusScope);
      if (!scope) {
        throw new Error("FocusLock is required to operate with FocusScope");
      }
      return useFocusController.apply(void 0, [scope.observed].concat(scope.shards));
    };
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/nano-events.js
var createNanoEvents;
var init_nano_events = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/nano-events.js"() {
    createNanoEvents = function createNanoEvents2() {
      return {
        emit: function emit(event) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }
          for (var i = 0, callbacks = this.events[event] || [], length = callbacks.length; i < length; i++) {
            callbacks[i].apply(callbacks, args);
          }
        },
        events: {},
        on: function on(event, cb) {
          var _this$events, _this = this;
          ((_this$events = this.events)[event] || (_this$events[event] = [])).push(cb);
          return function() {
            var _this$events$event;
            _this.events[event] = (_this$events$event = _this.events[event]) == null ? void 0 : _this$events$event.filter(function(i) {
              return cb !== i;
            });
          };
        }
      };
    };
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/use-focus-state.js
var import_react14, mainbus, subscribeCounter, onFocusIn, onFocusOut, useDocumentFocusSubscribe, getFocusState, useFocusState;
var init_use_focus_state = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/use-focus-state.js"() {
    import_react14 = __toESM(require_react());
    init_nano_events();
    mainbus = createNanoEvents();
    subscribeCounter = 0;
    onFocusIn = function onFocusIn2(event) {
      return mainbus.emit("assign", event.target);
    };
    onFocusOut = function onFocusOut2(event) {
      return mainbus.emit("reset", event.target);
    };
    useDocumentFocusSubscribe = function useDocumentFocusSubscribe2() {
      (0, import_react14.useEffect)(function() {
        if (!subscribeCounter) {
          document.addEventListener("focusin", onFocusIn);
          document.addEventListener("focusout", onFocusOut);
        }
        subscribeCounter += 1;
        return function() {
          subscribeCounter -= 1;
          if (!subscribeCounter) {
            document.removeEventListener("focusin", onFocusIn);
            document.removeEventListener("focusout", onFocusOut);
          }
        };
      }, []);
    };
    getFocusState = function getFocusState2(target, current) {
      if (target === current) {
        return "self";
      }
      if (current.contains(target)) {
        return "within";
      }
      return "within-boundary";
    };
    useFocusState = function useFocusState2(callbacks) {
      if (callbacks === void 0) {
        callbacks = {};
      }
      var _useState = (0, import_react14.useState)(false), active = _useState[0], setActive = _useState[1];
      var _useState2 = (0, import_react14.useState)(""), state = _useState2[0], setState = _useState2[1];
      var ref = (0, import_react14.useRef)(null);
      var focusState = (0, import_react14.useRef)({});
      var stateTracker = (0, import_react14.useRef)(false);
      (0, import_react14.useEffect)(function() {
        if (ref.current) {
          var isAlreadyFocused = ref.current === document.activeElement || ref.current.contains(document.activeElement);
          setActive(isAlreadyFocused);
          setState(getFocusState(document.activeElement, ref.current));
          if (isAlreadyFocused && callbacks.onFocus) {
            callbacks.onFocus();
          }
        }
      }, []);
      var onFocus3 = (0, import_react14.useCallback)(function(e) {
        focusState.current = {
          focused: true,
          state: getFocusState(e.target, e.currentTarget)
        };
      }, []);
      useDocumentFocusSubscribe();
      (0, import_react14.useEffect)(function() {
        var fout = mainbus.on("reset", function() {
          focusState.current = {};
        });
        var fin = mainbus.on("assign", function() {
          var newState = focusState.current.focused || false;
          setActive(newState);
          setState(focusState.current.state || "");
          if (newState !== stateTracker.current) {
            stateTracker.current = newState;
            if (newState) {
              callbacks.onFocus && callbacks.onFocus();
            } else {
              callbacks.onBlur && callbacks.onBlur();
            }
          }
        });
        return function() {
          fout();
          fin();
        };
      }, []);
      return {
        active,
        state,
        onFocus: onFocus3,
        ref
      };
    };
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/UI.js
var init_UI = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/UI.js"() {
    init_Lock();
    init_AutoFocusInside();
    init_MoveFocusInside();
    init_FreeFocusInside();
    init_FocusGuard();
    init_use_focus_scope();
    init_use_focus_state();
  }
});

// ../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/index.js
var es2015_exports2 = {};
__export(es2015_exports2, {
  AutoFocusInside: () => AutoFocusInside_default,
  FocusLockUI: () => Lock_default,
  FreeFocusInside: () => FreeFocusInside_default,
  InFocusGuard: () => FocusGuard_default,
  MoveFocusInside: () => MoveFocusInside_default,
  default: () => es2015_default,
  useFocusController: () => useFocusController,
  useFocusInside: () => useFocusInside,
  useFocusScope: () => useFocusScope,
  useFocusState: () => useFocusState
});
var es2015_default;
var init_es20155 = __esm({
  "../../../node_modules/.pnpm/react-focus-lock@2.13.7_@types+react@18.3.27_react@19.2.4/node_modules/react-focus-lock/dist/es2015/index.js"() {
    init_Combination();
    init_UI();
    es2015_default = Combination_default;
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/utils.js
var require_utils = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.capitalize = capitalize;
    exports.fromPopperPlacement = fromPopperPlacement;
    exports.getArrowPositionStyles = getArrowPositionStyles;
    exports.getEndPosition = getEndPosition;
    exports.getOppositePosition = getOppositePosition;
    exports.getPopoverMarginStyles = getPopoverMarginStyles;
    exports.getStartPosition = getStartPosition;
    exports.isVerticalPosition = isVerticalPosition;
    exports.splitPlacement = splitPlacement;
    var _constants = require_constants();
    var OPPOSITE_POSITIONS = {
      top: "bottom",
      bottom: "top",
      right: "left",
      left: "right"
    };
    function getOppositePosition(position) {
      return OPPOSITE_POSITIONS[position];
    }
    function isVerticalPosition(position) {
      return position === "top" || position === "bottom";
    }
    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    function fromPopperPlacement(placement) {
      const popoverPlacement = placement.replace(/(top|bottom)-start$/, "$1Left").replace(/(top|bottom)-end$/, "$1Right").replace(/(left|right)-start$/, "$1Top").replace(/(left|right)-end$/, "$1Bottom");
      return _constants.PLACEMENT[popoverPlacement] || null;
    }
    function splitPlacement(placement) {
      const matches = placement.match(/^([a-z]+)([A-Z][a-z]+)?/) || [];
      return matches.slice(1, 3).filter(Boolean).map((s) => s.toLowerCase());
    }
    function getPopoverMarginStyles(arrowSize, placement, popoverMargin) {
      const [position] = splitPlacement(placement);
      const opposite = getOppositePosition(position);
      if (!opposite) {
        return null;
      }
      const property = `margin${capitalize(opposite)}`;
      return {
        [property]: `${arrowSize + popoverMargin}px`
      };
    }
    function getStartPosition(offset, placement, arrowSize, popoverMargin) {
      offset = {
        ...offset
      };
      const [position] = splitPlacement(placement);
      const margin = (arrowSize > 0 ? arrowSize : popoverMargin) * 2;
      if (isVerticalPosition(position)) {
        offset.top += position === "top" ? margin : -margin;
      } else {
        offset.left += position === "left" ? margin : -margin;
      }
      return `translate3d(${offset.left}px, ${offset.top}px, 0)`;
    }
    function getEndPosition(offset) {
      return `translate3d(${offset.left}px, ${offset.top}px, 0)`;
    }
    function getArrowPositionStyles(offsets, placement) {
      const [position] = splitPlacement(placement);
      const oppositePosition = getOppositePosition(position);
      if (!oppositePosition) {
        return null;
      }
      const alignmentProperty = isVerticalPosition(position) ? "left" : "top";
      return {
        // @ts-ignore
        [alignmentProperty]: `${offsets[alignmentProperty]}px`,
        [oppositePosition]: `-${_constants.ARROW_SIZE - 2}px`
      };
    }
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/styled-components.js
var require_styled_components = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/styled-components.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.Padding = exports.Inner = exports.Hidden = exports.Body = exports.Arrow = void 0;
    exports.getArrowStyles = getArrowStyles;
    exports.getBodyStyles = getBodyStyles;
    exports.getInnerStyles = getInnerStyles;
    var _styles = require_styles();
    var _constants = require_constants();
    var _utils = require_utils();
    function getBodyStyles(props) {
      const {
        $animationDuration,
        $isOpen,
        $isAnimating,
        $placement,
        $popoverOffset,
        $showArrow,
        $theme,
        $popoverMargin,
        $isHoverTrigger
      } = props;
      return {
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: $theme.colors.backgroundTertiary,
        borderTopLeftRadius: $theme.borders.popoverBorderRadius,
        borderTopRightRadius: $theme.borders.popoverBorderRadius,
        borderBottomRightRadius: $theme.borders.popoverBorderRadius,
        borderBottomLeftRadius: $theme.borders.popoverBorderRadius,
        boxShadow: $theme.lighting.shadow600,
        transitionProperty: "opacity,transform",
        transitionDuration: $isAnimating ? $isOpen ? "0.1s" : `${$animationDuration}ms` : "0s",
        transitionTimingFunction: $isOpen ? $theme.animation.easeOutCurve : $theme.animation.easeInCurve,
        opacity: $isAnimating && $isOpen ? 1 : 0,
        transform: $isAnimating && $isOpen ? (0, _utils.getEndPosition)($popoverOffset) : (0, _utils.getStartPosition)($popoverOffset, $placement, $showArrow ? _constants.ARROW_SIZE : 0, $popoverMargin),
        ...(0, _utils.getPopoverMarginStyles)($showArrow ? _constants.ARROW_SIZE : 0, $placement, $popoverMargin),
        ...$isHoverTrigger ? {
          animationDuration: ".1s",
          animationName: {
            "0%": {
              pointerEvents: "none"
            },
            "99%": {
              pointerEvents: "none"
            },
            "100%": {
              pointerEvents: "auto"
            }
          }
        } : {}
      };
    }
    var Body = exports.Body = (0, _styles.styled)("div", getBodyStyles);
    Body.displayName = "Body";
    Body.displayName = "Body";
    function getArrowStyles(props) {
      const {
        $arrowOffset,
        $placement,
        $theme
      } = props;
      return {
        backgroundColor: $theme.colors.backgroundTertiary,
        boxShadow: $theme.lighting.shadow600,
        width: `${_constants.ARROW_WIDTH}px`,
        height: `${_constants.ARROW_WIDTH}px`,
        transform: "rotate(45deg)",
        position: "absolute",
        ...(0, _utils.getArrowPositionStyles)($arrowOffset, $placement)
      };
    }
    var Arrow = exports.Arrow = (0, _styles.styled)("div", getArrowStyles);
    Arrow.displayName = "Arrow";
    Arrow.displayName = "Arrow";
    function getInnerStyles({
      $theme
    }) {
      return {
        backgroundColor: $theme.colors.backgroundTertiary,
        borderTopLeftRadius: $theme.borders.popoverBorderRadius,
        borderTopRightRadius: $theme.borders.popoverBorderRadius,
        borderBottomRightRadius: $theme.borders.popoverBorderRadius,
        borderBottomLeftRadius: $theme.borders.popoverBorderRadius,
        color: $theme.colors.contentPrimary,
        position: "relative"
      };
    }
    var Inner = exports.Inner = (0, _styles.styled)("div", getInnerStyles);
    Inner.displayName = "Inner";
    Inner.displayName = "Inner";
    var Padding = exports.Padding = (0, _styles.styled)("div", {
      paddingLeft: "12px",
      paddingTop: "12px",
      paddingRight: "12px",
      paddingBottom: "12px"
    });
    Padding.displayName = "Padding";
    Padding.displayName = "Padding";
    var Hidden = exports.Hidden = (0, _styles.styled)("div", {
      display: "none"
    });
    Hidden.displayName = "Hidden";
    Hidden.displayName = "Hidden";
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/default-props.js
var require_default_props = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/default-props.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _constants = require_constants();
    var baseDefaultProps = {
      accessibilityType: _constants.ACCESSIBILITY_TYPE.menu,
      focusLock: false,
      autoFocus: true,
      returnFocus: true,
      // Remove the `ignoreBoundary` prop in the next major version
      // and have it replaced with the TetherBehavior props overrides
      ignoreBoundary: false,
      overrides: {},
      onMouseEnterDelay: 200,
      onMouseLeaveDelay: 200,
      placement: _constants.PLACEMENT.auto,
      showArrow: false,
      triggerType: _constants.TRIGGER_TYPE.click,
      renderAll: false
    };
    var _default = exports.default = baseDefaultProps;
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/popover.js
var require_popover = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/popover.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var React13 = _interopRequireWildcard(require_react());
    var _reactFocusLock = _interopRequireWildcard((init_es20155(), __toCommonJS(es2015_exports2)));
    var _overrides = require_overrides();
    var _constants = require_constants();
    var _layer = require_layer();
    var _styledComponents = require_styled_components();
    var _utils = require_utils();
    var _defaultProps = _interopRequireDefault(require_default_props());
    var _reactUid = (init_es2015(), __toCommonJS(es2015_exports));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _getRequireWildcardCache(e) {
      if ("function" != typeof WeakMap) return null;
      var r = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(e2) {
        return e2 ? t : r;
      })(e);
    }
    function _interopRequireWildcard(e, r) {
      if (!r && e && e.__esModule) return e;
      if (null === e || "object" != typeof e && "function" != typeof e) return { default: e };
      var t = _getRequireWildcardCache(r);
      if (t && t.has(e)) return t.get(e);
      var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) {
        var i = a ? Object.getOwnPropertyDescriptor(e, u) : null;
        i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u];
      }
      return n.default = e, t && t.set(e, n), n;
    }
    function _extends2() {
      _extends2 = Object.assign ? Object.assign.bind() : function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      return _extends2.apply(this, arguments);
    }
    function _defineProperty2(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == typeof i ? i : String(i);
    }
    function _toPrimitive(t, r) {
      if ("object" != typeof t || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != typeof i) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    var PopoverInner = class extends React13.Component {
      constructor(...args) {
        super(...args);
        _defineProperty2(this, "animateInTimer", void 0);
        _defineProperty2(this, "animateOutTimer", void 0);
        _defineProperty2(this, "animateOutCompleteTimer", void 0);
        _defineProperty2(this, "onMouseEnterTimer", void 0);
        _defineProperty2(this, "onMouseLeaveTimer", void 0);
        _defineProperty2(this, "anchorRef", React13.createRef());
        _defineProperty2(this, "popperRef", React13.createRef());
        _defineProperty2(this, "arrowRef", React13.createRef());
        _defineProperty2(this, "state", this.getDefaultState(this.props));
        _defineProperty2(this, "animateIn", () => {
          if (this.props.isOpen) {
            this.setState({
              isAnimating: true
            });
          }
        });
        _defineProperty2(this, "animateOut", () => {
          if (!this.props.isOpen) {
            this.setState({
              isAnimating: true
            });
            this.animateOutCompleteTimer = setTimeout(() => {
              this.setState({
                isAnimating: false,
                // Reset to ideal placement specified in props
                // @ts-ignore
                placement: this.props.placement
              });
            }, this.props.animateOutTime || _constants.ANIMATE_OUT_TIME);
          }
        });
        _defineProperty2(this, "onAnchorClick", (e) => {
          if (this.props.onClick) {
            this.props.onClick(e);
          }
        });
        _defineProperty2(this, "onAnchorMouseEnter", (e) => {
          if (this.onMouseLeaveTimer) {
            clearTimeout(this.onMouseLeaveTimer);
          }
          this.triggerOnMouseEnterWithDelay(e);
        });
        _defineProperty2(this, "onAnchorMouseLeave", (e) => {
          if (this.onMouseEnterTimer) {
            clearTimeout(this.onMouseEnterTimer);
          }
          this.triggerOnMouseLeaveWithDelay(e);
        });
        _defineProperty2(this, "onPopoverMouseEnter", () => {
          if (this.onMouseLeaveTimer) {
            clearTimeout(this.onMouseLeaveTimer);
          }
        });
        _defineProperty2(this, "onPopoverMouseLeave", (e) => {
          this.triggerOnMouseLeaveWithDelay(e);
        });
        _defineProperty2(this, "onPopperUpdate", (normalizedOffsets, data) => {
          const placement = (0, _utils.fromPopperPlacement)(data.placement) || _constants.PLACEMENT.top;
          this.setState({
            // @ts-ignore
            arrowOffset: normalizedOffsets.arrow,
            popoverOffset: normalizedOffsets.popper,
            placement
          });
          this.animateInTimer = setTimeout(this.animateIn, _constants.ANIMATE_IN_TIME);
          return data;
        });
        _defineProperty2(this, "triggerOnMouseLeave", (e) => {
          if (this.props.onMouseLeave) {
            this.props.onMouseLeave(e);
          }
        });
        _defineProperty2(this, "triggerOnMouseEnter", (e) => {
          if (this.props.onMouseEnter) {
            this.props.onMouseEnter(e);
          }
        });
        _defineProperty2(this, "onDocumentClick", (evt) => {
          const target = evt.composedPath ? evt.composedPath()[0] : evt.target;
          const popper = this.popperRef.current;
          const anchor = this.anchorRef.current;
          if (!popper || popper === target || target instanceof Node && popper.contains(target)) {
            return;
          }
          if (!anchor || anchor === target || target instanceof Node && anchor.contains(target)) {
            return;
          }
          if (this.props.onClickOutside) {
            this.props.onClickOutside(evt);
          }
        });
      }
      componentDidMount() {
        this.setState({
          isMounted: true
        });
      }
      componentDidUpdate(prevProps, prevState) {
        this.init(prevProps, prevState);
        if (this.props.accessibilityType !== _constants.ACCESSIBILITY_TYPE.tooltip && this.props.autoFocus && !this.state.autoFocusAfterPositioning && this.popperRef.current !== null && this.popperRef.current.getBoundingClientRect().top > 0) {
          this.setState({
            autoFocusAfterPositioning: true
          });
        }
        if (true) {
          if (!this.anchorRef.current) {
            console.warn(`[baseui][Popover] ref has not been passed to the Popper's anchor element.
              See how to pass the ref to an anchor element in the Popover example
              https://baseweb.design/components/popover/#anchor-ref-handling-example`);
          }
        }
      }
      init(prevProps, prevState) {
        if (this.props.isOpen !== prevProps.isOpen || this.state.isMounted !== prevState.isMounted || this.state.isLayerMounted !== prevState.isLayerMounted) {
          if (this.props.isOpen && this.state.isLayerMounted) {
            this.clearTimers();
            return;
          }
          if (!this.props.isOpen && prevProps.isOpen) {
            this.animateOutTimer = setTimeout(this.animateOut, 20);
            return;
          }
        }
      }
      componentWillUnmount() {
        this.clearTimers();
      }
      getDefaultState(props) {
        return {
          isAnimating: false,
          arrowOffset: {
            left: 0,
            top: 0
          },
          popoverOffset: {
            left: 0,
            top: 0
          },
          placement: props.placement,
          isMounted: false,
          isLayerMounted: false,
          autoFocusAfterPositioning: false
        };
      }
      clearTimers() {
        [this.animateInTimer, this.animateOutTimer, this.animateOutCompleteTimer, this.onMouseEnterTimer, this.onMouseLeaveTimer].forEach((timerId) => {
          if (timerId) {
            clearTimeout(timerId);
          }
        });
      }
      triggerOnMouseLeaveWithDelay(e) {
        const {
          onMouseLeaveDelay
        } = this.props;
        if (onMouseLeaveDelay) {
          this.onMouseLeaveTimer = setTimeout(() => this.triggerOnMouseLeave(e), onMouseLeaveDelay);
          return;
        }
        this.triggerOnMouseLeave(e);
      }
      triggerOnMouseEnterWithDelay(e) {
        const {
          onMouseEnterDelay
        } = this.props;
        if (onMouseEnterDelay) {
          this.onMouseEnterTimer = setTimeout(() => this.triggerOnMouseEnter(e), onMouseEnterDelay);
          return;
        }
        this.triggerOnMouseEnter(e);
      }
      isClickTrigger() {
        return this.props.triggerType === _constants.TRIGGER_TYPE.click;
      }
      isHoverTrigger() {
        return this.props.triggerType === _constants.TRIGGER_TYPE.hover;
      }
      isAccessibilityTypeMenu() {
        return this.props.accessibilityType === _constants.ACCESSIBILITY_TYPE.menu;
      }
      isAccessibilityTypeTooltip() {
        return this.props.accessibilityType === _constants.ACCESSIBILITY_TYPE.tooltip;
      }
      getAnchorIdAttr() {
        const popoverId = this.getPopoverIdAttr();
        return popoverId ? `${popoverId}__anchor` : null;
      }
      getPopoverIdAttr() {
        return this.props.id || null;
      }
      getAnchorProps() {
        const {
          isOpen
        } = this.props;
        const anchorProps = {
          ref: this.anchorRef
        };
        const popoverId = this.getPopoverIdAttr();
        if (this.isAccessibilityTypeMenu()) {
          const relationAttr = this.isClickTrigger() ? "aria-controls" : "aria-owns";
          anchorProps[relationAttr] = isOpen ? popoverId : null;
          anchorProps["aria-haspopup"] = true;
          anchorProps["aria-expanded"] = Boolean(isOpen);
        } else if (this.isAccessibilityTypeTooltip()) {
          anchorProps.id = this.getAnchorIdAttr();
          anchorProps["aria-describedby"] = isOpen ? popoverId : null;
        }
        if (this.isHoverTrigger()) {
          anchorProps.onMouseEnter = this.onAnchorMouseEnter;
          anchorProps.onMouseLeave = this.onAnchorMouseLeave;
          anchorProps.onBlur = this.props.onBlur;
          anchorProps.onFocus = this.props.onFocus;
        } else {
          anchorProps.onClick = this.onAnchorClick;
          if (this.props.onBlur) {
            anchorProps.onBlur = this.props.onBlur;
          }
          if (this.props.onFocus) {
            anchorProps.onFocus = this.props.onFocus;
          }
        }
        return anchorProps;
      }
      getPopoverBodyProps() {
        const bodyProps = {};
        const popoverId = this.getPopoverIdAttr();
        if (this.isAccessibilityTypeMenu()) {
          bodyProps.id = popoverId;
        } else if (this.isAccessibilityTypeTooltip()) {
          bodyProps.id = popoverId;
          bodyProps.role = "tooltip";
        }
        if (this.isHoverTrigger()) {
          bodyProps.onMouseEnter = this.onPopoverMouseEnter;
          bodyProps.onMouseLeave = this.onPopoverMouseLeave;
        }
        return bodyProps;
      }
      getSharedProps() {
        const {
          isOpen,
          showArrow,
          popoverMargin = _constants.POPOVER_MARGIN
        } = this.props;
        const {
          isAnimating,
          arrowOffset,
          popoverOffset,
          placement
        } = this.state;
        return {
          $showArrow: !!showArrow,
          $arrowOffset: arrowOffset,
          $popoverOffset: popoverOffset,
          // @ts-ignore
          $placement: placement,
          $isAnimating: isAnimating,
          $animationDuration: this.props.animateOutTime || _constants.ANIMATE_OUT_TIME,
          $isOpen: isOpen,
          $popoverMargin: popoverMargin,
          $isHoverTrigger: this.isHoverTrigger()
        };
      }
      getAnchorFromChildren() {
        const {
          children
        } = this.props;
        const childArray = React13.Children.toArray(children);
        if (childArray.length !== 1) {
          console.error(`[baseui] Exactly 1 child must be passed to Popover/Tooltip, found ${childArray.length} children`);
        }
        return childArray[0];
      }
      renderAnchor() {
        const anchor = this.getAnchorFromChildren();
        if (!anchor) {
          return null;
        }
        const isValidElement = React13.isValidElement(anchor);
        const anchorProps = this.getAnchorProps();
        if (typeof anchor === "object" && isValidElement) {
          return React13.cloneElement(anchor, anchorProps);
        }
        return (
          // @ts-ignore
          React13.createElement("span", _extends2({
            key: "popover-anchor"
          }, anchorProps), anchor)
        );
      }
      renderPopover(renderedContent) {
        const {
          showArrow,
          overrides = {}
        } = this.props;
        const {
          Arrow: ArrowOverride,
          Body: BodyOverride,
          Inner: InnerOverride
        } = overrides;
        const Arrow = (0, _overrides.getOverride)(ArrowOverride) || _styledComponents.Arrow;
        const Body = (0, _overrides.getOverride)(BodyOverride) || _styledComponents.Body;
        const Inner = (0, _overrides.getOverride)(InnerOverride) || _styledComponents.Inner;
        const sharedProps = this.getSharedProps();
        const bodyProps = this.getPopoverBodyProps();
        return React13.createElement(Body, _extends2({
          key: "popover-body",
          ref: this.popperRef,
          "data-baseweb": this.props["data-baseweb"] || "popover"
        }, bodyProps, sharedProps, (0, _overrides.getOverrideProps)(BodyOverride)), showArrow ? React13.createElement(Arrow, _extends2({
          key: "popover-arrow",
          ref: this.arrowRef
        }, sharedProps, (0, _overrides.getOverrideProps)(ArrowOverride))) : null, React13.createElement(Inner, _extends2({}, sharedProps, (0, _overrides.getOverrideProps)(InnerOverride)), renderedContent));
      }
      renderContent() {
        const {
          content
        } = this.props;
        return typeof content === "function" ? content() : content;
      }
      render() {
        const mountedAndOpen = this.state.isMounted && (this.props.isOpen || this.state.isAnimating);
        const rendered = [this.renderAnchor()];
        const renderedContent = mountedAndOpen || this.props.renderAll ? this.renderContent() : null;
        const defaultPopperOptions = {
          modifiers: {
            preventOverflow: {
              enabled: !this.props.ignoreBoundary,
              padding: 0
            }
          }
        };
        if (renderedContent) {
          if (mountedAndOpen) {
            rendered.push(React13.createElement(_layer.Layer, {
              key: "new-layer",
              mountNode: this.props.mountNode,
              onEscape: this.props.onEsc,
              onDocumentClick: this.isHoverTrigger() ? void 0 : this.onDocumentClick,
              isHoverLayer: this.isHoverTrigger(),
              onMount: () => this.setState({
                isLayerMounted: true
              }),
              onUnmount: () => this.setState({
                isLayerMounted: false
              })
            }, React13.createElement(_layer.TetherBehavior, {
              anchorRef: this.anchorRef.current,
              arrowRef: this.arrowRef.current,
              popperRef: this.popperRef.current,
              popperOptions: {
                ...defaultPopperOptions,
                ...this.props.popperOptions
              },
              onPopperUpdate: this.onPopperUpdate,
              placement: this.state.placement
            }, this.props.focusLock && this.props.accessibilityType !== _constants.ACCESSIBILITY_TYPE.tooltip ? React13.createElement(_reactFocusLock.default, {
              disabled: !this.props.focusLock,
              noFocusGuards: false,
              returnFocus: !this.isHoverTrigger() && this.props.returnFocus,
              autoFocus: this.state.autoFocusAfterPositioning,
              crossFrame: false,
              focusOptions: this.props.focusOptions
            }, this.renderPopover(renderedContent)) : React13.createElement(_reactFocusLock.MoveFocusInside, {
              disabled: !this.props.autoFocus || !this.state.autoFocusAfterPositioning
            }, this.renderPopover(renderedContent)))));
          } else {
            rendered.push(React13.createElement(_styledComponents.Hidden, {
              key: "hidden-layer"
            }, renderedContent));
          }
        }
        return rendered;
      }
    };
    _defineProperty2(PopoverInner, "defaultProps", _defaultProps.default);
    var Popover = (props) => {
      const {
        innerRef
      } = props;
      const gID = (0, _reactUid.useUID)();
      return React13.createElement(PopoverInner, _extends2({
        id: props.id || gID,
        ref: innerRef
      }, props));
    };
    Popover.defaultProps = _defaultProps.default;
    var _default = exports.default = Popover;
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/stateful-popover.js
var require_stateful_popover = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/stateful-popover.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var React13 = _interopRequireWildcard(require_react());
    var _constants = require_constants();
    var _statefulContainer = _interopRequireDefault(require_stateful_container());
    var _popover = _interopRequireDefault(require_popover());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _getRequireWildcardCache(e) {
      if ("function" != typeof WeakMap) return null;
      var r = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(e2) {
        return e2 ? t : r;
      })(e);
    }
    function _interopRequireWildcard(e, r) {
      if (!r && e && e.__esModule) return e;
      if (null === e || "object" != typeof e && "function" != typeof e) return { default: e };
      var t = _getRequireWildcardCache(r);
      if (t && t.has(e)) return t.get(e);
      var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) {
        var i = a ? Object.getOwnPropertyDescriptor(e, u) : null;
        i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u];
      }
      return n.default = e, t && t.set(e, n), n;
    }
    function StatefulPopover(props) {
      const {
        children,
        ...restProps
      } = props;
      return React13.createElement(_statefulContainer.default, restProps, (popoverProps) => React13.createElement(_popover.default, popoverProps, children));
    }
    StatefulPopover.defaultProps = {
      accessibilityType: _constants.ACCESSIBILITY_TYPE.menu,
      ignoreBoundary: false,
      overrides: {},
      onMouseEnterDelay: 200,
      onMouseLeaveDelay: 200,
      placement: _constants.PLACEMENT.auto,
      showArrow: false,
      triggerType: _constants.TRIGGER_TYPE.click,
      dismissOnClickOutside: true,
      dismissOnEsc: true,
      // @ts-ignore
      stateReducer: (_, nextState) => nextState,
      popoverMargin: _constants.POPOVER_MARGIN
    };
    var _default = exports.default = StatefulPopover;
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/types.js
var require_types = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/types.js"() {
    "use strict";
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/index.js
var require_popover2 = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/popover/index.js"(exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _exportNames = {
      StatefulPopover: true,
      StatefulContainer: true,
      Popover: true,
      ACCESSIBILITY_TYPE: true,
      PLACEMENT: true,
      TRIGGER_TYPE: true,
      STATE_CHANGE_TYPE: true,
      ANIMATE_IN_TIME: true,
      ANIMATE_OUT_TIME: true,
      StyledArrow: true,
      StyledBody: true,
      StyledInner: true,
      StyledPadding: true
    };
    Object.defineProperty(exports, "ACCESSIBILITY_TYPE", {
      enumerable: true,
      get: function() {
        return _constants.ACCESSIBILITY_TYPE;
      }
    });
    Object.defineProperty(exports, "ANIMATE_IN_TIME", {
      enumerable: true,
      get: function() {
        return _constants.ANIMATE_IN_TIME;
      }
    });
    Object.defineProperty(exports, "ANIMATE_OUT_TIME", {
      enumerable: true,
      get: function() {
        return _constants.ANIMATE_OUT_TIME;
      }
    });
    Object.defineProperty(exports, "PLACEMENT", {
      enumerable: true,
      get: function() {
        return _constants.PLACEMENT;
      }
    });
    Object.defineProperty(exports, "Popover", {
      enumerable: true,
      get: function() {
        return _popover.default;
      }
    });
    Object.defineProperty(exports, "STATE_CHANGE_TYPE", {
      enumerable: true,
      get: function() {
        return _constants.STATE_CHANGE_TYPE;
      }
    });
    Object.defineProperty(exports, "StatefulContainer", {
      enumerable: true,
      get: function() {
        return _statefulContainer.default;
      }
    });
    Object.defineProperty(exports, "StatefulPopover", {
      enumerable: true,
      get: function() {
        return _statefulPopover.default;
      }
    });
    Object.defineProperty(exports, "StyledArrow", {
      enumerable: true,
      get: function() {
        return _styledComponents.Arrow;
      }
    });
    Object.defineProperty(exports, "StyledBody", {
      enumerable: true,
      get: function() {
        return _styledComponents.Body;
      }
    });
    Object.defineProperty(exports, "StyledInner", {
      enumerable: true,
      get: function() {
        return _styledComponents.Inner;
      }
    });
    Object.defineProperty(exports, "StyledPadding", {
      enumerable: true,
      get: function() {
        return _styledComponents.Padding;
      }
    });
    Object.defineProperty(exports, "TRIGGER_TYPE", {
      enumerable: true,
      get: function() {
        return _constants.TRIGGER_TYPE;
      }
    });
    var _statefulPopover = _interopRequireDefault(require_stateful_popover());
    var _statefulContainer = _interopRequireDefault(require_stateful_container());
    var _popover = _interopRequireDefault(require_popover());
    var _constants = require_constants();
    var _styledComponents = require_styled_components();
    var _types = require_types();
    Object.keys(_types).forEach(function(key) {
      if (key === "default" || key === "__esModule") return;
      if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
      if (key in exports && exports[key] === _types[key]) return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function() {
          return _types[key];
        }
      });
    });
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  }
});
export default require_popover2();
//# sourceMappingURL=baseui_popover.js.map
