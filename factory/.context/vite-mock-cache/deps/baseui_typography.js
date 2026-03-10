import {
  require_overrides,
  require_responsive_helpers,
  require_styles
} from "./chunk-B7I2HBKX.js";
import "./chunk-TFDFHE5Q.js";
import {
  require_react
} from "./chunk-776SV3ZX.js";
import {
  __commonJS
} from "./chunk-V4OQ3NZ2.js";

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/styled-components.js
var require_styled_components = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/styled-components.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.StyledBlock = void 0;
    var _responsiveHelpers = require_responsive_helpers();
    var _styles = require_styles();
    function constrainToNull(value) {
      if (value === void 0) {
        return null;
      }
      return value;
    }
    function build(breakpoints) {
      const styles = {};
      const mediaQueries = (0, _responsiveHelpers.getMediaQueries)(breakpoints);
      return {
        // @ts-ignore
        apply: ({
          property,
          transform = (x) => x,
          value
        }) => {
          if (value === null || value === void 0) {
            return;
          }
          if (Array.isArray(value)) {
            value.forEach((v, index) => {
              if (index === 0) {
                styles[property] = constrainToNull(transform(v));
                return;
              }
              const mediaQuery = mediaQueries[index - 1];
              if (!styles[mediaQuery]) {
                styles[mediaQuery] = {};
              }
              styles[mediaQuery][property] = constrainToNull(transform(v));
            });
          } else {
            styles[property] = constrainToNull(transform(value));
          }
        },
        value: () => styles
      };
    }
    function getFontValue(obj, key) {
      if (!obj) return;
      return obj[key];
    }
    var StyledBlock = exports.StyledBlock = (0, _styles.styled)("div", (props) => {
      const {
        breakpoints,
        colors,
        typography,
        sizing
      } = props.$theme;
      const get = (obj, key) => obj[key];
      const getScale = (size) => sizing[size] || size;
      const styles = build(breakpoints);
      styles.apply({
        property: "color",
        value: get(props, "$color"),
        // @ts-ignore
        transform: (color) => colors[color] || color
      });
      styles.apply({
        property: "backgroundAttachment",
        value: get(props, "$backgroundAttachment")
      });
      styles.apply({
        property: "backgroundClip",
        value: get(props, "$backgroundClip")
      });
      styles.apply({
        property: "backgroundColor",
        value: get(props, "$backgroundColor"),
        // @ts-ignore
        transform: (backgroundColor) => colors[backgroundColor] || backgroundColor
      });
      styles.apply({
        property: "backgroundImage",
        value: get(props, "$backgroundImage")
      });
      styles.apply({
        property: "backgroundOrigin",
        value: get(props, "$backgroundOrigin")
      });
      styles.apply({
        property: "backgroundPosition",
        value: get(props, "$backgroundPosition")
      });
      styles.apply({
        property: "backgroundRepeat",
        value: get(props, "$backgroundRepeat")
      });
      styles.apply({
        property: "backgroundSize",
        value: get(props, "$backgroundSize")
      });
      styles.apply({
        property: "fontFamily",
        value: get(props, "$font"),
        // @ts-ignore
        transform: (font) => getFontValue(typography[font], "fontFamily")
      });
      styles.apply({
        property: "fontWeight",
        value: get(props, "$font"),
        // @ts-ignore
        transform: (font) => getFontValue(typography[font], "fontWeight")
      });
      styles.apply({
        property: "fontSize",
        value: get(props, "$font"),
        // @ts-ignore
        transform: (font) => getFontValue(typography[font], "fontSize")
      });
      styles.apply({
        property: "lineHeight",
        value: get(props, "$font"),
        // @ts-ignore
        transform: (font) => getFontValue(typography[font], "lineHeight")
      });
      styles.apply({
        property: "alignContent",
        value: get(props, "$alignContent")
      });
      styles.apply({
        property: "alignItems",
        value: get(props, "$alignItems")
      });
      styles.apply({
        property: "alignSelf",
        value: get(props, "$alignSelf")
      });
      styles.apply({
        property: "display",
        value: get(props, "$display")
      });
      styles.apply({
        property: "flex",
        value: get(props, "$flex")
      });
      styles.apply({
        property: "flexDirection",
        value: get(props, "$flexDirection")
      });
      styles.apply({
        property: "grid",
        value: get(props, "$grid")
      });
      styles.apply({
        property: "gridArea",
        value: get(props, "$gridArea")
      });
      styles.apply({
        property: "gridAutoColumns",
        value: get(props, "$gridAutoColumns")
      });
      styles.apply({
        property: "gridAutoFlow",
        value: get(props, "$gridAutoFlow")
      });
      styles.apply({
        property: "gridAutoRows",
        value: get(props, "$gridAutoRows")
      });
      styles.apply({
        property: "gridColumn",
        value: get(props, "$gridColumn")
      });
      styles.apply({
        property: "gridColumnEnd",
        value: get(props, "$gridColumnEnd")
      });
      styles.apply({
        property: "gridColumnGap",
        value: get(props, "$gridColumnGap"),
        transform: getScale
      });
      styles.apply({
        property: "gridColumnStart",
        value: get(props, "$gridColumnStart")
      });
      styles.apply({
        property: "gridGap",
        value: get(props, "$gridGap"),
        transform: getScale
      });
      styles.apply({
        property: "gridRow",
        value: get(props, "$gridRow")
      });
      styles.apply({
        property: "gridRowEnd",
        value: get(props, "$gridRowEnd")
      });
      styles.apply({
        property: "gridRowGap",
        value: get(props, "$gridRowGap"),
        transform: getScale
      });
      styles.apply({
        property: "gridRowStart",
        value: get(props, "$gridRowStart")
      });
      styles.apply({
        property: "gridTemplate",
        value: get(props, "$gridTemplate")
      });
      styles.apply({
        property: "gridTemplateAreas",
        value: get(props, "$gridTemplateAreas")
      });
      styles.apply({
        property: "gridTemplateColumns",
        value: get(props, "$gridTemplateColumns")
      });
      styles.apply({
        property: "gridTemplateRows",
        value: get(props, "$gridTemplateRows")
      });
      styles.apply({
        property: "justifyContent",
        value: get(props, "$justifyContent")
      });
      styles.apply({
        property: "justifyItems",
        value: get(props, "$justifyItems")
      });
      styles.apply({
        property: "justifySelf",
        value: get(props, "$justifySelf")
      });
      styles.apply({
        property: "order",
        value: get(props, "$order")
      });
      styles.apply({
        property: "position",
        value: get(props, "$position")
      });
      styles.apply({
        property: "width",
        value: get(props, "$width"),
        transform: getScale
      });
      styles.apply({
        property: "minWidth",
        value: get(props, "$minWidth"),
        transform: getScale
      });
      styles.apply({
        property: "maxWidth",
        value: get(props, "$maxWidth"),
        transform: getScale
      });
      styles.apply({
        property: "height",
        value: get(props, "$height"),
        transform: getScale
      });
      styles.apply({
        property: "minHeight",
        value: get(props, "$minHeight"),
        transform: getScale
      });
      styles.apply({
        property: "maxHeight",
        value: get(props, "$maxHeight"),
        transform: getScale
      });
      styles.apply({
        property: "overflowX",
        value: get(props, "$overflow"),
        // @ts-ignore
        transform: (overflow) => {
          if (overflow === "scrollX") {
            return "scroll";
          }
          return null;
        }
      });
      styles.apply({
        property: "overflowY",
        value: get(props, "$overflow"),
        // @ts-ignore
        transform: (overflow) => {
          if (overflow === "scrollY") {
            return "scroll";
          }
          return null;
        }
      });
      styles.apply({
        property: "overflow",
        value: get(props, "$overflow"),
        // @ts-ignore
        transform: (overflow) => {
          if (overflow !== "scrollX" && overflow !== "scrollY") {
            return overflow;
          }
          return null;
        }
      });
      styles.apply({
        property: "margin",
        value: get(props, "$margin"),
        transform: getScale
      });
      styles.apply({
        property: "marginTop",
        value: get(props, "$marginTop"),
        transform: getScale
      });
      styles.apply({
        property: "marginRight",
        value: get(props, "$marginRight"),
        transform: getScale
      });
      styles.apply({
        property: "marginBottom",
        value: get(props, "$marginBottom"),
        transform: getScale
      });
      styles.apply({
        property: "marginLeft",
        value: get(props, "$marginLeft"),
        transform: getScale
      });
      styles.apply({
        property: "padding",
        value: get(props, "$padding"),
        transform: getScale
      });
      styles.apply({
        property: "paddingTop",
        value: get(props, "$paddingTop"),
        transform: getScale
      });
      styles.apply({
        property: "paddingRight",
        value: get(props, "$paddingRight"),
        transform: getScale
      });
      styles.apply({
        property: "paddingBottom",
        value: get(props, "$paddingBottom"),
        transform: getScale
      });
      styles.apply({
        property: "paddingLeft",
        value: get(props, "$paddingLeft"),
        transform: getScale
      });
      styles.apply({
        property: "placeContent",
        value: get(props, "$placeContent")
      });
      styles.apply({
        property: "placeItems",
        value: get(props, "$placeItems")
      });
      styles.apply({
        property: "placeSelf",
        value: get(props, "$placeSelf")
      });
      styles.apply({
        property: "flexWrap",
        value: get(props, "$flexWrap"),
        transform: () => "wrap"
      });
      styles.apply({
        property: "top",
        value: get(props, "$top"),
        transform: getScale
      });
      styles.apply({
        property: "right",
        value: get(props, "$right"),
        transform: getScale
      });
      styles.apply({
        property: "left",
        value: get(props, "$left"),
        transform: getScale
      });
      styles.apply({
        property: "bottom",
        value: get(props, "$bottom"),
        transform: getScale
      });
      styles.apply({
        property: "textOverflow",
        value: get(props, "$textOverflow")
      });
      styles.apply({
        property: "whiteSpace",
        value: get(props, "$whiteSpace")
      });
      return styles.value();
    });
    StyledBlock.displayName = "StyledBlock";
    StyledBlock.displayName = "StyledBlock";
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/block.js
var require_block = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/block.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var React = _interopRequireWildcard(require_react());
    var _styledComponents = require_styled_components();
    var _overrides = require_overrides();
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
    function _extends() {
      _extends = Object.assign ? Object.assign.bind() : function(target) {
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
      return _extends.apply(this, arguments);
    }
    var Block = ({
      forwardedRef,
      children,
      as = "div",
      overrides = {},
      color,
      backgroundAttachment,
      backgroundClip,
      backgroundColor,
      backgroundImage,
      backgroundOrigin,
      backgroundPosition,
      backgroundRepeat,
      backgroundSize,
      font,
      alignContent,
      alignItems,
      alignSelf,
      flexDirection,
      display,
      flex,
      grid,
      gridArea,
      gridAutoColumns,
      gridAutoFlow,
      gridAutoRows,
      gridColumn,
      gridColumnEnd,
      gridColumnGap,
      gridColumnStart,
      gridGap,
      gridRow,
      gridRowEnd,
      gridRowGap,
      gridRowStart,
      gridTemplate,
      gridTemplateAreas,
      gridTemplateColumns,
      gridTemplateRows,
      justifyContent,
      justifyItems,
      justifySelf,
      order,
      position,
      width,
      minWidth,
      maxWidth,
      height,
      minHeight,
      maxHeight,
      overflow,
      margin,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      placeContent,
      placeItems,
      placeSelf,
      flexWrap,
      left,
      top,
      right,
      bottom,
      textOverflow,
      whiteSpace,
      ...restProps
    }) => {
      const [BaseBlock, baseBlockProps] = (0, _overrides.getOverrides)(overrides.Block, _styledComponents.StyledBlock);
      return React.createElement(
        BaseBlock,
        _extends({
          ref: forwardedRef,
          $as: as,
          $color: color,
          $backgroundAttachment: backgroundAttachment,
          $backgroundClip: backgroundClip,
          $backgroundColor: backgroundColor,
          $backgroundImage: backgroundImage,
          $backgroundOrigin: backgroundOrigin,
          $backgroundPosition: backgroundPosition,
          $backgroundRepeat: backgroundRepeat,
          $backgroundSize: backgroundSize,
          $font: font,
          $alignContent: alignContent,
          $alignItems: alignItems,
          $alignSelf: alignSelf,
          $flexDirection: flexDirection,
          $display: display,
          $flex: flex,
          $grid: grid,
          $gridArea: gridArea,
          $gridAutoColumns: gridAutoColumns,
          $gridAutoFlow: gridAutoFlow,
          $gridAutoRows: gridAutoRows,
          $gridColumn: gridColumn,
          $gridColumnEnd: gridColumnEnd,
          $gridColumnGap: gridColumnGap,
          $gridColumnStart: gridColumnStart,
          $gridGap: gridGap,
          $gridRow: gridRow,
          $gridRowEnd: gridRowEnd,
          $gridRowGap: gridRowGap,
          $gridRowStart: gridRowStart,
          $gridTemplate: gridTemplate,
          $gridTemplateAreas: gridTemplateAreas,
          $gridTemplateColumns: gridTemplateColumns,
          $gridTemplateRows: gridTemplateRows,
          $justifyContent: justifyContent,
          $justifyItems: justifyItems,
          $justifySelf: justifySelf,
          $order: order,
          $position: position,
          $width: width,
          $minWidth: minWidth,
          $maxWidth: maxWidth,
          $height: height,
          $minHeight: minHeight,
          $maxHeight: maxHeight,
          $overflow: overflow,
          $margin: margin,
          $marginTop: marginTop,
          $marginRight: marginRight,
          $marginBottom: marginBottom,
          $marginLeft: marginLeft,
          $padding: padding,
          $paddingTop: paddingTop,
          $paddingRight: paddingRight,
          $paddingBottom: paddingBottom,
          $paddingLeft: paddingLeft,
          $placeContent: placeContent,
          $placeItems: placeItems,
          $placeSelf: placeSelf,
          $flexWrap: flexWrap,
          $left: left,
          $top: top,
          $right: right,
          $bottom: bottom,
          $textOverflow: textOverflow,
          $whiteSpace: whiteSpace,
          "data-baseweb": "block"
        }, restProps, baseBlockProps),
        children
      );
    };
    var BlockComponent = React.forwardRef((props, ref) => React.createElement(Block, _extends({}, props, {
      forwardedRef: ref
    })));
    BlockComponent.displayName = "Block";
    var _default = exports.default = BlockComponent;
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/types.js
var require_types = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/types.js"() {
    "use strict";
  }
});

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/index.js
var require_block2 = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/block/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var _exportNames = {
      Block: true
    };
    Object.defineProperty(exports, "Block", {
      enumerable: true,
      get: function() {
        return _block.default;
      }
    });
    var _block = _interopRequireDefault(require_block());
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

// ../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/typography/index.js
var require_typography = __commonJS({
  "../../../node_modules/.pnpm/baseui@16.1.1_@types+react@18.3.27_react-dom@19.2.4_react@19.2.4__react@19.2.4_styletron-react@6.1.1_react@19.2.4_/node_modules/baseui/typography/index.js"(exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.ParagraphXSmall = exports.ParagraphSmall = exports.ParagraphMedium = exports.ParagraphLarge = exports.MonoParagraphXSmall = exports.MonoParagraphSmall = exports.MonoParagraphMedium = exports.MonoParagraphLarge = exports.MonoLabelXSmall = exports.MonoLabelSmall = exports.MonoLabelMedium = exports.MonoLabelLarge = exports.MonoHeadingXXLarge = exports.MonoHeadingXSmall = exports.MonoHeadingXLarge = exports.MonoHeadingSmall = exports.MonoHeadingMedium = exports.MonoHeadingLarge = exports.MonoDisplayXSmall = exports.MonoDisplaySmall = exports.MonoDisplayMedium = exports.MonoDisplayLarge = exports.LabelXSmall = exports.LabelSmall = exports.LabelMedium = exports.LabelLarge = exports.HeadingXXLarge = exports.HeadingXSmall = exports.HeadingXLarge = exports.HeadingSmall = exports.HeadingMedium = exports.HeadingLarge = exports.DisplayXSmall = exports.DisplaySmall = exports.DisplayMedium = exports.DisplayLarge = void 0;
    var React = _interopRequireWildcard(require_react());
    var _block = require_block2();
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
    function _extends() {
      _extends = Object.assign ? Object.assign.bind() : function(target) {
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
      return _extends.apply(this, arguments);
    }
    var DisplayLarge = exports.DisplayLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-displaylarge"
    }, props, {
      font: props.font || "DisplayLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    DisplayLarge.displayName = "DisplayLarge";
    var DisplayMedium = exports.DisplayMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-displaymedium"
    }, props, {
      font: props.font || "DisplayMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    DisplayMedium.displayName = "DisplayMedium";
    var DisplaySmall = exports.DisplaySmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-displaysmall"
    }, props, {
      font: props.font || "DisplaySmall",
      color: props.color || "contentPrimary",
      ref
    })));
    DisplaySmall.displayName = "DisplaySmall";
    var DisplayXSmall = exports.DisplayXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-displayxsmall"
    }, props, {
      font: props.font || "DisplayXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    DisplayXSmall.displayName = "DisplayXSmall";
    var HeadingXXLarge = exports.HeadingXXLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-headingxxlarge",
      as: props.as || "h1"
    }, props, {
      font: props.font || "HeadingXXLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    HeadingXXLarge.displayName = "HeadingXXLarge";
    var HeadingXLarge = exports.HeadingXLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-headingxlarge",
      as: props.as || "h2"
    }, props, {
      font: props.font || "HeadingXLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    HeadingXLarge.displayName = "HeadingXLarge";
    var HeadingLarge = exports.HeadingLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-headinglarge",
      as: props.as || "h3"
    }, props, {
      font: props.font || "HeadingLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    HeadingLarge.displayName = "HeadingLarge";
    var HeadingMedium = exports.HeadingMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-headingmedium",
      as: props.as || "h4"
    }, props, {
      font: props.font || "HeadingMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    HeadingMedium.displayName = "HeadingMedium";
    var HeadingSmall = exports.HeadingSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-headingsmall",
      as: props.as || "h5"
    }, props, {
      font: props.font || "HeadingSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    HeadingSmall.displayName = "HeadingSmall";
    var HeadingXSmall = exports.HeadingXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-headingxsmall",
      as: props.as || "h6"
    }, props, {
      font: props.font || "HeadingXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    HeadingXSmall.displayName = "HeadingXSmall";
    var LabelLarge = exports.LabelLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-labellarge"
    }, props, {
      font: props.font || "LabelLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    LabelLarge.displayName = "LabelLarge";
    var LabelMedium = exports.LabelMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-labelmedium"
    }, props, {
      font: props.font || "LabelMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    LabelMedium.displayName = "LabelMedium";
    var LabelSmall = exports.LabelSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-labelsmall"
    }, props, {
      font: props.font || "LabelSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    LabelSmall.displayName = "LabelSmall";
    var LabelXSmall = exports.LabelXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-labelxsmall"
    }, props, {
      font: props.font || "LabelXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    LabelXSmall.displayName = "LabelXSmall";
    var ParagraphLarge = exports.ParagraphLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-paragraphlarge",
      as: props.as || "p"
    }, props, {
      font: props.font || "ParagraphLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    ParagraphLarge.displayName = "ParagraphLarge";
    var ParagraphMedium = exports.ParagraphMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-paragraphmedium",
      as: props.as || "p"
    }, props, {
      font: props.font || "ParagraphMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    ParagraphMedium.displayName = "ParagraphMedium";
    var ParagraphSmall = exports.ParagraphSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-paragraphsmall",
      as: props.as || "p"
    }, props, {
      font: props.font || "ParagraphSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    ParagraphSmall.displayName = "ParagraphSmall";
    var ParagraphXSmall = exports.ParagraphXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-paragraphxsmall",
      as: props.as || "p"
    }, props, {
      font: props.font || "ParagraphXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    ParagraphXSmall.displayName = "ParagraphXSmall";
    var MonoDisplayLarge = exports.MonoDisplayLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monodisplaylarge"
    }, props, {
      font: props.font || "MonoDisplayLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoDisplayLarge.displayName = "MonoDisplayLarge";
    var MonoDisplayMedium = exports.MonoDisplayMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monodisplaymedium"
    }, props, {
      font: props.font || "MonoDisplayMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoDisplayMedium.displayName = "MonoDisplayMedium";
    var MonoDisplaySmall = exports.MonoDisplaySmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monodisplaysmall"
    }, props, {
      font: props.font || "MonoDisplaySmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoDisplaySmall.displayName = "MonoDisplaySmall";
    var MonoDisplayXSmall = exports.MonoDisplayXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monodisplayxsmall"
    }, props, {
      font: props.font || "MonoDisplayXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoDisplayXSmall.displayName = "MonoDisplayXSmall";
    var MonoHeadingXXLarge = exports.MonoHeadingXXLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoheadingxxlarge",
      as: props.as || "h1"
    }, props, {
      font: props.font || "MonoHeadingXXLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoHeadingXXLarge.displayName = "MonoHeadingXXLarge";
    var MonoHeadingXLarge = exports.MonoHeadingXLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoheadingxlarge",
      as: props.as || "h2"
    }, props, {
      font: props.font || "MonoHeadingXLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoHeadingXLarge.displayName = "MonoHeadingXLarge";
    var MonoHeadingLarge = exports.MonoHeadingLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoheadinglarge",
      as: props.as || "h3"
    }, props, {
      font: props.font || "MonoHeadingLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoHeadingLarge.displayName = "MonoHeadingLarge";
    var MonoHeadingMedium = exports.MonoHeadingMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoheadingmedium",
      as: props.as || "h4"
    }, props, {
      font: props.font || "MonoHeadingMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoHeadingMedium.displayName = "MonoHeadingMedium";
    var MonoHeadingSmall = exports.MonoHeadingSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoheadingsmall",
      as: props.as || "h5"
    }, props, {
      font: props.font || "MonoHeadingSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoHeadingSmall.displayName = "MonoHeadingSmall";
    var MonoHeadingXSmall = exports.MonoHeadingXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoheadingxsmall",
      as: props.as || "h6"
    }, props, {
      font: props.font || "MonoHeadingXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoHeadingXSmall.displayName = "MonoHeadingXSmall";
    var MonoLabelLarge = exports.MonoLabelLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monolabellarge"
    }, props, {
      font: props.font || "MonoLabelLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoLabelLarge.displayName = "MonoLabelLarge";
    var MonoLabelMedium = exports.MonoLabelMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monolabelmedium"
    }, props, {
      font: props.font || "MonoLabelMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoLabelMedium.displayName = "MonoLabelMedium";
    var MonoLabelSmall = exports.MonoLabelSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monolabelsmall"
    }, props, {
      font: props.font || "MonoLabelSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoLabelSmall.displayName = "MonoLabelSmall";
    var MonoLabelXSmall = exports.MonoLabelXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monolabelxsmall"
    }, props, {
      font: props.font || "MonoLabelXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoLabelXSmall.displayName = "MonoLabelXSmall";
    var MonoParagraphLarge = exports.MonoParagraphLarge = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoparagraphlarge",
      as: props.as || "p"
    }, props, {
      font: props.font || "MonoParagraphLarge",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoParagraphLarge.displayName = "MonoParagraphLarge";
    var MonoParagraphMedium = exports.MonoParagraphMedium = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoparagraphmedium",
      as: props.as || "p"
    }, props, {
      font: props.font || "MonoParagraphMedium",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoParagraphMedium.displayName = "MonoParagraphMedium";
    var MonoParagraphSmall = exports.MonoParagraphSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoparagraphsmall",
      as: props.as || "p"
    }, props, {
      font: props.font || "MonoParagraphSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoParagraphSmall.displayName = "MonoParagraphSmall";
    var MonoParagraphXSmall = exports.MonoParagraphXSmall = React.forwardRef((props, ref) => React.createElement(_block.Block, _extends({
      "data-baseweb": "typo-monoparagraphxsmall",
      as: props.as || "p"
    }, props, {
      font: props.font || "MonoParagraphXSmall",
      color: props.color || "contentPrimary",
      ref
    })));
    MonoParagraphXSmall.displayName = "MonoParagraphXSmall";
  }
});
export default require_typography();
//# sourceMappingURL=baseui_typography.js.map
