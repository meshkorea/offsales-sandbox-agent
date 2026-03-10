import "./chunk-V4OQ3NZ2.js";

// ../../../node_modules/.pnpm/@medv+finder@4.0.2/node_modules/@medv/finder/finder.js
var acceptedAttrNames = /* @__PURE__ */ new Set(["role", "name", "aria-label", "rel", "href"]);
function attr(name, value) {
  let nameIsOk = acceptedAttrNames.has(name);
  nameIsOk ||= name.startsWith("data-") && wordLike(name);
  let valueIsOk = wordLike(value) && value.length < 100;
  valueIsOk ||= value.startsWith("#") && wordLike(value.slice(1));
  return nameIsOk && valueIsOk;
}
function idName(name) {
  return wordLike(name);
}
function className(name) {
  return wordLike(name);
}
function tagName(name) {
  return true;
}
function finder(input, options) {
  if (input.nodeType !== Node.ELEMENT_NODE) {
    throw new Error(`Can't generate CSS selector for non-element node type.`);
  }
  if (input.tagName.toLowerCase() === "html") {
    return "html";
  }
  const defaults = {
    root: document.body,
    idName,
    className,
    tagName,
    attr,
    timeoutMs: 1e3,
    seedMinLength: 3,
    optimizedMinLength: 2,
    maxNumberOfPathChecks: Infinity
  };
  const startTime = /* @__PURE__ */ new Date();
  const config = { ...defaults, ...options };
  const rootDocument = findRootDocument(config.root, defaults);
  let foundPath;
  let count = 0;
  for (const candidate of search(input, config, rootDocument)) {
    const elapsedTimeMs = (/* @__PURE__ */ new Date()).getTime() - startTime.getTime();
    if (elapsedTimeMs > config.timeoutMs || count >= config.maxNumberOfPathChecks) {
      const fPath = fallback(input, rootDocument);
      if (!fPath) {
        throw new Error(`Timeout: Can't find a unique selector after ${config.timeoutMs}ms`);
      }
      return selector(fPath);
    }
    count++;
    if (unique(candidate, rootDocument)) {
      foundPath = candidate;
      break;
    }
  }
  if (!foundPath) {
    throw new Error(`Selector was not found.`);
  }
  const optimized = [
    ...optimize(foundPath, input, config, rootDocument, startTime)
  ];
  optimized.sort(byPenalty);
  if (optimized.length > 0) {
    return selector(optimized[0]);
  }
  return selector(foundPath);
}
function* search(input, config, rootDocument) {
  const stack = [];
  let paths = [];
  let current = input;
  let i = 0;
  while (current && current !== rootDocument) {
    const level = tie(current, config);
    for (const node of level) {
      node.level = i;
    }
    stack.push(level);
    current = current.parentElement;
    i++;
    paths.push(...combinations(stack));
    if (i >= config.seedMinLength) {
      paths.sort(byPenalty);
      for (const candidate of paths) {
        yield candidate;
      }
      paths = [];
    }
  }
  paths.sort(byPenalty);
  for (const candidate of paths) {
    yield candidate;
  }
}
function wordLike(name) {
  if (/^[a-z\-]{3,}$/i.test(name)) {
    const words = name.split(/-|[A-Z]/);
    for (const word of words) {
      if (word.length <= 2) {
        return false;
      }
      if (/[^aeiou]{4,}/i.test(word)) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function tie(element, config) {
  const level = [];
  const elementId = element.getAttribute("id");
  if (elementId && config.idName(elementId)) {
    level.push({
      name: "#" + CSS.escape(elementId),
      penalty: 0
    });
  }
  for (let i = 0; i < element.classList.length; i++) {
    const name = element.classList[i];
    if (config.className(name)) {
      level.push({
        name: "." + CSS.escape(name),
        penalty: 1
      });
    }
  }
  for (let i = 0; i < element.attributes.length; i++) {
    const attr2 = element.attributes[i];
    if (config.attr(attr2.name, attr2.value)) {
      level.push({
        name: `[${CSS.escape(attr2.name)}="${CSS.escape(attr2.value)}"]`,
        penalty: 2
      });
    }
  }
  const tagName2 = element.tagName.toLowerCase();
  if (config.tagName(tagName2)) {
    level.push({
      name: tagName2,
      penalty: 5
    });
    const index = indexOf(element, tagName2);
    if (index !== void 0) {
      level.push({
        name: nthOfType(tagName2, index),
        penalty: 10
      });
    }
  }
  const nth = indexOf(element);
  if (nth !== void 0) {
    level.push({
      name: nthChild(tagName2, nth),
      penalty: 50
    });
  }
  return level;
}
function selector(path) {
  let node = path[0];
  let query = node.name;
  for (let i = 1; i < path.length; i++) {
    const level = path[i].level || 0;
    if (node.level === level - 1) {
      query = `${path[i].name} > ${query}`;
    } else {
      query = `${path[i].name} ${query}`;
    }
    node = path[i];
  }
  return query;
}
function penalty(path) {
  return path.map((node) => node.penalty).reduce((acc, i) => acc + i, 0);
}
function byPenalty(a, b2) {
  return penalty(a) - penalty(b2);
}
function indexOf(input, tagName2) {
  const parent = input.parentNode;
  if (!parent) {
    return void 0;
  }
  let child = parent.firstChild;
  if (!child) {
    return void 0;
  }
  let i = 0;
  while (child) {
    if (child.nodeType === Node.ELEMENT_NODE && (tagName2 === void 0 || child.tagName.toLowerCase() === tagName2)) {
      i++;
    }
    if (child === input) {
      break;
    }
    child = child.nextSibling;
  }
  return i;
}
function fallback(input, rootDocument) {
  let i = 0;
  let current = input;
  const path = [];
  while (current && current !== rootDocument) {
    const tagName2 = current.tagName.toLowerCase();
    const index = indexOf(current, tagName2);
    if (index === void 0) {
      return;
    }
    path.push({
      name: nthOfType(tagName2, index),
      penalty: NaN,
      level: i
    });
    current = current.parentElement;
    i++;
  }
  if (unique(path, rootDocument)) {
    return path;
  }
}
function nthChild(tagName2, index) {
  if (tagName2 === "html") {
    return "html";
  }
  return `${tagName2}:nth-child(${index})`;
}
function nthOfType(tagName2, index) {
  if (tagName2 === "html") {
    return "html";
  }
  return `${tagName2}:nth-of-type(${index})`;
}
function* combinations(stack, path = []) {
  if (stack.length > 0) {
    for (let node of stack[0]) {
      yield* combinations(stack.slice(1, stack.length), path.concat(node));
    }
  } else {
    yield path;
  }
}
function findRootDocument(rootNode, defaults) {
  if (rootNode.nodeType === Node.DOCUMENT_NODE) {
    return rootNode;
  }
  if (rootNode === defaults.root) {
    return rootNode.ownerDocument;
  }
  return rootNode;
}
function unique(path, rootDocument) {
  const css = selector(path);
  switch (rootDocument.querySelectorAll(css).length) {
    case 0:
      throw new Error(`Can't select any node with this selector: ${css}`);
    case 1:
      return true;
    default:
      return false;
  }
}
function* optimize(path, input, config, rootDocument, startTime) {
  if (path.length > 2 && path.length > config.optimizedMinLength) {
    for (let i = 1; i < path.length - 1; i++) {
      const elapsedTimeMs = (/* @__PURE__ */ new Date()).getTime() - startTime.getTime();
      if (elapsedTimeMs > config.timeoutMs) {
        return;
      }
      const newPath = [...path];
      newPath.splice(i, 1);
      if (unique(newPath, rootDocument) && rootDocument.querySelector(selector(newPath)) === input) {
        yield newPath;
        yield* optimize(newPath, input, config, rootDocument, startTime);
      }
    }
  }
}

// ../../../node_modules/.pnpm/react-grab@0.1.27_@types+react@18.3.27_react@19.2.4/node_modules/react-grab/dist/chunk-5O2BUFAV.js
var mo = "0.1.27";
var F = "210, 57, 192";
var po = `rgba(${F}, 1)`;
var fo = `rgba(${F}, 0.4)`;
var go = `rgba(${F}, 0.05)`;
var Eo = `rgba(${F}, 0.5)`;
var _o = `rgba(${F}, 0.08)`;
var So = `rgba(${F}, 0.15)`;
var bo = 50;
var To = 8;
var ho = 4;
var Co = 0.2;
var Ro = 50;
var Oo = 16;
var No = 4;
var pe = 100;
var st = 15;
var it = 3;
var fe = ["id", "class", "aria-label", "data-testid", "role", "name", "title"];
var at = 5e3;
var yo = ["Meta", "Control", "Shift", "Alt"];
var Ao = /* @__PURE__ */ new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
var M = "data-react-grab-frozen";
var de = "data-react-grab-ignore";
var k = 0.9;
var lt = 1e3;
var ct = 2147483600;
var Fo = 400;
var vo = 100;
var Lo = 16;
var xo = 500;
var Io = 300;
var wo = 5;
var Po = 150;
var Mo = 14;
var ko = 28;
var Do = 150;
var Ho = 50;
var Vo = 78;
var Uo = 28;
var Go = 0.5;
var zo = 1500;
var Bo = 3e3;
var $o = 3;
var jo = "animate-[hint-flip-in_var(--transition-normal)_ease-out]";
var Wo = 0.75;
var Xo = 32;
var Yo = 3;
var Zo = 20;
var Ko = 100;
var qo = 1;
var Qo = 50;
var Jo = 50;
var es = 6;
var ts = 3;
var ge = 2;
var ut = 16;
var mt = 100;
var pt = 50;
var ns = 0.01;
var rs = 1e3;
var os = 20;
var ss = 2 * 1024 * 1024;
var is = 100;
var as = 200;
var ls = 8;
var cs = 8;
var us = 8;
var ms = 11;
var ps = 180;
var fs = 280;
var ds = 100;
var gs = "bg-white";
var Es = { left: -9999, top: -9999 };
var _s = { left: "left center", right: "right center", top: "center top", bottom: "center bottom" };
var Ss = '<svg width="294" height="294" viewBox="0 0 294 294" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_0_3)"><mask id="mask0_0_3" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="294" height="294"><path d="M294 0H0V294H294V0Z" fill="white"/></mask><g mask="url(#mask0_0_3)"><path d="M144.599 47.4924C169.712 27.3959 194.548 20.0265 212.132 30.1797C227.847 39.2555 234.881 60.3243 231.926 89.516C231.677 92.0069 231.328 94.5423 230.94 97.1058L228.526 110.14C228.517 110.136 228.505 110.132 228.495 110.127C228.486 110.165 228.479 110.203 228.468 110.24L216.255 105.741C216.256 105.736 216.248 105.728 216.248 105.723C207.915 103.125 199.421 101.075 190.82 99.5888L190.696 99.5588L173.526 97.2648L173.511 97.2631C173.492 97.236 173.467 97.2176 173.447 97.1905C163.862 96.2064 154.233 95.7166 144.599 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8624 138.391 86.939 147.193C90.8624 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245C115.749 197.245 115.758 197.246 115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.507 229.974L144.609 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.472 238.38C154.485 238.392 154.499 238.402 154.513 238.412L143.846 247.482L143.827 247.497C126.56 261.128 109.472 268.745 94.8019 268.745C88.5916 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3164 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3363 185.327 9.52301 167.51 9.52301 147.193C9.52301 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3164 60.3243 61.3496 39.2555 77.0657 30.1797C94.6494 20.0265 119.486 27.3959 144.599 47.4924ZM70.6423 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5176 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8516 207.742 83.0977 205.066 70.6423 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1787 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.9311 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.759 110.203C59.234 110.839 57.7378 111.475 56.27 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9104 147.193C67.822 135.23 63.7566 122.855 60.759 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.854 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.6291 47.6015 67.6975 64.5954 70.0424 87.9446L70.0416 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8263 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.773 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.29 38.512C183.321 38.512 169.34 44.4991 154.444 56.0153C163.93 64.9374 172.634 74.6557 180.462 85.064C193.375 86.6345 206.128 89.3102 218.584 93.0624C218.812 91.4325 219.003 89.8118 219.165 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.552 64.3097C138.104 70.2614 132.054 76.6306 126.443 83.3765C132.39 82.995 138.426 82.8046 144.552 82.8046C150.727 82.8046 156.778 83.0143 162.707 83.3765C157.08 76.6293 151.015 70.2596 144.552 64.3097Z" fill="white"/><path d="M144.598 47.4924C169.712 27.3959 194.547 20.0265 212.131 30.1797C227.847 39.2555 234.88 60.3243 231.926 89.516C231.677 92.0069 231.327 94.5423 230.941 97.1058L228.526 110.14L228.496 110.127C228.487 110.165 228.478 110.203 228.469 110.24L216.255 105.741L216.249 105.723C207.916 103.125 199.42 101.075 190.82 99.5888L190.696 99.5588L173.525 97.2648L173.511 97.263C173.492 97.236 173.468 97.2176 173.447 97.1905C163.863 96.2064 154.234 95.7166 144.598 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8622 138.391 86.939 147.193C90.8622 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245L115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.506 229.974L144.61 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.473 238.38L154.512 238.412L143.847 247.482L143.827 247.497C126.56 261.13 109.472 268.745 94.8018 268.745C88.5915 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3162 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3362 185.327 9.52298 167.51 9.52298 147.193C9.52298 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3162 60.3243 61.3496 39.2555 77.0657 30.1797C94.6493 20.0265 119.486 27.3959 144.598 47.4924ZM70.6422 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5175 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8515 207.742 83.0977 205.066 70.6422 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1786 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.931 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.7589 110.203C59.234 110.839 57.7378 111.475 56.2699 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9103 147.193C67.822 135.23 63.7566 122.855 60.7589 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.8539 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.629 47.6015 67.6975 64.5954 70.0424 87.9446L70.0415 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8262 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.772 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.291 38.512C183.321 38.512 169.34 44.4991 154.443 56.0153C163.929 64.9374 172.634 74.6557 180.462 85.064C193.374 86.6345 206.129 89.3102 218.584 93.0624C218.813 91.4325 219.003 89.8118 219.166 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.551 64.3097C138.103 70.2614 132.055 76.6306 126.443 83.3765C132.389 82.995 138.427 82.8046 144.551 82.8046C150.727 82.8046 156.779 83.0143 162.707 83.3765C157.079 76.6293 151.015 70.2596 144.551 64.3097Z" fill="#FF40E0"/></g><mask id="mask1_0_3" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="102" y="84" width="161" height="162"><path d="M235.282 84.827L102.261 112.259L129.693 245.28L262.714 217.848L235.282 84.827Z" fill="white"/></mask><g mask="url(#mask1_0_3)"><path d="M136.863 129.916L213.258 141.224C220.669 142.322 222.495 152.179 215.967 155.856L187.592 171.843L184.135 204.227C183.339 211.678 173.564 213.901 169.624 207.526L129.021 141.831C125.503 136.14 130.245 128.936 136.863 129.916Z" fill="#FF40E0" stroke="#FF40E0" stroke-width="0.817337" stroke-linecap="round" stroke-linejoin="round"/></g></g><defs><clipPath id="clip0_0_3"><rect width="294" height="294" fill="white"/></clipPath></defs></svg>';
var bs = 1e3;
var Ts = 95;
var hs = 229;
var Cs = -9999;
var Ee = /* @__PURE__ */ new Set(["display", "position", "top", "right", "bottom", "left", "z-index", "overflow", "overflow-x", "overflow-y", "width", "height", "min-width", "min-height", "max-width", "max-height", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left", "flex-direction", "flex-wrap", "justify-content", "align-items", "align-self", "align-content", "flex-grow", "flex-shrink", "flex-basis", "order", "gap", "row-gap", "column-gap", "grid-template-columns", "grid-template-rows", "grid-template-areas", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "text-decoration-line", "text-decoration-style", "text-transform", "text-overflow", "text-shadow", "white-space", "word-break", "overflow-wrap", "vertical-align", "color", "background-color", "background-image", "background-position", "background-size", "background-repeat", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius", "box-shadow", "opacity", "transform", "filter", "backdrop-filter", "object-fit", "object-position"]);
var v = (e) => (e.tagName || "").toLowerCase();
var _e = typeof window < "u";
var vn = (e) => 0;
var Ln = (e) => {
};
var D = _e ? (Object.getOwnPropertyDescriptor(Window.prototype, "requestAnimationFrame")?.value ?? window.requestAnimationFrame).bind(window) : vn;
var q = _e ? (Object.getOwnPropertyDescriptor(Window.prototype, "cancelAnimationFrame")?.value ?? window.cancelAnimationFrame).bind(window) : Ln;
var Ns = () => _e ? new Promise((e) => D(() => e())) : Promise.resolve();
var Se = "0.5.32";
var J = `bippy-${Se}`;
var ft = Object.defineProperty;
var xn = Object.prototype.hasOwnProperty;
var H = () => {
};
var gt = (e) => {
  try {
    Function.prototype.toString.call(e).indexOf("^_^") > -1 && setTimeout(() => {
      throw Error("React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://reactjs.org/link/perf-use-production-build");
    });
  } catch {
  }
};
var ee = (e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) => !!(e && "getFiberRoots" in e);
var Et = false;
var dt;
var V = (e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) => Et ? true : (e && typeof e.inject == "function" && (dt = e.inject.toString()), !!dt?.includes("(injected)"));
var Q = /* @__PURE__ */ new Set();
var _ = /* @__PURE__ */ new Set();
var be = (e) => {
  let t = /* @__PURE__ */ new Map(), n2 = 0, r = { _instrumentationIsActive: false, _instrumentationSource: J, checkDCE: gt, hasUnsupportedRendererAttached: false, inject(o2) {
    let s = ++n2;
    return t.set(s, o2), _.add(o2), r._instrumentationIsActive || (r._instrumentationIsActive = true, Q.forEach((i) => i())), s;
  }, on: H, onCommitFiberRoot: H, onCommitFiberUnmount: H, onPostCommitFiberRoot: H, renderers: t, supportsFiber: true, supportsFlight: true };
  try {
    ft(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__", { configurable: true, enumerable: true, get() {
      return r;
    }, set(i) {
      if (i && typeof i == "object") {
        let a = r.renderers;
        r = i, a.size > 0 && (a.forEach((l2, p2) => {
          _.add(l2), i.renderers.set(p2, l2);
        }), U(e));
      }
    } });
    let o2 = window.hasOwnProperty, s = false;
    ft(window, "hasOwnProperty", { configurable: true, value: function(...i) {
      try {
        if (!s && i[0] === "__REACT_DEVTOOLS_GLOBAL_HOOK__") return globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = void 0, s = true, -0;
      } catch {
      }
      return o2.apply(this, i);
    }, writable: true });
  } catch {
    U(e);
  }
  return r;
};
var U = (e) => {
  try {
    let t = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!t) return;
    if (!t._instrumentationSource) {
      t.checkDCE = gt, t.supportsFiber = true, t.supportsFlight = true, t.hasUnsupportedRendererAttached = false, t._instrumentationSource = J, t._instrumentationIsActive = false;
      let n2 = ee(t);
      if (n2 || (t.on = H), t.renderers.size) {
        t._instrumentationIsActive = true, Q.forEach((s) => s());
        return;
      }
      let r = t.inject, o2 = V(t);
      o2 && !n2 && (Et = true, t.inject({ scheduleRefresh() {
      } }) && (t._instrumentationIsActive = true)), t.inject = (s) => {
        let i = r(s);
        return _.add(s), o2 && t.renderers.set(i, s), t._instrumentationIsActive = true, Q.forEach((a) => a()), i;
      };
    }
    (t.renderers.size || t._instrumentationIsActive || V()) && e?.();
  } catch {
  }
};
var Te = () => xn.call(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__");
var S = (e) => Te() ? (U(e), globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) : be(e);
var he = () => !!(typeof window < "u" && (window.document?.createElement || window.navigator?.product === "ReactNative"));
var te = () => {
  try {
    he() && S();
  } catch {
  }
};
var Ce = 0;
var Re = 1;
var Oe = 5;
var Ne = 11;
var ye = 13;
var Ae = 15;
var Fe = 16;
var ve = 19;
var Le = 26;
var xe = 27;
var Ie = 28;
var we = 30;
var L = (e) => {
  switch (e.tag) {
    case 1:
    case 11:
    case 0:
    case 14:
    case 15:
      return true;
    default:
      return false;
  }
};
function x(e, t, n2 = false) {
  if (!e) return null;
  let r = t(e);
  if (r instanceof Promise) return (async () => {
    if (await r === true) return e;
    let s = n2 ? e.return : e.child;
    for (; s; ) {
      let i = await Me(s, t, n2);
      if (i) return i;
      s = n2 ? null : s.sibling;
    }
    return null;
  })();
  if (r === true) return e;
  let o2 = n2 ? e.return : e.child;
  for (; o2; ) {
    let s = Pe(o2, t, n2);
    if (s) return s;
    o2 = n2 ? null : o2.sibling;
  }
  return null;
}
var Pe = (e, t, n2 = false) => {
  if (!e) return null;
  if (t(e) === true) return e;
  let r = n2 ? e.return : e.child;
  for (; r; ) {
    let o2 = Pe(r, t, n2);
    if (o2) return o2;
    r = n2 ? null : r.sibling;
  }
  return null;
};
var Me = async (e, t, n2 = false) => {
  if (!e) return null;
  if (await t(e) === true) return e;
  let r = n2 ? e.return : e.child;
  for (; r; ) {
    let o2 = await Me(r, t, n2);
    if (o2) return o2;
    r = n2 ? null : r.sibling;
  }
  return null;
};
var ke = (e) => {
  let t = e;
  return typeof t == "function" ? t : typeof t == "object" && t ? ke(t.type || t.render) : null;
};
var b = (e) => {
  let t = e;
  if (typeof t == "string") return t;
  if (typeof t != "function" && !(typeof t == "object" && t)) return null;
  let n2 = t.displayName || t.name || null;
  if (n2) return n2;
  let r = ke(t);
  return r && (r.displayName || r.name) || null;
};
var R = () => {
  let e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  return !!e?._instrumentationIsActive || ee(e) || V(e);
};
var T = (e) => {
  let t = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (t?.renderers) for (let n2 of t.renderers.values()) try {
    let r = n2.findFiberByHostInstance?.(e);
    if (r) return r;
  } catch {
  }
  if (typeof e == "object" && e) {
    if ("_reactRootContainer" in e) return e._reactRootContainer?._internalRoot?.current?.child;
    for (let n2 in e) if (n2.startsWith("__reactContainer$") || n2.startsWith("__reactInternalInstance$") || n2.startsWith("__reactFiber")) return e[n2] || null;
  }
  return null;
};
var De = /* @__PURE__ */ new Set();
var _t = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
var wn = ["rsc://", "file:///", "webpack://", "webpack-internal://", "node:", "turbopack://", "metro://", "/app-pages-browser/", "/(app-pages-browser)/"];
var Pn = ["<anonymous>", "eval", ""];
var yt = /\.(jsx|tsx|ts|js)$/;
var Mn = /(\.min|bundle|chunk|vendor|vendors|runtime|polyfill|polyfills)\.(js|mjs|cjs)$|(chunk|bundle|vendor|vendors|runtime|polyfill|polyfills|framework|app|main|index)[-_.][A-Za-z0-9_-]{4,}\.(js|mjs|cjs)$|[\da-f]{8,}\.(js|mjs|cjs)$|[-_.][\da-f]{20,}\.(js|mjs|cjs)$|\/dist\/|\/build\/|\/.next\/|\/out\/|\/node_modules\/|\.webpack\.|\.vite\.|\.turbopack\./i;
var kn = /^\?[\w~.-]+(?:=[^&#]*)?(?:&[\w~.-]+(?:=[^&#]*)?)*$/;
var At = "(at Server)";
var Dn = /(^|@)\S+:\d+/;
var Ft = /^\s*at .*(\S+:\d+|\(native\))/m;
var Hn = /^(eval@)?(\[native code\])?$/;
var re = (e, t) => {
  {
    let n2 = e.split(`
`), r = [];
    for (let o2 of n2) if (/^\s*at\s+/.test(o2)) {
      let s = St(o2, void 0)[0];
      s && r.push(s);
    } else if (/^\s*in\s+/.test(o2)) {
      let s = o2.replace(/^\s*in\s+/, "").replace(/\s*\(at .*\)$/, "");
      r.push({ functionName: s, source: o2 });
    } else if (o2.match(Dn)) {
      let s = bt(o2, void 0)[0];
      s && r.push(s);
    }
    return Ue(r, t);
  }
};
var vt = (e) => {
  if (!e.includes(":")) return [e, void 0, void 0];
  let t = e.startsWith("(") && /:\d+\)$/.test(e) ? e.slice(1, -1) : e, n2 = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(t);
  return n2 ? [n2[1], n2[2] || void 0, n2[3] || void 0] : [t, void 0, void 0];
};
var Ue = (e, t) => t && t.slice != null ? Array.isArray(t.slice) ? e.slice(t.slice[0], t.slice[1]) : e.slice(0, t.slice) : e;
var St = (e, t) => Ue(e.split(`
`).filter((n2) => !!n2.match(Ft)), t).map((n2) => {
  let r = n2;
  r.includes("(eval ") && (r = r.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, ""));
  let o2 = r.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, ""), s = o2.match(/ (\(.+\)$)/);
  o2 = s ? o2.replace(s[0], "") : o2;
  let i = vt(s ? s[1] : o2);
  return { functionName: s && o2 || void 0, fileName: ["eval", "<anonymous>"].includes(i[0]) ? void 0 : i[0], lineNumber: i[1] ? +i[1] : void 0, columnNumber: i[2] ? +i[2] : void 0, source: r };
});
var bt = (e, t) => Ue(e.split(`
`).filter((n2) => !n2.match(Hn)), t).map((n2) => {
  let r = n2;
  if (r.includes(" > eval") && (r = r.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1")), !r.includes("@") && !r.includes(":")) return { functionName: r };
  {
    let o2 = /(([^\n\r"\u2028\u2029]*".[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*(?:@[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*)*(?:[\n\r\u2028\u2029][^@]*)?)?[^@]*)@/, s = r.match(o2), i = s && s[1] ? s[1] : void 0, a = vt(r.replace(o2, ""));
    return { functionName: i, fileName: a[0], lineNumber: a[1] ? +a[1] : void 0, columnNumber: a[2] ? +a[2] : void 0, source: r };
  }
});
var Vn = 44;
var Tt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var Un = new Uint8Array(64);
var Lt = new Uint8Array(128);
for (let e = 0; e < Tt.length; e++) {
  let t = Tt.charCodeAt(e);
  Un[e] = t, Lt[t] = e;
}
function G(e, t) {
  let n2 = 0, r = 0, o2 = 0;
  do
    o2 = Lt[e.next()], n2 |= (o2 & 31) << r, r += 5;
  while (o2 & 32);
  let s = n2 & 1;
  return n2 >>>= 1, s && (n2 = -2147483648 | -n2), t + n2;
}
function ht(e, t) {
  return e.pos >= t ? false : e.peek() !== Vn;
}
var Gn = class {
  constructor(e) {
    this.pos = 0, this.buffer = e;
  }
  next() {
    return this.buffer.charCodeAt(this.pos++);
  }
  peek() {
    return this.buffer.charCodeAt(this.pos);
  }
  indexOf(e) {
    let { buffer: t, pos: n2 } = this, r = t.indexOf(e, n2);
    return r === -1 ? t.length : r;
  }
};
function xt(e) {
  let { length: t } = e, n2 = new Gn(e), r = [], o2 = 0, s = 0, i = 0, a = 0, l2 = 0;
  do {
    let p2 = n2.indexOf(";"), u = [], m = true, c = 0;
    for (o2 = 0; n2.pos < p2; ) {
      let f;
      o2 = G(n2, o2), o2 < c && (m = false), c = o2, ht(n2, p2) ? (s = G(n2, s), i = G(n2, i), a = G(n2, a), ht(n2, p2) ? (l2 = G(n2, l2), f = [o2, s, i, a, l2]) : f = [o2, s, i, a]) : f = [o2], u.push(f), n2.pos++;
    }
    m || zn(u), r.push(u), n2.pos = p2 + 1;
  } while (n2.pos <= t);
  return r;
}
function zn(e) {
  e.sort(Bn);
}
function Bn(e, t) {
  return e[0] - t[0];
}
var It = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
var $n = /^data:application\/json[^,]+base64,/;
var jn = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*(?:\*\/)[ \t]*$)/;
var wt = typeof WeakRef < "u";
var z = /* @__PURE__ */ new Map();
var ne = /* @__PURE__ */ new Map();
var Wn = (e) => wt && e instanceof WeakRef;
var Ct = (e, t, n2, r) => {
  if (n2 < 0 || n2 >= e.length) return null;
  let o2 = e[n2];
  if (!o2 || o2.length === 0) return null;
  let s = null;
  for (let u of o2) if (u[0] <= r) s = u;
  else break;
  if (!s || s.length < 4) return null;
  let [, i, a, l2] = s;
  if (i === void 0 || a === void 0 || l2 === void 0) return null;
  let p2 = t[i];
  return p2 ? { columnNumber: l2, fileName: p2, lineNumber: a + 1 } : null;
};
var Xn = (e, t, n2) => {
  if (e.sections) {
    let r = null;
    for (let i of e.sections) if (t > i.offset.line || t === i.offset.line && n2 >= i.offset.column) r = i;
    else break;
    if (!r) return null;
    let o2 = t - r.offset.line, s = t === r.offset.line ? n2 - r.offset.column : n2;
    return Ct(r.map.mappings, r.map.sources, o2, s);
  }
  return Ct(e.mappings, e.sources, t - 1, n2);
};
var Yn = (e, t) => {
  let n2 = t.split(`
`), r;
  for (let s = n2.length - 1; s >= 0 && !r; s--) {
    let i = n2[s].match(jn);
    i && (r = i[1] || i[2]);
  }
  if (!r) return null;
  let o2 = It.test(r);
  if (!($n.test(r) || o2 || r.startsWith("/"))) {
    let s = e.split("/");
    s[s.length - 1] = r, r = s.join("/");
  }
  return r;
};
var Zn = (e) => ({ file: e.file, mappings: xt(e.mappings), names: e.names, sourceRoot: e.sourceRoot, sources: e.sources, sourcesContent: e.sourcesContent, version: 3 });
var Kn = (e) => {
  let t = e.sections.map(({ map: r, offset: o2 }) => ({ map: { ...r, mappings: xt(r.mappings) }, offset: o2 })), n2 = /* @__PURE__ */ new Set();
  for (let r of t) for (let o2 of r.map.sources) n2.add(o2);
  return { file: e.file, mappings: [], names: [], sections: t, sourceRoot: void 0, sources: Array.from(n2), sourcesContent: void 0, version: 3 };
};
var Rt = (e) => {
  if (!e) return false;
  let t = e.trim();
  if (!t) return false;
  let n2 = t.match(It);
  if (!n2) return true;
  let r = n2[0].toLowerCase();
  return r === "http:" || r === "https:";
};
var qn = async (e, t = fetch) => {
  if (!Rt(e)) return null;
  let n2;
  try {
    let o2 = await t(e);
    if (!o2.ok) return null;
    n2 = await o2.text();
  } catch {
    return null;
  }
  if (!n2) return null;
  let r = Yn(e, n2);
  if (!r || !Rt(r)) return null;
  try {
    let o2 = await t(r);
    if (!o2.ok) return null;
    let s = await o2.json();
    return "sections" in s ? Kn(s) : Zn(s);
  } catch {
    return null;
  }
};
var Qn = async (e, t = true, n2) => {
  if (t && z.has(e)) {
    let s = z.get(e);
    if (s == null) return null;
    if (Wn(s)) {
      let i = s.deref();
      if (i) return i;
      z.delete(e);
    } else return s;
  }
  if (t && ne.has(e)) return ne.get(e);
  let r = qn(e, n2);
  t && ne.set(e, r);
  let o2 = await r;
  return t && ne.delete(e), t && (o2 === null ? z.set(e, null) : z.set(e, wt ? new WeakRef(o2) : o2)), o2;
};
var Jn = async (e, t = true, n2) => await Promise.all(e.map(async (r) => {
  if (!r.fileName) return r;
  let o2 = await Qn(r.fileName, t, n2);
  if (!o2 || typeof r.lineNumber != "number" || typeof r.columnNumber != "number") return r;
  let s = Xn(o2, r.lineNumber, r.columnNumber);
  return s ? { ...r, source: s.fileName && r.source ? r.source.replace(r.fileName, s.fileName) : r.source, fileName: s.fileName, lineNumber: s.lineNumber, columnNumber: s.columnNumber, isSymbolicated: true } : r;
}));
var Ge = (e) => e._debugStack instanceof Error && typeof e._debugStack?.stack == "string";
var er = () => {
  let e = S();
  for (let t of [...Array.from(_), ...Array.from(e.renderers.values())]) {
    let n2 = t.currentDispatcherRef;
    if (n2 && typeof n2 == "object") return "H" in n2 ? n2.H : n2.current;
  }
  return null;
};
var Ot = (e) => {
  for (let t of _) {
    let n2 = t.currentDispatcherRef;
    n2 && typeof n2 == "object" && ("H" in n2 ? n2.H = e : n2.current = e);
  }
};
var g = (e) => `
    in ${e}`;
var tr = (e, t) => {
  let n2 = g(e);
  return t && (n2 += ` (at ${t})`), n2;
};
var He = false;
var Ve = (e, t) => {
  if (!e || He) return "";
  let n2 = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0, He = true;
  let r = er();
  Ot(null);
  let o2 = console.error, s = console.warn;
  console.error = () => {
  }, console.warn = () => {
  };
  try {
    let a = { DetermineComponentFrameRoot() {
      let u;
      try {
        if (t) {
          let m = function() {
            throw Error();
          };
          if (Object.defineProperty(m.prototype, "props", { set: function() {
            throw Error();
          } }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(m, []);
            } catch (c) {
              u = c;
            }
            Reflect.construct(e, [], m);
          } else {
            try {
              m.call();
            } catch (c) {
              u = c;
            }
            e.call(m.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (c) {
            u = c;
          }
          let m = e();
          m && typeof m.catch == "function" && m.catch(() => {
          });
        }
      } catch (m) {
        if (m instanceof Error && u instanceof Error && typeof m.stack == "string") return [m.stack, u.stack];
      }
      return [null, null];
    } };
    a.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot", Object.getOwnPropertyDescriptor(a.DetermineComponentFrameRoot, "name")?.configurable && Object.defineProperty(a.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
    let [l2, p2] = a.DetermineComponentFrameRoot();
    if (l2 && p2) {
      let u = l2.split(`
`), m = p2.split(`
`), c = 0, f = 0;
      for (; c < u.length && !u[c].includes("DetermineComponentFrameRoot"); ) c++;
      for (; f < m.length && !m[f].includes("DetermineComponentFrameRoot"); ) f++;
      if (c === u.length || f === m.length) for (c = u.length - 1, f = m.length - 1; c >= 1 && f >= 0 && u[c] !== m[f]; ) f--;
      for (; c >= 1 && f >= 0; c--, f--) if (u[c] !== m[f]) {
        if (c !== 1 || f !== 1) do
          if (c--, f--, f < 0 || u[c] !== m[f]) {
            let K = `
${u[c].replace(" at new ", " at ")}`, ot = b(e);
            return ot && K.includes("<anonymous>") && (K = K.replace("<anonymous>", ot)), K;
          }
        while (c >= 1 && f >= 0);
        break;
      }
    }
  } finally {
    He = false, Error.prepareStackTrace = n2, Ot(r), console.error = o2, console.warn = s;
  }
  let i = e ? b(e) : "";
  return i ? g(i) : "";
};
var nr = (e, t) => {
  let n2 = e.tag, r = "";
  switch (n2) {
    case Ie:
      r = g("Activity");
      break;
    case Re:
      r = Ve(e.type, true);
      break;
    case Ne:
      r = Ve(e.type.render, false);
      break;
    case Ce:
    case Ae:
      r = Ve(e.type, false);
      break;
    case Oe:
    case Le:
    case xe:
      r = g(e.type);
      break;
    case Fe:
      r = g("Lazy");
      break;
    case ye:
      r = e.child !== t && t !== null ? g("Suspense Fallback") : g("Suspense");
      break;
    case ve:
      r = g("SuspenseList");
      break;
    case we:
      r = g("ViewTransition");
      break;
    default:
      return "";
  }
  return r;
};
var rr = (e) => {
  try {
    let t = "", n2 = e, r = null;
    do {
      t += nr(n2, r);
      let o2 = n2._debugInfo;
      if (o2 && Array.isArray(o2)) for (let s = o2.length - 1; s >= 0; s--) {
        let i = o2[s];
        typeof i.name == "string" && (t += tr(i.name, i.env));
      }
      r = n2, n2 = n2.return;
    } while (n2);
    return t;
  } catch (t) {
    return t instanceof Error ? `
Error generating stack: ${t.message}
${t.stack}` : "";
  }
};
var ze = (e) => {
  let t = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  let n2 = e;
  if (!n2) return "";
  Error.prepareStackTrace = t, n2.startsWith(`Error: react-stack-top-frame
`) && (n2 = n2.slice(29));
  let r = n2.indexOf(`
`);
  if (r !== -1 && (n2 = n2.slice(r + 1)), r = Math.max(n2.indexOf("react_stack_bottom_frame"), n2.indexOf("react-stack-bottom-frame")), r !== -1 && (r = n2.lastIndexOf(`
`, r)), r !== -1) n2 = n2.slice(0, r);
  else return "";
  return n2;
};
var or = (e) => !!(e.fileName?.startsWith("rsc://") && e.functionName);
var sr = (e, t) => e.fileName === t.fileName && e.lineNumber === t.lineNumber && e.columnNumber === t.columnNumber;
var ir = (e) => {
  let t = /* @__PURE__ */ new Map();
  for (let n2 of e) for (let r of n2.stackFrames) {
    if (!or(r)) continue;
    let o2 = r.functionName, s = t.get(o2) ?? [];
    s.some((i) => sr(i, r)) || (s.push(r), t.set(o2, s));
  }
  return t;
};
var ar = (e, t, n2) => {
  if (!e.functionName) return { ...e, isServer: true };
  let r = t.get(e.functionName);
  if (!r || r.length === 0) return { ...e, isServer: true };
  let o2 = n2.get(e.functionName) ?? 0, s = r[o2 % r.length];
  return n2.set(e.functionName, o2 + 1), { ...e, isServer: true, fileName: s.fileName, lineNumber: s.lineNumber, columnNumber: s.columnNumber, source: e.source?.replace(At, `(${s.fileName}:${s.lineNumber}:${s.columnNumber})`) };
};
var lr = (e) => {
  let t = [];
  return x(e, (n2) => {
    if (!Ge(n2)) return;
    let r = typeof n2.type == "string" ? n2.type : b(n2.type) || "<anonymous>";
    t.push({ componentName: r, stackFrames: re(ze(n2._debugStack?.stack)) });
  }, true), t;
};
var Pt = async (e, t = true, n2) => {
  let r = lr(e), o2 = re(rr(e)), s = ir(r), i = /* @__PURE__ */ new Map();
  return Jn(o2.map((a) => a.source?.includes(At) ?? false ? ar(a, s, i) : a).filter((a, l2, p2) => {
    if (l2 === 0) return true;
    let u = p2[l2 - 1];
    return a.functionName !== u.functionName;
  }), t, n2);
};
var Nt = (e) => e.split("/").filter(Boolean).length;
var cr = (e) => e.split("/").filter(Boolean)[0] ?? null;
var ur = (e) => {
  let t = e.indexOf("/", 1);
  if (t === -1 || Nt(e.slice(0, t)) !== 1) return e;
  let n2 = e.slice(t);
  if (!yt.test(n2) || Nt(n2) < 2) return e;
  let r = cr(n2);
  return !r || r.startsWith("@") || r.length > 4 ? e : n2;
};
var I = (e) => {
  if (!e || Pn.some((s) => s === e)) return "";
  let t = e, n2 = t.startsWith("http://") || t.startsWith("https://");
  if (n2) try {
    t = new URL(t).pathname;
  } catch {
  }
  if (n2 && (t = ur(t)), t.startsWith("about://React/")) {
    let s = t.slice(14), i = s.indexOf("/"), a = s.indexOf(":");
    t = i !== -1 && (a === -1 || i < a) ? s.slice(i + 1) : s;
  }
  let r = true;
  for (; r; ) {
    r = false;
    for (let s of wn) if (t.startsWith(s)) {
      t = t.slice(s.length), s === "file:///" && (t = `/${t.replace(/^\/+/, "")}`), r = true;
      break;
    }
  }
  if (_t.test(t)) {
    let s = t.match(_t);
    s && (t = t.slice(s[0].length));
  }
  if (t.startsWith("//")) {
    let s = t.indexOf("/", 2);
    t = s === -1 ? "" : t.slice(s);
  }
  let o2 = t.indexOf("?");
  if (o2 !== -1) {
    let s = t.slice(o2);
    kn.test(s) && (t = t.slice(0, o2));
  }
  return t;
};
var oe = (e) => {
  let t = I(e);
  return !(!t || !yt.test(t) || Mn.test(t));
};
te();
var Mt = (e) => e.length > 0 && /^[A-Z]/.test(e);
var se = (e, t) => e.length > t ? `${e.slice(0, t)}...` : e;
var mr = /* @__PURE__ */ new Set(["_", "$", "motion.", "styled.", "chakra.", "ark.", "Primitive.", "Slot."]);
var pr = /* @__PURE__ */ new Set(["InnerLayoutRouter", "RedirectErrorBoundary", "RedirectBoundary", "HTTPAccessFallbackErrorBoundary", "HTTPAccessFallbackBoundary", "LoadingBoundary", "ErrorBoundary", "InnerScrollAndFocusHandler", "ScrollAndFocusHandler", "RenderFromTemplateContext", "OuterLayoutRouter", "body", "html", "DevRootHTTPAccessFallbackBoundary", "AppDevOverlayErrorBoundary", "AppDevOverlay", "HotReload", "Router", "ErrorBoundaryHandler", "AppRouter", "ServerRoot", "SegmentStateProvider", "RootErrorBoundary", "LoadableComponent", "MotionDOMComponent"]);
var fr = /* @__PURE__ */ new Set(["Suspense", "Fragment", "StrictMode", "Profiler", "SuspenseList"]);
var Be;
var ie = (e) => (e && (Be = void 0), Be ??= typeof document < "u" && !!(document.getElementById("__NEXT_DATA__") || document.querySelector("nextjs-portal")), Be);
var Ht = (e) => {
  if (pr.has(e) || fr.has(e)) return true;
  for (let t of mr) if (e.startsWith(t)) return true;
  return false;
};
var B = (e) => !(e.length <= 1 || Ht(e) || !Mt(e) || e.endsWith("Provider") || e.endsWith("Context"));
var Vt = ["about://React/", "rsc://React/"];
var dr = (e) => Vt.some((t) => e.startsWith(t));
var gr = (e) => {
  for (let t of Vt) {
    if (!e.startsWith(t)) continue;
    let n2 = e.indexOf("/", t.length), r = e.lastIndexOf("?");
    if (n2 > -1 && r > -1) return decodeURI(e.slice(n2 + 1, r));
  }
  return e;
};
var Er = async (e) => {
  let t = [], n2 = [];
  for (let s = 0; s < e.length; s++) {
    let i = e[s];
    !i.isServer || !i.fileName || (t.push(s), n2.push({ file: gr(i.fileName), methodName: i.functionName ?? "<unknown>", line1: i.lineNumber ?? null, column1: i.columnNumber ?? null, arguments: [] }));
  }
  if (n2.length === 0) return e;
  let r = new AbortController(), o2 = setTimeout(() => r.abort(), at);
  try {
    let s = await fetch("/__nextjs_original-stack-frames", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frames: n2, isServer: true, isEdgeServer: false, isAppDirectory: true }), signal: r.signal });
    if (!s.ok) return e;
    let i = await s.json(), a = [...e];
    for (let l2 = 0; l2 < t.length; l2++) {
      let p2 = i[l2];
      if (p2?.status !== "fulfilled") continue;
      let u = p2.value?.originalStackFrame;
      if (!u?.file || u.ignored) continue;
      let m = t[l2];
      a[m] = { ...e[m], fileName: u.file, lineNumber: u.line1 ?? void 0, columnNumber: u.column1 ?? void 0, isSymbolicated: true };
    }
    return a;
  } catch {
    return e;
  } finally {
    clearTimeout(o2);
  }
};
var _r = (e) => {
  let t = /* @__PURE__ */ new Map();
  return x(e, (n2) => {
    if (!Ge(n2)) return false;
    let r = ze(n2._debugStack.stack);
    if (!r) return false;
    for (let o2 of re(r)) !o2.functionName || !o2.fileName || dr(o2.fileName) && (t.has(o2.functionName) || t.set(o2.functionName, { ...o2, isServer: true }));
    return false;
  }, true), t;
};
var Sr = (e, t) => {
  if (!t.some((o2) => o2.isServer && !o2.fileName && o2.functionName)) return t;
  let r = _r(e);
  return r.size === 0 ? t : t.map((o2) => {
    if (!o2.isServer || o2.fileName || !o2.functionName) return o2;
    let s = r.get(o2.functionName);
    return s ? { ...o2, fileName: s.fileName, lineNumber: s.lineNumber, columnNumber: s.columnNumber } : o2;
  });
};
var $e = (e) => {
  if (!R()) return e;
  let t = e;
  for (; t; ) {
    if (T(t)) return t;
    t = t.parentElement;
  }
  return e;
};
var kt = /* @__PURE__ */ new WeakMap();
var br = async (e) => {
  try {
    let t = T(e);
    if (!t) return null;
    let n2 = await Pt(t);
    if (ie()) {
      let r = Sr(t, n2);
      return await Er(r);
    }
    return n2;
  } catch {
    return null;
  }
};
var Ut = (e) => {
  if (!R()) return Promise.resolve([]);
  let t = $e(e), n2 = kt.get(t);
  if (n2) return n2;
  let r = br(t);
  return kt.set(t, r), r;
};
var Ui = async (e) => {
  if (!R()) return null;
  let t = await Ut(e);
  if (!t) return null;
  for (let n2 of t) if (n2.functionName && B(n2.functionName)) return n2.functionName;
  return null;
};
var Gi = (e) => {
  if (!e || e.length === 0) return null;
  let t = e.filter((o2) => o2.fileName && oe(o2.fileName)), r = t.find((o2) => o2.functionName && B(o2.functionName)) ?? t[0];
  return r?.fileName ? { filePath: I(r.fileName), lineNumber: r.lineNumber, componentName: r.functionName && B(r.functionName) ? r.functionName : null } : null;
};
var Gt = (e) => !(!e || Ht(e) || e === "SlotClone" || e === "Slot");
var zi = (e) => {
  if (!R()) return null;
  let t = $e(e), n2 = T(t);
  if (!n2) return null;
  let r = n2.return;
  for (; r; ) {
    if (L(r)) {
      let o2 = b(r.type);
      if (o2 && Gt(o2)) return o2;
    }
    r = r.return;
  }
  return null;
};
var Tr = (e) => e ? e.some((t) => t.isServer || t.fileName && oe(t.fileName)) : false;
var hr = (e, t) => {
  if (!R()) return [];
  let n2 = T(e);
  if (!n2) return [];
  let r = [];
  return x(n2, (o2) => {
    if (r.length >= t) return true;
    if (L(o2)) {
      let s = b(o2.type);
      s && Gt(s) && r.push(s);
    }
    return false;
  }, true), r;
};
var Cr = (e, t = {}) => {
  let { maxLines: n2 = 3 } = t, r = ie(), o2 = [];
  for (let s of e) {
    if (o2.length >= n2) break;
    let i = s.fileName && oe(s.fileName);
    if (s.isServer && !i && (!s.functionName || B(s.functionName))) {
      o2.push(`
  in ${s.functionName || "<anonymous>"} (at Server)`);
      continue;
    }
    if (i) {
      let a = `
  in `, l2 = s.functionName && B(s.functionName);
      l2 && (a += `${s.functionName} (at `), a += I(s.fileName), r && s.lineNumber && s.columnNumber && (a += `:${s.lineNumber}:${s.columnNumber}`), l2 && (a += ")"), o2.push(a);
    }
  }
  return o2.join("");
};
var Rr = async (e, t = {}) => {
  let n2 = t.maxLines ?? 3, r = await Ut(e);
  if (r && Tr(r)) return Cr(r, t);
  let o2 = hr(e, n2);
  return o2.length > 0 ? o2.map((s) => `
  in ${s}`).join("") : "";
};
var Bi = async (e, t = {}) => {
  let n2 = $e(e), r = Nr(n2), o2 = await Rr(n2, t);
  return o2 ? `${r}${o2}` : Or(n2);
};
var Or = (e) => {
  let t = v(e);
  if (!(e instanceof HTMLElement)) {
    let s = Bt(e, { truncate: false, maxAttrs: fe.length });
    return `<${t}${s} />`;
  }
  let n2 = e.innerText?.trim() ?? e.textContent?.trim() ?? "", r = "";
  for (let { name: s, value: i } of e.attributes) r += ` ${s}="${i}"`;
  let o2 = se(n2, pe);
  return o2.length > 0 ? `<${t}${r}>
  ${o2}
</${t}>` : `<${t}${r} />`;
};
var zt = (e) => se(e, st);
var Bt = (e, t = {}) => {
  let { truncate: n2 = true, maxAttrs: r = it } = t, o2 = [];
  for (let s of fe) {
    if (o2.length >= r) break;
    let i = e.getAttribute(s);
    if (i) {
      let a = n2 ? zt(i) : i;
      o2.push(`${s}="${a}"`);
    }
  }
  return o2.length > 0 ? ` ${o2.join(" ")}` : "";
};
var Nr = (e) => {
  let t = v(e);
  if (!(e instanceof HTMLElement)) {
    let c = Bt(e);
    return `<${t}${c} />`;
  }
  let n2 = e.innerText?.trim() ?? e.textContent?.trim() ?? "", r = "";
  for (let { name: c, value: f } of e.attributes) r += ` ${c}="${zt(f)}"`;
  let o2 = [], s = [], i = false, a = Array.from(e.childNodes);
  for (let c of a) c.nodeType !== Node.COMMENT_NODE && (c.nodeType === Node.TEXT_NODE ? c.textContent && c.textContent.trim().length > 0 && (i = true) : c instanceof Element && (i ? s.push(c) : o2.push(c)));
  let l2 = (c) => c.length === 0 ? "" : c.length <= 2 ? c.map((f) => `<${v(f)} ...>`).join(`
  `) : `(${c.length} elements)`, p2 = "", u = l2(o2);
  u && (p2 += `
  ${u}`), n2.length > 0 && (p2 += `
  ${se(n2, pe)}`);
  let m = l2(s);
  return m && (p2 += `
  ${m}`), p2.length > 0 ? `<${t}${r}>${p2}
</${t}>` : `<${t}${r} />`;
};
var yr = "https://react-grab.com";
var $t = (e, t) => {
  let n2 = t ? `&line=${t}` : "";
  return `${yr}/open-file?url=${encodeURIComponent(e)}${n2}`;
};
var Ar = async (e, t) => {
  let n2 = ie(), r = new URLSearchParams({ file: e }), o2 = n2 ? "line1" : "line", s = n2 ? "column1" : "column";
  return t && r.set(o2, String(t)), r.set(s, "1"), (await fetch(`${n2 ? "/__nextjs_launch-editor" : "/__open-in-editor"}?${r}`)).ok;
};
var Zi = async (e, t, n2) => {
  if (e = I(e), await Ar(e, t).catch(() => false)) return;
  let o2 = $t(e, t), s = n2 ? n2(o2, e, t) : o2;
  window.open(s, "_blank", "noopener,noreferrer");
};
var d = false;
var je = (e, t, n2) => {
  let r = e.get(t);
  if (r) return r;
  let o2 = n2();
  return e.set(t, o2), o2;
};
var jt = /* @__PURE__ */ new WeakMap();
var Wt = /* @__PURE__ */ new WeakMap();
var Fr = /* @__PURE__ */ new WeakMap();
var Xe = /* @__PURE__ */ new Set();
var Ye = [];
var $ = [];
var ae = /* @__PURE__ */ new WeakMap();
var le = /* @__PURE__ */ new WeakMap();
var Xt = /* @__PURE__ */ new WeakSet();
var Yt = De;
var vr = (e) => {
  let t = e;
  for (; t.return; ) t = t.return;
  return t.stateNode ?? null;
};
var Zt = () => {
  if (Yt.size > 0) return Yt;
  let e = /* @__PURE__ */ new Set(), t = (n2) => {
    let r = T(n2);
    if (r) {
      let o2 = vr(r);
      o2 && e.add(o2);
      return;
    }
    for (let o2 of Array.from(n2.children)) if (t(o2), e.size > 0) return;
  };
  return t(document.body), e;
};
var Lr = (e, t) => {
  if (!e) return t;
  if (!t) return e;
  if (!e.next || !t.next) return t;
  let n2 = e.next, r = t.next, o2 = e === n2, s = t === r;
  return o2 && s ? (e.next = t, t.next = e) : o2 ? (e.next = r, t.next = e) : s ? (t.next = n2, e.next = t) : (e.next = r, t.next = n2), t;
};
var xr = (e) => {
  if (!e || ae.has(e)) return;
  let t = { originalPendingDescriptor: Object.getOwnPropertyDescriptor(e, "pending"), pendingValueAtPause: e.pending, bufferedPending: null };
  typeof e.getSnapshot == "function" && (t.originalGetSnapshot = e.getSnapshot, t.snapshotValueAtPause = e.getSnapshot(), e.getSnapshot = () => d ? t.snapshotValueAtPause : t.originalGetSnapshot());
  let n2 = t.pendingValueAtPause;
  Object.defineProperty(e, "pending", { configurable: true, enumerable: true, get: () => d ? null : n2, set: (r) => {
    if (d) {
      r !== null && (t.bufferedPending = Lr(t.bufferedPending ?? null, r));
      return;
    }
    n2 = r;
  } }), ae.set(e, t);
};
var Kt = (e) => {
  if (!e) return [];
  let t = [], n2 = e.next;
  if (!n2) return [];
  let r = n2;
  do
    r && (t.push(r.action), r = r.next);
  while (r && r !== n2);
  return t;
};
var Ir = (e) => {
  let t = ae.get(e);
  if (!t) return;
  t.originalGetSnapshot && (e.getSnapshot = t.originalGetSnapshot), t.originalPendingDescriptor ? Object.defineProperty(e, "pending", t.originalPendingDescriptor) : delete e.pending, e.pending = null;
  let n2 = e.dispatch;
  if (typeof n2 == "function") {
    let r = Kt(t.pendingValueAtPause ?? null), o2 = Kt(t.bufferedPending ?? null);
    for (let s of [...r, ...o2]) $.push(() => n2(s));
  }
  ae.delete(e);
};
var wr = (e) => {
  if (le.has(e)) return;
  let t = { originalDescriptor: Object.getOwnPropertyDescriptor(e, "memoizedValue"), frozenValue: e.memoizedValue };
  Object.defineProperty(e, "memoizedValue", { configurable: true, enumerable: true, get() {
    return d ? t.frozenValue : t.originalDescriptor?.get ? t.originalDescriptor.get.call(this) : this._memoizedValue;
  }, set(n2) {
    if (d) {
      t.pendingValue = n2, t.didReceivePendingValue = true;
      return;
    }
    t.originalDescriptor?.set ? t.originalDescriptor.set.call(this, n2) : this._memoizedValue = n2;
  } }), t.originalDescriptor?.get || (e._memoizedValue = t.frozenValue), le.set(e, t);
};
var Pr = (e) => {
  let t = le.get(e);
  t && (t.originalDescriptor ? Object.defineProperty(e, "memoizedValue", t.originalDescriptor) : delete e.memoizedValue, t.didReceivePendingValue && (e.memoizedValue = t.pendingValue), le.delete(e));
};
var qt = (e, t) => {
  let n2 = e.memoizedState;
  for (; n2; ) n2.queue && typeof n2.queue == "object" && t(n2.queue), n2 = n2.next;
};
var Qt = (e, t) => {
  let n2 = e.dependencies?.firstContext;
  for (; n2 && typeof n2 == "object" && "memoizedValue" in n2; ) t(n2), n2 = n2.next;
};
var ce = (e, t) => {
  e && (L(e) && t(e), ce(e.child, t), ce(e.sibling, t));
};
var Mr = (e) => {
  qt(e, xr), Qt(e, wr);
};
var kr = (e) => {
  qt(e, Ir), Qt(e, Pr);
};
var Dr = (e) => {
  if (jt.has(e)) return;
  let t = e, n2 = { useState: t.useState, useReducer: t.useReducer, useTransition: t.useTransition, useSyncExternalStore: t.useSyncExternalStore };
  jt.set(e, n2), t.useState = (...r) => {
    let o2 = n2.useState.apply(e, r);
    if (!d || !Array.isArray(o2) || typeof o2[1] != "function") return o2;
    let [s, i] = o2, a = je(Wt, i, () => (...l2) => {
      d ? $.push(() => i(...l2)) : i(...l2);
    });
    return [s, a];
  }, t.useReducer = (...r) => {
    let o2 = n2.useReducer.apply(e, r);
    if (!d || !Array.isArray(o2) || typeof o2[1] != "function") return o2;
    let [s, i] = o2, a = je(Wt, i, () => (...l2) => {
      d ? $.push(() => i(...l2)) : i(...l2);
    });
    return [s, a];
  }, t.useTransition = (...r) => {
    let o2 = n2.useTransition.apply(e, r);
    if (!d || !Array.isArray(o2) || typeof o2[1] != "function") return o2;
    let [s, i] = o2, a = je(Fr, i, () => (l2) => {
      d ? Ye.push(() => i(l2)) : i(l2);
    });
    return [s, a];
  }, t.useSyncExternalStore = (r, o2, s) => {
    if (!d) return n2.useSyncExternalStore(r, o2, s);
    let i = (a) => r(() => {
      d ? Xe.add(a) : a();
    });
    return n2.useSyncExternalStore(i, o2, s);
  };
};
var Hr = (e) => {
  let t = e.currentDispatcherRef;
  if (!t || typeof t != "object") return;
  let n2 = "H" in t ? "H" : "current", r = t[n2];
  Object.defineProperty(t, n2, { configurable: true, enumerable: true, get: () => (r && typeof r == "object" && Dr(r), r), set: (o2) => {
    r = o2;
  } });
};
var Vr = (e) => {
  queueMicrotask(() => {
    try {
      for (let t of S().renderers.values()) if (typeof t.scheduleUpdate == "function") {
        for (let n2 of e) if (n2.current) try {
          t.scheduleUpdate(n2.current);
        } catch {
        }
      }
    } catch {
    }
  });
};
var We = (e) => {
  for (let t of e) try {
    t();
  } catch {
  }
};
var Ur = () => {
  for (let e of S().renderers.values()) Xt.has(e) || (Hr(e), Xt.add(e));
};
var Qi = () => {
  if (d) return () => {
  };
  Ur(), d = true;
  let e = Zt();
  for (let t of e) ce(t.current, Mr);
  return () => {
    if (d) try {
      let t = Zt();
      for (let s of t) ce(s.current, kr);
      let n2 = Array.from(Xe), r = Ye.slice(), o2 = $.slice();
      d = false, We(n2), We(r), We(o2), Vr(t);
    } finally {
      Xe.clear(), Ye.length = 0, $.length = 0;
    }
  };
};
var j = (e, t) => {
  let n2 = document.createElement("style");
  return n2.setAttribute(e, ""), n2.textContent = t, document.head.appendChild(n2), n2;
};
var O = false;
var E = /* @__PURE__ */ new Map();
var Jt = -1;
var en = /* @__PURE__ */ new WeakSet();
var W = /* @__PURE__ */ new Map();
var w = /* @__PURE__ */ new Map();
var Gr = (e) => en.has(e) ? true : !O || !("gsapVersions" in window) || !(new Error().stack ?? "").includes("_tick") ? false : (en.add(e), true);
typeof window < "u" && (window.requestAnimationFrame = (e) => {
  if (!Gr(e)) return D(e);
  if (O) {
    let n2 = Jt--;
    return E.set(n2, e), n2;
  }
  let t = D((n2) => {
    if (O) {
      let r = Jt--;
      E.set(r, e), W.set(t, r);
      return;
    }
    e(n2);
  });
  return t;
}, window.cancelAnimationFrame = (e) => {
  if (E.has(e)) {
    E.delete(e);
    return;
  }
  let t = w.get(e);
  if (t !== void 0) {
    q(t.nativeId), w.delete(e);
    return;
  }
  let n2 = W.get(e);
  if (n2 !== void 0) {
    E.delete(n2), W.delete(e);
    return;
  }
  q(e);
});
var tn = () => {
  if (!O) {
    O = true, E.clear(), W.clear();
    for (let [e, { nativeId: t, callback: n2 }] of w) q(t), E.set(e, n2);
    w.clear();
  }
};
var nn = () => {
  if (O) {
    O = false;
    for (let [e, t] of E.entries()) {
      let n2 = D((r) => {
        w.delete(e), t(r);
      });
      w.set(e, { nativeId: n2, callback: t });
    }
    E.clear(), W.clear();
  }
};
var zr = `
[${M}],
[${M}] * {
  animation-play-state: paused !important;
  transition: none !important;
}
`;
var Br = `
*, *::before, *::after {
  animation-play-state: paused !important;
  transition: none !important;
}
`;
var on = "svg";
var rn = null;
var N = [];
var X = [];
var Ze = [];
var P = null;
var ue = [];
var Y = /* @__PURE__ */ new Map();
var Z = [];
var $r = () => {
  rn || (rn = j("data-react-grab-frozen-styles", zr));
};
var jr = (e, t) => e.length === t.length && e.every((n2, r) => n2 === t[r]);
var sn = (e) => {
  let t = /* @__PURE__ */ new Set();
  for (let n2 of e) {
    n2 instanceof SVGSVGElement ? t.add(n2) : n2 instanceof SVGElement && n2.ownerSVGElement && t.add(n2.ownerSVGElement);
    for (let r of n2.querySelectorAll(on)) r instanceof SVGSVGElement && t.add(r);
  }
  return [...t];
};
var an = (e, t) => {
  let n2 = Reflect.get(e, t);
  typeof n2 == "function" && n2.call(e);
};
var ln = (e) => {
  for (let t of e) {
    let n2 = Y.get(t) ?? 0;
    n2 === 0 && an(t, "pauseAnimations"), Y.set(t, n2 + 1);
  }
};
var cn = (e) => {
  for (let t of e) {
    let n2 = Y.get(t);
    if (n2) {
      if (n2 === 1) {
        Y.delete(t), an(t, "unpauseAnimations");
        continue;
      }
      Y.set(t, n2 - 1);
    }
  }
};
var Wr = (e) => {
  let t = [];
  for (let n2 of e) for (let r of n2.getAnimations({ subtree: true })) r.playState === "running" && t.push(r);
  return t;
};
var un = (e) => {
  for (let t of e) try {
    t.finish();
  } catch {
  }
};
var Xr = (e) => {
  if (e.length !== 0 && !jr(e, Ze)) {
    Ke(), Ze = [...e], $r(), N = e, X = sn(N), ln(X);
    for (let t of N) t.setAttribute(M, "");
    Z = Wr(N);
    for (let t of Z) t.pause();
  }
};
var Ke = () => {
  if (!(N.length === 0 && X.length === 0 && Z.length === 0)) {
    for (let e of N) e.removeAttribute(M);
    cn(X), un(Z), N = [], X = [], Z = [], Ze = [];
  }
};
var ia = (e) => e.length === 0 ? (Ke(), () => {
}) : (Xr(e), Ke);
var aa = () => {
  P || (P = j("data-react-grab-global-freeze", Br), ue = sn(Array.from(document.querySelectorAll(on))), ln(ue), tn());
};
var la = () => {
  if (!P) return;
  P.textContent = `
*, *::before, *::after {
  transition: none !important;
}
`;
  let e = [];
  for (let t of document.getAnimations()) {
    if (t.effect instanceof KeyframeEffect) {
      let n2 = t.effect.target;
      if (n2 instanceof Element && n2.getRootNode() instanceof ShadowRoot) continue;
    }
    e.push(t);
  }
  un(e), P.remove(), P = null, cn(ue), ue = [], nn();
};
var mn = (e) => {
  let t = v(e);
  return t === "html" || t === "body";
};
var pn = (e, t = window.getComputedStyle(e)) => t.display !== "none" && t.visibility !== "hidden" && t.opacity !== "0";
var Yr = (e) => {
  if (e.hasAttribute("data-react-grab")) return true;
  let t = e.getRootNode();
  return t instanceof ShadowRoot && t.host.hasAttribute("data-react-grab");
};
var Zr = (e) => e.hasAttribute(de) || e.closest(`[${de}]`) !== null;
var Kr = (e) => {
  let t = parseInt(e.zIndex, 10);
  return e.pointerEvents === "none" && e.position === "fixed" && !isNaN(t) && t >= ct;
};
var qr = (e, t) => {
  let n2 = t.position;
  if (n2 !== "fixed" && n2 !== "absolute") return false;
  let r = e.getBoundingClientRect();
  if (!(r.width / window.innerWidth >= k && r.height / window.innerHeight >= k)) return false;
  let s = t.backgroundColor;
  if (s === "transparent" || s === "rgba(0, 0, 0, 0)" || parseFloat(t.opacity) < 0.1) return true;
  let a = parseInt(t.zIndex, 10);
  return !isNaN(a) && a > lt;
};
var me = /* @__PURE__ */ new WeakMap();
var Ea = () => {
  me = /* @__PURE__ */ new WeakMap();
};
var qe = (e) => {
  if (mn(e) || Yr(e) || Zr(e)) return false;
  let t = performance.now(), n2 = me.get(e);
  if (n2 && t - n2.timestamp < pt) return n2.isVisible;
  let r = window.getComputedStyle(e);
  return pn(e, r) ? e.clientWidth / window.innerWidth >= k && e.clientHeight / window.innerHeight >= k && (Kr(r) || qr(e, r)) ? false : (me.set(e, { isVisible: true, timestamp: t }), true) : (me.set(e, { isVisible: false, timestamp: t }), false);
};
var Qr = "html { pointer-events: none !important; }";
var _n = ["mouseenter", "mouseleave", "mouseover", "mouseout", "pointerenter", "pointerleave", "pointerover", "pointerout"];
var Sn = ["focus", "blur", "focusin", "focusout"];
var bn = ["background-color", "color", "border-color", "box-shadow", "transform", "opacity", "outline", "filter", "scale", "visibility"];
var Tn = ["background-color", "color", "border-color", "box-shadow", "outline", "outline-offset", "outline-width", "outline-color", "outline-style", "filter", "opacity", "ring-color", "ring-width"];
var hn = /* @__PURE__ */ new Map();
var Qe = /* @__PURE__ */ new Map();
var h = null;
var Cn = (e) => {
  e.stopImmediatePropagation();
};
var Rn = (e) => {
  e.preventDefault(), e.stopImmediatePropagation();
};
var Jr = (e, t) => {
  let n2 = /* @__PURE__ */ new Map();
  for (let r of t) {
    let o2 = e.style.getPropertyValue(r);
    o2 && n2.set(r, o2);
  }
  return n2;
};
var fn = (e, t, n2) => {
  let r = [];
  for (let o2 of document.querySelectorAll(e)) {
    if (!(o2 instanceof HTMLElement) || n2?.has(o2)) continue;
    let s = getComputedStyle(o2), i = o2.style.cssText, a = Jr(o2, t);
    for (let l2 of t) {
      let p2 = s.getPropertyValue(l2);
      p2 && (i += `${l2}: ${p2} !important; `);
    }
    r.push({ element: o2, frozenStyles: i, originalPropertyValues: a });
  }
  return r;
};
var dn = (e, t) => {
  for (let { element: n2, frozenStyles: r, originalPropertyValues: o2 } of e) t.set(n2, o2), n2.style.cssText = r;
};
var gn = (e, t) => {
  for (let [n2, r] of e) for (let o2 of t) {
    let s = r.get(o2);
    s ? n2.style.setProperty(o2, s) : n2.style.removeProperty(o2);
  }
  e.clear();
};
var Je = () => {
  h && (h.disabled = true);
};
var et = () => {
  h && (h.disabled = false);
};
var Ta = () => {
  if (h) return;
  for (let n2 of _n) document.addEventListener(n2, Cn, true);
  for (let n2 of Sn) document.addEventListener(n2, Rn, true);
  let e = fn(":hover", bn), t = fn(":focus, :focus-visible", Tn, Qe);
  dn(e, hn), dn(t, Qe), h = j("data-react-grab-frozen-pseudo", Qr);
};
var ha = () => {
  En();
  for (let e of _n) document.removeEventListener(e, Cn, true);
  for (let e of Sn) document.removeEventListener(e, Rn, true);
  gn(hn, bn), gn(Qe, Tn), h?.remove(), h = null;
};
var y = null;
var A = null;
var On = () => {
  A !== null && clearTimeout(A), A = setTimeout(() => {
    A = null, et();
  }, mt);
};
var tt = () => {
  A !== null && (clearTimeout(A), A = null);
};
var eo = (e, t, n2, r) => {
  let o2 = Math.abs(e - n2), s = Math.abs(t - r);
  return o2 <= ge && s <= ge;
};
var ya = (e, t) => {
  tt(), Je();
  let n2 = document.elementsFromPoint(e, t);
  return On(), n2;
};
var Aa = (e, t) => {
  let n2 = performance.now();
  if (y) {
    let s = eo(e, t, y.clientX, y.clientY), i = n2 - y.timestamp < ut;
    if (s || i) return y.element;
  }
  tt(), Je();
  let r = null, o2 = document.elementFromPoint(e, t);
  if (o2 && qe(o2)) r = o2;
  else {
    let s = document.elementsFromPoint(e, t);
    for (let i of s) if (i !== o2 && qe(i)) {
      r = i;
      break;
    }
  }
  return On(), y = { clientX: e, clientY: t, element: r, timestamp: n2 }, r;
};
var En = () => {
  tt(), et(), y = null;
};
var Nn = (e) => typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/[^a-zA-Z0-9_-]/g, (t) => `\\${t}`);
var yn = (e) => e.ownerDocument.body ?? e.ownerDocument.documentElement;
var An = /* @__PURE__ */ new Set(["data-testid", "data-test-id", "data-test", "data-cy", "data-qa", "aria-label", "role", "name", "title", "alt"]);
var Fn = (e) => e.length > 0 && e.length <= 120;
var nt = (e, t) => {
  try {
    let n2 = e.ownerDocument.querySelectorAll(t);
    return n2.length === 1 && n2[0] === e;
  } catch {
    return false;
  }
};
var so = (e) => {
  if (e instanceof HTMLElement && e.id) {
    let t = `#${Nn(e.id)}`;
    if (nt(e, t)) return t;
  }
  for (let t of An) {
    let n2 = e.getAttribute(t);
    if (!n2 || !Fn(n2)) continue;
    let r = JSON.stringify(n2), o2 = `[${t}=${r}]`;
    if (nt(e, o2)) return o2;
    let s = `${e.tagName.toLowerCase()}${o2}`;
    if (nt(e, s)) return s;
  }
  return null;
};
var io = (e) => {
  let t = [], n2 = yn(e), r = e;
  for (; r; ) {
    if (r instanceof HTMLElement && r.id) {
      t.unshift(`#${Nn(r.id)}`);
      break;
    }
    let o2 = r.parentElement;
    if (!o2) {
      t.unshift(r.tagName.toLowerCase());
      break;
    }
    let i = Array.from(o2.children).indexOf(r), a = i >= 0 ? i + 1 : 1;
    if (t.unshift(`${r.tagName.toLowerCase()}:nth-child(${a})`), o2 === n2) {
      t.unshift(n2.tagName.toLowerCase());
      break;
    }
    r = o2;
  }
  return t.join(" > ");
};
var xa = (e, t = true) => {
  let n2 = so(e);
  if (n2) return n2;
  if (t) try {
    let r = finder(e, { root: yn(e), timeoutMs: 200, attr: (o2, s) => attr(o2, s) || An.has(o2) && Fn(s) });
    if (r) return r;
  } catch {
  }
  return io(e);
};
var ao = new Map(["top", "right", "bottom", "left"].flatMap((e) => [[`border-${e}-style`, e], [`border-${e}-color`, e]]));
var C = null;
var rt = /* @__PURE__ */ new Map();
var lo = () => C || (C = document.createElement("iframe"), C.style.cssText = "position:fixed;left:-9999px;width:0;height:0;border:none;visibility:hidden;", document.body.appendChild(C), C);
var co = (e) => {
  let t = rt.get(e);
  if (t) return t;
  let n2 = lo(), r = n2.contentDocument, o2 = r.createElement(e);
  r.body.appendChild(o2);
  let s = n2.contentWindow.getComputedStyle(o2), i = /* @__PURE__ */ new Map();
  for (let a of Ee) {
    let l2 = s.getPropertyValue(a);
    l2 && i.set(a, l2);
  }
  return o2.remove(), rt.set(e, i), i;
};
var uo = (e, t) => {
  let n2 = ao.get(e);
  if (!n2) return false;
  let r = t.getPropertyValue(`border-${n2}-width`);
  return r === "0px" || r === "0";
};
var Pa = (e) => {
  let t = e.tagName.toLowerCase(), n2 = co(t), r = getComputedStyle(e), o2 = [];
  for (let a of Ee) {
    let l2 = r.getPropertyValue(a);
    l2 && l2 !== n2.get(a) && (uo(a, r) || o2.push(`${a}: ${l2};`));
  }
  let s = e.getAttribute("class")?.trim(), i = o2.join(`
`);
  return s ? i ? `className: ${s}

${i}` : `className: ${s}` : i;
};
var Ma = () => {
  C?.remove(), C = null, rt.clear();
};

// ../../../node_modules/.pnpm/react-grab@0.1.27_@types+react@18.3.27_react@19.2.4/node_modules/react-grab/dist/chunk-STWQGYJG.js
var lu = (e, t) => e === t;
var Jt2 = /* @__PURE__ */ Symbol("solid-proxy");
var cu = typeof Proxy == "function";
var sr2 = /* @__PURE__ */ Symbol("solid-track");
var Yr2 = { equals: lu };
var bl = El;
var Bt2 = 1;
var or2 = 2;
var yl = { owned: null, cleanups: null, context: null, owner: null };
var ws = {};
var $e2 = null;
var J2 = null;
var Eo2 = null;
var We2 = null;
var at2 = null;
var yt2 = null;
var Jr2 = 0;
function yn2(e, t) {
  let n2 = We2, o2 = $e2, l2 = e.length === 0, a = t === void 0 ? o2 : t, i = l2 ? yl : { owned: null, cleanups: null, context: a ? a.context : null, owner: a }, c = l2 ? e : () => e(() => wt2(() => Rn2(i)));
  $e2 = i, We2 = null;
  try {
    return Mt2(c, true);
  } finally {
    We2 = n2, $e2 = o2;
  }
}
function B2(e, t) {
  t = t ? Object.assign({}, Yr2, t) : Yr2;
  let n2 = { value: e, observers: null, observerSlots: null, comparator: t.equals || void 0 }, o2 = (l2) => (typeof l2 == "function" && (l2 = l2(n2.value)), Cl(n2, l2));
  return [vl.bind(n2), o2];
}
function ml(e, t, n2) {
  let o2 = ti(e, t, true, Bt2);
  Ao2(o2);
}
function Y2(e, t, n2) {
  let o2 = ti(e, t, false, Bt2);
  Ao2(o2);
}
function pe2(e, t, n2) {
  bl = gu;
  let o2 = ti(e, t, false, Bt2);
  o2.user = true, yt2 ? yt2.push(o2) : Ao2(o2);
}
function se2(e, t, n2) {
  n2 = n2 ? Object.assign({}, Yr2, n2) : Yr2;
  let o2 = ti(e, t, true, 0);
  return o2.observers = null, o2.observerSlots = null, o2.comparator = n2.equals || void 0, Ao2(o2), vl.bind(o2);
}
function du(e) {
  return e && typeof e == "object" && "then" in e;
}
function Es2(e, t, n2) {
  let o2, l2, a;
  typeof t == "function" ? (o2 = e, l2 = t, a = {}) : (o2 = true, l2 = e, a = t || {});
  let i = null, c = ws, f = false, p2 = "initialValue" in a, y2 = typeof o2 == "function" && se2(o2), T2 = /* @__PURE__ */ new Set(), [H2, $2] = (a.storage || B2)(a.initialValue), [b2, w3] = B2(void 0), [h2, g2] = B2(void 0, { equals: false }), [v2, I2] = B2(p2 ? "ready" : "unresolved");
  function K(ue2, W2, V2, S2) {
    return i === ue2 && (i = null, S2 !== void 0 && (p2 = true), (ue2 === c || W2 === c) && a.onHydrated && queueMicrotask(() => a.onHydrated(S2, { value: W2 })), c = ws, Q2(W2, V2)), W2;
  }
  function Q2(ue2, W2) {
    Mt2(() => {
      W2 === void 0 && $2(() => ue2), I2(W2 !== void 0 ? "errored" : p2 ? "ready" : "unresolved"), w3(W2);
      for (let V2 of T2.keys()) V2.decrement();
      T2.clear();
    }, false);
  }
  function X2() {
    let ue2 = rr2, W2 = H2(), V2 = b2();
    if (V2 !== void 0 && !i) throw V2;
    return We2 && !We2.user && ue2, W2;
  }
  function te2(ue2 = true) {
    if (ue2 !== false && f) return;
    f = false;
    let W2 = y2 ? y2() : o2;
    if (W2 == null || W2 === false) {
      K(i, wt2(H2));
      return;
    }
    let V2, S2 = c !== ws ? c : wt2(() => {
      try {
        return l2(W2, { value: H2(), refetching: ue2 });
      } catch (O2) {
        V2 = O2;
      }
    });
    if (V2 !== void 0) {
      K(i, void 0, Xr2(V2), W2);
      return;
    } else if (!du(S2)) return K(i, S2, void 0, W2), S2;
    return i = S2, "v" in S2 ? (S2.s === 1 ? K(i, S2.v, void 0, W2) : K(i, void 0, Xr2(S2.v), W2), S2) : (f = true, queueMicrotask(() => f = false), Mt2(() => {
      I2(p2 ? "refreshing" : "pending"), g2();
    }, false), S2.then((O2) => K(S2, O2, void 0, W2), (O2) => K(S2, void 0, Xr2(O2), W2)));
  }
  Object.defineProperties(X2, { state: { get: () => v2() }, error: { get: () => b2() }, loading: { get() {
    let ue2 = v2();
    return ue2 === "pending" || ue2 === "refreshing";
  } }, latest: { get() {
    if (!p2) return X2();
    let ue2 = b2();
    if (ue2 && !i) throw ue2;
    return H2();
  } } });
  let ye2 = $e2;
  return y2 ? ml(() => (ye2 = $e2, te2(false))) : te2(false), [X2, { refetch: (ue2) => wl(ye2, () => te2(ue2)), mutate: $2 }];
}
function Qr2(e) {
  return Mt2(e, false);
}
function wt2(e) {
  if (We2 === null) return e();
  let t = We2;
  We2 = null;
  try {
    return Eo2 ? Eo2.untrack(e) : e();
  } finally {
    We2 = t;
  }
}
function Be2(e, t, n2) {
  let o2 = Array.isArray(e), l2, a = n2 && n2.defer;
  return (i) => {
    let c;
    if (o2) {
      c = Array(e.length);
      for (let d2 = 0; d2 < e.length; d2++) c[d2] = e[d2]();
    } else c = e();
    if (a) return a = false, i;
    let s = wt2(() => t(c, l2, i));
    return l2 = c, s;
  };
}
function lt2(e) {
  pe2(() => wt2(e));
}
function Te2(e) {
  return $e2 === null || ($e2.cleanups === null ? $e2.cleanups = [e] : $e2.cleanups.push(e)), e;
}
function ei() {
  return We2;
}
function wl(e, t) {
  let n2 = $e2, o2 = We2;
  $e2 = e, We2 = null;
  try {
    return Mt2(t, true);
  } catch (l2) {
    ni(l2);
  } finally {
    $e2 = n2, We2 = o2;
  }
}
var [Zg, gl] = B2(false);
var rr2;
function vl() {
  let e = J2;
  if (this.sources && this.state) if (this.state === Bt2) Ao2(this);
  else {
    let t = at2;
    at2 = null, Mt2(() => qr2(this), false), at2 = t;
  }
  if (We2) {
    let t = this.observers ? this.observers.length : 0;
    We2.sources ? (We2.sources.push(this), We2.sourceSlots.push(t)) : (We2.sources = [this], We2.sourceSlots = [t]), this.observers ? (this.observers.push(We2), this.observerSlots.push(We2.sources.length - 1)) : (this.observers = [We2], this.observerSlots = [We2.sources.length - 1]);
  }
  return e && J2.sources.has(this) ? this.tValue : this.value;
}
function Cl(e, t, n2) {
  let o2 = e.value;
  if (!e.comparator || !e.comparator(o2, t)) {
    e.value = t;
    e.observers && e.observers.length && Mt2(() => {
      for (let l2 = 0; l2 < e.observers.length; l2 += 1) {
        let a = e.observers[l2], i = J2 && J2.running;
        i && J2.disposed.has(a) || ((i ? !a.tState : !a.state) && (a.pure ? at2.push(a) : yt2.push(a), a.observers && Sl(a)), i ? a.tState = Bt2 : a.state = Bt2);
      }
      if (at2.length > 1e6) throw at2 = [], new Error();
    }, false);
  }
  return t;
}
function Ao2(e) {
  if (!e.fn) return;
  Rn2(e);
  let t = Jr2;
  pl(e, e.value, t);
}
function pl(e, t, n2) {
  let o2, l2 = $e2, a = We2;
  We2 = $e2 = e;
  try {
    o2 = e.fn(t);
  } catch (i) {
    return e.pure && (e.state = Bt2, e.owned && e.owned.forEach(Rn2), e.owned = null), e.updatedAt = n2 + 1, ni(i);
  } finally {
    We2 = a, $e2 = l2;
  }
  (!e.updatedAt || e.updatedAt <= n2) && (e.updatedAt != null && "observers" in e ? Cl(e, o2) : e.value = o2, e.updatedAt = n2);
}
function ti(e, t, n2, o2 = Bt2, l2) {
  let a = { fn: e, state: o2, updatedAt: null, owned: null, sources: null, sourceSlots: null, cleanups: null, value: t, owner: $e2, context: $e2 ? $e2.context : null, pure: n2 };
  if ($e2 === null || $e2 !== yl && ($e2.owned ? $e2.owned.push(a) : $e2.owned = [a]), Eo2) ;
  return a;
}
function ir2(e) {
  let t = J2;
  if (e.state === 0) return;
  if (e.state === or2) return qr2(e);
  if (e.suspense && wt2(e.suspense.inFallback)) return e.suspense.effects.push(e);
  let n2 = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < Jr2); ) {
    e.state && n2.push(e);
  }
  for (let o2 = n2.length - 1; o2 >= 0; o2--) {
    if (e = n2[o2], t) ;
    if (e.state === Bt2) Ao2(e);
    else if (e.state === or2) {
      let l2 = at2;
      at2 = null, Mt2(() => qr2(e, n2[0]), false), at2 = l2;
    }
  }
}
function Mt2(e, t) {
  if (at2) return e();
  let n2 = false;
  t || (at2 = []), yt2 ? n2 = true : yt2 = [], Jr2++;
  try {
    let o2 = e();
    return fu(n2), o2;
  } catch (o2) {
    n2 || (yt2 = null), at2 = null, ni(o2);
  }
}
function fu(e) {
  if (at2 && (El(at2), at2 = null), e) return;
  let n2 = yt2;
  yt2 = null, n2.length && Mt2(() => bl(n2), false);
}
function El(e) {
  for (let t = 0; t < e.length; t++) ir2(e[t]);
}
function gu(e) {
  let t, n2 = 0;
  for (t = 0; t < e.length; t++) {
    let o2 = e[t];
    o2.user ? e[n2++] = o2 : ir2(o2);
  }
  for (t = 0; t < n2; t++) ir2(e[t]);
}
function qr2(e, t) {
  e.state = 0;
  for (let o2 = 0; o2 < e.sources.length; o2 += 1) {
    let l2 = e.sources[o2];
    if (l2.sources) {
      let a = l2.state;
      a === Bt2 ? l2 !== t && (!l2.updatedAt || l2.updatedAt < Jr2) && ir2(l2) : a === or2 && qr2(l2, t);
    }
  }
}
function Sl(e) {
  for (let n2 = 0; n2 < e.observers.length; n2 += 1) {
    let o2 = e.observers[n2];
    !o2.state && (o2.state = or2, o2.pure ? at2.push(o2) : yt2.push(o2), o2.observers && Sl(o2));
  }
}
function Rn2(e) {
  let t;
  if (e.sources) for (; e.sources.length; ) {
    let n2 = e.sources.pop(), o2 = e.sourceSlots.pop(), l2 = n2.observers;
    if (l2 && l2.length) {
      let a = l2.pop(), i = n2.observerSlots.pop();
      o2 < l2.length && (a.sourceSlots[i] = o2, l2[o2] = a, n2.observerSlots[o2] = i);
    }
  }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) Rn2(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) Rn2(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  e.state = 0;
}
function Xr2(e) {
  return e instanceof Error ? e : new Error(typeof e == "string" ? e : "Unknown error", { cause: e });
}
function ni(e, t = $e2) {
  let o2 = Xr2(e);
  throw o2;
}
var Cs2 = /* @__PURE__ */ Symbol("fallback");
function Zr2(e) {
  for (let t = 0; t < e.length; t++) e[t]();
}
function pu(e, t, n2 = {}) {
  let o2 = [], l2 = [], a = [], i = 0, c = t.length > 1 ? [] : null;
  return Te2(() => Zr2(a)), () => {
    let s = e() || [], d2 = s.length, f, p2;
    return s[sr2], wt2(() => {
      let T2, H2, $2, b2, w3, h2, g2, v2, I2;
      if (d2 === 0) i !== 0 && (Zr2(a), a = [], o2 = [], l2 = [], i = 0, c && (c = [])), n2.fallback && (o2 = [Cs2], l2[0] = yn2((K) => (a[0] = K, n2.fallback())), i = 1);
      else if (i === 0) {
        for (l2 = new Array(d2), p2 = 0; p2 < d2; p2++) o2[p2] = s[p2], l2[p2] = yn2(y2);
        i = d2;
      } else {
        for ($2 = new Array(d2), b2 = new Array(d2), c && (w3 = new Array(d2)), h2 = 0, g2 = Math.min(i, d2); h2 < g2 && o2[h2] === s[h2]; h2++) ;
        for (g2 = i - 1, v2 = d2 - 1; g2 >= h2 && v2 >= h2 && o2[g2] === s[v2]; g2--, v2--) $2[v2] = l2[g2], b2[v2] = a[g2], c && (w3[v2] = c[g2]);
        for (T2 = /* @__PURE__ */ new Map(), H2 = new Array(v2 + 1), p2 = v2; p2 >= h2; p2--) I2 = s[p2], f = T2.get(I2), H2[p2] = f === void 0 ? -1 : f, T2.set(I2, p2);
        for (f = h2; f <= g2; f++) I2 = o2[f], p2 = T2.get(I2), p2 !== void 0 && p2 !== -1 ? ($2[p2] = l2[f], b2[p2] = a[f], c && (w3[p2] = c[f]), p2 = H2[p2], T2.set(I2, p2)) : a[f]();
        for (p2 = h2; p2 < d2; p2++) p2 in $2 ? (l2[p2] = $2[p2], a[p2] = b2[p2], c && (c[p2] = w3[p2], c[p2](p2))) : l2[p2] = yn2(y2);
        l2 = l2.slice(0, i = d2), o2 = s.slice(0);
      }
      return l2;
    });
    function y2(T2) {
      if (a[p2] = T2, c) {
        let [H2, $2] = B2(p2);
        return c[p2] = $2, t(s[p2], H2);
      }
      return t(s[p2]);
    }
  };
}
function hu(e, t, n2 = {}) {
  let o2 = [], l2 = [], a = [], i = [], c = 0, s;
  return Te2(() => Zr2(a)), () => {
    let d2 = e() || [], f = d2.length;
    return d2[sr2], wt2(() => {
      if (f === 0) return c !== 0 && (Zr2(a), a = [], o2 = [], l2 = [], c = 0, i = []), n2.fallback && (o2 = [Cs2], l2[0] = yn2((y2) => (a[0] = y2, n2.fallback())), c = 1), l2;
      for (o2[0] === Cs2 && (a[0](), a = [], o2 = [], l2 = [], c = 0), s = 0; s < f; s++) s < o2.length && o2[s] !== d2[s] ? i[s](() => d2[s]) : s >= o2.length && (l2[s] = yn2(p2));
      for (; s < o2.length; s++) a[s]();
      return c = i.length = a.length = f, o2 = d2.slice(0), l2 = l2.slice(0, c);
    });
    function p2(y2) {
      a[s] = y2;
      let [T2, H2] = B2(d2[s]);
      return i[s] = H2, t(T2, s);
    }
  };
}
function E2(e, t) {
  return wt2(() => e(t || {}));
}
function jr2() {
  return true;
}
var yu = { get(e, t, n2) {
  return t === Jt2 ? n2 : e.get(t);
}, has(e, t) {
  return t === Jt2 ? true : e.has(t);
}, set: jr2, deleteProperty: jr2, getOwnPropertyDescriptor(e, t) {
  return { configurable: true, enumerable: true, get() {
    return e.get(t);
  }, set: jr2, deleteProperty: jr2 };
}, ownKeys(e) {
  return e.keys();
} };
function xs(e) {
  return (e = typeof e == "function" ? e() : e) ? e : {};
}
function wu() {
  for (let e = 0, t = this.length; e < t; ++e) {
    let n2 = this[e]();
    if (n2 !== void 0) return n2;
  }
}
function To2(...e) {
  let t = false;
  for (let i = 0; i < e.length; i++) {
    let c = e[i];
    t = t || !!c && Jt2 in c, e[i] = typeof c == "function" ? (t = true, se2(c)) : c;
  }
  if (cu && t) return new Proxy({ get(i) {
    for (let c = e.length - 1; c >= 0; c--) {
      let s = xs(e[c])[i];
      if (s !== void 0) return s;
    }
  }, has(i) {
    for (let c = e.length - 1; c >= 0; c--) if (i in xs(e[c])) return true;
    return false;
  }, keys() {
    let i = [];
    for (let c = 0; c < e.length; c++) i.push(...Object.keys(xs(e[c])));
    return [...new Set(i)];
  } }, yu);
  let n2 = {}, o2 = /* @__PURE__ */ Object.create(null);
  for (let i = e.length - 1; i >= 0; i--) {
    let c = e[i];
    if (!c) continue;
    let s = Object.getOwnPropertyNames(c);
    for (let d2 = s.length - 1; d2 >= 0; d2--) {
      let f = s[d2];
      if (f === "__proto__" || f === "constructor") continue;
      let p2 = Object.getOwnPropertyDescriptor(c, f);
      if (!o2[f]) o2[f] = p2.get ? { enumerable: true, configurable: true, get: wu.bind(n2[f] = [p2.get.bind(c)]) } : p2.value !== void 0 ? p2 : void 0;
      else {
        let y2 = n2[f];
        y2 && (p2.get ? y2.push(p2.get.bind(c)) : p2.value !== void 0 && y2.push(() => p2.value));
      }
    }
  }
  let l2 = {}, a = Object.keys(o2);
  for (let i = a.length - 1; i >= 0; i--) {
    let c = a[i], s = o2[c];
    s && s.get ? Object.defineProperty(l2, c, s) : l2[c] = s ? s.value : void 0;
  }
  return l2;
}
var xu = (e) => `Stale read from <${e}>.`;
function Qt2(e) {
  let t = "fallback" in e && { fallback: () => e.fallback };
  return se2(pu(() => e.each, e.children, t || void 0));
}
function oi(e) {
  let t = "fallback" in e && { fallback: () => e.fallback };
  return se2(hu(() => e.each, e.children, t || void 0));
}
function fe2(e) {
  let t = e.keyed, n2 = se2(() => e.when, void 0, void 0), o2 = t ? n2 : se2(n2, void 0, { equals: (l2, a) => !l2 == !a });
  return se2(() => {
    let l2 = o2();
    if (l2) {
      let a = e.children;
      return typeof a == "function" && a.length > 0 ? wt2(() => a(t ? l2 : () => {
        if (!wt2(o2)) throw xu("Show");
        return n2();
      })) : a;
    }
    return e.fallback;
  }, void 0, void 0);
}
var Cu = ["allowfullscreen", "async", "alpha", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "inert", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected", "adauctionheaders", "browsingtopics", "credentialless", "defaultchecked", "defaultmuted", "defaultselected", "defer", "disablepictureinpicture", "disableremoteplayback", "preservespitch", "shadowrootclonable", "shadowrootcustomelementregistry", "shadowrootdelegatesfocus", "shadowrootserializable", "sharedstoragewritable"];
var Eu = /* @__PURE__ */ new Set(["className", "value", "readOnly", "noValidate", "formNoValidate", "isMap", "noModule", "playsInline", "adAuctionHeaders", "allowFullscreen", "browsingTopics", "defaultChecked", "defaultMuted", "defaultSelected", "disablePictureInPicture", "disableRemotePlayback", "preservesPitch", "shadowRootClonable", "shadowRootCustomElementRegistry", "shadowRootDelegatesFocus", "shadowRootSerializable", "sharedStorageWritable", ...Cu]);
var Su = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]);
var Au = Object.assign(/* @__PURE__ */ Object.create(null), { className: "class", htmlFor: "for" });
var Tu = Object.assign(/* @__PURE__ */ Object.create(null), { class: "className", novalidate: { $: "noValidate", FORM: 1 }, formnovalidate: { $: "formNoValidate", BUTTON: 1, INPUT: 1 }, ismap: { $: "isMap", IMG: 1 }, nomodule: { $: "noModule", SCRIPT: 1 }, playsinline: { $: "playsInline", VIDEO: 1 }, readonly: { $: "readOnly", INPUT: 1, TEXTAREA: 1 }, adauctionheaders: { $: "adAuctionHeaders", IFRAME: 1 }, allowfullscreen: { $: "allowFullscreen", IFRAME: 1 }, browsingtopics: { $: "browsingTopics", IMG: 1 }, defaultchecked: { $: "defaultChecked", INPUT: 1 }, defaultmuted: { $: "defaultMuted", AUDIO: 1, VIDEO: 1 }, defaultselected: { $: "defaultSelected", OPTION: 1 }, disablepictureinpicture: { $: "disablePictureInPicture", VIDEO: 1 }, disableremoteplayback: { $: "disableRemotePlayback", AUDIO: 1, VIDEO: 1 }, preservespitch: { $: "preservesPitch", AUDIO: 1, VIDEO: 1 }, shadowrootclonable: { $: "shadowRootClonable", TEMPLATE: 1 }, shadowrootdelegatesfocus: { $: "shadowRootDelegatesFocus", TEMPLATE: 1 }, shadowrootserializable: { $: "shadowRootSerializable", TEMPLATE: 1 }, sharedstoragewritable: { $: "sharedStorageWritable", IFRAME: 1, IMG: 1 } });
function ku(e, t) {
  let n2 = Tu[e];
  return typeof n2 == "object" ? n2[t] ? n2.$ : void 0 : n2;
}
var Pu = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
var Fe2 = (e) => se2(() => e());
function Iu(e, t, n2) {
  let o2 = n2.length, l2 = t.length, a = o2, i = 0, c = 0, s = t[l2 - 1].nextSibling, d2 = null;
  for (; i < l2 || c < a; ) {
    if (t[i] === n2[c]) {
      i++, c++;
      continue;
    }
    for (; t[l2 - 1] === n2[a - 1]; ) l2--, a--;
    if (l2 === i) {
      let f = a < o2 ? c ? n2[c - 1].nextSibling : n2[a - c] : s;
      for (; c < a; ) e.insertBefore(n2[c++], f);
    } else if (a === c) for (; i < l2; ) (!d2 || !d2.has(t[i])) && t[i].remove(), i++;
    else if (t[i] === n2[a - 1] && n2[c] === t[l2 - 1]) {
      let f = t[--l2].nextSibling;
      e.insertBefore(n2[c++], t[i++].nextSibling), e.insertBefore(n2[--a], f), t[l2] = n2[a];
    } else {
      if (!d2) {
        d2 = /* @__PURE__ */ new Map();
        let p2 = c;
        for (; p2 < a; ) d2.set(n2[p2], p2++);
      }
      let f = d2.get(t[i]);
      if (f != null) if (c < f && f < a) {
        let p2 = i, y2 = 1, T2;
        for (; ++p2 < l2 && p2 < a && !((T2 = d2.get(t[p2])) == null || T2 !== f + y2); ) y2++;
        if (y2 > f - c) {
          let H2 = t[i];
          for (; c < f; ) e.insertBefore(n2[c++], H2);
        } else e.replaceChild(n2[c++], t[i++]);
      } else i++;
      else t[i++].remove();
    }
  }
}
var Tl = "_$DX_DELEGATE";
function Il(e, t, n2, o2 = {}) {
  let l2;
  return yn2((a) => {
    l2 = a, t === document ? e() : _2(t, e(), t.firstChild ? null : void 0, n2);
  }, o2.owner), () => {
    l2(), t.textContent = "";
  };
}
function N2(e, t, n2, o2) {
  let l2, a = () => {
    let c = document.createElement("template");
    return c.innerHTML = e, c.content.firstChild;
  }, i = () => (l2 || (l2 = a())).cloneNode(true);
  return i.cloneNode = i, i;
}
function Qe2(e, t = window.document) {
  let n2 = t[Tl] || (t[Tl] = /* @__PURE__ */ new Set());
  for (let o2 = 0, l2 = e.length; o2 < l2; o2++) {
    let a = e[o2];
    n2.has(a) || (n2.add(a), t.addEventListener(a, Nu));
  }
}
function re2(e, t, n2) {
  n2 == null ? e.removeAttribute(t) : e.setAttribute(t, n2);
}
function Ou(e, t, n2) {
  n2 ? e.setAttribute(t, "") : e.removeAttribute(t);
}
function we2(e, t) {
  t == null ? e.removeAttribute("class") : e.className = t;
}
function Pe2(e, t, n2, o2) {
  if (o2) Array.isArray(n2) ? (e[`$$${t}`] = n2[0], e[`$$${t}Data`] = n2[1]) : e[`$$${t}`] = n2;
  else if (Array.isArray(n2)) {
    let l2 = n2[0];
    e.addEventListener(t, n2[0] = (a) => l2.call(e, n2[1], a));
  } else e.addEventListener(t, n2, typeof n2 != "function" && n2);
}
function eo2(e, t, n2 = {}) {
  let o2 = Object.keys(t || {}), l2 = Object.keys(n2), a, i;
  for (a = 0, i = l2.length; a < i; a++) {
    let c = l2[a];
    !c || c === "undefined" || t[c] || (kl(e, c, false), delete n2[c]);
  }
  for (a = 0, i = o2.length; a < i; a++) {
    let c = o2[a], s = !!t[c];
    !c || c === "undefined" || n2[c] === s || !s || (kl(e, c, true), n2[c] = s);
  }
  return n2;
}
function Du(e, t, n2) {
  if (!t) return n2 ? re2(e, "style") : t;
  let o2 = e.style;
  if (typeof t == "string") return o2.cssText = t;
  typeof n2 == "string" && (o2.cssText = n2 = void 0), n2 || (n2 = {}), t || (t = {});
  let l2, a;
  for (a in n2) t[a] == null && o2.removeProperty(a), delete n2[a];
  for (a in t) l2 = t[a], l2 !== n2[a] && (o2.setProperty(a, l2), n2[a] = l2);
  return n2;
}
function de2(e, t, n2) {
  n2 != null ? e.style.setProperty(t, n2) : e.style.removeProperty(t);
}
function ar2(e, t = {}, n2, o2) {
  let l2 = {};
  return Y2(() => typeof t.ref == "function" && Ue2(t.ref, e)), Y2(() => Lu(e, t, n2, true, l2, true)), l2;
}
function Ue2(e, t, n2) {
  return wt2(() => e(t, n2));
}
function _2(e, t, n2, o2) {
  if (n2 !== void 0 && !o2 && (o2 = []), typeof t != "function") return Po2(e, t, o2, n2);
  Y2((l2) => Po2(e, t(), l2, n2), o2);
}
function Lu(e, t, n2, o2, l2 = {}, a = false) {
  t || (t = {});
  for (let i in l2) if (!(i in t)) {
    if (i === "children") continue;
    l2[i] = Pl(e, i, null, l2[i], n2, a, t);
  }
  for (let i in t) {
    if (i === "children") {
      continue;
    }
    let c = t[i];
    l2[i] = Pl(e, i, c, l2[i], n2, a, t);
  }
}
function Ru(e) {
  return e.toLowerCase().replace(/-([a-z])/g, (t, n2) => n2.toUpperCase());
}
function kl(e, t, n2) {
  let o2 = t.trim().split(/\s+/);
  for (let l2 = 0, a = o2.length; l2 < a; l2++) e.classList.toggle(o2[l2], n2);
}
function Pl(e, t, n2, o2, l2, a, i) {
  let c, s, d2, f, p2;
  if (t === "style") return Du(e, n2, o2);
  if (t === "classList") return eo2(e, n2, o2);
  if (n2 === o2) return o2;
  if (t === "ref") a || n2(e);
  else if (t.slice(0, 3) === "on:") {
    let y2 = t.slice(3);
    o2 && e.removeEventListener(y2, o2, typeof o2 != "function" && o2), n2 && e.addEventListener(y2, n2, typeof n2 != "function" && n2);
  } else if (t.slice(0, 10) === "oncapture:") {
    let y2 = t.slice(10);
    o2 && e.removeEventListener(y2, o2, true), n2 && e.addEventListener(y2, n2, true);
  } else if (t.slice(0, 2) === "on") {
    let y2 = t.slice(2).toLowerCase(), T2 = Pu.has(y2);
    if (!T2 && o2) {
      let H2 = Array.isArray(o2) ? o2[0] : o2;
      e.removeEventListener(y2, H2);
    }
    (T2 || n2) && (Pe2(e, y2, n2, T2), T2 && Qe2([y2]));
  } else if (t.slice(0, 5) === "attr:") re2(e, t.slice(5), n2);
  else if (t.slice(0, 5) === "bool:") Ou(e, t.slice(5), n2);
  else if ((p2 = t.slice(0, 5) === "prop:") || (d2 = Su.has(t)) || ((f = ku(t, e.tagName)) || (s = Eu.has(t))) || (c = e.nodeName.includes("-") || "is" in i)) {
    if (p2) t = t.slice(5), s = true;
    t === "class" || t === "className" ? we2(e, n2) : c && !s && !d2 ? e[Ru(t)] = n2 : e[f || t] = n2;
  } else {
    re2(e, Au[t] || t, n2);
  }
  return n2;
}
function Nu(e) {
  let t = e.target, n2 = `$$${e.type}`, o2 = e.target, l2 = e.currentTarget, a = (s) => Object.defineProperty(e, "target", { configurable: true, value: s }), i = () => {
    let s = t[n2];
    if (s && !t.disabled) {
      let d2 = t[`${n2}Data`];
      if (d2 !== void 0 ? s.call(t, d2, e) : s.call(t, e), e.cancelBubble) return;
    }
    return t.host && typeof t.host != "string" && !t.host._$host && t.contains(e.target) && a(t.host), true;
  }, c = () => {
    for (; i() && (t = t._$host || t.parentNode || t.host); ) ;
  };
  if (Object.defineProperty(e, "currentTarget", { configurable: true, get() {
    return t || document;
  } }), e.composedPath) {
    let s = e.composedPath();
    a(s[0]);
    for (let d2 = 0; d2 < s.length - 2 && (t = s[d2], !!i()); d2++) {
      if (t._$host) {
        t = t._$host, c();
        break;
      }
      if (t.parentNode === l2) break;
    }
  } else c();
  a(o2);
}
function Po2(e, t, n2, o2, l2) {
  for (; typeof n2 == "function"; ) n2 = n2();
  if (t === n2) return n2;
  let i = typeof t, c = o2 !== void 0;
  if (e = c && n2[0] && n2[0].parentNode || e, i === "string" || i === "number") {
    if (i === "number" && (t = t.toString(), t === n2)) return n2;
    if (c) {
      let s = n2[0];
      s && s.nodeType === 3 ? s.data !== t && (s.data = t) : s = document.createTextNode(t), n2 = ko2(e, n2, o2, s);
    } else n2 !== "" && typeof n2 == "string" ? n2 = e.firstChild.data = t : n2 = e.textContent = t;
  } else if (t == null || i === "boolean") {
    n2 = ko2(e, n2, o2);
  } else {
    if (i === "function") return Y2(() => {
      let s = t();
      for (; typeof s == "function"; ) s = s();
      n2 = Po2(e, s, n2, o2);
    }), () => n2;
    if (Array.isArray(t)) {
      let s = [], d2 = n2 && Array.isArray(n2);
      if (Ss2(s, t, n2, l2)) return Y2(() => n2 = Po2(e, s, n2, o2, true)), () => n2;
      if (s.length === 0) {
        if (n2 = ko2(e, n2, o2), c) return n2;
      } else d2 ? n2.length === 0 ? Ml(e, s, o2) : Iu(e, n2, s) : (n2 && ko2(e), Ml(e, s));
      n2 = s;
    } else if (t.nodeType) {
      if (Array.isArray(n2)) {
        if (c) return n2 = ko2(e, n2, o2, t);
        ko2(e, n2, null, t);
      } else n2 == null || n2 === "" || !e.firstChild ? e.appendChild(t) : e.replaceChild(t, e.firstChild);
      n2 = t;
    }
  }
  return n2;
}
function Ss2(e, t, n2, o2) {
  let l2 = false;
  for (let a = 0, i = t.length; a < i; a++) {
    let c = t[a], s = n2 && n2[e.length], d2;
    if (!(c == null || c === true || c === false)) if ((d2 = typeof c) == "object" && c.nodeType) e.push(c);
    else if (Array.isArray(c)) l2 = Ss2(e, c, s) || l2;
    else if (d2 === "function") if (o2) {
      for (; typeof c == "function"; ) c = c();
      l2 = Ss2(e, Array.isArray(c) ? c : [c], Array.isArray(s) ? s : [s]) || l2;
    } else e.push(c), l2 = true;
    else {
      let f = String(c);
      s && s.nodeType === 3 && s.data === f ? e.push(s) : e.push(document.createTextNode(f));
    }
  }
  return l2;
}
function Ml(e, t, n2 = null) {
  for (let o2 = 0, l2 = t.length; o2 < l2; o2++) e.insertBefore(t[o2], n2);
}
function ko2(e, t, n2, o2) {
  if (n2 === void 0) return e.textContent = "";
  let l2 = o2 || document.createTextNode("");
  if (t.length) {
    let a = false;
    for (let i = t.length - 1; i >= 0; i--) {
      let c = t[i];
      if (l2 !== c) {
        let s = c.parentNode === e;
        !a && !i ? s ? e.replaceChild(l2, c) : e.insertBefore(l2, n2) : s && c.remove();
      } else a = true;
    }
  } else e.insertBefore(l2, n2);
  return [l2];
}
var As = `/*! tailwindcss v4.1.17 | MIT License | https://tailwindcss.com */
@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-scale-x:1;--tw-scale-y:1;--tw-scale-z:1;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-ordinal:initial;--tw-slashed-zero:initial;--tw-numeric-figure:initial;--tw-numeric-spacing:initial;--tw-numeric-fraction:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial;--tw-duration:initial;--tw-ease:initial;--tw-contain-size:initial;--tw-contain-layout:initial;--tw-contain-paint:initial;--tw-contain-style:initial;--tw-content:""}}}@layer theme{:root,:host{--font-sans:"Geist",ui-sans-serif,system-ui,sans-serif;--font-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;--color-yellow-500:oklch(79.5% .184 86.047);--color-black:#000;--color-white:#fff;--spacing:4px;--text-sm:14px;--text-sm--line-height:calc(1.25/.875);--font-weight-medium:500;--radius-sm:4px;--ease-out:cubic-bezier(0,0,.2,1);--animate-ping:ping 1s cubic-bezier(0,0,.2,1)infinite;--animate-pulse:pulse 2s cubic-bezier(.4,0,.6,1)infinite;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4,0,.2,1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono);--transition-fast:.1s;--transition-normal:.15s;--transition-slow:.2s}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring{outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab,currentcolor 50%,transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.pointer-events-auto{pointer-events:auto}.pointer-events-none{pointer-events:none}.collapse{visibility:collapse}.invisible{visibility:hidden}.visible{visibility:visible}.touch-hitbox{position:relative}.touch-hitbox:before{content:"";width:100%;min-width:44px;height:100%;min-height:44px;display:block;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.-top-0\\.5{top:calc(var(--spacing)*-.5)}.top-0{top:calc(var(--spacing)*0)}.top-0\\.5{top:calc(var(--spacing)*.5)}.top-1\\/2{top:50%}.top-full{top:100%}.-right-0\\.5{right:calc(var(--spacing)*-.5)}.right-full{right:100%}.bottom-full{bottom:100%}.left-0{left:calc(var(--spacing)*0)}.left-0\\.5{left:calc(var(--spacing)*.5)}.left-1\\.5{left:calc(var(--spacing)*1.5)}.left-1\\/2{left:50%}.left-2\\.5{left:calc(var(--spacing)*2.5)}.left-full{left:100%}.z-1{z-index:1}.z-10{z-index:10}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.m-0{margin:calc(var(--spacing)*0)}.-mx-2{margin-inline:calc(var(--spacing)*-2)}.mx-0\\.5{margin-inline:calc(var(--spacing)*.5)}.-my-1\\.5{margin-block:calc(var(--spacing)*-1.5)}.my-0\\.5{margin-block:calc(var(--spacing)*.5)}.mt-0\\.5{margin-top:calc(var(--spacing)*.5)}.mt-2\\.5{margin-top:calc(var(--spacing)*2.5)}.mr-0\\.5{margin-right:calc(var(--spacing)*.5)}.mr-1\\.5{margin-right:calc(var(--spacing)*1.5)}.mr-2\\.5{margin-right:calc(var(--spacing)*2.5)}.mb-0\\.5{margin-bottom:calc(var(--spacing)*.5)}.mb-1{margin-bottom:calc(var(--spacing)*1)}.mb-1\\.5{margin-bottom:calc(var(--spacing)*1.5)}.mb-2\\.5{margin-bottom:calc(var(--spacing)*2.5)}.-ml-\\[2px\\]{margin-left:-2px}.ml-0\\.5{margin-left:calc(var(--spacing)*.5)}.ml-1{margin-left:calc(var(--spacing)*1)}.ml-2\\.5{margin-left:calc(var(--spacing)*2.5)}.ml-4{margin-left:calc(var(--spacing)*4)}.ml-auto{margin-left:auto}.line-clamp-5{-webkit-line-clamp:5;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.block{display:block}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.size-1\\.5{width:calc(var(--spacing)*1.5);height:calc(var(--spacing)*1.5)}.size-4{width:calc(var(--spacing)*4);height:calc(var(--spacing)*4)}.size-\\[18px\\]{width:18px;height:18px}.h-0{height:calc(var(--spacing)*0)}.h-1\\.5{height:calc(var(--spacing)*1.5)}.h-2{height:calc(var(--spacing)*2)}.h-2\\.5{height:calc(var(--spacing)*2.5)}.h-3{height:calc(var(--spacing)*3)}.h-3\\.5{height:calc(var(--spacing)*3.5)}.h-4{height:calc(var(--spacing)*4)}.h-\\[17px\\]{height:17px}.h-fit{height:fit-content}.max-h-\\[240px\\]{max-height:240px}.min-h-0{min-height:calc(var(--spacing)*0)}.min-h-4{min-height:calc(var(--spacing)*4)}.w-0{width:calc(var(--spacing)*0)}.w-1\\.5{width:calc(var(--spacing)*1.5)}.w-2{width:calc(var(--spacing)*2)}.w-3\\.5{width:calc(var(--spacing)*3.5)}.w-4{width:calc(var(--spacing)*4)}.w-5{width:calc(var(--spacing)*5)}.w-\\[calc\\(100\\%\\+16px\\)\\]{width:calc(100% + 16px)}.w-auto{width:auto}.w-fit{width:fit-content}.w-full{width:100%}.max-w-\\[280px\\]{max-width:280px}.max-w-full{max-width:100%}.min-w-0{min-width:calc(var(--spacing)*0)}.min-w-\\[100px\\]{min-width:100px}.min-w-\\[150px\\]{min-width:150px}.flex-1{flex:1}.flex-shrink,.shrink{flex-shrink:1}.shrink-0{flex-shrink:0}.flex-grow,.grow{flex-grow:1}.-translate-x-1\\/2{--tw-translate-x:calc(calc(1/2*100%)*-1);translate:var(--tw-translate-x)var(--tw-translate-y)}.-translate-y-1\\/2{--tw-translate-y:calc(calc(1/2*100%)*-1);translate:var(--tw-translate-x)var(--tw-translate-y)}.scale-75{--tw-scale-x:75%;--tw-scale-y:75%;--tw-scale-z:75%;scale:var(--tw-scale-x)var(--tw-scale-y)}.scale-100{--tw-scale-x:100%;--tw-scale-y:100%;--tw-scale-z:100%;scale:var(--tw-scale-x)var(--tw-scale-y)}.-rotate-90{rotate:-90deg}.rotate-0{rotate:none}.rotate-90{rotate:90deg}.rotate-180{rotate:180deg}.interactive-scale{transition-property:transform;transition-duration:var(--transition-normal);transition-timing-function:cubic-bezier(.34,1.56,.64,1)}@media (hover:hover) and (pointer:fine){.interactive-scale:hover{transform:scale(1.05)}}.interactive-scale:active{transform:scale(.97)}.press-scale{transition-property:transform;transition-duration:var(--transition-fast);transition-timing-function:ease-out}.press-scale:active{transform:scale(.97)}.transform{transform:var(--tw-rotate-x,)var(--tw-rotate-y,)var(--tw-rotate-z,)var(--tw-skew-x,)var(--tw-skew-y,)}.animate-\\[hint-flip-in_var\\(--transition-normal\\)_ease-out\\]{animation:hint-flip-in var(--transition-normal)ease-out}.animate-ping{animation:var(--animate-ping)}.animate-pulse{animation:var(--animate-pulse)}.cursor-grab{cursor:grab}.cursor-grabbing{cursor:grabbing}.cursor-pointer{cursor:pointer}.resize{resize:both}.resize-none{resize:none}.grid-cols-\\[0fr\\]{grid-template-columns:0fr}.grid-cols-\\[1fr\\]{grid-template-columns:1fr}.grid-rows-\\[0fr\\]{grid-template-rows:0fr}.grid-rows-\\[1fr\\]{grid-template-rows:1fr}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.items-end{align-items:flex-end}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-0\\.5{gap:calc(var(--spacing)*.5)}.gap-1{gap:calc(var(--spacing)*1)}.gap-1\\.5{gap:calc(var(--spacing)*1.5)}.gap-2{gap:calc(var(--spacing)*2)}.gap-\\[5px\\]{gap:5px}.self-stretch{align-self:stretch}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-hidden{overflow:hidden}.overflow-visible{overflow:visible}.overflow-y-auto{overflow-y:auto}.rounded-\\[1px\\]{border-radius:1px}.rounded-\\[10px\\]{border-radius:10px}.rounded-full{border-radius:3.40282e38px}.rounded-sm{border-radius:var(--radius-sm)}.rounded-t-\\[10px\\]{border-top-left-radius:10px;border-top-right-radius:10px}.rounded-t-none{border-top-left-radius:0;border-top-right-radius:0}.rounded-l-\\[10px\\]{border-top-left-radius:10px;border-bottom-left-radius:10px}.rounded-l-none{border-top-left-radius:0;border-bottom-left-radius:0}.rounded-r-\\[10px\\]{border-top-right-radius:10px;border-bottom-right-radius:10px}.rounded-r-none{border-top-right-radius:0;border-bottom-right-radius:0}.rounded-b-\\[6px\\]{border-bottom-right-radius:6px;border-bottom-left-radius:6px}.rounded-b-\\[10px\\]{border-bottom-right-radius:10px;border-bottom-left-radius:10px}.rounded-b-none{border-bottom-right-radius:0;border-bottom-left-radius:0}.border{border-style:var(--tw-border-style);border-width:1px}.\\[border-width\\:0\\.5px\\]{border-width:.5px}.\\[border-top-width\\:0\\.5px\\]{border-top-width:.5px}.border-none{--tw-border-style:none;border-style:none}.border-solid{--tw-border-style:solid;border-style:solid}.border-\\[\\#B3B3B3\\]{border-color:#b3b3b3}.border-t-\\[\\#D9D9D9\\]{border-top-color:#d9d9d9}.bg-\\[\\#404040\\]{background-color:#404040}.bg-\\[\\#FEF2F2\\]{background-color:#fef2f2}.bg-black{background-color:var(--color-black)}.bg-black\\/5{background-color:#0000000d}@supports (color:color-mix(in lab, red, red)){.bg-black\\/5{background-color:color-mix(in oklab,var(--color-black)5%,transparent)}}.bg-black\\/25{background-color:#00000040}@supports (color:color-mix(in lab, red, red)){.bg-black\\/25{background-color:color-mix(in oklab,var(--color-black)25%,transparent)}}.bg-transparent{background-color:#0000}.bg-white{background-color:var(--color-white)}.bg-yellow-500{background-color:var(--color-yellow-500)}.p-0{padding:calc(var(--spacing)*0)}.px-0\\.25{padding-inline:calc(var(--spacing)*.25)}.px-1\\.5{padding-inline:calc(var(--spacing)*1.5)}.px-2{padding-inline:calc(var(--spacing)*2)}.px-\\[3px\\]{padding-inline:3px}.py-0\\.5{padding-block:calc(var(--spacing)*.5)}.py-0\\.25{padding-block:calc(var(--spacing)*.25)}.py-1{padding-block:calc(var(--spacing)*1)}.py-1\\.5{padding-block:calc(var(--spacing)*1.5)}.py-2{padding-block:calc(var(--spacing)*2)}.py-px{padding-block:1px}.pt-1\\.5{padding-top:calc(var(--spacing)*1.5)}.pb-1{padding-bottom:calc(var(--spacing)*1)}.text-left{text-align:left}.font-sans{font-family:var(--font-sans)}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-\\[10px\\]{font-size:10px}.text-\\[11px\\]{font-size:11px}.text-\\[12px\\]{font-size:12px}.text-\\[13px\\]{font-size:13px}.leading-3{--tw-leading:calc(var(--spacing)*3);line-height:calc(var(--spacing)*3)}.leading-3\\.5{--tw-leading:calc(var(--spacing)*3.5);line-height:calc(var(--spacing)*3.5)}.leading-4{--tw-leading:calc(var(--spacing)*4);line-height:calc(var(--spacing)*4)}.leading-none{--tw-leading:1;line-height:1}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.wrap-break-word{overflow-wrap:break-word}.text-ellipsis{text-overflow:ellipsis}.whitespace-nowrap{white-space:nowrap}.text-\\[\\#71717a\\]{color:#71717a}.text-\\[\\#B3B3B3\\]{color:#b3b3b3}.text-\\[\\#B91C1C\\]{color:#b91c1c}.text-\\[\\#B91C1C\\]\\/50{color:oklab(50.542% .168942 .0880134/.5)}.text-black{color:var(--color-black)}.text-black\\/25{color:#00000040}@supports (color:color-mix(in lab, red, red)){.text-black\\/25{color:color-mix(in oklab,var(--color-black)25%,transparent)}}.text-black\\/30{color:#0000004d}@supports (color:color-mix(in lab, red, red)){.text-black\\/30{color:color-mix(in oklab,var(--color-black)30%,transparent)}}.text-black\\/40{color:#0006}@supports (color:color-mix(in lab, red, red)){.text-black\\/40{color:color-mix(in oklab,var(--color-black)40%,transparent)}}.text-black\\/50{color:#00000080}@supports (color:color-mix(in lab, red, red)){.text-black\\/50{color:color-mix(in oklab,var(--color-black)50%,transparent)}}.text-black\\/60{color:#0009}@supports (color:color-mix(in lab, red, red)){.text-black\\/60{color:color-mix(in oklab,var(--color-black)60%,transparent)}}.text-black\\/70{color:#000000b3}@supports (color:color-mix(in lab, red, red)){.text-black\\/70{color:color-mix(in oklab,var(--color-black)70%,transparent)}}.text-black\\/80{color:#000c}@supports (color:color-mix(in lab, red, red)){.text-black\\/80{color:color-mix(in oklab,var(--color-black)80%,transparent)}}.text-black\\/85{color:#000000d9}@supports (color:color-mix(in lab, red, red)){.text-black\\/85{color:color-mix(in oklab,var(--color-black)85%,transparent)}}.text-white{color:var(--color-white)}.italic{font-style:italic}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,)var(--tw-slashed-zero,)var(--tw-numeric-figure,)var(--tw-numeric-spacing,)var(--tw-numeric-fraction,)}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.opacity-0{opacity:0}.opacity-35{opacity:.35}.opacity-40{opacity:.4}.opacity-50{opacity:.5}.opacity-100{opacity:1}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a),0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.filter{filter:var(--tw-blur,)var(--tw-brightness,)var(--tw-contrast,)var(--tw-grayscale,)var(--tw-hue-rotate,)var(--tw-invert,)var(--tw-saturate,)var(--tw-sepia,)var(--tw-drop-shadow,)}.filter-\\[drop-shadow\\(0px_1px_2px_\\#51515140\\)\\]{filter:drop-shadow(0 1px 2px #51515140)}.backdrop-filter{-webkit-backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,)var(--tw-backdrop-brightness,)var(--tw-backdrop-contrast,)var(--tw-backdrop-grayscale,)var(--tw-backdrop-hue-rotate,)var(--tw-backdrop-invert,)var(--tw-backdrop-opacity,)var(--tw-backdrop-saturate,)var(--tw-backdrop-sepia,)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[grid-template-columns\\,opacity\\]{transition-property:grid-template-columns,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[grid-template-rows\\,opacity\\]{transition-property:grid-template-rows,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[opacity\\,transform\\]{transition-property:opacity,transform;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[top\\,left\\,width\\,height\\,opacity\\]{transition-property:top,left,width,height,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[transform\\,opacity\\]{transition-property:transform,opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-opacity{transition-property:opacity;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-75{--tw-duration:75ms;transition-duration:75ms}.duration-100{--tw-duration:.1s;transition-duration:.1s}.duration-150{--tw-duration:.15s;transition-duration:.15s}.duration-300{--tw-duration:.3s;transition-duration:.3s}.ease-out{--tw-ease:var(--ease-out);transition-timing-function:var(--ease-out)}.will-change-\\[opacity\\,transform\\]{will-change:opacity,transform}.contain-layout{--tw-contain-layout:layout;contain:var(--tw-contain-size,)var(--tw-contain-layout,)var(--tw-contain-paint,)var(--tw-contain-style,)}.outline-none{--tw-outline-style:none;outline-style:none}.select-none{-webkit-user-select:none;user-select:none}.\\[animation-fill-mode\\:backwards\\]{animation-fill-mode:backwards}.\\[corner-shape\\:superellipse\\(1\\.25\\)\\]{corner-shape:superellipse(1.25)}.\\[font-synthesis\\:none\\]{font-synthesis:none}.\\[grid-area\\:1\\/1\\]{grid-area:1/1}.\\[scrollbar-color\\:transparent_transparent\\]{scrollbar-color:transparent transparent}.\\[scrollbar-width\\:thin\\]{scrollbar-width:thin}.group-focus-within\\:invisible:is(:where(.group):focus-within *){visibility:hidden}.group-focus-within\\:visible:is(:where(.group):focus-within *){visibility:visible}@media (hover:hover){.group-hover\\:invisible:is(:where(.group):hover *){visibility:hidden}.group-hover\\:visible:is(:where(.group):hover *){visibility:visible}}.before\\:\\!min-h-full:before{content:var(--tw-content);min-height:100%!important}.before\\:\\!min-w-full:before{content:var(--tw-content);min-width:100%!important}@media (hover:hover){.hover\\:bg-\\[\\#F5F5F5\\]:hover{background-color:#f5f5f5}.hover\\:bg-\\[\\#FEE2E2\\]:hover{background-color:#fee2e2}.hover\\:bg-black\\/10:hover{background-color:#0000001a}@supports (color:color-mix(in lab, red, red)){.hover\\:bg-black\\/10:hover{background-color:color-mix(in oklab,var(--color-black)10%,transparent)}}.hover\\:text-\\[\\#B91C1C\\]:hover{color:#b91c1c}.hover\\:text-black:hover{color:var(--color-black)}.hover\\:text-black\\/60:hover{color:#0009}@supports (color:color-mix(in lab, red, red)){.hover\\:text-black\\/60:hover{color:color-mix(in oklab,var(--color-black)60%,transparent)}}.hover\\:opacity-100:hover{opacity:1}.hover\\:\\[scrollbar-color\\:rgba\\(0\\,0\\,0\\,0\\.15\\)_transparent\\]:hover{scrollbar-color:#00000026 transparent}}.disabled\\:cursor-default:disabled{cursor:default}.disabled\\:opacity-40:disabled{opacity:.4}}:host{all:initial;direction:ltr}@keyframes shake{0%,to{transform:translate(0)}15%{transform:translate(-3px)}30%{transform:translate(3px)}45%{transform:translate(-3px)}60%{transform:translate(3px)}75%{transform:translate(-2px)}90%{transform:translate(2px)}}@keyframes pop-in{0%{opacity:0;transform:scale(.9)}70%{opacity:1;transform:scale(1.02)}to{opacity:1;transform:scale(1)}}@keyframes pop-out{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}@keyframes slide-in-bottom{0%{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in-top{0%{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in-left{0%{opacity:0;transform:translate(-8px)}to{opacity:1;transform:translate(0)}}@keyframes slide-in-right{0%{opacity:0;transform:translate(8px)}to{opacity:1;transform:translate(0)}}@keyframes success-pop{0%{opacity:0;transform:scale(.9)}60%{opacity:1;transform:scale(1.1)}80%{transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes hint-flip-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes tooltip-fade-in{0%{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}@keyframes icon-loader-spin{0%{opacity:1}50%{opacity:.5}to{opacity:.2}}.icon-loader-bar{animation:.5s linear infinite icon-loader-spin}@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}.shimmer-text{color:#0000;background:linear-gradient(90deg,#71717a 0%,#a1a1aa 25%,#71717a 50%,#a1a1aa 75%,#71717a 100%) 0 0/200% 100%;-webkit-background-clip:text;background-clip:text;animation:2.5s linear infinite shimmer}@keyframes clock-flash{0%{transform:scale(1)}25%{transform:scale(1.2)}50%{transform:scale(.92)}75%{transform:scale(1.05)}to{transform:scale(1)}}.animate-clock-flash{will-change:transform;animation:.4s ease-out clock-flash}.animate-shake{will-change:transform;animation:.3s ease-out shake}.animate-pop-in{animation:pop-in var(--transition-normal)ease-out;will-change:transform,opacity}.animate-pop-out{animation:pop-out var(--transition-normal)ease-out forwards;will-change:transform,opacity}.animate-slide-in-bottom{animation:slide-in-bottom var(--transition-slow)ease-out;will-change:transform,opacity}.animate-slide-in-top{animation:slide-in-top var(--transition-slow)ease-out;will-change:transform,opacity}.animate-slide-in-left{animation:slide-in-left var(--transition-slow)ease-out;will-change:transform,opacity}.animate-slide-in-right{animation:slide-in-right var(--transition-slow)ease-out;will-change:transform,opacity}.animate-success-pop{will-change:transform,opacity;animation:.25s ease-out success-pop}.animate-tooltip-fade-in{animation:tooltip-fade-in var(--transition-fast)ease-out;will-change:transform,opacity}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --tw-scale-x{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-y{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-z{syntax:"*";inherits:false;initial-value:1}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-ordinal{syntax:"*";inherits:false}@property --tw-slashed-zero{syntax:"*";inherits:false}@property --tw-numeric-figure{syntax:"*";inherits:false}@property --tw-numeric-spacing{syntax:"*";inherits:false}@property --tw-numeric-fraction{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}@property --tw-backdrop-blur{syntax:"*";inherits:false}@property --tw-backdrop-brightness{syntax:"*";inherits:false}@property --tw-backdrop-contrast{syntax:"*";inherits:false}@property --tw-backdrop-grayscale{syntax:"*";inherits:false}@property --tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --tw-backdrop-invert{syntax:"*";inherits:false}@property --tw-backdrop-opacity{syntax:"*";inherits:false}@property --tw-backdrop-saturate{syntax:"*";inherits:false}@property --tw-backdrop-sepia{syntax:"*";inherits:false}@property --tw-duration{syntax:"*";inherits:false}@property --tw-ease{syntax:"*";inherits:false}@property --tw-contain-size{syntax:"*";inherits:false}@property --tw-contain-layout{syntax:"*";inherits:false}@property --tw-contain-paint{syntax:"*";inherits:false}@property --tw-contain-style{syntax:"*";inherits:false}@property --tw-content{syntax:"*";inherits:false;initial-value:""}@keyframes ping{75%,to{opacity:0;transform:scale(2)}}@keyframes pulse{50%{opacity:.5}}`;
var ri = /* @__PURE__ */ Symbol("store-raw");
var Io2 = /* @__PURE__ */ Symbol("store-node");
var wn2 = /* @__PURE__ */ Symbol("store-has");
var _l = /* @__PURE__ */ Symbol("store-self");
function Ol(e) {
  let t = e[Jt2];
  if (!t && (Object.defineProperty(e, Jt2, { value: t = new Proxy(e, Fu) }), !Array.isArray(e))) {
    let n2 = Object.keys(e), o2 = Object.getOwnPropertyDescriptors(e);
    for (let l2 = 0, a = n2.length; l2 < a; l2++) {
      let i = n2[l2];
      o2[i].get && Object.defineProperty(e, i, { enumerable: o2[i].enumerable, get: o2[i].get.bind(t) });
    }
  }
  return t;
}
function _o2(e) {
  let t;
  return e != null && typeof e == "object" && (e[Jt2] || !(t = Object.getPrototypeOf(e)) || t === Object.prototype || Array.isArray(e));
}
function Oo2(e, t = /* @__PURE__ */ new Set()) {
  let n2, o2, l2, a;
  if (n2 = e != null && e[ri]) return n2;
  if (!_o2(e) || t.has(e)) return e;
  if (Array.isArray(e)) {
    Object.isFrozen(e) ? e = e.slice(0) : t.add(e);
    for (let i = 0, c = e.length; i < c; i++) l2 = e[i], (o2 = Oo2(l2, t)) !== l2 && (e[i] = o2);
  } else {
    Object.isFrozen(e) ? e = Object.assign({}, e) : t.add(e);
    let i = Object.keys(e), c = Object.getOwnPropertyDescriptors(e);
    for (let s = 0, d2 = i.length; s < d2; s++) a = i[s], !c[a].get && (l2 = e[a], (o2 = Oo2(l2, t)) !== l2 && (e[a] = o2));
  }
  return e;
}
function ii(e, t) {
  let n2 = e[t];
  return n2 || Object.defineProperty(e, t, { value: n2 = /* @__PURE__ */ Object.create(null) }), n2;
}
function cr2(e, t, n2) {
  if (e[t]) return e[t];
  let [o2, l2] = B2(n2, { equals: false, internal: true });
  return o2.$ = l2, e[t] = o2;
}
function Bu(e, t) {
  let n2 = Reflect.getOwnPropertyDescriptor(e, t);
  return !n2 || n2.get || !n2.configurable || t === Jt2 || t === Io2 || (delete n2.value, delete n2.writable, n2.get = () => e[Jt2][t]), n2;
}
function Dl(e) {
  ei() && cr2(ii(e, Io2), _l)();
}
function Hu(e) {
  return Dl(e), Reflect.ownKeys(e);
}
var Fu = { get(e, t, n2) {
  if (t === ri) return e;
  if (t === Jt2) return n2;
  if (t === sr2) return Dl(e), n2;
  let o2 = ii(e, Io2), l2 = o2[t], a = l2 ? l2() : e[t];
  if (t === Io2 || t === wn2 || t === "__proto__") return a;
  if (!l2) {
    let i = Object.getOwnPropertyDescriptor(e, t);
    ei() && (typeof a != "function" || e.hasOwnProperty(t)) && !(i && i.get) && (a = cr2(o2, t, a)());
  }
  return _o2(a) ? Ol(a) : a;
}, has(e, t) {
  return t === ri || t === Jt2 || t === sr2 || t === Io2 || t === wn2 || t === "__proto__" ? true : (ei() && cr2(ii(e, wn2), t)(), t in e);
}, set() {
  return true;
}, deleteProperty() {
  return true;
}, ownKeys: Hu, getOwnPropertyDescriptor: Bu };
function Do2(e, t, n2, o2 = false) {
  if (!o2 && e[t] === n2) return;
  let l2 = e[t], a = e.length;
  n2 === void 0 ? (delete e[t], e[wn2] && e[wn2][t] && l2 !== void 0 && e[wn2][t].$()) : (e[t] = n2, e[wn2] && e[wn2][t] && l2 === void 0 && e[wn2][t].$());
  let i = ii(e, Io2), c;
  if ((c = cr2(i, t, l2)) && c.$(() => n2), Array.isArray(e) && e.length !== a) {
    for (let s = e.length; s < a; s++) (c = i[s]) && c.$();
    (c = cr2(i, "length", a)) && c.$(e.length);
  }
  (c = i[_l]) && c.$();
}
function Ll(e, t) {
  let n2 = Object.keys(t);
  for (let o2 = 0; o2 < n2.length; o2 += 1) {
    let l2 = n2[o2];
    Do2(e, l2, t[l2]);
  }
}
function zu(e, t) {
  if (typeof t == "function" && (t = t(e)), t = Oo2(t), Array.isArray(t)) {
    if (e === t) return;
    let n2 = 0, o2 = t.length;
    for (; n2 < o2; n2++) {
      let l2 = t[n2];
      e[n2] !== l2 && Do2(e, n2, l2);
    }
    Do2(e, "length", o2);
  } else Ll(e, t);
}
function lr2(e, t, n2 = []) {
  let o2, l2 = e;
  if (t.length > 1) {
    o2 = t.shift();
    let i = typeof o2, c = Array.isArray(e);
    if (Array.isArray(o2)) {
      for (let s = 0; s < o2.length; s++) lr2(e, [o2[s]].concat(t), n2);
      return;
    } else if (c && i === "function") {
      for (let s = 0; s < e.length; s++) o2(e[s], s) && lr2(e, [s].concat(t), n2);
      return;
    } else if (c && i === "object") {
      let { from: s = 0, to: d2 = e.length - 1, by: f = 1 } = o2;
      for (let p2 = s; p2 <= d2; p2 += f) lr2(e, [p2].concat(t), n2);
      return;
    } else if (t.length > 1) {
      lr2(e[o2], t, [o2].concat(n2));
      return;
    }
    l2 = e[o2], n2 = [o2].concat(n2);
  }
  let a = t[0];
  typeof a == "function" && (a = a(l2, n2), a === l2) || o2 === void 0 && a == null || (a = Oo2(a), o2 === void 0 || _o2(l2) && _o2(a) && !Array.isArray(a) ? Ll(l2, a) : Do2(e, o2, a));
}
function ai(...[e, t]) {
  let n2 = Oo2(e || {}), o2 = Array.isArray(n2), l2 = Ol(n2);
  function a(...i) {
    Qr2(() => {
      o2 && i.length === 1 ? zu(n2, i[0]) : lr2(n2, i);
    });
  }
  return [l2, a];
}
var si = /* @__PURE__ */ new WeakMap();
var Rl = { get(e, t) {
  if (t === ri) return e;
  let n2 = e[t], o2;
  return _o2(n2) ? si.get(n2) || (si.set(n2, o2 = new Proxy(n2, Rl)), o2) : n2;
}, set(e, t, n2) {
  return Do2(e, t, Oo2(n2)), true;
}, deleteProperty(e, t) {
  return Do2(e, t, void 0, true), true;
} };
function Ut2(e) {
  return (t) => {
    if (_o2(t)) {
      let n2;
      (n2 = si.get(t)) || si.set(t, n2 = new Proxy(t, Rl)), e(n2);
    }
    return t;
  };
}
var Ku = (e) => typeof e == "number" && !Number.isNaN(e) && Number.isFinite(e);
var Vu = (e) => {
  let t = e.trim();
  if (!t) return null;
  let n2 = parseFloat(t);
  return Ku(n2) ? n2 : null;
};
var Nl = (e, t) => {
  let n2 = e.split(",");
  if (n2.length !== t) return null;
  let o2 = [];
  for (let l2 of n2) {
    let a = Vu(l2);
    if (a === null) return null;
    o2.push(a);
  }
  return o2;
};
var $l = (e, t, n2, o2) => e === 1 && t === 0 && n2 === 0 && o2 === 1;
var Uu = (e) => e[0] === 1 && e[1] === 0 && e[2] === 0 && e[3] === 0 && e[4] === 0 && e[5] === 1 && e[6] === 0 && e[7] === 0 && e[8] === 0 && e[9] === 0 && e[10] === 1 && e[11] === 0 && e[15] === 1;
var Bl = (e) => {
  if (!e || e === "none") return "none";
  if (e.charCodeAt(0) === 109) if (e.charCodeAt(6) === 51) {
    let n2 = e.length - 1, o2 = Nl(e.slice(9, n2), 16);
    if (o2) return o2[12] = 0, o2[13] = 0, o2[14] = 0, Uu(o2) ? "none" : `matrix3d(${o2[0]}, ${o2[1]}, ${o2[2]}, ${o2[3]}, ${o2[4]}, ${o2[5]}, ${o2[6]}, ${o2[7]}, ${o2[8]}, ${o2[9]}, ${o2[10]}, ${o2[11]}, 0, 0, 0, ${o2[15]})`;
  } else {
    let n2 = e.length - 1, o2 = Nl(e.slice(7, n2), 6);
    if (o2) {
      let l2 = o2[0], a = o2[1], i = o2[2], c = o2[3];
      return $l(l2, a, i, c) ? "none" : `matrix(${l2}, ${a}, ${i}, ${c}, 0, 0)`;
    }
  }
  return "none";
};
var Hl = (e) => e.isIdentity ? "none" : e.is2D ? $l(e.a, e.b, e.c, e.d) ? "none" : `matrix(${e.a}, ${e.b}, ${e.c}, ${e.d}, 0, 0)` : e.m11 === 1 && e.m12 === 0 && e.m13 === 0 && e.m14 === 0 && e.m21 === 0 && e.m22 === 1 && e.m23 === 0 && e.m24 === 0 && e.m31 === 0 && e.m32 === 0 && e.m33 === 1 && e.m34 === 0 && e.m44 === 1 ? "none" : `matrix3d(${e.m11}, ${e.m12}, ${e.m13}, ${e.m14}, ${e.m21}, ${e.m22}, ${e.m23}, ${e.m24}, ${e.m31}, ${e.m32}, ${e.m33}, ${e.m34}, 0, 0, 0, ${e.m44})`;
var Ts2 = /* @__PURE__ */ new WeakMap();
var Fl = () => {
  Ts2 = /* @__PURE__ */ new WeakMap();
};
var Wu = (e, t) => {
  let n2 = t && t !== "none", o2 = null, l2 = e.parentElement, a = 0;
  for (; l2 && l2 !== document.documentElement && a < es; ) {
    let i = window.getComputedStyle(l2).transform;
    if (i && i !== "none") o2 = o2 ? new DOMMatrix(i).multiply(o2) : new DOMMatrix(i);
    else if (!n2 && !o2 && a >= ts) return "none";
    l2 = l2.parentElement, a++;
  }
  return o2 ? (n2 && (o2 = o2.multiply(new DOMMatrix(t))), Hl(o2)) : n2 ? Bl(t) : "none";
};
var ze2 = (e) => {
  let t = performance.now(), n2 = Ts2.get(e);
  if (n2 && t - n2.timestamp < 16) return n2.bounds;
  let o2 = e.getBoundingClientRect(), l2 = window.getComputedStyle(e), a = Wu(e, l2.transform), i;
  if (a !== "none" && e instanceof HTMLElement) {
    let c = e.offsetWidth, s = e.offsetHeight;
    if (c > 0 && s > 0) {
      let d2 = o2.left + o2.width * 0.5, f = o2.top + o2.height * 0.5;
      i = { borderRadius: l2.borderRadius || "0px", height: s, transform: a, width: c, x: d2 - c * 0.5, y: f - s * 0.5 };
    } else i = { borderRadius: l2.borderRadius || "0px", height: o2.height, transform: a, width: o2.width, x: o2.left, y: o2.top };
  } else i = { borderRadius: l2.borderRadius || "0px", height: o2.height, transform: a, width: o2.width, x: o2.left, y: o2.top };
  return Ts2.set(e, { bounds: i, timestamp: t }), i;
};
var qe2 = (e) => !!(e?.isConnected ?? e?.ownerDocument?.contains(e));
var xn2 = (e) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
var li = ({ currentPosition: e, previousBounds: t, nextBounds: n2 }) => {
  if (!t || !n2) return e;
  let o2 = xn2(t), l2 = xn2(n2), a = t.width / 2, i = e.x - o2.x, c = a > 0 ? i / a : 0, s = n2.width / 2;
  return { ...e, x: l2.x + c * s };
};
var ju = (e) => ({ current: { state: "idle" }, wasActivatedByToggle: false, pendingCommentMode: false, hasAgentProvider: e.hasAgentProvider, keyHoldDuration: e.keyHoldDuration, pointer: { x: -1e3, y: -1e3 }, dragStart: { x: -1e3, y: -1e3 }, copyStart: { x: -1e3, y: -1e3 }, copyOffsetFromCenterX: 0, detectedElement: null, frozenElement: null, frozenElements: [], frozenDragRect: null, lastGrabbedElement: null, lastCopiedElement: null, selectionFilePath: null, selectionLineNumber: null, inputText: "", pendingClickData: null, replySessionId: null, viewportVersion: 0, grabbedBoxes: [], labelInstances: [], agentSessions: /* @__PURE__ */ new Map(), sessionElements: /* @__PURE__ */ new Map(), isTouchMode: false, theme: e.theme, activationTimestamp: null, previouslyFocusedElement: null, isAgentConnected: false, supportsUndo: false, supportsFollowUp: false, dismissButtonText: void 0, pendingAbortSessionId: null, contextMenuPosition: null, contextMenuElement: null, contextMenuClickOffset: null, selectedAgent: null });
var zl = (e) => {
  let [t, n2] = ai(ju(e)), o2 = () => t.current.state === "active", l2 = () => t.current.state === "holding", a = { startHold: (i) => {
    i !== void 0 && n2("keyHoldDuration", i), n2("current", { state: "holding", startedAt: Date.now() });
  }, release: () => {
    t.current.state === "holding" && n2("current", { state: "idle" });
  }, activate: () => {
    n2("current", { state: "active", phase: "hovering", isPromptMode: false, isPendingDismiss: false }), n2("activationTimestamp", Date.now()), n2("previouslyFocusedElement", document.activeElement);
  }, deactivate: () => {
    n2(Ut2((i) => {
      i.current = { state: "idle" }, i.wasActivatedByToggle = false, i.pendingCommentMode = false, i.inputText = "", i.frozenElement = null, i.frozenElements = [], i.frozenDragRect = null, i.pendingClickData = null, i.replySessionId = null, i.pendingAbortSessionId = null, i.activationTimestamp = null, i.previouslyFocusedElement = null, i.contextMenuPosition = null, i.contextMenuElement = null, i.contextMenuClickOffset = null, i.selectedAgent = null, i.lastCopiedElement = null;
    }));
  }, toggle: () => {
    t.activationTimestamp !== null ? a.deactivate() : (n2("wasActivatedByToggle", true), a.activate());
  }, freeze: () => {
    if (t.current.state === "active") {
      let i = t.frozenElement ?? t.detectedElement;
      i && n2("frozenElement", i), n2("current", Ut2((c) => {
        c.state === "active" && (c.phase = "frozen");
      }));
    }
  }, unfreeze: () => {
    t.current.state === "active" && (n2("frozenElement", null), n2("frozenElements", []), n2("frozenDragRect", null), n2("current", Ut2((i) => {
      i.state === "active" && (i.phase = "hovering");
    })));
  }, startDrag: (i) => {
    t.current.state === "active" && (a.clearFrozenElement(), n2("dragStart", { x: i.x + window.scrollX, y: i.y + window.scrollY }), n2("current", Ut2((c) => {
      c.state === "active" && (c.phase = "dragging");
    })));
  }, endDrag: () => {
    t.current.state === "active" && t.current.phase === "dragging" && (n2("dragStart", { x: -1e3, y: -1e3 }), n2("current", Ut2((i) => {
      i.state === "active" && (i.phase = "justDragged");
    })));
  }, cancelDrag: () => {
    t.current.state === "active" && t.current.phase === "dragging" && (n2("dragStart", { x: -1e3, y: -1e3 }), n2("current", Ut2((i) => {
      i.state === "active" && (i.phase = "hovering");
    })));
  }, finishJustDragged: () => {
    t.current.state === "active" && t.current.phase === "justDragged" && n2("current", Ut2((i) => {
      i.state === "active" && (i.phase = "hovering");
    }));
  }, startCopy: () => {
    let i = t.current.state === "active";
    n2("current", { state: "copying", startedAt: Date.now(), wasActive: i });
  }, completeCopy: (i) => {
    n2("pendingClickData", null), i && n2("lastCopiedElement", i);
    let c = t.current.state === "copying" ? t.current.wasActive : false;
    n2("current", { state: "justCopied", copiedAt: Date.now(), wasActive: c });
  }, finishJustCopied: () => {
    t.current.state === "justCopied" && (t.current.wasActive && !t.wasActivatedByToggle ? (a.clearFrozenElement(), n2("current", { state: "active", phase: "hovering", isPromptMode: false, isPendingDismiss: false })) : a.deactivate());
  }, enterPromptMode: (i, c) => {
    let s = ze2(c), d2 = s.x + s.width / 2;
    n2("copyStart", i), n2("copyOffsetFromCenterX", i.x - d2), n2("pointer", i), n2("frozenElement", c), n2("wasActivatedByToggle", true), t.current.state !== "active" ? (n2("current", { state: "active", phase: "frozen", isPromptMode: true, isPendingDismiss: false }), n2("activationTimestamp", Date.now()), n2("previouslyFocusedElement", document.activeElement)) : n2("current", Ut2((f) => {
      f.state === "active" && (f.isPromptMode = true, f.phase = "frozen");
    }));
  }, exitPromptMode: () => {
    t.current.state === "active" && n2("current", Ut2((i) => {
      i.state === "active" && (i.isPromptMode = false, i.isPendingDismiss = false);
    }));
  }, setInputText: (i) => {
    n2("inputText", i);
  }, clearInputText: () => {
    n2("inputText", "");
  }, setPendingDismiss: (i) => {
    t.current.state === "active" && n2("current", Ut2((c) => {
      c.state === "active" && (c.isPendingDismiss = i);
    }));
  }, setPointer: (i) => {
    n2("pointer", i);
  }, setDetectedElement: (i) => {
    n2("detectedElement", i);
  }, setFrozenElement: (i) => {
    n2("frozenElement", i), n2("frozenElements", [i]), n2("frozenDragRect", null);
  }, setFrozenElements: (i) => {
    n2("frozenElements", i), n2("frozenElement", i.length > 0 ? i[0] : null), n2("frozenDragRect", null);
  }, setFrozenDragRect: (i) => {
    n2("frozenDragRect", i);
  }, clearFrozenElement: () => {
    n2("frozenElement", null), n2("frozenElements", []), n2("frozenDragRect", null);
  }, setCopyStart: (i, c) => {
    let s = ze2(c), d2 = s.x + s.width / 2;
    n2("copyStart", i), n2("copyOffsetFromCenterX", i.x - d2);
  }, setLastGrabbed: (i) => {
    n2("lastGrabbedElement", i);
  }, clearLastCopied: () => {
    n2("lastCopiedElement", null);
  }, setWasActivatedByToggle: (i) => {
    n2("wasActivatedByToggle", i);
  }, setPendingCommentMode: (i) => {
    n2("pendingCommentMode", i);
  }, setTouchMode: (i) => {
    n2("isTouchMode", i);
  }, setSelectionSource: (i, c) => {
    n2("selectionFilePath", i), n2("selectionLineNumber", c);
  }, setPendingClickData: (i) => {
    n2("pendingClickData", i);
  }, clearReplySessionId: () => {
    n2("replySessionId", null);
  }, incrementViewportVersion: () => {
    n2("viewportVersion", (i) => i + 1);
  }, addGrabbedBox: (i) => {
    n2("grabbedBoxes", (c) => [...c, i]);
  }, removeGrabbedBox: (i) => {
    n2("grabbedBoxes", (c) => c.filter((s) => s.id !== i));
  }, clearGrabbedBoxes: () => {
    n2("grabbedBoxes", []);
  }, addLabelInstance: (i) => {
    n2("labelInstances", (c) => [...c, i]);
  }, updateLabelInstance: (i, c, s) => {
    let d2 = t.labelInstances.findIndex((f) => f.id === i);
    d2 !== -1 && n2("labelInstances", d2, Ut2((f) => {
      f.status = c, s !== void 0 && (f.errorMessage = s);
    }));
  }, removeLabelInstance: (i) => {
    n2("labelInstances", (c) => c.filter((s) => s.id !== i));
  }, clearLabelInstances: () => {
    n2("labelInstances", []);
  }, setHasAgentProvider: (i) => {
    n2("hasAgentProvider", i);
  }, setAgentCapabilities: (i) => {
    n2("supportsUndo", i.supportsUndo), n2("supportsFollowUp", i.supportsFollowUp), n2("dismissButtonText", i.dismissButtonText), n2("isAgentConnected", i.isAgentConnected);
  }, setPendingAbortSessionId: (i) => {
    n2("pendingAbortSessionId", i);
  }, updateSessionBounds: () => {
    let i = t.agentSessions;
    if (i.size === 0) return;
    let c = new Map(i), s = false;
    for (let [d2, f] of i) {
      let p2 = t.sessionElements.get(d2) ?? null;
      if (qe2(p2)) {
        let y2 = ze2(p2), T2 = f.selectionBounds[0], H2 = li({ currentPosition: f.position, previousBounds: T2, nextBounds: y2 });
        c.set(d2, { ...f, selectionBounds: [y2], position: H2 }), s = true;
      }
    }
    s && n2("agentSessions", c);
  }, addAgentSession: (i, c, s) => {
    let d2 = new Map(t.agentSessions);
    d2.set(i, c), n2("agentSessions", d2);
    let f = new Map(t.sessionElements);
    f.set(i, s), n2("sessionElements", f);
  }, updateAgentSessionStatus: (i, c) => {
    let s = t.agentSessions.get(i);
    if (!s) return;
    let d2 = new Map(t.agentSessions);
    d2.set(i, { ...s, lastStatus: c }), n2("agentSessions", d2);
  }, completeAgentSession: (i, c) => {
    let s = t.agentSessions.get(i);
    if (!s) return;
    let d2 = new Map(t.agentSessions);
    d2.set(i, { ...s, isStreaming: false, lastStatus: c ?? s.lastStatus }), n2("agentSessions", d2);
  }, setAgentSessionError: (i, c) => {
    let s = t.agentSessions.get(i);
    if (!s) return;
    let d2 = new Map(t.agentSessions);
    d2.set(i, { ...s, isStreaming: false, error: c }), n2("agentSessions", d2);
  }, removeAgentSession: (i) => {
    let c = new Map(t.agentSessions);
    c.delete(i), n2("agentSessions", c);
    let s = new Map(t.sessionElements);
    s.delete(i), n2("sessionElements", s);
  }, showContextMenu: (i, c) => {
    let s = ze2(c), d2 = s.x + s.width / 2, f = s.y + s.height / 2;
    n2("contextMenuPosition", i), n2("contextMenuElement", c), n2("contextMenuClickOffset", { x: i.x - d2, y: i.y - f });
  }, hideContextMenu: () => {
    n2("contextMenuPosition", null), n2("contextMenuElement", null), n2("contextMenuClickOffset", null);
  }, updateContextMenuPosition: () => {
    let i = t.contextMenuElement, c = t.contextMenuClickOffset;
    if (!i || !c || !qe2(i)) return;
    let s = ze2(i), d2 = s.x + s.width / 2, f = s.y + s.height / 2;
    n2("contextMenuPosition", { x: d2 + c.x, y: f + c.y });
  }, setSelectedAgent: (i) => {
    n2("selectedAgent", i);
  } };
  return { store: t, setStore: n2, actions: a, isActive: o2, isHolding: l2 };
};
var Xu = ["input", "textarea", "select", "searchbox", "slider", "spinbutton", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "textbox", "combobox"];
var Yu = (e) => {
  if (e.composed) {
    let t = e.composedPath()[0];
    if (t instanceof HTMLElement) return t;
  } else if (e.target instanceof HTMLElement) return e.target;
};
var xt2 = (e) => {
  if (document.designMode === "on") return true;
  let t = Yu(e);
  if (!t) return false;
  if (t.isContentEditable) return true;
  let n2 = v(t);
  return Xu.some((o2) => o2 === n2 || o2 === t.role);
};
var Kl = (e) => {
  let t = e.target;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
    let n2 = t.selectionStart ?? 0;
    return (t.selectionEnd ?? 0) - n2 > 0;
  }
  return false;
};
var Vl = () => {
  let e = window.getSelection();
  return e ? e.toString().length > 0 : false;
};
var ci = "data-react-grab";
var Ul = "react-grab-fonts";
var qu = "https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap";
var Zu = () => {
  if (document.getElementById(Ul) || !document.head) return;
  let e = document.createElement("link");
  e.id = Ul, e.rel = "stylesheet", e.href = qu, document.head.appendChild(e);
};
var Gl = (e) => {
  Zu();
  let t = document.querySelector(`[${ci}]`);
  if (t) {
    let i = t.shadowRoot?.querySelector(`[${ci}]`);
    if (i instanceof HTMLDivElement && t.shadowRoot) return i;
  }
  let n2 = document.createElement("div");
  n2.setAttribute(ci, "true"), n2.style.zIndex = String(2147483647), n2.style.position = "fixed", n2.style.inset = "0", n2.style.pointerEvents = "none";
  let o2 = n2.attachShadow({ mode: "open" });
  {
    let i = document.createElement("style");
    i.textContent = e, o2.appendChild(i);
  }
  let l2 = document.createElement("div");
  l2.setAttribute(ci, "true"), o2.appendChild(l2);
  let a = document.body ?? document.documentElement;
  return a.appendChild(n2), setTimeout(() => {
    a.appendChild(n2);
  }, rs), l2;
};
var Lo2 = (e, t, n2) => e + (t - e) * n2;
var Qu = N2("<canvas data-react-grab-overlay-canvas style=position:fixed;top:0;left:0;pointer-events:none>");
var Nn2 = { drag: { borderColor: fo, fillColor: go, lerpFactor: 0.7 }, selection: { borderColor: Eo, fillColor: _o, lerpFactor: 0.95 }, grabbed: { borderColor: Eo, fillColor: _o, lerpFactor: 0.95 }, processing: { borderColor: Eo, fillColor: _o, lerpFactor: 0.95 } };
var Xl = (e) => {
  let t, n2 = null, o2 = 0, l2 = 0, a = 1, i = null, c = { crosshair: { canvas: null, context: null }, drag: { canvas: null, context: null }, selection: { canvas: null, context: null }, grabbed: { canvas: null, context: null }, processing: { canvas: null, context: null } }, s = { x: 0, y: 0 }, d2 = [], f = null, p2 = [], y2 = [], T2 = (S2, O2, U2) => {
    let q2 = new OffscreenCanvas(S2 * U2, O2 * U2), x2 = q2.getContext("2d");
    return x2 && x2.scale(U2, U2), { canvas: q2, context: x2 };
  }, H2 = () => {
    if (t) {
      a = Math.max(window.devicePixelRatio || 1, 2), o2 = window.innerWidth, l2 = window.innerHeight, t.width = o2 * a, t.height = l2 * a, t.style.width = `${o2}px`, t.style.height = `${l2}px`, n2 = t.getContext("2d"), n2 && n2.scale(a, a);
      for (let S2 of Object.keys(c)) c[S2] = T2(o2, l2, a);
    }
  }, $2 = (S2) => {
    if (!S2) return 0;
    let O2 = S2.match(/^(\d+(?:\.\d+)?)/);
    return O2 ? parseFloat(O2[1]) : 0;
  }, b$1 = (S2, O2, U2) => ({ id: S2, current: { x: O2.x, y: O2.y, width: O2.width, height: O2.height }, target: { x: O2.x, y: O2.y, width: O2.width, height: O2.height }, borderRadius: $2(O2.borderRadius), opacity: U2?.opacity ?? 1, targetOpacity: U2?.targetOpacity ?? U2?.opacity ?? 1, createdAt: U2?.createdAt, isInitialized: true }), w3 = (S2, O2, U2) => {
    S2.target = { x: O2.x, y: O2.y, width: O2.width, height: O2.height }, S2.borderRadius = $2(O2.borderRadius), U2 !== void 0 && (S2.targetOpacity = U2);
  }, h2 = (S2) => S2.boundsMultiple ?? [S2.bounds], g2 = (S2, O2, U2, q2, x2, A2, j2, z2, ne2 = 1) => {
    if (q2 <= 0 || x2 <= 0) return;
    let G2 = Math.min(q2 / 2, x2 / 2), Ee2 = Math.min(A2, G2);
    S2.globalAlpha = ne2, S2.beginPath(), Ee2 > 0 ? S2.roundRect(O2, U2, q2, x2, Ee2) : S2.rect(O2, U2, q2, x2), S2.fillStyle = j2, S2.fill(), S2.strokeStyle = z2, S2.lineWidth = 1, S2.stroke(), S2.globalAlpha = 1;
  }, v2 = () => {
    let S2 = c.crosshair;
    if (!S2.context) return;
    let O2 = S2.context;
    O2.clearRect(0, 0, o2, l2), e.crosshairVisible && (O2.strokeStyle = po, O2.lineWidth = 1, O2.beginPath(), O2.moveTo(s.x, 0), O2.lineTo(s.x, l2), O2.moveTo(0, s.y), O2.lineTo(o2, s.y), O2.stroke());
  }, I2 = () => {
    let S2 = c.drag;
    if (!S2.context) return;
    let O2 = S2.context;
    if (O2.clearRect(0, 0, o2, l2), !e.dragVisible || !f) return;
    let U2 = Nn2.drag;
    g2(O2, f.current.x, f.current.y, f.current.width, f.current.height, f.borderRadius, U2.fillColor, U2.borderColor);
  }, K = () => {
    let S2 = c.selection;
    if (!S2.context) return;
    let O2 = S2.context;
    if (O2.clearRect(0, 0, o2, l2), !e.selectionVisible) return;
    let U2 = Nn2.selection;
    for (let q2 of d2) {
      let x2 = e.selectionIsFading ? 0 : q2.opacity;
      g2(O2, q2.current.x, q2.current.y, q2.current.width, q2.current.height, q2.borderRadius, U2.fillColor, U2.borderColor, x2);
    }
  }, Q2 = () => {
    let S2 = c.grabbed;
    if (!S2.context) return;
    let O2 = S2.context;
    O2.clearRect(0, 0, o2, l2);
    let U2 = Nn2.grabbed;
    for (let q2 of p2) g2(O2, q2.current.x, q2.current.y, q2.current.width, q2.current.height, q2.borderRadius, U2.fillColor, U2.borderColor, q2.opacity);
  }, X2 = () => {
    let S2 = c.processing;
    if (!S2.context) return;
    let O2 = S2.context;
    O2.clearRect(0, 0, o2, l2);
    let U2 = Nn2.processing;
    for (let q2 of y2) g2(O2, q2.current.x, q2.current.y, q2.current.width, q2.current.height, q2.borderRadius, U2.fillColor, U2.borderColor, q2.opacity);
  }, te2 = () => {
    if (!n2 || !t) return;
    n2.setTransform(1, 0, 0, 1, 0, 0), n2.clearRect(0, 0, t.width, t.height), n2.setTransform(a, 0, 0, a, 0, 0), v2(), I2(), K(), Q2(), X2();
    let S2 = ["crosshair", "drag", "selection", "grabbed", "processing"];
    for (let O2 of S2) {
      let U2 = c[O2];
      U2.canvas && n2.drawImage(U2.canvas, 0, 0, o2, l2);
    }
  }, ye2 = (S2, O2, U2) => {
    let q2 = Lo2(S2.current.x, S2.target.x, O2), x2 = Lo2(S2.current.y, S2.target.y, O2), A2 = Lo2(S2.current.width, S2.target.width, O2), j2 = Lo2(S2.current.height, S2.target.height, O2), z2 = Math.abs(q2 - S2.target.x) < 0.5 && Math.abs(x2 - S2.target.y) < 0.5 && Math.abs(A2 - S2.target.width) < 0.5 && Math.abs(j2 - S2.target.height) < 0.5;
    S2.current.x = z2 ? S2.target.x : q2, S2.current.y = z2 ? S2.target.y : x2, S2.current.width = z2 ? S2.target.width : A2, S2.current.height = z2 ? S2.target.height : j2;
    let ne2 = true;
    if (U2?.interpolateOpacity) {
      let G2 = Lo2(S2.opacity, S2.targetOpacity, O2);
      ne2 = Math.abs(G2 - S2.targetOpacity) < 0.01, S2.opacity = ne2 ? S2.targetOpacity : G2;
    }
    return !z2 || !ne2;
  }, ue2 = () => {
    let S2 = false;
    f?.isInitialized && ye2(f, Nn2.drag.lerpFactor) && (S2 = true);
    for (let U2 of d2) U2.isInitialized && ye2(U2, Nn2.selection.lerpFactor) && (S2 = true);
    let O2 = Date.now();
    p2 = p2.filter((U2) => {
      let q2 = U2.id.startsWith("label-");
      if (U2.isInitialized && ye2(U2, Nn2.grabbed.lerpFactor, { interpolateOpacity: q2 }) && (S2 = true), U2.createdAt) {
        let x2 = O2 - U2.createdAt, A2 = 1600;
        if (x2 >= A2) return false;
        if (x2 > 1500) {
          let j2 = (x2 - 1500) / 100;
          U2.opacity = 1 - j2, S2 = true;
        }
        return true;
      }
      return q2 ? !(Math.abs(U2.opacity - U2.targetOpacity) < 0.01 && U2.targetOpacity === 0) : U2.opacity > 0;
    });
    for (let U2 of y2) U2.isInitialized && ye2(U2, Nn2.processing.lerpFactor) && (S2 = true);
    te2(), S2 ? i = D(ue2) : i = null;
  }, W2 = () => {
    i === null && (i = D(ue2));
  }, V2 = () => {
    H2(), W2();
  };
  return pe2(Be2(() => e.crosshairVisible, () => {
    W2();
  })), pe2(Be2(() => [e.selectionVisible, e.selectionBounds, e.selectionBoundsMultiple, e.selectionIsFading, e.selectionShouldSnap], ([S2, O2, U2, , q2]) => {
    if (!S2 || !O2 && (!U2 || U2.length === 0)) {
      d2 = [], W2();
      return;
    }
    d2 = (U2 && U2.length > 0 ? U2 : O2 ? [O2] : []).map((A2, j2) => {
      let z2 = `selection-${j2}`, ne2 = d2.find((G2) => G2.id === z2);
      return ne2 ? (w3(ne2, A2), q2 && (ne2.current = { ...ne2.target }), ne2) : b$1(z2, A2);
    }), W2();
  })), pe2(Be2(() => [e.dragVisible, e.dragBounds], ([S2, O2]) => {
    if (!S2 || !O2) {
      f = null, W2();
      return;
    }
    f ? w3(f, O2) : f = b$1("drag", O2), W2();
  })), pe2(Be2(() => e.grabbedBoxes, (S2) => {
    let O2 = S2 ?? [], U2 = new Set(O2.map((x2) => x2.id)), q2 = new Set(p2.map((x2) => x2.id));
    for (let x2 of O2) q2.has(x2.id) || p2.push(b$1(x2.id, x2.bounds, { createdAt: x2.createdAt }));
    for (let x2 of p2) {
      let A2 = O2.find((j2) => j2.id === x2.id);
      A2 && w3(x2, A2.bounds);
    }
    p2 = p2.filter((x2) => x2.id.startsWith("label-") ? true : U2.has(x2.id)), W2();
  })), pe2(Be2(() => e.agentSessions, (S2) => {
    if (!S2 || S2.size === 0) {
      y2 = [], W2();
      return;
    }
    let O2 = [];
    for (let [U2, q2] of S2) for (let x2 = 0; x2 < q2.selectionBounds.length; x2++) {
      let A2 = q2.selectionBounds[x2], j2 = `processing-${U2}-${x2}`, z2 = y2.find((ne2) => ne2.id === j2);
      z2 ? (w3(z2, A2), O2.push(z2)) : O2.push(b$1(j2, A2));
    }
    y2 = O2, W2();
  })), pe2(Be2(() => e.labelInstances, (S2) => {
    let O2 = S2 ?? [];
    for (let q2 of O2) {
      let x2 = h2(q2), A2 = q2.status === "fading" ? 0 : 1;
      for (let j2 = 0; j2 < x2.length; j2++) {
        let z2 = x2[j2], ne2 = `label-${q2.id}-${j2}`, G2 = p2.find((Ee2) => Ee2.id === ne2);
        G2 ? w3(G2, z2, A2) : p2.push(b$1(ne2, z2, { opacity: 1, targetOpacity: A2 }));
      }
    }
    let U2 = /* @__PURE__ */ new Set();
    for (let q2 of O2) {
      let x2 = h2(q2);
      for (let A2 = 0; A2 < x2.length; A2++) U2.add(`label-${q2.id}-${A2}`);
    }
    p2 = p2.filter((q2) => q2.id.startsWith("label-") ? U2.has(q2.id) : true), W2();
  })), lt2(() => {
    H2(), W2();
    let S2 = (x2) => {
      x2.isPrimary && (s.x = x2.clientX, s.y = x2.clientY, W2());
    };
    window.addEventListener("pointermove", S2, { passive: true }), window.addEventListener("resize", V2);
    let O2 = null, U2 = () => {
      Math.max(window.devicePixelRatio || 1, 2) !== a && (V2(), q2());
    }, q2 = () => {
      O2 && O2.removeEventListener("change", U2), O2 = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`), O2.addEventListener("change", U2);
    };
    q2(), Te2(() => {
      window.removeEventListener("pointermove", S2), window.removeEventListener("resize", V2), O2 && O2.removeEventListener("change", U2), i !== null && q(i);
    });
  }), (() => {
    var S2 = Qu(), O2 = t;
    return typeof O2 == "function" ? Ue2(O2, S2) : t = S2, Y2((U2) => de2(S2, "z-index", String(2147483645))), S2;
  })();
};
var ur2 = (e, t) => {
  e.style.height = "auto", e.style.height = `${Math.min(e.scrollHeight, t)}px`;
};
var ui = (e) => {
  if (e <= 0) return To;
  let t = e * Co;
  return Math.max(ho, Math.min(To, t));
};
function Yl(e) {
  var t, n2, o2 = "";
  if (typeof e == "string" || typeof e == "number") o2 += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var l2 = e.length;
    for (t = 0; t < l2; t++) e[t] && (n2 = Yl(e[t])) && (o2 && (o2 += " "), o2 += n2);
  } else for (n2 in e) e[n2] && (o2 && (o2 += " "), o2 += n2);
  return o2;
}
function ql() {
  for (var e, t, n2 = 0, o2 = "", l2 = arguments.length; n2 < l2; n2++) (e = arguments[n2]) && (t = Yl(e)) && (o2 && (o2 += " "), o2 += t);
  return o2;
}
var _s2 = "-";
var ef = (e) => {
  let t = nf(e), { conflictingClassGroups: n2, conflictingClassGroupModifiers: o2 } = e;
  return { getClassGroupId: (i) => {
    let c = i.split(_s2);
    return c[0] === "" && c.length !== 1 && c.shift(), Ql(c, t) || tf(i);
  }, getConflictingClassGroupIds: (i, c) => {
    let s = n2[i] || [];
    return c && o2[i] ? [...s, ...o2[i]] : s;
  } };
};
var Ql = (e, t) => {
  if (e.length === 0) return t.classGroupId;
  let n2 = e[0], o2 = t.nextPart.get(n2), l2 = o2 ? Ql(e.slice(1), o2) : void 0;
  if (l2) return l2;
  if (t.validators.length === 0) return;
  let a = e.join(_s2);
  return t.validators.find(({ validator: i }) => i(a))?.classGroupId;
};
var Zl = /^\[(.+)\]$/;
var tf = (e) => {
  if (Zl.test(e)) {
    let t = Zl.exec(e)[1], n2 = t?.substring(0, t.indexOf(":"));
    if (n2) return "arbitrary.." + n2;
  }
};
var nf = (e) => {
  let { theme: t, prefix: n2 } = e, o2 = { nextPart: /* @__PURE__ */ new Map(), validators: [] };
  return rf(Object.entries(e.classGroups), n2).forEach(([a, i]) => {
    Is(i, o2, a, t);
  }), o2;
};
var Is = (e, t, n2, o2) => {
  e.forEach((l2) => {
    if (typeof l2 == "string") {
      let a = l2 === "" ? t : Jl(t, l2);
      a.classGroupId = n2;
      return;
    }
    if (typeof l2 == "function") {
      if (of(l2)) {
        Is(l2(o2), t, n2, o2);
        return;
      }
      t.validators.push({ validator: l2, classGroupId: n2 });
      return;
    }
    Object.entries(l2).forEach(([a, i]) => {
      Is(i, Jl(t, a), n2, o2);
    });
  });
};
var Jl = (e, t) => {
  let n2 = e;
  return t.split(_s2).forEach((o2) => {
    n2.nextPart.has(o2) || n2.nextPart.set(o2, { nextPart: /* @__PURE__ */ new Map(), validators: [] }), n2 = n2.nextPart.get(o2);
  }), n2;
};
var of = (e) => e.isThemeGetter;
var rf = (e, t) => t ? e.map(([n2, o2]) => {
  let l2 = o2.map((a) => typeof a == "string" ? t + a : typeof a == "object" ? Object.fromEntries(Object.entries(a).map(([i, c]) => [t + i, c])) : a);
  return [n2, l2];
}) : e;
var sf = (e) => {
  if (e < 1) return { get: () => {
  }, set: () => {
  } };
  let t = 0, n2 = /* @__PURE__ */ new Map(), o2 = /* @__PURE__ */ new Map(), l2 = (a, i) => {
    n2.set(a, i), t++, t > e && (t = 0, o2 = n2, n2 = /* @__PURE__ */ new Map());
  };
  return { get(a) {
    let i = n2.get(a);
    if (i !== void 0) return i;
    if ((i = o2.get(a)) !== void 0) return l2(a, i), i;
  }, set(a, i) {
    n2.has(a) ? n2.set(a, i) : l2(a, i);
  } };
};
var ec = "!";
var af = (e) => {
  let { separator: t, experimentalParseClassName: n2 } = e, o2 = t.length === 1, l2 = t[0], a = t.length, i = (c) => {
    let s = [], d2 = 0, f = 0, p2;
    for (let b2 = 0; b2 < c.length; b2++) {
      let w3 = c[b2];
      if (d2 === 0) {
        if (w3 === l2 && (o2 || c.slice(b2, b2 + a) === t)) {
          s.push(c.slice(f, b2)), f = b2 + a;
          continue;
        }
        if (w3 === "/") {
          p2 = b2;
          continue;
        }
      }
      w3 === "[" ? d2++ : w3 === "]" && d2--;
    }
    let y2 = s.length === 0 ? c : c.substring(f), T2 = y2.startsWith(ec), H2 = T2 ? y2.substring(1) : y2, $2 = p2 && p2 > f ? p2 - f : void 0;
    return { modifiers: s, hasImportantModifier: T2, baseClassName: H2, maybePostfixModifierPosition: $2 };
  };
  return n2 ? (c) => n2({ className: c, parseClassName: i }) : i;
};
var lf = (e) => {
  if (e.length <= 1) return e;
  let t = [], n2 = [];
  return e.forEach((o2) => {
    o2[0] === "[" ? (t.push(...n2.sort(), o2), n2 = []) : n2.push(o2);
  }), t.push(...n2.sort()), t;
};
var cf = (e) => ({ cache: sf(e.cacheSize), parseClassName: af(e), ...ef(e) });
var df = /\s+/;
var uf = (e, t) => {
  let { parseClassName: n2, getClassGroupId: o2, getConflictingClassGroupIds: l2 } = t, a = [], i = e.trim().split(df), c = "";
  for (let s = i.length - 1; s >= 0; s -= 1) {
    let d2 = i[s], { modifiers: f, hasImportantModifier: p2, baseClassName: y2, maybePostfixModifierPosition: T2 } = n2(d2), H2 = !!T2, $2 = o2(H2 ? y2.substring(0, T2) : y2);
    if (!$2) {
      if (!H2) {
        c = d2 + (c.length > 0 ? " " + c : c);
        continue;
      }
      if ($2 = o2(y2), !$2) {
        c = d2 + (c.length > 0 ? " " + c : c);
        continue;
      }
      H2 = false;
    }
    let b2 = lf(f).join(":"), w3 = p2 ? b2 + ec : b2, h2 = w3 + $2;
    if (a.includes(h2)) continue;
    a.push(h2);
    let g2 = l2($2, H2);
    for (let v2 = 0; v2 < g2.length; ++v2) {
      let I2 = g2[v2];
      a.push(w3 + I2);
    }
    c = d2 + (c.length > 0 ? " " + c : c);
  }
  return c;
};
function ff() {
  let e = 0, t, n2, o2 = "";
  for (; e < arguments.length; ) (t = arguments[e++]) && (n2 = tc(t)) && (o2 && (o2 += " "), o2 += n2);
  return o2;
}
var tc = (e) => {
  if (typeof e == "string") return e;
  let t, n2 = "";
  for (let o2 = 0; o2 < e.length; o2++) e[o2] && (t = tc(e[o2])) && (n2 && (n2 += " "), n2 += t);
  return n2;
};
function mf(e, ...t) {
  let n2, o2, l2, a = i;
  function i(s) {
    let d2 = t.reduce((f, p2) => p2(f), e());
    return n2 = cf(d2), o2 = n2.cache.get, l2 = n2.cache.set, a = c, c(s);
  }
  function c(s) {
    let d2 = o2(s);
    if (d2) return d2;
    let f = uf(s, n2);
    return l2(s, f), f;
  }
  return function() {
    return a(ff.apply(null, arguments));
  };
}
var et2 = (e) => {
  let t = (n2) => n2[e] || [];
  return t.isThemeGetter = true, t;
};
var nc = /^\[(?:([a-z-]+):)?(.+)\]$/i;
var gf = /^\d+\/\d+$/;
var pf = /* @__PURE__ */ new Set(["px", "full", "screen"]);
var hf = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var bf = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
var yf = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
var wf = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
var xf = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
var vn2 = (e) => Ro2(e) || pf.has(e) || gf.test(e);
var $n2 = (e) => No2(e, "length", Pf);
var Ro2 = (e) => !!e && !Number.isNaN(Number(e));
var Ms = (e) => No2(e, "number", Ro2);
var fr2 = (e) => !!e && Number.isInteger(Number(e));
var vf = (e) => e.endsWith("%") && Ro2(e.slice(0, -1));
var Ie2 = (e) => nc.test(e);
var Bn2 = (e) => hf.test(e);
var Cf = /* @__PURE__ */ new Set(["length", "size", "percentage"]);
var Ef = (e) => No2(e, Cf, oc);
var Sf = (e) => No2(e, "position", oc);
var Af = /* @__PURE__ */ new Set(["image", "url"]);
var Tf = (e) => No2(e, Af, If);
var kf = (e) => No2(e, "", Mf);
var mr2 = () => true;
var No2 = (e, t, n2) => {
  let o2 = nc.exec(e);
  return o2 ? o2[1] ? typeof t == "string" ? o2[1] === t : t.has(o2[1]) : n2(o2[2]) : false;
};
var Pf = (e) => bf.test(e) && !yf.test(e);
var oc = () => false;
var Mf = (e) => wf.test(e);
var If = (e) => xf.test(e);
var _f = () => {
  let e = et2("colors"), t = et2("spacing"), n2 = et2("blur"), o2 = et2("brightness"), l2 = et2("borderColor"), a = et2("borderRadius"), i = et2("borderSpacing"), c = et2("borderWidth"), s = et2("contrast"), d2 = et2("grayscale"), f = et2("hueRotate"), p2 = et2("invert"), y2 = et2("gap"), T2 = et2("gradientColorStops"), H2 = et2("gradientColorStopPositions"), $2 = et2("inset"), b2 = et2("margin"), w3 = et2("opacity"), h2 = et2("padding"), g2 = et2("saturate"), v2 = et2("scale"), I2 = et2("sepia"), K = et2("skew"), Q2 = et2("space"), X2 = et2("translate"), te2 = () => ["auto", "contain", "none"], ye2 = () => ["auto", "hidden", "clip", "visible", "scroll"], ue2 = () => ["auto", Ie2, t], W2 = () => [Ie2, t], V2 = () => ["", vn2, $n2], S2 = () => ["auto", Ro2, Ie2], O2 = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"], U2 = () => ["solid", "dashed", "dotted", "double", "none"], q2 = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], x2 = () => ["start", "end", "center", "between", "around", "evenly", "stretch"], A2 = () => ["", "0", Ie2], j2 = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], z2 = () => [Ro2, Ie2];
  return { cacheSize: 500, separator: ":", theme: { colors: [mr2], spacing: [vn2, $n2], blur: ["none", "", Bn2, Ie2], brightness: z2(), borderColor: [e], borderRadius: ["none", "", "full", Bn2, Ie2], borderSpacing: W2(), borderWidth: V2(), contrast: z2(), grayscale: A2(), hueRotate: z2(), invert: A2(), gap: W2(), gradientColorStops: [e], gradientColorStopPositions: [vf, $n2], inset: ue2(), margin: ue2(), opacity: z2(), padding: W2(), saturate: z2(), scale: z2(), sepia: A2(), skew: z2(), space: W2(), translate: W2() }, classGroups: { aspect: [{ aspect: ["auto", "square", "video", Ie2] }], container: ["container"], columns: [{ columns: [Bn2] }], "break-after": [{ "break-after": j2() }], "break-before": [{ "break-before": j2() }], "break-inside": [{ "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"] }], "box-decoration": [{ "box-decoration": ["slice", "clone"] }], box: [{ box: ["border", "content"] }], display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"], float: [{ float: ["right", "left", "none", "start", "end"] }], clear: [{ clear: ["left", "right", "both", "none", "start", "end"] }], isolation: ["isolate", "isolation-auto"], "object-fit": [{ object: ["contain", "cover", "fill", "none", "scale-down"] }], "object-position": [{ object: [...O2(), Ie2] }], overflow: [{ overflow: ye2() }], "overflow-x": [{ "overflow-x": ye2() }], "overflow-y": [{ "overflow-y": ye2() }], overscroll: [{ overscroll: te2() }], "overscroll-x": [{ "overscroll-x": te2() }], "overscroll-y": [{ "overscroll-y": te2() }], position: ["static", "fixed", "absolute", "relative", "sticky"], inset: [{ inset: [$2] }], "inset-x": [{ "inset-x": [$2] }], "inset-y": [{ "inset-y": [$2] }], start: [{ start: [$2] }], end: [{ end: [$2] }], top: [{ top: [$2] }], right: [{ right: [$2] }], bottom: [{ bottom: [$2] }], left: [{ left: [$2] }], visibility: ["visible", "invisible", "collapse"], z: [{ z: ["auto", fr2, Ie2] }], basis: [{ basis: ue2() }], "flex-direction": [{ flex: ["row", "row-reverse", "col", "col-reverse"] }], "flex-wrap": [{ flex: ["wrap", "wrap-reverse", "nowrap"] }], flex: [{ flex: ["1", "auto", "initial", "none", Ie2] }], grow: [{ grow: A2() }], shrink: [{ shrink: A2() }], order: [{ order: ["first", "last", "none", fr2, Ie2] }], "grid-cols": [{ "grid-cols": [mr2] }], "col-start-end": [{ col: ["auto", { span: ["full", fr2, Ie2] }, Ie2] }], "col-start": [{ "col-start": S2() }], "col-end": [{ "col-end": S2() }], "grid-rows": [{ "grid-rows": [mr2] }], "row-start-end": [{ row: ["auto", { span: [fr2, Ie2] }, Ie2] }], "row-start": [{ "row-start": S2() }], "row-end": [{ "row-end": S2() }], "grid-flow": [{ "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"] }], "auto-cols": [{ "auto-cols": ["auto", "min", "max", "fr", Ie2] }], "auto-rows": [{ "auto-rows": ["auto", "min", "max", "fr", Ie2] }], gap: [{ gap: [y2] }], "gap-x": [{ "gap-x": [y2] }], "gap-y": [{ "gap-y": [y2] }], "justify-content": [{ justify: ["normal", ...x2()] }], "justify-items": [{ "justify-items": ["start", "end", "center", "stretch"] }], "justify-self": [{ "justify-self": ["auto", "start", "end", "center", "stretch"] }], "align-content": [{ content: ["normal", ...x2(), "baseline"] }], "align-items": [{ items: ["start", "end", "center", "baseline", "stretch"] }], "align-self": [{ self: ["auto", "start", "end", "center", "stretch", "baseline"] }], "place-content": [{ "place-content": [...x2(), "baseline"] }], "place-items": [{ "place-items": ["start", "end", "center", "baseline", "stretch"] }], "place-self": [{ "place-self": ["auto", "start", "end", "center", "stretch"] }], p: [{ p: [h2] }], px: [{ px: [h2] }], py: [{ py: [h2] }], ps: [{ ps: [h2] }], pe: [{ pe: [h2] }], pt: [{ pt: [h2] }], pr: [{ pr: [h2] }], pb: [{ pb: [h2] }], pl: [{ pl: [h2] }], m: [{ m: [b2] }], mx: [{ mx: [b2] }], my: [{ my: [b2] }], ms: [{ ms: [b2] }], me: [{ me: [b2] }], mt: [{ mt: [b2] }], mr: [{ mr: [b2] }], mb: [{ mb: [b2] }], ml: [{ ml: [b2] }], "space-x": [{ "space-x": [Q2] }], "space-x-reverse": ["space-x-reverse"], "space-y": [{ "space-y": [Q2] }], "space-y-reverse": ["space-y-reverse"], w: [{ w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", Ie2, t] }], "min-w": [{ "min-w": [Ie2, t, "min", "max", "fit"] }], "max-w": [{ "max-w": [Ie2, t, "none", "full", "min", "max", "fit", "prose", { screen: [Bn2] }, Bn2] }], h: [{ h: [Ie2, t, "auto", "min", "max", "fit", "svh", "lvh", "dvh"] }], "min-h": [{ "min-h": [Ie2, t, "min", "max", "fit", "svh", "lvh", "dvh"] }], "max-h": [{ "max-h": [Ie2, t, "min", "max", "fit", "svh", "lvh", "dvh"] }], size: [{ size: [Ie2, t, "auto", "min", "max", "fit"] }], "font-size": [{ text: ["base", Bn2, $n2] }], "font-smoothing": ["antialiased", "subpixel-antialiased"], "font-style": ["italic", "not-italic"], "font-weight": [{ font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", Ms] }], "font-family": [{ font: [mr2] }], "fvn-normal": ["normal-nums"], "fvn-ordinal": ["ordinal"], "fvn-slashed-zero": ["slashed-zero"], "fvn-figure": ["lining-nums", "oldstyle-nums"], "fvn-spacing": ["proportional-nums", "tabular-nums"], "fvn-fraction": ["diagonal-fractions", "stacked-fractions"], tracking: [{ tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", Ie2] }], "line-clamp": [{ "line-clamp": ["none", Ro2, Ms] }], leading: [{ leading: ["none", "tight", "snug", "normal", "relaxed", "loose", vn2, Ie2] }], "list-image": [{ "list-image": ["none", Ie2] }], "list-style-type": [{ list: ["none", "disc", "decimal", Ie2] }], "list-style-position": [{ list: ["inside", "outside"] }], "placeholder-color": [{ placeholder: [e] }], "placeholder-opacity": [{ "placeholder-opacity": [w3] }], "text-alignment": [{ text: ["left", "center", "right", "justify", "start", "end"] }], "text-color": [{ text: [e] }], "text-opacity": [{ "text-opacity": [w3] }], "text-decoration": ["underline", "overline", "line-through", "no-underline"], "text-decoration-style": [{ decoration: [...U2(), "wavy"] }], "text-decoration-thickness": [{ decoration: ["auto", "from-font", vn2, $n2] }], "underline-offset": [{ "underline-offset": ["auto", vn2, Ie2] }], "text-decoration-color": [{ decoration: [e] }], "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"], "text-overflow": ["truncate", "text-ellipsis", "text-clip"], "text-wrap": [{ text: ["wrap", "nowrap", "balance", "pretty"] }], indent: [{ indent: W2() }], "vertical-align": [{ align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", Ie2] }], whitespace: [{ whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"] }], break: [{ break: ["normal", "words", "all", "keep"] }], hyphens: [{ hyphens: ["none", "manual", "auto"] }], content: [{ content: ["none", Ie2] }], "bg-attachment": [{ bg: ["fixed", "local", "scroll"] }], "bg-clip": [{ "bg-clip": ["border", "padding", "content", "text"] }], "bg-opacity": [{ "bg-opacity": [w3] }], "bg-origin": [{ "bg-origin": ["border", "padding", "content"] }], "bg-position": [{ bg: [...O2(), Sf] }], "bg-repeat": [{ bg: ["no-repeat", { repeat: ["", "x", "y", "round", "space"] }] }], "bg-size": [{ bg: ["auto", "cover", "contain", Ef] }], "bg-image": [{ bg: ["none", { "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"] }, Tf] }], "bg-color": [{ bg: [e] }], "gradient-from-pos": [{ from: [H2] }], "gradient-via-pos": [{ via: [H2] }], "gradient-to-pos": [{ to: [H2] }], "gradient-from": [{ from: [T2] }], "gradient-via": [{ via: [T2] }], "gradient-to": [{ to: [T2] }], rounded: [{ rounded: [a] }], "rounded-s": [{ "rounded-s": [a] }], "rounded-e": [{ "rounded-e": [a] }], "rounded-t": [{ "rounded-t": [a] }], "rounded-r": [{ "rounded-r": [a] }], "rounded-b": [{ "rounded-b": [a] }], "rounded-l": [{ "rounded-l": [a] }], "rounded-ss": [{ "rounded-ss": [a] }], "rounded-se": [{ "rounded-se": [a] }], "rounded-ee": [{ "rounded-ee": [a] }], "rounded-es": [{ "rounded-es": [a] }], "rounded-tl": [{ "rounded-tl": [a] }], "rounded-tr": [{ "rounded-tr": [a] }], "rounded-br": [{ "rounded-br": [a] }], "rounded-bl": [{ "rounded-bl": [a] }], "border-w": [{ border: [c] }], "border-w-x": [{ "border-x": [c] }], "border-w-y": [{ "border-y": [c] }], "border-w-s": [{ "border-s": [c] }], "border-w-e": [{ "border-e": [c] }], "border-w-t": [{ "border-t": [c] }], "border-w-r": [{ "border-r": [c] }], "border-w-b": [{ "border-b": [c] }], "border-w-l": [{ "border-l": [c] }], "border-opacity": [{ "border-opacity": [w3] }], "border-style": [{ border: [...U2(), "hidden"] }], "divide-x": [{ "divide-x": [c] }], "divide-x-reverse": ["divide-x-reverse"], "divide-y": [{ "divide-y": [c] }], "divide-y-reverse": ["divide-y-reverse"], "divide-opacity": [{ "divide-opacity": [w3] }], "divide-style": [{ divide: U2() }], "border-color": [{ border: [l2] }], "border-color-x": [{ "border-x": [l2] }], "border-color-y": [{ "border-y": [l2] }], "border-color-s": [{ "border-s": [l2] }], "border-color-e": [{ "border-e": [l2] }], "border-color-t": [{ "border-t": [l2] }], "border-color-r": [{ "border-r": [l2] }], "border-color-b": [{ "border-b": [l2] }], "border-color-l": [{ "border-l": [l2] }], "divide-color": [{ divide: [l2] }], "outline-style": [{ outline: ["", ...U2()] }], "outline-offset": [{ "outline-offset": [vn2, Ie2] }], "outline-w": [{ outline: [vn2, $n2] }], "outline-color": [{ outline: [e] }], "ring-w": [{ ring: V2() }], "ring-w-inset": ["ring-inset"], "ring-color": [{ ring: [e] }], "ring-opacity": [{ "ring-opacity": [w3] }], "ring-offset-w": [{ "ring-offset": [vn2, $n2] }], "ring-offset-color": [{ "ring-offset": [e] }], shadow: [{ shadow: ["", "inner", "none", Bn2, kf] }], "shadow-color": [{ shadow: [mr2] }], opacity: [{ opacity: [w3] }], "mix-blend": [{ "mix-blend": [...q2(), "plus-lighter", "plus-darker"] }], "bg-blend": [{ "bg-blend": q2() }], filter: [{ filter: ["", "none"] }], blur: [{ blur: [n2] }], brightness: [{ brightness: [o2] }], contrast: [{ contrast: [s] }], "drop-shadow": [{ "drop-shadow": ["", "none", Bn2, Ie2] }], grayscale: [{ grayscale: [d2] }], "hue-rotate": [{ "hue-rotate": [f] }], invert: [{ invert: [p2] }], saturate: [{ saturate: [g2] }], sepia: [{ sepia: [I2] }], "backdrop-filter": [{ "backdrop-filter": ["", "none"] }], "backdrop-blur": [{ "backdrop-blur": [n2] }], "backdrop-brightness": [{ "backdrop-brightness": [o2] }], "backdrop-contrast": [{ "backdrop-contrast": [s] }], "backdrop-grayscale": [{ "backdrop-grayscale": [d2] }], "backdrop-hue-rotate": [{ "backdrop-hue-rotate": [f] }], "backdrop-invert": [{ "backdrop-invert": [p2] }], "backdrop-opacity": [{ "backdrop-opacity": [w3] }], "backdrop-saturate": [{ "backdrop-saturate": [g2] }], "backdrop-sepia": [{ "backdrop-sepia": [I2] }], "border-collapse": [{ border: ["collapse", "separate"] }], "border-spacing": [{ "border-spacing": [i] }], "border-spacing-x": [{ "border-spacing-x": [i] }], "border-spacing-y": [{ "border-spacing-y": [i] }], "table-layout": [{ table: ["auto", "fixed"] }], caption: [{ caption: ["top", "bottom"] }], transition: [{ transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", Ie2] }], duration: [{ duration: z2() }], ease: [{ ease: ["linear", "in", "out", "in-out", Ie2] }], delay: [{ delay: z2() }], animate: [{ animate: ["none", "spin", "ping", "pulse", "bounce", Ie2] }], transform: [{ transform: ["", "gpu", "none"] }], scale: [{ scale: [v2] }], "scale-x": [{ "scale-x": [v2] }], "scale-y": [{ "scale-y": [v2] }], rotate: [{ rotate: [fr2, Ie2] }], "translate-x": [{ "translate-x": [X2] }], "translate-y": [{ "translate-y": [X2] }], "skew-x": [{ "skew-x": [K] }], "skew-y": [{ "skew-y": [K] }], "transform-origin": [{ origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", Ie2] }], accent: [{ accent: ["auto", e] }], appearance: [{ appearance: ["none", "auto"] }], cursor: [{ cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", Ie2] }], "caret-color": [{ caret: [e] }], "pointer-events": [{ "pointer-events": ["none", "auto"] }], resize: [{ resize: ["none", "y", "x", ""] }], "scroll-behavior": [{ scroll: ["auto", "smooth"] }], "scroll-m": [{ "scroll-m": W2() }], "scroll-mx": [{ "scroll-mx": W2() }], "scroll-my": [{ "scroll-my": W2() }], "scroll-ms": [{ "scroll-ms": W2() }], "scroll-me": [{ "scroll-me": W2() }], "scroll-mt": [{ "scroll-mt": W2() }], "scroll-mr": [{ "scroll-mr": W2() }], "scroll-mb": [{ "scroll-mb": W2() }], "scroll-ml": [{ "scroll-ml": W2() }], "scroll-p": [{ "scroll-p": W2() }], "scroll-px": [{ "scroll-px": W2() }], "scroll-py": [{ "scroll-py": W2() }], "scroll-ps": [{ "scroll-ps": W2() }], "scroll-pe": [{ "scroll-pe": W2() }], "scroll-pt": [{ "scroll-pt": W2() }], "scroll-pr": [{ "scroll-pr": W2() }], "scroll-pb": [{ "scroll-pb": W2() }], "scroll-pl": [{ "scroll-pl": W2() }], "snap-align": [{ snap: ["start", "end", "center", "align-none"] }], "snap-stop": [{ snap: ["normal", "always"] }], "snap-type": [{ snap: ["none", "x", "y", "both"] }], "snap-strictness": [{ snap: ["mandatory", "proximity"] }], touch: [{ touch: ["auto", "none", "manipulation"] }], "touch-x": [{ "touch-pan": ["x", "left", "right"] }], "touch-y": [{ "touch-pan": ["y", "up", "down"] }], "touch-pz": ["touch-pinch-zoom"], select: [{ select: ["none", "text", "all", "auto"] }], "will-change": [{ "will-change": ["auto", "scroll", "contents", "transform", Ie2] }], fill: [{ fill: [e, "none"] }], "stroke-w": [{ stroke: [vn2, $n2, Ms] }], stroke: [{ stroke: [e, "none"] }], sr: ["sr-only", "not-sr-only"], "forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }] }, conflictingClassGroups: { overflow: ["overflow-x", "overflow-y"], overscroll: ["overscroll-x", "overscroll-y"], inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"], "inset-x": ["right", "left"], "inset-y": ["top", "bottom"], flex: ["basis", "grow", "shrink"], gap: ["gap-x", "gap-y"], p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"], px: ["pr", "pl"], py: ["pt", "pb"], m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"], mx: ["mr", "ml"], my: ["mt", "mb"], size: ["w", "h"], "font-size": ["leading"], "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"], "fvn-ordinal": ["fvn-normal"], "fvn-slashed-zero": ["fvn-normal"], "fvn-figure": ["fvn-normal"], "fvn-spacing": ["fvn-normal"], "fvn-fraction": ["fvn-normal"], "line-clamp": ["display", "overflow"], rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"], "rounded-s": ["rounded-ss", "rounded-es"], "rounded-e": ["rounded-se", "rounded-ee"], "rounded-t": ["rounded-tl", "rounded-tr"], "rounded-r": ["rounded-tr", "rounded-br"], "rounded-b": ["rounded-br", "rounded-bl"], "rounded-l": ["rounded-tl", "rounded-bl"], "border-spacing": ["border-spacing-x", "border-spacing-y"], "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"], "border-w-x": ["border-w-r", "border-w-l"], "border-w-y": ["border-w-t", "border-w-b"], "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"], "border-color-x": ["border-color-r", "border-color-l"], "border-color-y": ["border-color-t", "border-color-b"], "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"], "scroll-mx": ["scroll-mr", "scroll-ml"], "scroll-my": ["scroll-mt", "scroll-mb"], "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"], "scroll-px": ["scroll-pr", "scroll-pl"], "scroll-py": ["scroll-pt", "scroll-pb"], touch: ["touch-x", "touch-y", "touch-pz"], "touch-x": ["touch"], "touch-y": ["touch"], "touch-pz": ["touch"] }, conflictingClassGroupModifiers: { "font-size": ["leading"] } };
};
var rc = mf(_f);
var me2 = (...e) => rc(ql(e));
var fi = (e) => e.elementsCount && e.elementsCount > 1 ? { tagName: `${e.elementsCount} elements`, componentName: void 0 } : { tagName: e.tagName || e.componentName || "element", componentName: e.tagName ? e.componentName : void 0 };
var gr2 = null;
var Of = () => {
  if (typeof navigator > "u" || !("userAgentData" in navigator)) return null;
  let e = navigator.userAgentData;
  if (typeof e != "object" || e === null || !("platform" in e)) return null;
  let t = e.platform;
  return typeof t != "string" ? null : t;
};
var Cn2 = () => {
  if (gr2 === null) {
    if (typeof navigator > "u") return gr2 = false, gr2;
    let e = Of() ?? navigator.platform ?? navigator.userAgent;
    gr2 = /Mac|iPhone|iPad|iPod/i.test(e);
  }
  return gr2;
};
var Hn2 = (e) => e === "Enter" ? "↵" : Cn2() ? `⌘${e}` : `Ctrl+${e.replace("⇧", "Shift+")}`;
var Df = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 12 12"fill=none style=transform:rotate(180deg)><path d="M5 3V1L1 4.5L5 8V6C8 6 10 7 11 10C11 7 9 4 5 3Z"fill=currentColor>');
var mi = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = Df();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Lf = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 12 12"fill=none><path d="M6 1L6 11M6 1L2 5M6 1L10 5"stroke=currentColor stroke-width=1.5 stroke-linecap=round stroke-linejoin=round>');
var gi = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = Lf();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Rf = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path class=icon-loader-bar d="M12 2v4"style=animation-delay:0ms></path><path class=icon-loader-bar d="M15 6.8l2-3.5"style=animation-delay:-42ms></path><path class=icon-loader-bar d="M17.2 9l3.5-2"style=animation-delay:-83ms></path><path class=icon-loader-bar d="M18 12h4"style=animation-delay:-125ms></path><path class=icon-loader-bar d="M17.2 15l3.5 2"style=animation-delay:-167ms></path><path class=icon-loader-bar d="M15 17.2l2 3.5"style=animation-delay:-208ms></path><path class=icon-loader-bar d="M12 18v4"style=animation-delay:-250ms></path><path class=icon-loader-bar d="M9 17.2l-2 3.5"style=animation-delay:-292ms></path><path class=icon-loader-bar d="M6.8 15l-3.5 2"style=animation-delay:-333ms></path><path class=icon-loader-bar d="M2 12h4"style=animation-delay:-375ms></path><path class=icon-loader-bar d="M6.8 9l-3.5-2"style=animation-delay:-417ms></path><path class=icon-loader-bar d="M9 6.8l-2-3.5"style=animation-delay:-458ms>');
var ic = (e) => {
  let t = () => e.size ?? 16;
  return (() => {
    var n2 = Rf(), o2 = n2.firstChild, l2 = o2.nextSibling, a = l2.nextSibling, i = a.nextSibling, c = i.nextSibling, s = c.nextSibling, d2 = s.nextSibling, f = d2.nextSibling, p2 = f.nextSibling, y2 = p2.nextSibling, T2 = y2.nextSibling;
    T2.nextSibling;
    return Y2(($2) => {
      var b2 = t(), w3 = t(), h2 = e.class;
      return b2 !== $2.e && re2(n2, "width", $2.e = b2), w3 !== $2.t && re2(n2, "height", $2.t = w3), h2 !== $2.a && re2(n2, "class", $2.a = h2), $2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Nf = N2('<div data-react-grab-arrow class="absolute w-0 h-0 z-10">');
var pi = (e) => {
  let t = () => e.color ?? "white", n2 = () => e.position === "bottom", o2 = () => ui(e.labelWidth ?? 0);
  return (() => {
    var l2 = Nf();
    return Y2((a) => {
      var i = `calc(${e.leftPercent}% + ${e.leftOffsetPx}px)`, c = n2() ? "0" : void 0, s = n2() ? void 0 : "0", d2 = n2() ? "translateX(-50%) translateY(-100%)" : "translateX(-50%) translateY(100%)", f = `${o2()}px solid transparent`, p2 = `${o2()}px solid transparent`, y2 = n2() ? `${o2()}px solid ${t()}` : void 0, T2 = n2() ? void 0 : `${o2()}px solid ${t()}`;
      return i !== a.e && de2(l2, "left", a.e = i), c !== a.t && de2(l2, "top", a.t = c), s !== a.a && de2(l2, "bottom", a.a = s), d2 !== a.o && de2(l2, "transform", a.o = d2), f !== a.i && de2(l2, "border-left", a.i = f), p2 !== a.n && de2(l2, "border-right", a.n = p2), y2 !== a.s && de2(l2, "border-bottom", a.s = y2), T2 !== a.h && de2(l2, "border-top", a.h = T2), a;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0, s: void 0, h: void 0 }), l2;
  })();
};
var $f = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=2><path d="M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path><path d="M11 13l9-9"></path><path d="M15 4h5v5">');
var sc = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = $f();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var ac = N2("<span class=text-black>");
var Bf = N2("<span class=text-black/50>.");
var Hf = N2('<div><span class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0">');
var pr2 = (e) => {
  let [t, n2] = B2(false), o2 = () => {
    n2(true), e.onHoverChange?.(true);
  }, l2 = () => {
    n2(false), e.onHoverChange?.(false);
  };
  return (() => {
    var a = Hf(), i = a.firstChild;
    return Pe2(a, "click", e.onClick, true), a.addEventListener("mouseleave", l2), a.addEventListener("mouseenter", o2), _2(i, E2(fe2, { get when() {
      return e.componentName;
    }, get children() {
      return [(() => {
        var c = ac();
        return _2(c, () => e.componentName), c;
      })(), (() => {
        var c = Bf();
        c.firstChild;
        return _2(c, () => e.tagName, null), c;
      })()];
    } }), null), _2(i, E2(fe2, { get when() {
      return !e.componentName;
    }, get children() {
      var c = ac();
      return _2(c, () => e.tagName), c;
    } }), null), _2(a, E2(fe2, { get when() {
      return e.isClickable || e.forceShowIcon;
    }, get children() {
      return E2(sc, { size: 10, get class() {
        return me2("text-black transition-all duration-100 shrink-0", t() || e.forceShowIcon ? "opacity-100 scale-100" : "opacity-0 scale-75 -ml-[2px] w-0");
      } });
    } }), null), Y2(() => we2(a, me2("contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden", e.shrink && "shrink-0", e.isClickable && "cursor-pointer"))), a;
  })();
};
Qe2(["click"]);
var Ff = N2('<div class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-1.5 w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-[6px]">');
var It2 = (e) => (() => {
  var t = Ff();
  return _2(t, () => e.children), t;
})();
var hi = null;
var St2 = { claim: (e) => {
  hi = e;
}, release: (e) => {
  hi === e && (hi = null);
}, isActive: (e) => hi === e };
var zf = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 22 19"fill=none><path d="M6.76263 18.6626C7.48251 18.6626 7.95474 18.1682 7.95474 17.4895C7.95474 17.1207 7.80474 16.8576 7.58683 16.6361L5.3018 14.4137L2.84621 12.3589L2.44374 13.0037L5.92137 13.1622H17.9232C20.4842 13.1622 21.593 12.021 21.593 9.47237V3.66983C21.593 1.10875 20.4842 0 17.9232 0H12.5414C11.8179 0 11.3018 0.545895 11.3018 1.21695C11.3018 1.888 11.8179 2.43389 12.5414 2.43389H17.8424C18.7937 2.43389 19.1897 2.83653 19.1897 3.78784V9.35747C19.1897 10.3257 18.7937 10.7314 17.8424 10.7314H5.92137L2.44374 10.8832L2.84621 11.5281L5.3018 9.47993L7.58683 7.2606C7.80474 7.03914 7.95474 6.7693 7.95474 6.40049C7.95474 5.72854 7.48251 5.22747 6.76263 5.22747C6.46129 5.22747 6.12975 5.36905 5.89231 5.6096L0.376815 11.0425C0.134921 11.2777 0 11.6141 0 11.9452C0 12.2728 0.134921 12.6158 0.376815 12.848L5.89231 18.2871C6.12975 18.5276 6.46129 18.6626 6.76263 18.6626Z"fill=currentColor>');
var bi = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = zf();
    return Y2((o2) => {
      var l2 = t(), a = t() * 19 / 22, i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Kf = N2('<div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit"><button data-react-grab-discard-no class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">No</span></button><button data-react-grab-discard-yes class="contain-layout shrink-0 flex items-center justify-center gap-0.5 px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"><span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">Yes');
var Vf = N2('<div data-react-grab-discard-prompt class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit"><div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-2 w-full h-fit"><span class="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">');
var hr2 = (e) => {
  let t = /* @__PURE__ */ Symbol(), n2 = (l2) => {
    if (!St2.isActive(t) || xt2(l2)) return;
    let a = l2.code === "Enter", i = l2.code === "Escape";
    (a || i) && (l2.preventDefault(), l2.stopPropagation(), i && e.cancelOnEscape ? e.onCancel?.() : e.onConfirm?.());
  }, o2 = () => {
    St2.claim(t);
  };
  return lt2(() => {
    St2.claim(t), window.addEventListener("keydown", n2, { capture: true });
  }), Te2(() => {
    St2.release(t), window.removeEventListener("keydown", n2, { capture: true });
  }), (() => {
    var l2 = Vf(), a = l2.firstChild, i = a.firstChild;
    return l2.$$click = o2, l2.$$pointerdown = o2, _2(i, () => e.label ?? "Discard?"), _2(l2, E2(It2, { get children() {
      var c = Kf(), s = c.firstChild, d2 = s.nextSibling;
      d2.firstChild;
      return Pe2(s, "click", e.onCancel, true), Pe2(d2, "click", e.onConfirm, true), _2(d2, E2(bi, { size: 10, class: "text-[#B91C1C]/50" }), null), c;
    } }), null), l2;
  })();
};
Qe2(["pointerdown", "click"]);
var Uf = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"fill=currentColor>');
var lc = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = Uf();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Gf = N2('<div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit"><button data-react-grab-retry class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">Retry</span></button><button data-react-grab-error-ok class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">Ok');
var Wf = N2('<div data-react-grab-error class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px]"><div class="contain-layout shrink-0 flex items-start gap-1 px-2 w-full h-fit"><span class="text-[#B91C1C] text-[13px] leading-4 font-sans font-medium overflow-hidden line-clamp-5">');
var cc = (e) => {
  let t = /* @__PURE__ */ Symbol(), n2 = (a) => {
    if (!St2.isActive(t) || xt2(a)) return;
    let i = a.code === "Enter", c = a.code === "Escape";
    i ? (a.preventDefault(), a.stopPropagation(), e.onRetry?.()) : c && (a.preventDefault(), a.stopPropagation(), e.onAcknowledge?.());
  }, o2 = () => {
    St2.claim(t);
  };
  lt2(() => {
    St2.claim(t), window.addEventListener("keydown", n2, { capture: true });
  }), Te2(() => {
    St2.release(t), window.removeEventListener("keydown", n2, { capture: true });
  });
  let l2 = () => !!(e.onRetry || e.onAcknowledge);
  return (() => {
    var a = Wf(), i = a.firstChild, c = i.firstChild;
    return a.$$click = o2, a.$$pointerdown = o2, _2(c, () => e.error), _2(a, E2(fe2, { get when() {
      return l2();
    }, get children() {
      return E2(It2, { get children() {
        var s = Gf(), d2 = s.firstChild;
        d2.firstChild;
        var p2 = d2.nextSibling;
        return Pe2(d2, "click", e.onRetry, true), _2(d2, E2(lc, { size: 10, class: "text-black/50" }), null), Pe2(p2, "click", e.onAcknowledge, true), s;
      } });
    } }), null), Y2((s) => {
      var d2 = { "pt-1.5 pb-1": l2(), "py-1.5": !l2() }, f = e.error;
      return s.e = eo2(i, d2, s.e), f !== s.t && re2(c, "title", s.t = f), s;
    }, { e: void 0, t: void 0 }), a;
  })();
};
Qe2(["pointerdown", "click"]);
var jf = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><circle cx=5 cy=12 r=2></circle><circle cx=12 cy=12 r=2></circle><circle cx=19 cy=12 r=2>');
var $o2 = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = jf();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Xf = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 21 21"fill=none><g clip-path=url(#clip0_icon_check)><path d="M20.1767 10.0875C20.1767 15.6478 15.6576 20.175 10.0875 20.175C4.52715 20.175 0 15.6478 0 10.0875C0 4.51914 4.52715 0 10.0875 0C15.6576 0 20.1767 4.51914 20.1767 10.0875ZM13.0051 6.23867L8.96699 12.7041L7.08476 10.3143C6.83358 9.99199 6.59941 9.88828 6.28984 9.88828C5.79414 9.88828 5.39961 10.2918 5.39961 10.7893C5.39961 11.0367 5.48925 11.2621 5.66386 11.4855L8.05703 14.3967C8.33027 14.7508 8.63183 14.9103 8.99902 14.9103C9.36445 14.9103 9.68105 14.7312 9.90546 14.3896L14.4742 7.27206C14.6107 7.04765 14.7289 6.80898 14.7289 6.58359C14.7289 6.07187 14.281 5.72968 13.7934 5.72968C13.4937 5.72968 13.217 5.90527 13.0051 6.23867Z"fill=currentColor></path></g><defs><clipPath id=clip0_icon_check><rect width=20.5381 height=20.1848 fill=white>');
var br2 = (e) => {
  let t = () => e.size ?? 21;
  return (() => {
    var n2 = Xf();
    return Y2((o2) => {
      var l2 = t(), a = t() * 20.1848 / 20.5381, i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Yf = N2('<button data-react-grab-ignore-events data-react-grab-more-options class="flex items-center justify-center size-[18px] rounded-sm cursor-pointer bg-transparent hover:bg-black/10 text-black/30 hover:text-black border-none outline-none p-0 shrink-0 press-scale">');
var qf = N2('<button data-react-grab-undo class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"><span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">Undo');
var Zf = N2('<button data-react-grab-dismiss class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"><span class="text-black text-[13px] leading-3.5 font-sans font-medium">');
var Jf = N2('<div class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full h-fit"><span class="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0"></span><div class="contain-layout shrink-0 flex items-center gap-2 h-fit">');
var Qf = N2('<div class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-full h-fit"><span class="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">');
var em = N2('<div class="flex items-center gap-1 w-full mb-1 overflow-hidden"><span class="text-black/40 text-[11px] leading-3 font-medium truncate italic">');
var tm = N2('<div class="shrink-0 flex justify-between items-end w-full min-h-4"><textarea data-react-grab-ignore-events data-react-grab-followup-input class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"placeholder=follow-up rows=1 style=field-sizing:content;min-height:16px;scrollbar-width:none></textarea><button data-react-grab-followup-submit>');
var nm = N2("<div data-react-grab-completion>");
var dc = (e) => (() => {
  var t = Yf();
  return Pe2(t, "click", (n2) => {
    n2.stopImmediatePropagation(), e.onClick();
  }), Pe2(t, "pointerdown", (n2) => {
    n2.stopImmediatePropagation();
  }), _2(t, E2($o2, { size: 14 })), t;
})();
var uc = (e) => {
  let t = /* @__PURE__ */ Symbol(), n2, o2, l2, [a, i] = B2(false), [c, s] = B2(false), [d2, f] = B2(e.statusText), [p2, y2] = B2(""), T2 = () => {
    o2 !== void 0 && window.clearTimeout(o2), l2 !== void 0 && window.clearTimeout(l2), s(true), e.onFadingChange?.(true), e.onShowContextMenu?.();
  }, H2 = () => {
    a() || (i(true), f("Copied"), e.onCopyStateChange?.(), o2 = window.setTimeout(() => {
      s(true), e.onFadingChange?.(true), l2 = window.setTimeout(() => {
        e.onDismiss?.();
      }, 100);
    }, 1400));
  }, $2 = () => {
    let g2 = p2().trim();
    g2 && e.onFollowUpSubmit && e.onFollowUpSubmit(g2);
  }, b2 = (g2) => {
    if (g2.isComposing || g2.keyCode === 229) return;
    let v2 = g2.code === "KeyZ" && (g2.metaKey || g2.ctrlKey), I2 = g2.code === "Enter" && !g2.shiftKey, K = g2.code === "Escape";
    v2 || g2.stopImmediatePropagation(), I2 ? (g2.preventDefault(), p2().trim() ? $2() : H2()) : K && (g2.preventDefault(), e.onDismiss?.());
  }, w3 = (g2) => {
    if (!St2.isActive(t)) return;
    let v2 = g2.code === "KeyZ" && (g2.metaKey || g2.ctrlKey) && !g2.shiftKey, I2 = g2.code === "Enter", K = g2.code === "Escape";
    if (v2 && e.supportsUndo && e.onUndo) {
      g2.preventDefault(), g2.stopPropagation(), e.onUndo();
      return;
    }
    xt2(g2) || (I2 ? (g2.preventDefault(), g2.stopPropagation(), H2()) : K && (g2.preventDefault(), g2.stopPropagation(), e.onDismiss?.()));
  }, h2 = () => {
    St2.claim(t);
  };
  return pe2(() => {
    a() || f(e.statusText);
  }), lt2(() => {
    St2.claim(t), window.addEventListener("keydown", w3, { capture: true }), e.supportsFollowUp && e.onFollowUpSubmit && n2 && n2.focus();
  }), Te2(() => {
    St2.release(t), window.removeEventListener("keydown", w3, { capture: true }), o2 !== void 0 && window.clearTimeout(o2), l2 !== void 0 && window.clearTimeout(l2);
  }), (() => {
    var g2 = nm();
    return g2.$$click = h2, g2.$$pointerdown = h2, _2(g2, E2(fe2, { get when() {
      return Fe2(() => !a())() && (e.onDismiss || e.onUndo);
    }, get children() {
      var v2 = Jf(), I2 = v2.firstChild, K = I2.nextSibling;
      return _2(I2, d2), _2(K, E2(fe2, { get when() {
        return Fe2(() => !!e.onShowContextMenu)() && !e.supportsFollowUp;
      }, get children() {
        return E2(dc, { onClick: T2 });
      } }), null), _2(K, E2(fe2, { get when() {
        return Fe2(() => !!e.supportsUndo)() && e.onUndo;
      }, get children() {
        var Q2 = qf();
        return Q2.$$click = () => e.onUndo?.(), Q2;
      } }), null), _2(K, E2(fe2, { get when() {
        return e.onDismiss;
      }, get children() {
        var Q2 = Zf(), X2 = Q2.firstChild;
        return Q2.$$click = H2, _2(X2, () => e.dismissButtonText ?? "Keep"), _2(Q2, E2(fe2, { get when() {
          return !a();
        }, get children() {
          return E2(bi, { size: 10, class: "text-black/50" });
        } }), null), Y2(() => Q2.disabled = a()), Q2;
      } }), null), v2;
    } }), null), _2(g2, E2(fe2, { get when() {
      return a() || !e.onDismiss && !e.onUndo;
    }, get children() {
      var v2 = Qf(), I2 = v2.firstChild;
      return _2(v2, E2(br2, { size: 14, class: "text-black/85 shrink-0 animate-success-pop" }), I2), _2(I2, d2), _2(v2, E2(fe2, { get when() {
        return Fe2(() => !!e.onShowContextMenu)() && !e.supportsFollowUp;
      }, get children() {
        return E2(dc, { onClick: T2 });
      } }), null), v2;
    } }), null), _2(g2, E2(fe2, { get when() {
      return Fe2(() => !!(!a() && e.supportsFollowUp))() && e.onFollowUpSubmit;
    }, get children() {
      return E2(It2, { get children() {
        return [E2(fe2, { get when() {
          return e.previousPrompt;
        }, get children() {
          var v2 = em(), I2 = v2.firstChild;
          return _2(v2, E2(mi, { size: 10, class: "text-black/30 shrink-0" }), I2), _2(I2, () => e.previousPrompt), v2;
        } }), (() => {
          var v2 = tm(), I2 = v2.firstChild, K = I2.nextSibling;
          I2.$$keydown = b2, I2.$$input = (X2) => {
            ur2(X2.target, Ts), y2(X2.target.value);
          };
          var Q2 = n2;
          return typeof Q2 == "function" ? Ue2(Q2, I2) : n2 = I2, de2(I2, "max-height", `${Ts}px`), K.$$click = $2, _2(K, E2(gi, { size: 10, class: "text-white" })), Y2((X2) => {
            var te2 = e.previousPrompt ? "14px" : "0", ye2 = me2("contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale", !p2().trim() && "opacity-35");
            return te2 !== X2.e && de2(v2, "padding-left", X2.e = te2), ye2 !== X2.t && we2(K, X2.t = ye2), X2;
          }, { e: void 0, t: void 0 }), Y2(() => I2.value = p2()), v2;
        })()];
      } });
    } }), null), Y2((v2) => {
      var I2 = me2("contain-layout shrink-0 flex flex-col justify-center items-end rounded-[10px] antialiased w-fit h-fit max-w-[280px] transition-opacity duration-100 ease-out [font-synthesis:none] [corner-shape:superellipse(1.25)]", gs), K = c() ? 0 : 1;
      return I2 !== v2.e && we2(g2, v2.e = I2), K !== v2.t && de2(g2, "opacity", v2.t = K), v2;
    }, { e: void 0, t: void 0 }), g2;
  })();
};
Qe2(["pointerdown", "click", "input", "keydown"]);
var om = "0";
var rm = "1";
var im = ({ hiddenOpacity: e = om, visibleOpacity: t = rm } = {}) => {
  let n2, o2, l2 = () => {
    o2 && (o2.style.opacity = e);
  };
  return { containerRef: (s) => {
    n2 = s;
  }, followerRef: (s) => {
    o2 = s;
  }, followElement: (s) => {
    if (!o2 || !n2) return;
    if (!s) {
      l2();
      return;
    }
    let d2 = n2.getBoundingClientRect(), f = s.getBoundingClientRect(), p2 = f.top - d2.top + n2.scrollTop, y2 = f.left - d2.left + n2.scrollLeft;
    o2.style.opacity = t, o2.style.top = `${p2}px`, o2.style.left = `${y2}px`, o2.style.width = `${f.width}px`, o2.style.height = `${f.height}px`;
  }, hideFollower: l2 };
};
var Fn2 = () => {
  let { containerRef: e, followerRef: t, followElement: n2, hideFollower: o2 } = im();
  return { containerRef: e, highlightRef: t, updateHighlight: n2, clearHighlight: o2 };
};
var sm = N2('<div class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">');
var am = N2("<span class=text-black/40>.");
var lm = N2('<button data-react-grab-ignore-events class="relative z-1 contain-layout flex items-center w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent"><span class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0 transition-colors">');
var fc = (e) => {
  let { containerRef: t, highlightRef: n2, updateHighlight: o2, clearHighlight: l2 } = Fn2(), a, i = false, c = (s) => a ? a.querySelector(`[data-react-grab-arrow-nav-index="${s}"]`) ?? void 0 : void 0;
  return pe2(() => {
    e.items, i = false;
  }), pe2(() => {
    let s = c(e.activeIndex);
    s && o2(s);
  }), E2(It2, { get children() {
    var s = sm(), d2 = s.firstChild;
    return s.$$pointermove = () => {
      i = true;
    }, Ue2((f) => {
      a = f, t(f);
    }, s), Ue2(n2, d2), _2(s, E2(Qt2, { get each() {
      return e.items;
    }, children: (f, p2) => (() => {
      var y2 = lm(), T2 = y2.firstChild;
      return y2.$$click = (H2) => {
        H2.stopPropagation(), e.onSelect(p2());
      }, y2.addEventListener("pointerleave", () => {
        let H2 = c(e.activeIndex);
        H2 ? o2(H2) : l2();
      }), y2.addEventListener("pointerenter", (H2) => {
        o2(H2.currentTarget), i && e.onSelect(p2());
      }), y2.$$pointerdown = (H2) => H2.stopPropagation(), _2(T2, E2(fe2, { get when() {
        return f.componentName;
      }, get children() {
        return [Fe2(() => f.componentName), am()];
      } }), null), _2(T2, () => f.tagName, null), Y2((H2) => {
        var $2 = f.tagName, b2 = p2(), w3 = p2() === e.activeIndex, h2 = p2() !== e.activeIndex;
        return $2 !== H2.e && re2(y2, "data-react-grab-arrow-nav-item", H2.e = $2), b2 !== H2.t && re2(y2, "data-react-grab-arrow-nav-index", H2.t = b2), w3 !== H2.a && T2.classList.toggle("text-black", H2.a = w3), h2 !== H2.o && T2.classList.toggle("text-black/30", H2.o = h2), H2;
      }, { e: void 0, t: void 0, a: void 0, o: void 0 }), y2;
    })() }), null), s;
  } });
};
Qe2(["pointermove", "pointerdown", "click"]);
var cm = N2('<button data-react-grab-ignore-events data-react-grab-abort class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale"><div class="size-1.5 bg-white rounded-[1px]">');
var dm = N2('<div class="shrink-0 flex justify-between items-end w-full min-h-4"><textarea data-react-grab-ignore-events class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50 wrap-break-word overflow-y-auto"placeholder="Add context"rows=1 disabled style=field-sizing:content;min-height:16px;scrollbar-width:none>');
var um = N2('<div class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit max-w-[280px]"><div class="contain-layout shrink-0 flex items-center gap-1 py-1.5 px-2 w-full h-fit"><span class="shimmer-text text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap">');
var fm = N2('<div class="flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5">');
var mm = N2('<div class="contain-layout shrink-0 flex flex-col items-start w-fit h-fit"><div class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit px-2">');
var gm = N2('<div class="flex items-center gap-1 w-full mb-1 overflow-hidden"><span class="text-black/40 text-[11px] leading-3 font-medium truncate italic">');
var pm = N2('<button data-react-grab-submit class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale">');
var hm = N2('<div class="shrink-0 flex justify-between items-end w-full min-h-4"><textarea data-react-grab-ignore-events data-react-grab-input class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"placeholder="Add context"rows=1 style=field-sizing:content;min-height:16px;scrollbar-width:none>');
var bm = N2('<div class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit min-w-[150px] max-w-[280px]"><div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2 max-w-full">');
var ym = N2("<div data-react-grab-ignore-events data-react-grab-selection-label style=z-index:2147483647><div>");
var wm = N2('<span class="text-[11px] font-sans text-black/50 ml-4">');
var xm = N2('<div class="contain-layout flex items-center justify-between w-full px-2 py-1 transition-colors"><span class="text-[13px] leading-4 font-sans font-medium text-black">');
var mc = { left: Cs, top: Cs, arrowLeftPercent: Ro, arrowLeftOffset: 0, edgeOffsetX: 0 };
var wi = (e) => {
  let t, n$1, o2, l$1 = false, a = null, i = null, [c, s] = B2(0), [d2, f] = B2(0), [p2, y2] = B2(0), [T2, H2] = B2("bottom"), [$2, b2] = B2(0), [w3, h2] = B2(false), [g2, v2] = B2(false), I2 = () => e.status !== "copying" && e.status !== "copied" && e.status !== "fading" && e.status !== "error", K = () => e.status === "copied" || e.status === "fading", Q2 = () => !!(e.isPromptMode || K() && (e.onDismiss || e.onShowContextMenu) || e.status === "copying" && e.onAbort || e.status === "error" && (e.onAcknowledgeError || e.onRetry) || e.arrowNavigationState?.isVisible), X2, te2 = (L2) => {
    l$1 = L2;
  }, ye2 = () => {
    b2((L2) => L2 + 1);
  }, ue2 = (L2) => {
    if (xt2(L2)) return;
    let F2 = L2.code === "Enter" && !e.isPromptMode && I2(), ie2 = L2.code === "KeyC" && L2.ctrlKey && e.status === "copying" && e.onAbort;
    F2 ? (L2.preventDefault(), L2.stopImmediatePropagation(), e.onToggleExpand?.()) : ie2 && (L2.preventDefault(), L2.stopImmediatePropagation(), e.onAbort?.());
  };
  lt2(() => {
    if (X2 = new ResizeObserver((L2) => {
      for (let F2 of L2) {
        let ie2 = F2.target.getBoundingClientRect();
        F2.target === t && !l$1 ? (s(ie2.width), f(ie2.height)) : F2.target === n$1 && y2(ie2.width);
      }
    }), t) {
      let L2 = t.getBoundingClientRect();
      s(L2.width), f(L2.height), X2.observe(t);
    }
    n$1 && (y2(n$1.getBoundingClientRect().width), X2.observe(n$1)), window.addEventListener("scroll", ye2, true), window.addEventListener("resize", ye2), window.addEventListener("keydown", ue2, { capture: true });
  }), Te2(() => {
    X2?.disconnect(), window.removeEventListener("scroll", ye2, true), window.removeEventListener("resize", ye2), window.removeEventListener("keydown", ue2, { capture: true });
  }), pe2(() => {
    let L2 = `${e.tagName ?? ""}:${e.componentName ?? ""}`;
    L2 !== i && (i = L2, a = null);
  }), pe2(() => {
    if (e.isPromptMode && o2 && e.onSubmit) {
      let L2 = setTimeout(() => {
        o2 && (o2.focus(), ur2(o2, Ts));
      }, 0);
      Te2(() => {
        clearTimeout(L2);
      });
    }
  });
  let W2 = se2(() => {
    $2();
    let L2 = e.selectionBounds, F2 = c(), ie2 = d2(), Me2 = F2 > 0 && ie2 > 0, he2 = L2 && L2.width > 0 && L2.height > 0;
    if (!Me2 || !he2) return { position: a ?? mc, computedArrowPosition: null };
    let ke2 = window.visualViewport?.width ?? window.innerWidth, ge2 = window.visualViewport?.height ?? window.innerHeight;
    if (!(L2.x + L2.width > 0 && L2.x < ke2 && L2.y + L2.height > 0 && L2.y < ge2)) return { position: mc, computedArrowPosition: null };
    let He2 = L2.x + L2.width / 2, Oe2 = e.mouseX ?? He2, be2 = L2.y + L2.height, Se2 = L2.y, tt2 = e.hideArrow ? 0 : ui(p2()), ot = Oe2, ft2 = 0, _t2 = be2 + tt2 + No;
    if (F2 > 0) {
      let jt2 = ot - F2 / 2, Ht2 = ot + F2 / 2;
      Ht2 > ke2 - 8 && (ft2 = ke2 - 8 - Ht2), jt2 + ft2 < 8 && (ft2 = 8 - jt2);
    }
    let so2 = ie2 + tt2 + No, Vn2 = _t2 + ie2 <= ge2 - 8;
    Vn2 || (_t2 = Se2 - so2), _t2 < 8 && (_t2 = 8);
    let Sn2 = Ro, ht2 = F2 / 2, en2 = ht2 - ft2, mt2 = Math.min(Oo, ht2), tn2 = Math.max(F2 - Oo, ht2), dn2 = Math.max(mt2, Math.min(tn2, en2)) - ht2;
    return { position: { left: ot, top: _t2, arrowLeftPercent: Sn2, arrowLeftOffset: dn2, edgeOffsetX: ft2 }, computedArrowPosition: Vn2 ? "bottom" : "top" };
  });
  pe2(() => {
    let L2 = W2();
    L2.computedArrowPosition !== null && (a = L2.position, h2(true), H2(L2.computedArrowPosition));
  });
  let V2 = (L2) => {
    if (L2.isComposing || L2.keyCode === hs) return;
    L2.stopImmediatePropagation();
    let F2 = L2.code === "Enter" && !L2.shiftKey, ie2 = L2.code === "Escape";
    F2 ? (L2.preventDefault(), e.onSubmit?.()) : ie2 && (L2.preventDefault(), e.onConfirmDismiss?.());
  }, S2 = (L2) => {
    let F2 = L2.target;
    F2 instanceof HTMLTextAreaElement && (ur2(F2, Ts), e.onInputChange?.(F2.value));
  }, O2 = () => fi({ tagName: e.tagName, componentName: e.componentName, elementsCount: e.elementsCount }), U2 = () => O2().tagName, q2 = () => O2().componentName, x2 = () => e.actionCycleState?.items ?? [], A2 = () => e.actionCycleState?.activeIndex ?? 0, j2 = () => !!e.actionCycleState?.isVisible, z2 = () => !!e.arrowNavigationState?.isVisible, ne2 = (L2) => {
    L2.stopImmediatePropagation(), e.filePath && e.onOpen && e.onOpen();
  }, G2 = () => !!(e.filePath && e.onOpen), Ee2 = (L2) => {
    L2.stopImmediatePropagation(), I2() && e.isPromptMode && !e.isPendingDismiss && e.onSubmit && o2 && o2.focus();
  }, ve2 = () => w3() && (K() || e.status === "error");
  return E2(fe2, { get when() {
    return Fe2(() => e.visible !== false)() && (e.selectionBounds || ve2());
  }, get children() {
    var L2 = ym(), F2 = L2.firstChild;
    L2.addEventListener("mouseleave", () => e.onHoverChange?.(false)), L2.addEventListener("mouseenter", () => e.onHoverChange?.(true)), L2.$$click = (he2) => {
      he2.stopImmediatePropagation();
    }, L2.$$pointerdown = Ee2;
    var ie2 = t;
    typeof ie2 == "function" ? Ue2(ie2, L2) : t = L2, _2(L2, E2(fe2, { get when() {
      return !e.hideArrow;
    }, get children() {
      return E2(pi, { get position() {
        return T2();
      }, get leftPercent() {
        return W2().position.arrowLeftPercent;
      }, get leftOffsetPx() {
        return W2().position.arrowLeftOffset;
      }, get labelWidth() {
        return p2();
      } });
    } }), F2), _2(L2, E2(fe2, { get when() {
      return Fe2(() => !!K())() && !e.error;
    }, get children() {
      return E2(uc, { get statusText() {
        return Fe2(() => !!e.hasAgent)() ? e.statusText ?? "Completed" : "Copied";
      }, get supportsUndo() {
        return e.supportsUndo;
      }, get supportsFollowUp() {
        return e.supportsFollowUp;
      }, get dismissButtonText() {
        return e.dismissButtonText;
      }, get previousPrompt() {
        return e.previousPrompt;
      }, get onDismiss() {
        return e.onDismiss;
      }, get onUndo() {
        return e.onUndo;
      }, get onFollowUpSubmit() {
        return e.onFollowUpSubmit;
      }, onFadingChange: v2, get onShowContextMenu() {
        return e.onShowContextMenu;
      } });
    } }), F2);
    var Me2 = n$1;
    return typeof Me2 == "function" ? Ue2(Me2, F2) : n$1 = F2, _2(F2, E2(fe2, { get when() {
      return Fe2(() => e.status === "copying")() && !e.isPendingAbort;
    }, get children() {
      var he2 = um(), ke2 = he2.firstChild, ge2 = ke2.firstChild;
      return _2(ke2, E2(ic, { size: 13, class: "text-[#71717a] shrink-0" }), ge2), _2(ge2, () => e.statusText ?? "Grabbing…"), _2(he2, E2(fe2, { get when() {
        return Fe2(() => !!e.hasAgent)() && e.inputValue;
      }, get children() {
        return E2(It2, { get children() {
          var Ce2 = dm(), He2 = Ce2.firstChild, Oe2 = o2;
          return typeof Oe2 == "function" ? Ue2(Oe2, He2) : o2 = He2, de2(He2, "max-height", `${Ts}px`), _2(Ce2, E2(fe2, { get when() {
            return e.onAbort;
          }, get children() {
            var be2 = cm();
            return be2.$$click = (Se2) => {
              Se2.stopPropagation(), e.onAbort?.();
            }, be2.$$pointerdown = (Se2) => Se2.stopPropagation(), be2;
          } }), null), Y2(() => He2.value = e.inputValue ?? ""), Ce2;
        } });
      } }), null), Y2(() => he2.classList.toggle("min-w-[150px]", !!(e.hasAgent && e.inputValue))), he2;
    } }), null), _2(F2, E2(fe2, { get when() {
      return Fe2(() => e.status === "copying")() && e.isPendingAbort;
    }, get children() {
      return E2(hr2, { get onConfirm() {
        return e.onConfirmAbort;
      }, get onCancel() {
        return e.onCancelAbort;
      } });
    } }), null), _2(F2, E2(fe2, { get when() {
      return Fe2(() => !!I2())() && !e.isPromptMode;
    }, get children() {
      var he2 = mm(), ke2 = he2.firstChild;
      return _2(ke2, E2(pr2, { get tagName() {
        return U2();
      }, get componentName() {
        return q2();
      }, get isClickable() {
        return G2();
      }, onClick: ne2, onHoverChange: te2, shrink: true, get forceShowIcon() {
        return Fe2(() => !!z2())() ? G2() : !!e.isContextMenuOpen;
      } })), _2(he2, E2(fe2, { get when() {
        return e.arrowNavigationState?.isVisible;
      }, get children() {
        return E2(fc, { get items() {
          return e.arrowNavigationState.items;
        }, get activeIndex() {
          return e.arrowNavigationState.activeIndex;
        }, onSelect: (ge2) => e.onArrowNavigationSelect?.(ge2) });
      } }), null), _2(he2, E2(fe2, { get when() {
        return Fe2(() => !z2())() && j2();
      }, get children() {
        return E2(It2, { get children() {
          var ge2 = fm();
          return _2(ge2, E2(Qt2, { get each() {
            return x2();
          }, children: (Ce2, He2) => (() => {
            var Oe2 = xm(), be2 = Oe2.firstChild;
            return _2(be2, () => Ce2.label), _2(Oe2, E2(fe2, { get when() {
              return Ce2.shortcut;
            }, get children() {
              var Se2 = wm();
              return _2(Se2, () => Hn2(Ce2.shortcut)), Se2;
            } }), null), Y2((Se2) => {
              var tt2 = Ce2.label.toLowerCase(), ot = He2() === A2(), ft2 = He2() === x2().length - 1;
              return tt2 !== Se2.e && re2(Oe2, "data-react-grab-action-cycle-item", Se2.e = tt2), ot !== Se2.t && Oe2.classList.toggle("bg-black/5", Se2.t = ot), ft2 !== Se2.a && Oe2.classList.toggle("rounded-b-[6px]", Se2.a = ft2), Se2;
            }, { e: void 0, t: void 0, a: void 0 }), Oe2;
          })() })), ge2;
        } });
      } }), null), Y2((ge2) => {
        var Ce2 = !!z2(), He2 = { "py-1.5": !z2(), "pt-1.5 pb-1": z2() };
        return Ce2 !== ge2.e && he2.classList.toggle("min-w-[100px]", ge2.e = Ce2), ge2.t = eo2(ke2, He2, ge2.t), ge2;
      }, { e: void 0, t: void 0 }), he2;
    } }), null), _2(F2, E2(fe2, { get when() {
      return Fe2(() => !!(I2() && e.isPromptMode))() && !e.isPendingDismiss;
    }, get children() {
      var he2 = bm(), ke2 = he2.firstChild;
      return _2(ke2, E2(pr2, { get tagName() {
        return U2();
      }, get componentName() {
        return q2();
      }, get isClickable() {
        return G2();
      }, onClick: ne2, onHoverChange: te2, forceShowIcon: true })), _2(he2, E2(It2, { get children() {
        return [E2(fe2, { get when() {
          return e.replyToPrompt;
        }, get children() {
          var ge2 = gm(), Ce2 = ge2.firstChild;
          return _2(ge2, E2(mi, { size: 10, class: "text-black/30 shrink-0" }), Ce2), _2(Ce2, () => e.replyToPrompt), ge2;
        } }), (() => {
          var ge2 = hm(), Ce2 = ge2.firstChild;
          Ce2.$$keydown = V2, Ce2.$$input = S2;
          var He2 = o2;
          return typeof He2 == "function" ? Ue2(He2, Ce2) : o2 = Ce2, de2(Ce2, "max-height", `${Ts}px`), _2(ge2, E2(fe2, { get when() {
            return e.onSubmit;
          }, get children() {
            var Oe2 = pm();
            return Oe2.$$click = () => e.onSubmit?.(), _2(Oe2, E2(gi, { size: 10, class: "text-white" })), Oe2;
          } }), null), Y2((Oe2) => {
            var be2 = e.replyToPrompt ? "14px" : "0", Se2 = !e.onSubmit;
            return be2 !== Oe2.e && de2(ge2, "padding-left", Oe2.e = be2), Se2 !== Oe2.t && (Ce2.readOnly = Oe2.t = Se2), Oe2;
          }, { e: void 0, t: void 0 }), Y2(() => Ce2.value = e.inputValue ?? ""), ge2;
        })()];
      } }), null), he2;
    } }), null), _2(F2, E2(fe2, { get when() {
      return e.isPendingDismiss;
    }, get children() {
      return E2(hr2, { get onConfirm() {
        return e.onConfirmDismiss;
      }, get onCancel() {
        return e.onCancelDismiss;
      } });
    } }), null), _2(F2, E2(fe2, { get when() {
      return e.error;
    }, get children() {
      return E2(cc, { get error() {
        return e.error;
      }, get onAcknowledge() {
        return e.onAcknowledgeError;
      }, get onRetry() {
        return e.onRetry;
      } });
    } }), null), Y2((he2) => {
      var ke2 = me2("fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-opacity duration-100 ease-out"), ge2 = `${W2().position.top}px`, Ce2 = `${W2().position.left}px`, He2 = `translateX(calc(-50% + ${W2().position.edgeOffsetX}px))`, Oe2 = Q2() ? "auto" : "none", be2 = e.status === "fading" || g2() ? 0 : 1, Se2 = me2("contain-layout flex items-center gap-[5px] rounded-[10px] antialiased w-fit h-fit p-0 [font-synthesis:none] [corner-shape:superellipse(1.25)]", gs), tt2 = K() && !e.error ? "none" : void 0;
      return ke2 !== he2.e && we2(L2, he2.e = ke2), ge2 !== he2.t && de2(L2, "top", he2.t = ge2), Ce2 !== he2.a && de2(L2, "left", he2.a = Ce2), He2 !== he2.o && de2(L2, "transform", he2.o = He2), Oe2 !== he2.i && de2(L2, "pointer-events", he2.i = Oe2), be2 !== he2.n && de2(L2, "opacity", he2.n = be2), Se2 !== he2.s && we2(F2, he2.s = Se2), tt2 !== he2.h && de2(F2, "display", he2.h = tt2), he2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0, s: void 0, h: void 0 }), L2;
  } });
};
Qe2(["pointerdown", "click", "input", "keydown"]);
var gc = "react-grab-toolbar-state";
var no = () => {
  try {
    let e = localStorage.getItem(gc);
    if (!e) return null;
    let t = JSON.parse(e);
    if (typeof t != "object" || t === null) return null;
    let n2 = t;
    return { edge: n2.edge === "top" || n2.edge === "bottom" || n2.edge === "left" || n2.edge === "right" ? n2.edge : "bottom", ratio: typeof n2.ratio == "number" ? n2.ratio : Go, collapsed: typeof n2.collapsed == "boolean" ? n2.collapsed : false, enabled: typeof n2.enabled == "boolean" ? n2.enabled : true };
  } catch (e) {
    console.warn("[react-grab] Failed to load toolbar state from localStorage:", e);
  }
  return null;
};
var yr2 = (e) => {
  try {
    localStorage.setItem(gc, JSON.stringify(e));
  } catch (t) {
    console.warn("[react-grab] Failed to save toolbar state to localStorage:", t);
  }
};
var vm = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 18 18"fill=currentColor><path opacity=0.4 d="M7.65631 10.9565C7.31061 10.0014 7.54012 8.96635 8.25592 8.25195C8.74522 7.76615 9.38771 7.49951 10.0694 7.49951C10.3682 7.49951 10.6641 7.55171 10.9483 7.65381L16.0001 9.49902V4.75C16.0001 3.2334 14.7667 2 13.2501 2H4.75012C3.23352 2 2.00012 3.2334 2.00012 4.75V13.25C2.00012 14.7666 3.23352 16 4.75012 16H9.49962L7.65631 10.9565Z"></path><path d="M17.296 11.5694L10.4415 9.06545C10.0431 8.92235 9.61441 9.01658 9.31551 9.31338C9.01671 9.61168 8.92101 10.0429 9.06551 10.4413L11.5704 17.2948C11.7247 17.7191 12.128 18.0004 12.5772 18.0004C12.585 18.0004 12.5918 17.9999 12.5987 17.9999C13.0577 17.9906 13.4591 17.6913 13.5987 17.2543L14.4854 14.4857L17.2559 13.5985C17.6914 13.4589 17.9903 13.057 18 12.599C18.0097 12.141 17.7267 11.7276 17.296 11.5694Z">');
var xi = (e) => {
  let t = () => e.size ?? 14;
  return (() => {
    var n2 = vm();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Cm = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><path fill-rule=evenodd clip-rule=evenodd d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8V12C11 12.2652 11.1054 12.5196 11.2929 12.7071L13.2929 14.7071C13.6834 15.0976 14.3166 15.0976 14.7071 14.7071C15.0976 14.3166 15.0976 13.6834 14.7071 13.2929L13 11.5858V8Z">');
var vi = (e) => {
  let t = () => e.size ?? 14;
  return (() => {
    var n2 = Cm();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Em = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><path d="M16.0549 8.25C17.4225 8.24998 18.5248 8.24996 19.3918 8.36652C20.2919 8.48754 21.0497 8.74643 21.6517 9.34835C22.2536 9.95027 22.5125 10.7081 22.6335 11.6083C22.75 12.4752 22.75 13.5775 22.75 14.9451V14.9451V16.0549V16.0549C22.75 17.4225 22.75 18.5248 22.6335 19.3918C22.5125 20.2919 22.2536 21.0497 21.6517 21.6517C21.0497 22.2536 20.2919 22.5125 19.3918 22.6335C18.5248 22.75 17.4225 22.75 16.0549 22.75H16.0549H14.9451H14.9451C13.5775 22.75 12.4752 22.75 11.6082 22.6335C10.7081 22.5125 9.95027 22.2536 9.34835 21.6516C8.74643 21.0497 8.48754 20.2919 8.36652 19.3918C8.24996 18.5248 8.24998 17.4225 8.25 16.0549V16.0549V14.9451V14.9451C8.24998 13.5775 8.24996 12.4752 8.36652 11.6082C8.48754 10.7081 8.74643 9.95027 9.34835 9.34835C9.95027 8.74643 10.7081 8.48754 11.6083 8.36652C12.4752 8.24996 13.5775 8.24998 14.9451 8.25H14.9451H16.0549H16.0549Z"></path><path d="M6.75 14.8569C6.74991 13.5627 6.74983 12.3758 6.8799 11.4084C7.0232 10.3425 7.36034 9.21504 8.28769 8.28769C9.21504 7.36034 10.3425 7.0232 11.4084 6.8799C12.3758 6.74983 13.5627 6.74991 14.8569 6.75L17.0931 6.75C17.3891 6.75 17.5371 6.75 17.6261 6.65419C17.7151 6.55838 17.7045 6.4142 17.6833 6.12584C17.6648 5.87546 17.6412 5.63892 17.6111 5.41544C17.4818 4.45589 17.2232 3.6585 16.6718 2.98663C16.4744 2.74612 16.2539 2.52558 16.0134 2.3282C15.3044 1.74638 14.4557 1.49055 13.4248 1.36868C12.4205 1.24998 11.1512 1.24999 9.54893 1.25H9.45109C7.84883 1.24999 6.57947 1.24998 5.57525 1.36868C4.54428 1.49054 3.69558 1.74638 2.98663 2.3282C2.74612 2.52558 2.52558 2.74612 2.3282 2.98663C1.74638 3.69558 1.49055 4.54428 1.36868 5.57525C1.24998 6.57947 1.24999 7.84882 1.25 9.45108V9.54891C1.24999 11.1512 1.24998 12.4205 1.36868 13.4247C1.49054 14.4557 1.74638 15.3044 2.3282 16.0134C2.52558 16.2539 2.74612 16.4744 2.98663 16.6718C3.6585 17.2232 4.45589 17.4818 5.41544 17.6111C5.63892 17.6412 5.87546 17.6648 6.12584 17.6833C6.4142 17.7045 6.55838 17.7151 6.65419 17.6261C6.75 17.5371 6.75 17.3891 6.75 17.0931V14.8569Z">');
var oo = (e) => {
  let t = () => e.size ?? 14;
  return (() => {
    var n2 = Em();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Os = (e, t, n2) => (e.x - n2.x) * (t.y - n2.y) - (t.x - n2.x) * (e.y - n2.y);
var Sm = (e, t, n2, o2) => {
  let l2 = Os(e, t, n2), a = Os(e, n2, o2), i = Os(e, o2, t), c = l2 < 0 || a < 0 || i < 0, s = l2 > 0 || a > 0 || i > 0;
  return !c || !s;
};
var Ds = (e, t) => e.x >= t.x && e.x <= t.x + t.width && e.y >= t.y && e.y <= t.y + t.height;
var Am = (e, t) => {
  let n2 = t.y + t.height, o2 = t.x + t.width;
  return e.y <= t.y ? [{ x: t.x, y: n2 }, { x: o2, y: n2 }] : e.y >= n2 ? [{ x: t.x, y: t.y }, { x: o2, y: t.y }] : e.x <= t.x ? [{ x: o2, y: t.y }, { x: o2, y: n2 }] : [{ x: t.x, y: t.y }, { x: t.x, y: n2 }];
};
var Ci = () => {
  let e = null, t = () => {
    e?.(), e = null;
  };
  return { start: (o2, l2, a) => {
    t();
    let i = l2[0];
    if (!i || Ds(o2, i)) return;
    let [c, s] = Am(o2, i), d2 = (p2) => l2.some((y2) => Ds(p2, y2)), f = (p2) => {
      let y2 = { x: p2.clientX, y: p2.clientY };
      if (d2(y2)) {
        Ds(y2, i) && t();
        return;
      }
      Sm(y2, o2, c, s) || (t(), a());
    };
    window.addEventListener("mousemove", f), e = () => {
      window.removeEventListener("mousemove", f);
    };
  }, stop: t };
};
var Tm = N2("<div style=z-index:2147483647>");
var Ls = 0;
var km = () => Date.now() - Ls < vo;
var En2 = (e) => {
  let [t, n2] = B2(false), [o2, l2] = B2(true), a;
  return pe2(Be2(() => e.visible, (i) => {
    a !== void 0 && (clearTimeout(a), a = void 0), i ? km() ? (l2(false), n2(true)) : (l2(true), a = setTimeout(() => {
      n2(true);
    }, Fo)) : (t() && (Ls = Date.now()), n2(false));
  })), Te2(() => {
    a !== void 0 && clearTimeout(a), t() && (Ls = Date.now());
  }), E2(fe2, { get when() {
    return t();
  }, get children() {
    var i = Tm();
    return _2(i, () => e.children), Y2(() => we2(i, me2("absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none [corner-shape:superellipse(1.25)]", gs, e.position === "left" || e.position === "right" ? "top-1/2 -translate-y-1/2" : "left-1/2 -translate-x-1/2", e.position === "top" && "bottom-full mb-2.5", e.position === "bottom" && "top-full mt-2.5", e.position === "left" && "right-full mr-2.5", e.position === "right" && "left-full ml-2.5", o2() && "animate-tooltip-fade-in"))), i;
  } });
};
var Pm = N2('<kbd class="inline-flex items-center justify-center px-[3px] h-3.5 rounded-sm [border-width:0.5px] border-solid border-[#B3B3B3] text-black/70 text-[10px] font-medium leading-none">');
var Ho2 = (e) => (() => {
  var t = Pm();
  return _2(t, () => e.children), t;
})();
var pc = (e, t, n2) => {
  if (t) return e ? "grid-rows-[1fr] opacity-100" : "grid-cols-[1fr] opacity-100";
  let o2 = e ? "grid-rows-[0fr] opacity-0" : "grid-cols-[0fr] opacity-0";
  return n2 ? `${o2} ${n2}` : o2;
};
var Ei = (e) => e ? "mb-1.5" : "mr-1.5";
var hc = (e) => e ? "min-h-0" : "min-w-0";
var Si = (e) => e ? "before:!min-h-full" : "before:!min-w-full";
var Mm = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2.5 stroke-linecap=round stroke-linejoin=round><path d="m18 15-6-6-6 6">');
var bc = (e) => {
  let t = () => e.size ?? 12;
  return (() => {
    var n2 = Mm();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var Im = N2("<button data-react-grab-ignore-events data-react-grab-toolbar-toggle>");
var _m = N2('<button data-react-grab-ignore-events data-react-grab-toolbar-history aria-label="Open history">');
var Om = N2('<button data-react-grab-ignore-events data-react-grab-toolbar-copy-all aria-label="Copy all history items">');
var Dm = N2("<button data-react-grab-ignore-events data-react-grab-toolbar-menu>");
var Lm = N2("<button data-react-grab-ignore-events data-react-grab-toolbar-enabled><div><div>");
var Rm = N2('<button data-react-grab-ignore-events data-react-grab-toolbar-collapse class="contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale">');
var Nm = N2('<div><div><div><div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div><div class="relative shrink-0 overflow-visible">');
var yc = (e) => {
  let t = () => e.snapEdge ?? "bottom", n2 = () => t() === "left" || t() === "right", o2 = (b2, w3) => pc(n2(), b2, w3), l2 = () => e.disableGridTransitions ? "" : n2() ? "transition-[grid-template-rows,opacity] duration-150 ease-out" : "transition-[grid-template-columns,opacity] duration-150 ease-out", a = () => Ei(n2()), i = () => hc(n2()), c = () => Si(n2()), s = () => {
    if (!e.isCollapsed) return "";
    let b2 = { top: "rounded-t-none rounded-b-[10px]", bottom: "rounded-b-none rounded-t-[10px]", left: "rounded-l-none rounded-r-[10px]", right: "rounded-r-none rounded-l-[10px]" }[t()], w3 = n2() ? "px-0.25 py-2" : "px-2 py-0.25";
    return `${b2} ${w3}`;
  }, d2 = () => {
    let b2 = e.isCollapsed;
    switch (t()) {
      case "top":
        return b2 ? "rotate-180" : "rotate-0";
      case "bottom":
        return b2 ? "rotate-0" : "rotate-180";
      case "left":
        return b2 ? "rotate-90" : "-rotate-90";
      case "right":
        return b2 ? "-rotate-90" : "rotate-90";
      default:
        return "rotate-0";
    }
  }, f = () => (() => {
    var b2 = Im();
    return _2(b2, E2(xi, { size: 14, get class() {
      return me2("transition-colors", e.isActive ? "text-black" : "text-black/70");
    } })), Y2((w3) => {
      var h2 = e.isActive ? "Stop selecting element" : "Select element", g2 = !!e.isActive, v2 = me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", a(), c());
      return h2 !== w3.e && re2(b2, "aria-label", w3.e = h2), g2 !== w3.t && re2(b2, "aria-pressed", w3.t = g2), v2 !== w3.a && we2(b2, w3.a = v2), w3;
    }, { e: void 0, t: void 0, a: void 0 }), b2;
  })(), p2 = () => (() => {
    var b2 = _m();
    return _2(b2, E2(vi, { size: 14, get class() {
      return me2("transition-colors", e.isHistoryPinned ? "text-black/80" : "text-[#B3B3B3]");
    } })), Y2(() => we2(b2, me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", a(), c()))), b2;
  })(), y2 = () => (() => {
    var b2 = Om();
    return _2(b2, E2(oo, { size: 14, class: "text-[#B3B3B3] transition-colors" })), Y2(() => we2(b2, me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", a(), c()))), b2;
  })(), T2 = () => (() => {
    var b2 = Dm();
    return _2(b2, E2($o2, { size: 14, get class() {
      return me2("transition-colors", e.isMenuOpen ? "text-black/80" : "text-[#B3B3B3]");
    } })), Y2((w3) => {
      var h2 = e.isMenuOpen ? "Close more actions menu" : "Open more actions menu", g2 = me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", a(), c());
      return h2 !== w3.e && re2(b2, "aria-label", w3.e = h2), g2 !== w3.t && we2(b2, w3.t = g2), w3;
    }, { e: void 0, t: void 0 }), b2;
  })(), H2 = () => (() => {
    var b2 = Lm(), w3 = b2.firstChild, h2 = w3.firstChild;
    return Y2((g2) => {
      var v2 = e.enabled ? "Disable React Grab" : "Enable React Grab", I2 = !!e.enabled, K = me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none", n2() ? "my-0.5" : "mx-0.5"), Q2 = me2("relative rounded-full transition-colors", n2() ? "w-3.5 h-2.5" : "w-5 h-3", e.enabled ? "bg-black" : "bg-black/25"), X2 = me2("absolute top-0.5 rounded-full bg-white transition-transform", n2() ? "w-1.5 h-1.5" : "w-2 h-2", !e.enabled && "left-0.5", e.enabled && (n2() ? "left-1.5" : "left-2.5"));
      return v2 !== g2.e && re2(b2, "aria-label", g2.e = v2), I2 !== g2.t && re2(b2, "aria-pressed", g2.t = I2), K !== g2.a && we2(b2, g2.a = K), Q2 !== g2.o && we2(w3, g2.o = Q2), X2 !== g2.i && we2(h2, g2.i = X2), g2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0 }), b2;
  })(), $2 = () => (() => {
    var b2 = Rm();
    return Pe2(b2, "click", e.onCollapseClick, true), _2(b2, E2(bc, { size: 14, get class() {
      return me2("text-[#B3B3B3] transition-transform duration-150", d2());
    } })), Y2(() => re2(b2, "aria-label", e.isCollapsed ? "Expand toolbar" : "Collapse toolbar")), b2;
  })();
  return (() => {
    var b2 = Nm(), w3 = b2.firstChild, h2 = w3.firstChild, g2 = h2.firstChild, v2 = g2.firstChild, I2 = v2.firstChild, K = v2.nextSibling, Q2 = K.firstChild, X2 = K.nextSibling, te2 = X2.firstChild, ye2 = X2.nextSibling, ue2 = ye2.firstChild, W2 = g2.nextSibling;
    return Pe2(b2, "click", e.onPanelClick, true), Pe2(b2, "animationend", e.onAnimationEnd), Ue2((V2) => e.onExpandableButtonsRef?.(V2), g2), _2(I2, () => e.selectButton ?? f()), _2(Q2, () => e.historyButton ?? p2()), _2(te2, () => e.copyAllButton ?? y2()), _2(ue2, () => e.menuButton ?? T2()), _2(W2, () => e.toggleButton ?? H2()), _2(b2, () => e.collapseButton ?? $2(), null), _2(b2, () => e.shakeTooltip, null), Y2((V2) => {
      var S2 = me2("flex items-center justify-center rounded-[10px] antialiased relative overflow-visible [font-synthesis:none] filter-[drop-shadow(0px_1px_2px_#51515140)] [corner-shape:superellipse(1.25)]", n2() && "flex-col", gs, !e.isCollapsed && (n2() ? "px-1.5 gap-1.5 py-2" : "py-1.5 gap-1.5 px-2"), s(), e.isShaking && "animate-shake"), O2 = e.transformOrigin, U2 = me2("grid", l2(), o2(!e.isCollapsed, "pointer-events-none")), q2 = me2("flex", n2() ? "flex-col items-center min-h-0" : "items-center min-w-0"), x2 = me2("flex items-center", n2() && "flex-col"), A2 = me2("grid", l2(), o2(!!e.enabled)), j2 = me2("relative overflow-visible", i()), z2 = me2("grid", l2(), o2(!!e.enabled && !!e.isHistoryExpanded, "pointer-events-none")), ne2 = me2("relative overflow-visible", i()), G2 = me2("grid", l2(), o2(!!e.isCopyAllExpanded, "pointer-events-none")), Ee2 = me2("relative overflow-visible", i()), ve2 = me2("grid", l2(), o2(!!e.enabled && !!e.isMenuExpanded, "pointer-events-none")), L2 = me2("relative overflow-visible", i());
      return S2 !== V2.e && we2(b2, V2.e = S2), O2 !== V2.t && de2(b2, "transform-origin", V2.t = O2), U2 !== V2.a && we2(w3, V2.a = U2), q2 !== V2.o && we2(h2, V2.o = q2), x2 !== V2.i && we2(g2, V2.i = x2), A2 !== V2.n && we2(v2, V2.n = A2), j2 !== V2.s && we2(I2, V2.s = j2), z2 !== V2.h && we2(K, V2.h = z2), ne2 !== V2.r && we2(Q2, V2.r = ne2), G2 !== V2.d && we2(X2, V2.d = G2), Ee2 !== V2.l && we2(te2, V2.l = Ee2), ve2 !== V2.u && we2(ye2, V2.u = ve2), L2 !== V2.c && we2(ue2, V2.c = L2), V2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0, s: void 0, h: void 0, r: void 0, d: void 0, l: void 0, u: void 0, c: void 0 }), b2;
  })();
};
Qe2(["click"]);
var $m = N2("<div data-react-grab-ignore-events data-react-grab-toolbar>");
var Bm = N2("<button data-react-grab-ignore-events data-react-grab-toolbar-toggle>");
var Hm = N2('<span data-react-grab-unread-indicator class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#404040]">');
var Fm = N2('<button data-react-grab-ignore-events data-react-grab-toolbar-history aria-haspopup=menu><span class="inline-flex relative">');
var zm = N2('<button data-react-grab-ignore-events data-react-grab-toolbar-copy-all aria-label="Copy all history items">');
var Km = N2("<button data-react-grab-ignore-events data-react-grab-toolbar-menu aria-haspopup=menu>");
var Vm = N2("<button data-react-grab-ignore-events data-react-grab-toolbar-enabled><div><div>");
var Um = N2("<span>Click or<!>to capture");
var Gm = N2("<span>to fine-tune target");
var Wm = N2("<span>to cancel");
var jm = N2("<div>");
var Xm = N2("<div>Enable to continue");
var wc = (e) => {
  let t$1, n2, o2 = null, l2 = 0, a = 0, i = Ci(), c = (P3) => {
    if (!t$1) return null;
    let M2 = t$1.getRootNode().querySelector(P3);
    if (!M2) return null;
    let D2 = M2.getBoundingClientRect();
    return { x: D2.x - us, y: D2.y - us, width: D2.width + us * 2, height: D2.height + us * 2 };
  }, s = (...P3) => {
    let Z2 = [];
    for (let M2 of P3) {
      let D2 = c(M2);
      D2 && Z2.push(D2);
    }
    return Z2.length > 0 ? Z2 : null;
  }, d2 = no(), [f, p2] = B2(false), [y$1, T2] = B2(false), [H$1, $$1] = B2(false), [b2, w$1] = B2(false), [h2, g2] = B2(false), [v$1, I$1] = B2(d2?.edge ?? "bottom"), [K, Q2] = B2(d2?.ratio ?? Go), [X2, te2] = B2({ x: 0, y: 0 }), [ye2, ue2] = B2({ x: 0, y: 0 }), [W2, V2] = B2({ x: 0, y: 0 }), [S2, O2] = B2(false), [U2, q2] = B2(false), [x$1, A$1] = B2(false), [j2, z$1] = B2(false), [ne2, G$1] = B2(false), [Ee2, ve2] = B2(false), [L2, F$1] = B2(false), [ie2, Me2] = B2(false), [he2, ke2] = B2(false), [ge2, Ce2] = B2(false), [He2, Oe2] = B2(false), be2, [Se2, tt2] = B2(0), [ot, ft2] = B2(false), _t2 = () => (e.clockFlashTrigger ?? 0) > 0;
  pe2(Be2(() => [e.isActive, _t2()], ([P3, Z2]) => {
    if (tt2(0), ft2(false), !P3 || Z2) return;
    let M2 = setInterval(() => {
      ot() || ft2(true), tt2((D2) => (D2 + 1) % $o);
    }, Bo);
    Te2(() => clearInterval(M2));
  }, { defer: true }));
  let so2 = () => (e.toolbarActions ?? []).length > 0, Vn2 = () => {
    let P3 = e.historyItemCount ?? 0;
    return P3 > 0 ? `History (${P3})` : "History";
  }, Sn2 = () => me2("transition-colors", e.isHistoryPinned ? "text-black/80" : "text-[#B3B3B3]"), ht2 = () => v$1() === "left" || v$1() === "right", en2 = () => {
    if (!n2) return;
    let P3 = n2.getBoundingClientRect();
    ht2() ? a = P3.height : l2 = P3.width;
  }, mt2 = () => !y$1() && !e.isHistoryDropdownOpen && !e.isMenuOpen && !e.isClearPromptOpen, tn2 = () => {
    switch (v$1()) {
      case "top":
        return "bottom";
      case "bottom":
        return "top";
      case "left":
        return "right";
      case "right":
        return "left";
    }
  }, cn2 = () => Ei(ht2()), dn2 = () => Si(ht2()), st2 = () => {
    let P3 = tn2();
    return ht2() ? `top-1/2 -translate-y-1/2 ${P3 === "left" ? "right-full mr-0.5" : "left-full ml-0.5"}` : `left-1/2 -translate-x-1/2 ${P3 === "top" ? "bottom-full mb-0.5" : "top-full mt-0.5"}`;
  }, jt2 = (P3) => {
    P3.stopImmediatePropagation();
  }, Ht2 = (P3, Z2) => ({ onMouseEnter: () => {
    H$1() || (i.stop(), P3(true), Z2?.shouldFreezeInteractions !== false && !o2 && (o2 = Qi(), aa(), Ta()), Z2?.onHoverChange?.(true));
  }, onMouseLeave: (M2) => {
    P3(false), Z2?.shouldFreezeInteractions !== false && !e.isActive && !e.isContextMenuOpen && (o2?.(), o2 = null, la(), ha());
    let D2 = Z2?.safePolygonTargets?.();
    if (D2) {
      i.start({ x: M2.clientX, y: M2.clientY }, D2, () => Z2?.onHoverChange?.(false));
      return;
    }
    Z2?.onHoverChange?.(false);
  } }), un2, nn2 = () => {
    un2 !== void 0 && (clearTimeout(un2), un2 = void 0);
  };
  pe2(Be2(() => e.shakeCount, (P3) => {
    P3 && !e.enabled && (q2(true), ve2(true), nn2(), un2 = setTimeout(() => {
      ve2(false);
    }, zo), Te2(() => {
      nn2();
    }));
  })), pe2(Be2(() => e.enabled, (P3) => {
    P3 && Ee2() && (ve2(false), nn2());
  })), pe2(Be2(() => [e.isActive, e.isContextMenuOpen], ([P3, Z2]) => {
    !P3 && !Z2 && o2 && (o2(), o2 = null);
  }));
  let Sr2 = () => {
    if (!t$1) return;
    let P3 = t$1.getBoundingClientRect();
    De2 = { width: P3.width, height: P3.height };
    let Z2 = X2(), M2 = vt2(), D2 = v$1(), ee2 = Z2.x, oe2 = Z2.y;
    if (D2 === "top" || D2 === "bottom") {
      let Le2 = M2.offsetLeft + Lo, Ke2 = Math.max(Le2, M2.offsetLeft + M2.width - P3.width - Lo);
      ee2 = gt2(Z2.x, Le2, Ke2), oe2 = D2 === "top" ? M2.offsetTop + Lo : M2.offsetTop + M2.height - P3.height - Lo;
    } else {
      let Le2 = M2.offsetTop + Lo, Ke2 = Math.max(Le2, M2.offsetTop + M2.height - P3.height - Lo);
      oe2 = gt2(Z2.y, Le2, Ke2), ee2 = D2 === "left" ? M2.offsetLeft + Lo : M2.offsetLeft + M2.width - P3.width - Lo;
    }
    let ce2 = An2(D2, ee2, oe2, P3.width, P3.height);
    Q2(ce2), (ee2 !== Z2.x || oe2 !== Z2.y) && (A$1(true), D(() => {
      D(() => {
        te2({ x: ee2, y: oe2 }), bt2 && clearTimeout(bt2), bt2 = setTimeout(() => {
          A$1(false);
        }, Do);
      });
    }));
  };
  pe2(Be2(() => e.clockFlashTrigger ?? 0, () => {
    if (e.isHistoryDropdownOpen) return;
    be2 && (be2.classList.remove("animate-clock-flash"), be2.offsetHeight, be2.classList.add("animate-clock-flash")), ke2(true);
    let P3 = setTimeout(() => {
      be2?.classList.remove("animate-clock-flash"), ke2(false);
    }, 1500);
    Te2(() => {
      clearTimeout(P3), ke2(false);
    });
  }, { defer: true })), pe2(Be2(() => e.historyItemCount ?? 0, () => {
    y$1() || (zt2 && clearTimeout(zt2), zt2 = setTimeout(() => {
      en2(), Sr2();
    }, Do), Te2(() => {
      zt2 && clearTimeout(zt2);
    }));
  }, { defer: true }));
  let Ot2 = { x: 0, y: 0, time: 0 }, Dt = { x: 0, y: 0 }, De2 = { width: Vo, height: Uo }, [ao2, lo2] = B2({ width: Mo, height: Mo }), gt2 = (P3, Z2, M2) => Math.max(Z2, Math.min(P3, M2)), vt2 = () => {
    let P3 = window.visualViewport;
    return P3 ? { width: P3.width, height: P3.height, offsetLeft: P3.offsetLeft, offsetTop: P3.offsetTop } : { width: window.innerWidth, height: window.innerHeight, offsetLeft: 0, offsetTop: 0 };
  }, on2 = (P3, Z2) => {
    let M2 = vt2(), D2 = M2.width, ee2 = M2.height, { width: oe2, height: ce2 } = De2, Ne2 = t$1?.getBoundingClientRect(), Le2 = Ne2?.width ?? Mo, Ke2 = Ne2?.height ?? Mo, je2;
    if (Z2 === "top" || Z2 === "bottom") {
      let Re2 = (oe2 - Le2) / 2, Ct2 = P3.x - Re2, kt2 = gt2(Ct2, M2.offsetLeft + Lo, M2.offsetLeft + D2 - oe2 - Lo), Rt2 = Z2 === "top" ? M2.offsetTop + Lo : M2.offsetTop + ee2 - ce2 - Lo;
      je2 = { x: kt2, y: Rt2 };
    } else {
      let Re2 = (ce2 - Ke2) / 2, Ct2 = P3.y - Re2, kt2 = gt2(Ct2, M2.offsetTop + Lo, M2.offsetTop + ee2 - ce2 - Lo);
      je2 = { x: Z2 === "left" ? M2.offsetLeft + Lo : M2.offsetLeft + D2 - oe2 - Lo, y: kt2 };
    }
    let dt2 = An2(Z2, je2.x, je2.y, oe2, ce2);
    return { position: je2, ratio: dt2 };
  }, Un2 = (P3, Z2, M2, D2) => {
    let ee2 = vt2(), oe2 = ee2.width, ce2 = ee2.height, Ne2 = ee2.offsetLeft + Lo, Le2 = Math.max(Ne2, ee2.offsetLeft + oe2 - M2 - Lo), Ke2 = ee2.offsetTop + Lo, je2 = Math.max(Ke2, ee2.offsetTop + ce2 - D2 - Lo);
    if (P3 === "top" || P3 === "bottom") {
      let kt2 = Math.max(0, oe2 - M2 - Lo * 2);
      return { x: Math.min(Le2, Math.max(Ne2, ee2.offsetLeft + Lo + kt2 * Z2)), y: P3 === "top" ? Ke2 : je2 };
    }
    let dt2 = Math.max(0, ce2 - D2 - Lo * 2), Re2 = Math.min(je2, Math.max(Ke2, ee2.offsetTop + Lo + dt2 * Z2));
    return { x: P3 === "left" ? Ne2 : Le2, y: Re2 };
  }, An2 = (P3, Z2, M2, D2, ee2) => {
    let oe2 = vt2(), ce2 = oe2.width, Ne2 = oe2.height;
    if (P3 === "top" || P3 === "bottom") {
      let Ke2 = ce2 - D2 - Lo * 2;
      return Ke2 <= 0 ? Go : Math.max(0, Math.min(1, (Z2 - oe2.offsetLeft - Lo) / Ke2));
    }
    let Le2 = Ne2 - ee2 - Lo * 2;
    return Le2 <= 0 ? Go : Math.max(0, Math.min(1, (M2 - oe2.offsetTop - Lo) / Le2));
  }, Ar2 = () => {
    let P3 = Un2(v$1(), K(), De2.width, De2.height);
    te2(P3);
  }, Gn2 = false, rn2 = (P3) => (Z2) => {
    if (Z2.stopImmediatePropagation(), Gn2) {
      Gn2 = false;
      return;
    }
    P3();
  }, Tr2 = rn2(() => e.onToggle?.()), co2 = rn2(() => e.onToggleHistory?.()), kr2 = rn2(() => e.onCopyAll?.()), Tn2 = rn2(() => e.onToggleMenu?.()), Pr2 = rn2(() => {
    let P3 = t$1?.getBoundingClientRect(), Z2 = y$1(), M2 = K();
    if (Z2) {
      let { position: D2, ratio: ee2 } = on2(Wn2(), v$1());
      M2 = ee2, te2(D2), Q2(M2);
    } else P3 && (De2 = { width: P3.width, height: P3.height });
    A$1(true), T2((D2) => !D2), Kt2({ edge: v$1(), ratio: M2, collapsed: !Z2, enabled: e.enabled ?? true }), bt2 && clearTimeout(bt2), bt2 = setTimeout(() => {
      if (A$1(false), y$1()) {
        let D2 = t$1?.getBoundingClientRect();
        D2 && lo2({ width: D2.width, height: D2.height });
      }
    }, Do);
  }), Fi = rn2(() => {
    let P3 = !!e.enabled, Z2 = v$1(), M2 = X2(), D2 = Z2 === "left" || Z2 === "right", ee2 = () => D2 ? a : l2;
    P3 && n2 && !L2() && en2();
    let oe2 = ee2(), ce2 = oe2 > 0, Ne2 = 0;
    if (n2) {
      let Le2 = n2.getBoundingClientRect();
      Ne2 = D2 ? Le2.height : Le2.width;
    }
    if (!P3 && oe2 === 0 && n2) {
      let Le2 = (e.historyItemCount ?? 0) > 0, Ke2 = so2(), je2 = Array.from(n2.children).filter((Re2) => Re2 instanceof HTMLElement ? Re2.querySelector("[data-react-grab-toolbar-history]") ? Le2 : Re2.querySelector("[data-react-grab-toolbar-copy-all]") ? !!e.isHistoryDropdownOpen : Re2.querySelector("[data-react-grab-toolbar-menu]") ? Ke2 : true : false), dt2 = D2 ? "gridTemplateRows" : "gridTemplateColumns";
      for (let Re2 of je2) Re2.style.transition = "none", Re2.style[dt2] = "1fr";
      n2.offsetWidth, en2(), oe2 = ee2();
      for (let Re2 of je2) Re2.style[dt2] = "";
      n2.offsetWidth;
      for (let Re2 of je2) Re2.style.transition = "";
      ce2 = oe2 > 0;
    }
    if (ce2 && (Me2(L2()), F$1(true)), e.onToggleEnabled?.(), ce2) {
      let Le2 = P3 ? -oe2 : oe2;
      D2 ? De2 = { width: De2.width, height: De2.height + Le2 } : De2 = { width: De2.width + Le2, height: De2.height };
      let Ke2 = D2 ? M2.y + Ne2 : M2.x + Ne2, je2 = (dt2) => {
        let Re2 = vt2(), Ct2 = Ke2 - dt2;
        if (D2) {
          let Or2 = Re2.offsetTop + Lo, Ki = Re2.offsetTop + Re2.height - De2.height - Lo;
          return { x: M2.x, y: gt2(Ct2, Or2, Ki) };
        }
        let kt2 = Re2.offsetLeft + Lo, Rt2 = Re2.offsetLeft + Re2.width - De2.width - Lo;
        return { x: gt2(Ct2, kt2, Rt2), y: M2.y };
      };
      if (Lt2 !== void 0 && q(Lt2), ie2()) te2(je2(P3 ? 0 : oe2)), Lt2 = void 0;
      else {
        let dt2 = performance.now(), Re2 = () => {
          if (performance.now() - dt2 > Do + Ho) {
            Lt2 = void 0;
            return;
          }
          if (n2) {
            let kt2 = D2 ? n2.getBoundingClientRect().height : n2.getBoundingClientRect().width;
            te2(je2(kt2));
          }
          Lt2 = D(Re2);
        };
        Lt2 = D(Re2);
      }
      clearTimeout(Pn2), Pn2 = setTimeout(() => {
        Lt2 !== void 0 && (q(Lt2), Lt2 = void 0), te2(je2(P3 ? 0 : oe2)), F$1(false), Me2(false);
        let Re2 = An2(Z2, X2().x, X2().y, De2.width, De2.height);
        Q2(Re2), Kt2({ edge: Z2, ratio: Re2, collapsed: y$1(), enabled: !P3 });
      }, Do);
    } else Kt2({ edge: Z2, ratio: K(), collapsed: y$1(), enabled: !P3 });
  }), uo2 = (P3, Z2, M2, D2, ee2, oe2) => {
    let ce2 = vt2(), Ne2 = ce2.width, Le2 = ce2.height, Ke2 = P3 + ee2 * Po, je2 = Z2 + oe2 * Po, dt2 = je2 - ce2.offsetTop + D2 / 2, Re2 = ce2.offsetTop + Le2 - je2 - D2 / 2, Ct2 = Ke2 - ce2.offsetLeft + M2 / 2, kt2 = ce2.offsetLeft + Ne2 - Ke2 - M2 / 2, Rt2 = Math.min(dt2, Re2, Ct2, kt2);
    return Rt2 === dt2 ? { edge: "top", x: Math.max(ce2.offsetLeft + Lo, Math.min(Ke2, ce2.offsetLeft + Ne2 - M2 - Lo)), y: ce2.offsetTop + Lo } : Rt2 === Ct2 ? { edge: "left", x: ce2.offsetLeft + Lo, y: Math.max(ce2.offsetTop + Lo, Math.min(je2, ce2.offsetTop + Le2 - D2 - Lo)) } : Rt2 === kt2 ? { edge: "right", x: ce2.offsetLeft + Ne2 - M2 - Lo, y: Math.max(ce2.offsetTop + Lo, Math.min(je2, ce2.offsetTop + Le2 - D2 - Lo)) } : { edge: "bottom", x: Math.max(ce2.offsetLeft + Lo, Math.min(Ke2, ce2.offsetLeft + Ne2 - M2 - Lo)), y: ce2.offsetTop + Le2 - D2 - Lo };
  }, kn2 = (P3) => {
    if (!H$1() || (Math.sqrt(Math.pow(P3.clientX - Dt.x, 2) + Math.pow(P3.clientY - Dt.y, 2)) > wo && (O2(true), o2 && (o2(), o2 = null, la(), ha())), !S2())) return;
    let M2 = performance.now(), D2 = M2 - Ot2.time;
    if (D2 > 0) {
      let ce2 = (P3.clientX - Ot2.x) / D2, Ne2 = (P3.clientY - Ot2.y) / D2;
      V2({ x: ce2, y: Ne2 });
    }
    Ot2 = { x: P3.clientX, y: P3.clientY, time: M2 };
    let ee2 = P3.clientX - ye2().x, oe2 = P3.clientY - ye2().y;
    te2({ x: ee2, y: oe2 });
  }, Ft2 = () => {
    if (!H$1()) return;
    window.removeEventListener("pointermove", kn2), window.removeEventListener("pointerup", Ft2);
    let P3 = S2();
    if ($$1(false), !P3) return;
    Gn2 = true;
    let Z2 = t$1?.getBoundingClientRect();
    if (!Z2) return;
    let M2 = W2(), D2 = uo2(X2().x, X2().y, Z2.width, Z2.height, M2.x, M2.y), ee2 = An2(D2.edge, D2.x, D2.y, Z2.width, Z2.height);
    I$1(D2.edge), Q2(ee2), w$1(true), D(() => {
      let oe2 = t$1?.getBoundingClientRect();
      oe2 && (De2 = { width: oe2.width, height: oe2.height }), D(() => {
        let ce2 = Un2(D2.edge, ee2, De2.width, De2.height);
        te2(ce2), Kt2({ edge: D2.edge, ratio: ee2, collapsed: y$1(), enabled: e.enabled ?? true }), Mr2 = setTimeout(() => {
          w$1(false), e.enabled && en2();
        }, Io);
      });
    });
  }, Tt2 = (P3) => {
    if (y$1()) return;
    let Z2 = t$1?.getBoundingClientRect();
    Z2 && (Dt = { x: P3.clientX, y: P3.clientY }, ue2({ x: P3.clientX - Z2.left, y: P3.clientY - Z2.top }), $$1(true), O2(false), V2({ x: 0, y: 0 }), Ot2 = { x: P3.clientX, y: P3.clientY, time: performance.now() }, window.addEventListener("pointermove", kn2), window.addEventListener("pointerup", Ft2));
  }, fo2 = () => {
    let P3 = v$1(), Z2 = X2(), { width: M2, height: D2 } = De2, { width: ee2, height: oe2 } = ao2(), ce2 = vt2();
    switch (P3) {
      case "top":
      case "bottom": {
        let Ne2 = (M2 - ee2) / 2, Le2 = Z2.x + Ne2;
        return { x: gt2(Le2, ce2.offsetLeft, ce2.offsetLeft + ce2.width - ee2), y: P3 === "top" ? ce2.offsetTop : ce2.offsetTop + ce2.height - oe2 };
      }
      case "left":
      case "right": {
        let Ne2 = (D2 - oe2) / 2, Le2 = Z2.y + Ne2, Ke2 = gt2(Le2, ce2.offsetTop, ce2.offsetTop + ce2.height - oe2);
        return { x: P3 === "left" ? ce2.offsetLeft : ce2.offsetLeft + ce2.width - ee2, y: Ke2 };
      }
      default:
        return Z2;
    }
  }, fn2, bt2, Mr2, Pn2, Lt2, zt2, mn2 = () => {
    H$1() || (g2(true), Ar2(), fn2 && clearTimeout(fn2), fn2 = setTimeout(() => {
      g2(false);
      let P3 = An2(v$1(), X2().x, X2().y, De2.width, De2.height);
      Q2(P3), Kt2({ edge: v$1(), ratio: P3, collapsed: y$1(), enabled: e.enabled ?? true });
    }, xo));
  }, Kt2 = (P3) => {
    yr2(P3), e.onStateChange?.(P3);
  };
  lt2(() => {
    t$1 && e.onContainerRef?.(t$1);
    let P3 = t$1?.getBoundingClientRect(), Z2 = vt2();
    if (d2) {
      if (P3 && (De2 = { width: P3.width, height: P3.height }), d2.collapsed) {
        let ee2 = d2.edge === "top" || d2.edge === "bottom";
        lo2({ width: ee2 ? ko : Mo, height: ee2 ? Mo : ko });
      }
      T2(d2.collapsed);
      let D2 = Un2(d2.edge, d2.ratio, De2.width, De2.height);
      te2(D2);
    } else if (P3) De2 = { width: P3.width, height: P3.height }, te2({ x: Z2.offsetLeft + (Z2.width - P3.width) / 2, y: Z2.offsetTop + Z2.height - P3.height - Lo }), Q2(Go);
    else {
      let D2 = Un2("bottom", Go, De2.width, De2.height);
      te2(D2);
    }
    if (e.enabled && en2(), e.onSubscribeToStateChanges) {
      let D2 = e.onSubscribeToStateChanges((ee2) => {
        if (x$1() || L2() || !t$1?.getBoundingClientRect()) return;
        let ce2 = y$1() !== ee2.collapsed;
        if (I$1(ee2.edge), ce2 && !ee2.collapsed) {
          let Ne2 = Wn2();
          A$1(true), T2(ee2.collapsed);
          let { position: Le2, ratio: Ke2 } = on2(Ne2, ee2.edge);
          te2(Le2), Q2(Ke2), clearTimeout(bt2), bt2 = setTimeout(() => {
            A$1(false);
          }, Do);
        } else {
          ce2 && (A$1(true), clearTimeout(bt2), bt2 = setTimeout(() => {
            A$1(false);
          }, Do)), T2(ee2.collapsed);
          let Ne2 = Un2(ee2.edge, ee2.ratio, De2.width, De2.height);
          te2(Ne2), Q2(ee2.ratio);
        }
      });
      Te2(D2);
    }
    window.addEventListener("resize", mn2), window.visualViewport?.addEventListener("resize", mn2), window.visualViewport?.addEventListener("scroll", mn2);
    let M2 = setTimeout(() => {
      p2(true);
    }, xo);
    Te2(() => {
      clearTimeout(M2);
    });
  }), Te2(() => {
    window.removeEventListener("resize", mn2), window.visualViewport?.removeEventListener("resize", mn2), window.visualViewport?.removeEventListener("scroll", mn2), window.removeEventListener("pointermove", kn2), window.removeEventListener("pointerup", Ft2), clearTimeout(fn2), clearTimeout(bt2), nn2(), clearTimeout(Mr2), clearTimeout(Pn2), clearTimeout(zt2), Lt2 !== void 0 && q(Lt2), o2?.(), i.stop();
  });
  let Wn2 = () => y$1() ? fo2() : X2(), zi2 = () => y$1() ? "cursor-pointer" : H$1() ? "cursor-grabbing" : "cursor-grab", Ir2 = () => h2() ? "" : b2() ? "transition-[transform,opacity] duration-300 ease-out" : x$1() ? "transition-[transform,opacity] duration-150 ease-out" : L2() ? "transition-opacity duration-150 ease-out" : "transition-opacity duration-300 ease-out", _r2 = () => {
    switch (v$1()) {
      case "top":
        return "center top";
      case "bottom":
        return "center bottom";
      case "left":
        return "left center";
      case "right":
        return "right center";
      default:
        return "center center";
    }
  };
  return (() => {
    var P3 = $m();
    P3.addEventListener("mouseleave", () => e.onSelectHoverChange?.(false)), P3.addEventListener("mouseenter", () => !y$1() && e.onSelectHoverChange?.(true)), Pe2(P3, "mousedown", jt2), Pe2(P3, "pointerdown", (M2) => {
      jt2(M2), Tt2(M2);
    });
    var Z2 = t$1;
    return typeof Z2 == "function" ? Ue2(Z2, P3) : t$1 = P3, _2(P3, E2(yc, { get isActive() {
      return e.isActive;
    }, get enabled() {
      return e.enabled;
    }, get isCollapsed() {
      return y$1();
    }, get snapEdge() {
      return v$1();
    }, get isShaking() {
      return U2();
    }, get isHistoryExpanded() {
      return (e.historyItemCount ?? 0) > 0;
    }, get isCopyAllExpanded() {
      return !!e.isHistoryDropdownOpen;
    }, get isMenuExpanded() {
      return so2();
    }, get isMenuOpen() {
      return e.isMenuOpen;
    }, get isHistoryPinned() {
      return e.isHistoryPinned;
    }, get disableGridTransitions() {
      return ie2();
    }, get transformOrigin() {
      return _r2();
    }, onAnimationEnd: () => q2(false), onCollapseClick: Pr2, onExpandableButtonsRef: (M2) => {
      n2 = M2;
    }, onPanelClick: (M2) => {
      if (y$1()) {
        M2.stopPropagation();
        let { position: D2, ratio: ee2 } = on2(Wn2(), v$1());
        te2(D2), Q2(ee2), A$1(true), T2(false), Kt2({ edge: v$1(), ratio: ee2, collapsed: false, enabled: e.enabled ?? true }), bt2 && clearTimeout(bt2), bt2 = setTimeout(() => {
          A$1(false);
        }, Do);
      }
    }, get selectButton() {
      return [(() => {
        var M2 = Bm();
        return M2.$$click = (D2) => {
          z$1(false), Tr2(D2);
        }, ar2(M2, To2({ get "aria-label"() {
          return e.isActive ? "Stop selecting element" : "Select element";
        }, get "aria-pressed"() {
          return !!e.isActive;
        }, get class() {
          return me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", cn2(), dn2());
        } }, () => Ht2(z$1)), false), _2(M2, E2(xi, { size: 14, get class() {
          return me2("transition-colors", e.isActive ? "text-black" : "text-black/70");
        } })), M2;
      })(), E2(En2, { get visible() {
        return Fe2(() => !!j2())() && mt2();
      }, get position() {
        return tn2();
      }, get children() {
        return ["Select element ", E2(Ho2, { get children() {
          return Hn2("C");
        } })];
      } })];
    }, get historyButton() {
      return [(() => {
        var M2 = Fm(), D2 = M2.firstChild;
        M2.$$click = (oe2) => {
          ke2(false), co2(oe2);
        }, ar2(M2, To2({ get "aria-label"() {
          return `Open history${(e.historyItemCount ?? 0) > 0 ? ` (${e.historyItemCount ?? 0} items)` : ""}`;
        }, get "aria-expanded"() {
          return !!e.isHistoryDropdownOpen;
        }, get class() {
          return me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", cn2(), dn2());
        } }, () => Ht2((oe2) => {
          oe2 && e.isHistoryDropdownOpen || ke2(oe2);
        }, { onHoverChange: (oe2) => e.onHistoryButtonHover?.(oe2), shouldFreezeInteractions: false, safePolygonTargets: () => e.isHistoryDropdownOpen ? s("[data-react-grab-history-dropdown]", "[data-react-grab-toolbar-copy-all]") : null })), false);
        var ee2 = be2;
        return typeof ee2 == "function" ? Ue2(ee2, D2) : be2 = D2, _2(D2, E2(vi, { size: 14, get class() {
          return Sn2();
        } }), null), _2(D2, E2(fe2, { get when() {
          return e.hasUnreadHistoryItems;
        }, get children() {
          return Hm();
        } }), null), M2;
      })(), E2(En2, { get visible() {
        return Fe2(() => !!he2())() && mt2();
      }, get position() {
        return tn2();
      }, get children() {
        return Vn2();
      } })];
    }, get copyAllButton() {
      return [(() => {
        var M2 = zm();
        return M2.$$click = (D2) => {
          Oe2(false), kr2(D2);
        }, ar2(M2, To2({ get class() {
          return me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", cn2(), dn2());
        } }, () => Ht2(Oe2, { onHoverChange: (D2) => e.onCopyAllHover?.(D2), shouldFreezeInteractions: false, safePolygonTargets: () => e.isHistoryDropdownOpen ? s("[data-react-grab-history-dropdown]", "[data-react-grab-toolbar-history]") : null })), false), _2(M2, E2(oo, { size: 14, class: "text-[#B3B3B3] transition-colors" })), M2;
      })(), E2(En2, { get visible() {
        return Fe2(() => !!He2())() && mt2();
      }, get position() {
        return tn2();
      }, children: "Copy all" })];
    }, get menuButton() {
      return [(() => {
        var M2 = Km();
        return M2.$$click = (D2) => {
          Ce2(false), Tn2(D2);
        }, ar2(M2, To2({ get "aria-label"() {
          return e.isMenuOpen ? "Close more actions menu" : "Open more actions menu";
        }, get "aria-expanded"() {
          return !!e.isMenuOpen;
        }, get class() {
          return me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale touch-hitbox", cn2(), dn2());
        } }, () => Ht2((D2) => {
          D2 && e.isMenuOpen || Ce2(D2);
        }, { shouldFreezeInteractions: false })), false), _2(M2, E2($o2, { size: 14, get class() {
          return me2("transition-colors", e.isMenuOpen ? "text-black/80" : "text-[#B3B3B3]");
        } })), M2;
      })(), E2(En2, { get visible() {
        return Fe2(() => !!ge2())() && mt2();
      }, get position() {
        return tn2();
      }, children: "More actions" })];
    }, get toggleButton() {
      return [(() => {
        var M2 = Vm(), D2 = M2.firstChild, ee2 = D2.firstChild;
        return M2.addEventListener("mouseleave", () => G$1(false)), M2.addEventListener("mouseenter", () => G$1(true)), M2.$$click = (oe2) => {
          G$1(false), Fi(oe2);
        }, Y2((oe2) => {
          var ce2 = e.enabled ? "Disable React Grab" : "Enable React Grab", Ne2 = !!e.enabled, Le2 = me2("contain-layout flex items-center justify-center cursor-pointer interactive-scale outline-none", ht2() ? "my-0.5" : "mx-0.5"), Ke2 = me2("relative rounded-full transition-colors", ht2() ? "w-3.5 h-2.5" : "w-5 h-3", e.enabled ? "bg-black" : "bg-black/25"), je2 = me2("absolute top-0.5 rounded-full bg-white transition-transform", ht2() ? "w-1.5 h-1.5" : "w-2 h-2", !e.enabled && "left-0.5", e.enabled && (ht2() ? "left-1.5" : "left-2.5"));
          return ce2 !== oe2.e && re2(M2, "aria-label", oe2.e = ce2), Ne2 !== oe2.t && re2(M2, "aria-pressed", oe2.t = Ne2), Le2 !== oe2.a && we2(M2, oe2.a = Le2), Ke2 !== oe2.o && we2(D2, oe2.o = Ke2), je2 !== oe2.i && we2(ee2, oe2.i = je2), oe2;
        }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0 }), M2;
      })(), E2(En2, { get visible() {
        return Fe2(() => !!ne2())() && mt2();
      }, get position() {
        return tn2();
      }, get children() {
        return e.enabled ? "Disable" : "Enable";
      } })];
    }, get shakeTooltip() {
      return [E2(fe2, { get when() {
        return Fe2(() => !!e.isActive)() && !_t2();
      }, get children() {
        var M2 = jm();
        return _2(M2, E2(fe2, { get when() {
          return Se2() === 0;
        }, get children() {
          var D2 = Um(), ee2 = D2.firstChild, oe2 = ee2.nextSibling;
          oe2.nextSibling;
          return _2(D2, E2(Ho2, { children: "↵" }), oe2), Y2(() => we2(D2, me2("flex items-center gap-1", ot() && jo))), D2;
        } }), null), _2(M2, E2(fe2, { get when() {
          return Se2() === 1;
        }, get children() {
          var D2 = Gm(), ee2 = D2.firstChild;
          return _2(D2, E2(Ho2, { children: "↑" }), ee2), _2(D2, E2(Ho2, { children: "↓" }), ee2), Y2(() => we2(D2, me2("flex items-center gap-1", jo))), D2;
        } }), null), _2(M2, E2(fe2, { get when() {
          return Se2() === 2;
        }, get children() {
          var D2 = Wm(), ee2 = D2.firstChild;
          return _2(D2, E2(Ho2, { children: "esc" }), ee2), Y2(() => we2(D2, me2("flex items-center gap-1", jo))), D2;
        } }), null), Y2((D2) => {
          var ee2 = me2("absolute whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [animation-fill-mode:backwards] overflow-hidden [corner-shape:superellipse(1.25)]", gs, st2()), oe2 = String(2147483647);
          return ee2 !== D2.e && we2(M2, D2.e = ee2), oe2 !== D2.t && de2(M2, "z-index", D2.t = oe2), D2;
        }, { e: void 0, t: void 0 }), M2;
      } }), E2(fe2, { get when() {
        return Ee2();
      }, get children() {
        var M2 = Xm();
        return Y2((D2) => {
          var ee2 = me2("absolute whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none animate-tooltip-fade-in [corner-shape:superellipse(1.25)]", gs, st2()), oe2 = String(2147483647);
          return ee2 !== D2.e && we2(M2, D2.e = ee2), oe2 !== D2.t && de2(M2, "z-index", D2.t = oe2), D2;
        }, { e: void 0, t: void 0 }), M2;
      } })];
    } })), Y2((M2) => {
      var D2 = me2("fixed left-0 top-0 font-sans text-[13px] antialiased select-none", zi2(), Ir2(), f() ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"), ee2 = String(2147483647), oe2 = `translate(${Wn2().x}px, ${Wn2().y}px)`, ce2 = _r2();
      return D2 !== M2.e && we2(P3, M2.e = D2), ee2 !== M2.t && de2(P3, "z-index", M2.t = ee2), oe2 !== M2.a && de2(P3, "transform", M2.a = oe2), ce2 !== M2.o && de2(P3, "transform-origin", M2.o = ce2), M2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0 }), P3;
  })();
};
Qe2(["click"]);
var Rs = (e, t, n2, o2) => Math.max(o2, Math.min(e, n2 - t - o2));
var Fo2 = ({ anchor: e, measuredWidth: t, measuredHeight: n2, viewportWidth: o2, viewportHeight: l2, anchorGapPx: a, viewportPaddingPx: i, offscreenPosition: c }) => {
  if (!e || t === 0 || n2 === 0) return c;
  let s, d2;
  return e.edge === "left" || e.edge === "right" ? (s = e.edge === "left" ? e.x + a : e.x - t - a, d2 = e.y - n2 / 2) : (s = e.x - t / 2, d2 = e.edge === "top" ? e.y + a : e.y - n2 - a), { left: Rs(s, t, o2, i), top: Rs(d2, n2, l2, i) };
};
var At2 = (e, t) => {
  try {
    return e.composedPath().some((n2) => n2 instanceof HTMLElement && n2.hasAttribute(t));
  } catch {
    return false;
  }
};
var wr2 = (e, t) => typeof e.enabled == "function" ? t ? e.enabled(t) : false : e.enabled ?? true;
var xr2 = (e) => typeof e.enabled == "function" ? e.enabled() : e.enabled ?? true;
var ct2 = (e) => {
  e.type === "contextmenu" && e.preventDefault(), e.stopImmediatePropagation();
};
var Ym = N2('<div data-react-grab-ignore-events data-react-grab-toolbar-menu class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"style=z-index:2147483647><div><div class="relative flex flex-col py-1"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">');
var qm = N2("<div><div>");
var Zm = N2('<button data-react-grab-ignore-events class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default"><span class="text-[13px] leading-4 font-sans font-medium text-black">');
var Jm = N2('<span class="text-[11px] font-sans text-black/50 ml-4">');
var xc = (e) => {
  let t, { containerRef: n2, highlightRef: o2, updateHighlight: l2, clearHighlight: a } = Fn2(), [i, c] = B2(0), [s, d2] = B2(0), [f, p2] = B2(false), [y2, T2] = B2(false), [H2, $2] = B2("bottom"), [b2, w3] = B2(0), h2, g2, v2 = () => {
    clearTimeout(h2), g2 !== void 0 && (q(g2), g2 = void 0);
  }, I2 = () => {
    t && (c(t.offsetWidth), d2(t.offsetHeight));
  };
  pe2(() => {
    let X$1 = e.position;
    X$1 ? ($2(X$1.edge), clearTimeout(h2), p2(true), g2 !== void 0 && q(g2), g2 = D(() => {
      I2(), t?.offsetHeight, T2(true);
    })) : (g2 !== void 0 && q(g2), T2(false), h2 = setTimeout(() => {
      p2(false);
    }, is)), Te2(() => {
      v2();
    });
  });
  let K = se2((X2) => {
    let te2 = Fo2({ anchor: e.position, measuredWidth: i(), measuredHeight: s(), viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, anchorGapPx: cs, viewportPaddingPx: ls, offscreenPosition: Es });
    return te2.left !== Es.left ? te2 : X2;
  }, Es), Q2 = (X2, te2) => {
    te2.stopPropagation(), xr2(X2) && (X2.onAction(), X2.isActive !== void 0 ? w3((ye2) => ye2 + 1) : e.onDismiss());
  };
  return lt2(() => {
    I2();
    let X2 = (ue2) => {
      !e.position || At2(ue2, "data-react-grab-ignore-events") || e.onDismiss();
    }, te2 = (ue2) => {
      e.position && ue2.code === "Escape" && (ue2.preventDefault(), ue2.stopPropagation(), e.onDismiss());
    }, ye2 = D(() => {
      window.addEventListener("mousedown", X2, { capture: true }), window.addEventListener("touchstart", X2, { capture: true });
    });
    window.addEventListener("keydown", te2, { capture: true }), Te2(() => {
      q(ye2), v2(), window.removeEventListener("mousedown", X2, { capture: true }), window.removeEventListener("touchstart", X2, { capture: true }), window.removeEventListener("keydown", te2, { capture: true });
    });
  }), E2(fe2, { get when() {
    return f();
  }, get children() {
    var X2 = Ym(), te2 = X2.firstChild, ye2 = te2.firstChild, ue2 = ye2.firstChild;
    Pe2(X2, "contextmenu", ct2, true), Pe2(X2, "click", ct2, true), Pe2(X2, "mousedown", ct2, true), Pe2(X2, "pointerdown", ct2, true);
    var W2 = t;
    return typeof W2 == "function" ? Ue2(W2, X2) : t = X2, de2(te2, "min-width", `${ds}px`), Ue2(n2, ye2), Ue2(o2, ue2), _2(ye2, E2(Qt2, { get each() {
      return e.actions;
    }, children: (V2) => {
      let S2 = () => xr2(V2), O2 = () => V2.isActive !== void 0, U2 = () => (b2(), !!V2.isActive?.());
      return (() => {
        var q2 = Zm(), x2 = q2.firstChild;
        return q2.$$click = (A2) => Q2(V2, A2), Pe2(q2, "pointerleave", a), q2.addEventListener("pointerenter", (A2) => {
          S2() && l2(A2.currentTarget);
        }), q2.$$pointerdown = (A2) => A2.stopPropagation(), _2(x2, () => V2.label), _2(q2, E2(fe2, { get when() {
          return Fe2(() => !O2())() && V2.shortcut;
        }, children: (A2) => (() => {
          var j2 = Jm();
          return _2(j2, () => Hn2(A2())), j2;
        })() }), null), _2(q2, E2(fe2, { get when() {
          return O2();
        }, get children() {
          var A2 = qm(), j2 = A2.firstChild;
          return Y2((z2) => {
            var ne2 = me2("relative rounded-full transition-colors ml-4 shrink-0 w-5 h-3", U2() ? "bg-black" : "bg-black/25"), G2 = me2("absolute top-0.5 rounded-full bg-white transition-transform w-2 h-2", U2() ? "left-2.5" : "left-0.5");
            return ne2 !== z2.e && we2(A2, z2.e = ne2), G2 !== z2.t && we2(j2, z2.t = G2), z2;
          }, { e: void 0, t: void 0 }), A2;
        } }), null), Y2((A2) => {
          var j2 = V2.id, z2 = !S2();
          return j2 !== A2.e && re2(q2, "data-react-grab-menu-item", A2.e = j2), z2 !== A2.t && (q2.disabled = A2.t = z2), A2;
        }, { e: void 0, t: void 0 }), q2;
      })();
    } }), null), Y2((V2) => {
      var S2 = `${K().top}px`, O2 = `${K().left}px`, U2 = y2() ? "auto" : "none", q2 = _s[H2()], x2 = y2() ? "1" : "0", A2 = y2() ? "scale(1)" : "scale(0.95)", j2 = me2("contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]", gs);
      return S2 !== V2.e && de2(X2, "top", V2.e = S2), O2 !== V2.t && de2(X2, "left", V2.t = O2), U2 !== V2.a && de2(X2, "pointer-events", V2.a = U2), q2 !== V2.o && de2(X2, "transform-origin", V2.o = q2), x2 !== V2.i && de2(X2, "opacity", V2.i = x2), A2 !== V2.n && de2(X2, "transform", V2.n = A2), j2 !== V2.s && we2(te2, V2.s = j2), V2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0, s: void 0 }), X2;
  } });
};
Qe2(["pointerdown", "mousedown", "click", "contextmenu"]);
var Qm = N2('<div class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">');
var eg = N2('<div data-react-grab-ignore-events data-react-grab-context-menu class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none"style=z-index:2147483647;pointer-events:auto><div><div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2">');
var tg = N2('<button data-react-grab-ignore-events class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default"><span class="text-[13px] leading-4 font-sans font-medium text-black">');
var ng = N2('<span class="text-[11px] font-sans text-black/50 ml-4">');
var vc = (e) => {
  let t, { containerRef: n$1, highlightRef: o2, updateHighlight: l2, clearHighlight: a } = Fn2(), [i$1, c] = B2(0), [s, d2] = B2(0), f = () => e.position !== null, p2 = se2(() => fi({ tagName: e.tagName, componentName: e.componentName })), y2 = () => {
    if (t) {
      let b2 = t.getBoundingClientRect();
      c(b2.width), d2(b2.height);
    }
  };
  pe2(() => {
    f() && D(y2);
  });
  let T2 = se2(() => {
    let b2 = e.selectionBounds, w3 = e.position, h2 = i$1(), g2 = s();
    if (h2 === 0 || g2 === 0 || !b2 || !w3) return { left: -9999, top: -9999, arrowLeft: 0, arrowPosition: "bottom" };
    let v2 = w3.x ?? b2.x + b2.width / 2, I2 = Math.max(No, Math.min(v2 - h2 / 2, window.innerWidth - h2 - No)), K = Math.max(To, Math.min(v2 - I2, h2 - To)), Q2 = b2.y + b2.height + To + No, X2 = b2.y - g2 - To - No, te2 = Q2 + g2 > window.innerHeight, ye2 = X2 >= 0, ue2 = te2 && ye2, W2 = ue2 ? X2 : Q2, V2 = ue2 ? "top" : "bottom";
    if (te2 && !ye2) {
      let S2 = w3.y ?? b2.y + b2.height / 2;
      W2 = Math.max(No, Math.min(S2 + No, window.innerHeight - g2 - No)), V2 = "top";
    }
    return { left: I2, top: W2, arrowLeft: K, arrowPosition: V2 };
  }), H2 = se2(() => {
    let b2 = e.actions ?? [], w3 = e.actionContext;
    return b2.map((h2) => ({ label: h2.label, action: () => {
      w3 && h2.onAction(w3);
    }, enabled: wr2(h2, w3), shortcut: h2.shortcut }));
  }), $2 = (b2, w3) => {
    w3.stopPropagation(), b2.enabled && (b2.action(), e.onHide());
  };
  return lt2(() => {
    y2();
    let b2 = (g2) => {
      !f() || At2(g2, "data-react-grab-ignore-events") || g2 instanceof MouseEvent && g2.button === 2 || e.onDismiss();
    }, w3 = (g2) => {
      if (!f()) return;
      let v2 = g2.code === "Escape", I2 = g2.key === "Enter", K = g2.metaKey || g2.ctrlKey, Q2 = g2.key.toLowerCase(), X2 = e.actions ?? [], te2 = e.actionContext, ye2 = (W2) => !te2 || !wr2(W2, te2) ? false : (g2.preventDefault(), g2.stopPropagation(), W2.onAction(te2), e.onHide(), true);
      if (v2) {
        g2.preventDefault(), g2.stopPropagation(), e.onDismiss();
        return;
      }
      if (I2) {
        let W2 = X2.find((V2) => V2.shortcut === "Enter");
        W2 && ye2(W2);
        return;
      }
      if (!K || g2.repeat) return;
      let ue2 = X2.find((W2) => W2.shortcut && W2.shortcut !== "Enter" && Q2 === W2.shortcut.toLowerCase());
      ue2 && ye2(ue2);
    }, h2 = D(() => {
      window.addEventListener("mousedown", b2, { capture: true }), window.addEventListener("touchstart", b2, { capture: true });
    });
    window.addEventListener("keydown", w3, { capture: true }), Te2(() => {
      q(h2), window.removeEventListener("mousedown", b2, { capture: true }), window.removeEventListener("touchstart", b2, { capture: true }), window.removeEventListener("keydown", w3, { capture: true });
    });
  }), E2(fe2, { get when() {
    return f();
  }, get children() {
    var b2 = eg(), w3 = b2.firstChild, h2 = w3.firstChild;
    Pe2(b2, "contextmenu", ct2, true), Pe2(b2, "click", ct2, true), Pe2(b2, "mousedown", ct2, true), Pe2(b2, "pointerdown", ct2, true);
    var g2 = t;
    return typeof g2 == "function" ? Ue2(g2, b2) : t = b2, _2(b2, E2(pi, { get position() {
      return T2().arrowPosition;
    }, leftPercent: 0, get leftOffsetPx() {
      return T2().arrowLeft;
    } }), w3), _2(h2, E2(pr2, { get tagName() {
      return p2().tagName;
    }, get componentName() {
      return p2().componentName;
    }, get isClickable() {
      return e.hasFilePath;
    }, onClick: (v2) => {
      v2.stopPropagation(), e.hasFilePath && e.actionContext && e.actions?.find((K) => K.id === "open")?.onAction(e.actionContext);
    }, shrink: true, get forceShowIcon() {
      return e.hasFilePath;
    } })), _2(w3, E2(It2, { get children() {
      var v2 = Qm(), I2 = v2.firstChild;
      return Ue2(n$1, v2), Ue2(o2, I2), _2(v2, E2(Qt2, { get each() {
        return H2();
      }, children: (K) => (() => {
        var Q2 = tg(), X2 = Q2.firstChild;
        return Q2.$$click = (te2) => $2(K, te2), Pe2(Q2, "pointerleave", a), Q2.addEventListener("pointerenter", (te2) => {
          K.enabled && l2(te2.currentTarget);
        }), Q2.$$pointerdown = (te2) => te2.stopPropagation(), _2(X2, () => K.label), _2(Q2, E2(fe2, { get when() {
          return K.shortcut;
        }, children: (te2) => (() => {
          var ye2 = ng();
          return _2(ye2, () => Hn2(te2())), ye2;
        })() }), null), Y2((te2) => {
          var ye2 = K.label.toLowerCase(), ue2 = !K.enabled;
          return ye2 !== te2.e && re2(Q2, "data-react-grab-menu-item", te2.e = ye2), ue2 !== te2.t && (Q2.disabled = te2.t = ue2), te2;
        }, { e: void 0, t: void 0 }), Q2;
      })() }), null), v2;
    } }), null), Y2((v2) => {
      var I2 = `${T2().top}px`, K = `${T2().left}px`, Q2 = me2("contain-layout flex flex-col justify-center items-start rounded-[10px] antialiased w-fit h-fit min-w-[100px] [font-synthesis:none] [corner-shape:superellipse(1.25)]", gs);
      return I2 !== v2.e && de2(b2, "top", v2.e = I2), K !== v2.t && de2(b2, "left", v2.t = K), Q2 !== v2.a && we2(w3, v2.a = Q2), v2;
    }, { e: void 0, t: void 0, a: void 0 }), b2;
  } });
};
Qe2(["pointerdown", "mousedown", "click", "contextmenu"]);
var og = N2('<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=currentColor><path fill-rule=evenodd clip-rule=evenodd d="M4.63751 20.1665L3.82444 6.75092L3.73431 5.06621C3.72513 4.89447 3.8619 4.75018 4.03388 4.75018H19.9945C20.1685 4.75018 20.306 4.89769 20.2938 5.07124L20.1756 6.75092L19.3625 20.1665C19.2745 21.618 18.0717 22.7502 16.6176 22.7502H7.38247C5.9283 22.7502 4.72548 21.618 4.63751 20.1665ZM8.74963 16.5002C8.74963 16.9144 9.08542 17.2502 9.49963 17.2502C9.91385 17.2502 10.2496 16.9144 10.2496 16.5002V10.5002C10.2496 10.086 9.91385 9.75018 9.49963 9.75018C9.08542 9.75018 8.74963 10.086 8.74963 10.5002V16.5002ZM14.4996 9.75018C14.9138 9.75018 15.2496 10.086 15.2496 10.5002V16.5002C15.2496 16.9144 14.9138 17.2502 14.4996 17.2502C14.0854 17.2502 13.7496 16.9144 13.7496 16.5002V10.5002C13.7496 10.086 14.0854 9.75018 14.4996 9.75018Z"></path><path fill-rule=evenodd clip-rule=evenodd d="M8.31879 2.46286C8.63394 1.7275 9.35702 1.2507 10.1571 1.2507H13.8383C14.6383 1.2507 15.3614 1.7275 15.6766 2.46286L16.6569 4.75034H19.2239C19.2903 4.75034 19.3523 4.75034 19.4102 4.7507H19.4637C19.4857 4.74973 19.5079 4.74972 19.5303 4.7507H20.9977C21.55 4.7507 21.9977 5.19842 21.9977 5.7507C21.9977 6.30299 21.55 6.7507 20.9977 6.7507H2.99768C2.4454 6.7507 1.99768 6.30299 1.99768 5.7507C1.99768 5.19842 2.4454 4.7507 2.99768 4.7507H4.46507C4.48746 4.74972 4.50968 4.74973 4.53167 4.7507H4.58469C4.6426 4.75034 4.70457 4.75034 4.77093 4.75034H7.33844L8.31879 2.46286ZM13.8903 3.37192L14.481 4.75034H9.5144L10.1052 3.37192C10.1367 3.29838 10.209 3.2507 10.289 3.2507L13.7064 3.2507C13.7864 3.2507 13.8587 3.29838 13.8903 3.37192Z">');
var Ns2 = (e) => {
  let t = () => e.size ?? 14;
  return (() => {
    var n2 = og();
    return Y2((o2) => {
      var l2 = t(), a = t(), i = e.class;
      return l2 !== o2.e && re2(n2, "width", o2.e = l2), a !== o2.t && re2(n2, "height", o2.t = a), i !== o2.a && re2(n2, "class", o2.a = i), o2;
    }, { e: void 0, t: void 0, a: void 0 }), n2;
  })();
};
var rg = N2('<div class="flex items-center gap-[5px]"><div class=relative><button data-react-grab-ignore-events data-react-grab-history-clear class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px] text-[#B91C1C]"></button></div><div class=relative><button data-react-grab-ignore-events data-react-grab-history-copy-all class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px] text-black/60">');
var ig = N2('<div data-react-grab-ignore-events data-react-grab-history-dropdown class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"style=z-index:2147483647><div><div class="contain-layout shrink-0 flex items-center justify-between px-2 pt-1.5 pb-1"><span class="text-[11px] font-medium text-black/40">History</span></div><div class="min-h-0 [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] px-2 py-1.5"><div class="relative flex flex-col max-h-[240px] overflow-y-auto -mx-2 -my-1.5 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(0,0,0,0.15)_transparent]"><div class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out">');
var sg = N2('<span class="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5">');
var ag = N2('<div data-react-grab-ignore-events data-react-grab-history-item class="group relative z-1 contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer text-left gap-2"tabindex=0><span class="flex flex-col min-w-0 flex-1"><span class="text-[12px] leading-4 font-sans font-medium text-black truncate"></span></span><span class="shrink-0 grid"><span class="text-[10px] font-sans text-black/25 group-hover:invisible group-focus-within:invisible [grid-area:1/1] flex items-center justify-end"></span><span class="invisible group-hover:visible group-focus-within:visible [grid-area:1/1] flex items-center justify-end gap-1.5"><button data-react-grab-ignore-events data-react-grab-history-item-remove></button><button data-react-grab-ignore-events data-react-grab-history-item-copy>');
var Cc = "flex items-center justify-center cursor-pointer text-black/25 transition-colors press-scale";
var lg = (e) => {
  let t = Math.floor((Date.now() - e) / 1e3);
  if (t < 60) return "now";
  let n2 = Math.floor(t / 60);
  if (n2 < 60) return `${n2}m`;
  let o2 = Math.floor(n2 / 60);
  return o2 < 24 ? `${o2}h` : `${Math.floor(o2 / 24)}d`;
};
var cg = (e) => e.elementsCount && e.elementsCount > 1 ? `${e.elementsCount} elements` : e.componentName ?? e.tagName;
var Ec = (e) => {
  let t, { containerRef: n2, highlightRef: o2, updateHighlight: l2, clearHighlight: a } = Fn2(), i = Ci(), c = () => {
    if (!t) return null;
    let j2 = t.getRootNode().querySelector("[data-react-grab-toolbar]");
    if (!j2) return null;
    let z2 = j2.getBoundingClientRect();
    return [{ x: z2.x - us, y: z2.y - us, width: z2.width + us * 2, height: z2.height + us * 2 }];
  }, [s, d2] = B2(0), [f, p2] = B2(0), [y2, T2] = B2(null), [H2, $$1] = B2(false), [b2, w3] = B2(null), h2, g2, v2, I2, K = () => {
    clearTimeout(v2), I2 !== void 0 && (q(I2), I2 = void 0);
  }, Q2 = () => e.position !== null, [X$1, te2] = B2(false), [ye2, ue2] = B2(false), [W2, V2] = B2("bottom"), S2 = () => {
    t && (d2(t.offsetWidth), p2(t.offsetHeight));
  };
  pe2(() => {
    Q2() ? (e.position && V2(e.position.edge), clearTimeout(v2), te2(true), I2 !== void 0 && q(I2), I2 = D(() => {
      S2(), t?.offsetHeight, ue2(true);
    })) : (I2 !== void 0 && q(I2), ue2(false), v2 = setTimeout(() => {
      te2(false);
    }, is)), Te2(() => {
      K();
    });
  }), pe2(Be2(() => ye2(), (A2) => {
    A2 && t?.matches(":hover") && e.onDropdownHover?.(true);
  }, { defer: true }));
  let O2 = se2((A2) => {
    let j2 = Fo2({ anchor: e.position, measuredWidth: s(), measuredHeight: f(), viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, anchorGapPx: cs, viewportPaddingPx: ls, offscreenPosition: Es });
    return j2.left !== Es.left ? j2 : A2;
  }, Es), U2 = () => Math.min(fs, window.innerWidth - O2().left - ls), q2 = () => window.innerHeight - O2().top - ls, x2 = () => Math.max(ps, e.position?.toolbarWidth ?? 0);
  return lt2(() => {
    S2();
    let A2 = (j2) => {
      Q2() && j2.code === "Escape" && (j2.preventDefault(), j2.stopPropagation(), e.onDismiss?.());
    };
    window.addEventListener("keydown", A2, { capture: true }), Te2(() => {
      clearTimeout(h2), clearTimeout(g2), K(), window.removeEventListener("keydown", A2, { capture: true }), i.stop();
    });
  }), E2(fe2, { get when() {
    return X$1();
  }, get children() {
    var A2 = ig(), j2 = A2.firstChild, z2 = j2.firstChild;
    z2.firstChild;
    var G2 = z2.nextSibling, Ee2 = G2.firstChild, ve2 = Ee2.firstChild;
    A2.addEventListener("mouseleave", (F2) => {
      let ie2 = c();
      if (ie2) {
        i.start({ x: F2.clientX, y: F2.clientY }, ie2, () => e.onDropdownHover?.(false));
        return;
      }
      e.onDropdownHover?.(false);
    }), A2.addEventListener("mouseenter", () => {
      i.stop(), e.onDropdownHover?.(true);
    }), Pe2(A2, "contextmenu", ct2, true), Pe2(A2, "click", ct2, true), Pe2(A2, "mousedown", ct2, true), Pe2(A2, "pointerdown", ct2, true);
    var L2 = t;
    return typeof L2 == "function" ? Ue2(L2, A2) : t = A2, _2(z2, E2(fe2, { get when() {
      return e.items.length > 0;
    }, get children() {
      var F2 = rg(), ie2 = F2.firstChild, Me2 = ie2.firstChild, he2 = ie2.nextSibling, ke2 = he2.firstChild;
      return Me2.addEventListener("mouseleave", () => T2(null)), Me2.addEventListener("mouseenter", () => T2("clear")), Me2.$$click = (ge2) => {
        ge2.stopPropagation(), T2(null), e.onClearAll?.();
      }, _2(Me2, E2(Ns2, { size: ms })), _2(ie2, E2(En2, { get visible() {
        return y2() === "clear";
      }, position: "top", children: "Clear all" }), null), ke2.addEventListener("mouseleave", () => {
        T2(null), e.onCopyAllHover?.(false);
      }), ke2.addEventListener("mouseenter", () => {
        T2("copy"), H2() || e.onCopyAllHover?.(true);
      }), ke2.$$click = (ge2) => {
        ge2.stopPropagation(), T2(null), e.onCopyAll?.(), $$1(true), clearTimeout(h2), h2 = setTimeout(() => {
          $$1(false);
        }, 1500);
      }, _2(ke2, E2(fe2, { get when() {
        return H2();
      }, get fallback() {
        return E2(oo, { size: ms });
      }, get children() {
        return E2(br2, { size: ms, class: "text-black" });
      } })), _2(he2, E2(En2, { get visible() {
        return y2() === "copy";
      }, position: "top", children: "Copy all" }), null), F2;
    } }), null), Ue2(n2, Ee2), Ue2(o2, ve2), _2(Ee2, E2(Qt2, { get each() {
      return e.items;
    }, children: (F2) => (() => {
      var ie2 = ag(), Me2 = ie2.firstChild, he2 = Me2.firstChild, ke2 = Me2.nextSibling, ge2 = ke2.firstChild, Ce2 = ge2.nextSibling, He2 = Ce2.firstChild, Oe2 = He2.nextSibling;
      return Pe2(ie2, "blur", a), ie2.addEventListener("focus", (be2) => l2(be2.currentTarget)), ie2.addEventListener("mouseleave", () => {
        e.onItemHover?.(null), a();
      }), ie2.addEventListener("mouseenter", (be2) => {
        e.disconnectedItemIds?.has(F2.id) || e.onItemHover?.(F2.id), l2(be2.currentTarget);
      }), ie2.$$keydown = (be2) => {
        be2.code === "Space" && be2.currentTarget === be2.target && (be2.preventDefault(), be2.stopPropagation(), e.onSelectItem?.(F2));
      }, ie2.$$click = (be2) => {
        be2.stopPropagation(), e.onSelectItem?.(F2), w3(F2.id), clearTimeout(g2), g2 = setTimeout(() => {
          w3(null);
        }, 1500);
      }, ie2.$$pointerdown = (be2) => be2.stopPropagation(), _2(he2, () => cg(F2)), _2(Me2, E2(fe2, { get when() {
        return F2.commentText;
      }, get children() {
        var be2 = sg();
        return _2(be2, () => F2.commentText), be2;
      } }), null), _2(ge2, () => lg(F2.timestamp)), He2.$$click = (be2) => {
        be2.stopPropagation(), e.onRemoveItem?.(F2);
      }, _2(He2, E2(Ns2, { size: ms })), Oe2.$$click = (be2) => {
        be2.stopPropagation(), e.onCopyItem?.(F2), w3(F2.id), clearTimeout(g2), g2 = setTimeout(() => {
          w3(null);
        }, 1500);
      }, _2(Oe2, E2(fe2, { get when() {
        return b2() === F2.id;
      }, get fallback() {
        return E2(oo, { size: ms });
      }, get children() {
        return E2(br2, { size: ms, class: "text-black" });
      } })), Y2((be2) => {
        var Se2 = { "opacity-40 hover:opacity-100": !!e.disconnectedItemIds?.has(F2.id) }, tt2 = me2(Cc, "hover:text-[#B91C1C]"), ot = me2(Cc, "hover:text-black/60");
        return be2.e = eo2(ie2, Se2, be2.e), tt2 !== be2.t && we2(He2, be2.t = tt2), ot !== be2.a && we2(Oe2, be2.a = ot), be2;
      }, { e: void 0, t: void 0, a: void 0 }), ie2;
    })() }), null), Y2((F2) => {
      var ie2 = `${O2().top}px`, Me2 = `${O2().left}px`, he2 = ye2() ? "auto" : "none", ke2 = _s[W2()], ge2 = ye2() ? "1" : "0", Ce2 = ye2() ? "scale(1)" : "scale(0.95)", He2 = me2("contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]", gs), Oe2 = `${x2()}px`, be2 = `${U2()}px`, Se2 = `${q2()}px`;
      return ie2 !== F2.e && de2(A2, "top", F2.e = ie2), Me2 !== F2.t && de2(A2, "left", F2.t = Me2), he2 !== F2.a && de2(A2, "pointer-events", F2.a = he2), ke2 !== F2.o && de2(A2, "transform-origin", F2.o = ke2), ge2 !== F2.i && de2(A2, "opacity", F2.i = ge2), Ce2 !== F2.n && de2(A2, "transform", F2.n = Ce2), He2 !== F2.s && we2(j2, F2.s = He2), Oe2 !== F2.h && de2(j2, "min-width", F2.h = Oe2), be2 !== F2.r && de2(j2, "max-width", F2.r = be2), Se2 !== F2.d && de2(j2, "max-height", F2.d = Se2), F2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0, s: void 0, h: void 0, r: void 0, d: void 0 }), A2;
  } });
};
Qe2(["pointerdown", "mousedown", "click", "contextmenu", "keydown"]);
var dg = N2('<div data-react-grab-ignore-events data-react-grab-clear-history-prompt class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"style=z-index:2147483647><div>');
var Sc = (e) => {
  let t, [n2, o2] = B2(0), [l2, a] = B2(0), [i, c] = B2(false), [s, d2] = B2(false), [f, p2] = B2("bottom"), y2, T2, H2 = () => {
    t && (o2(t.offsetWidth), a(t.offsetHeight));
  };
  pe2(() => {
    let b2 = e.position;
    b2 ? (p2(b2.edge), clearTimeout(y2), c(true), T2 !== void 0 && q(T2), T2 = D(() => {
      H2(), t?.offsetHeight, d2(true);
    })) : (T2 !== void 0 && q(T2), d2(false), y2 = setTimeout(() => {
      c(false);
    }, is));
  });
  let $2 = se2((b2) => {
    let w3 = Fo2({ anchor: e.position, measuredWidth: n2(), measuredHeight: l2(), viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, anchorGapPx: cs, viewportPaddingPx: ls, offscreenPosition: Es });
    return w3.left !== Es.left ? w3 : b2;
  }, Es);
  return lt2(() => {
    H2();
    let b2 = (g2) => {
      if (!e.position || xt2(g2)) return;
      let v2 = g2.code === "Enter", I2 = g2.code === "Escape";
      (v2 || I2) && (g2.preventDefault(), g2.stopImmediatePropagation(), I2 ? e.onCancel() : e.onConfirm());
    };
    window.addEventListener("keydown", b2, { capture: true });
    let w3 = (g2) => {
      !e.position || At2(g2, "data-react-grab-ignore-events") || e.onCancel();
    }, h2 = D(() => {
      window.addEventListener("mousedown", w3, { capture: true }), window.addEventListener("touchstart", w3, { capture: true });
    });
    Te2(() => {
      q(h2), clearTimeout(y2), T2 !== void 0 && q(T2), window.removeEventListener("keydown", b2, { capture: true }), window.removeEventListener("mousedown", w3, { capture: true }), window.removeEventListener("touchstart", w3, { capture: true });
    });
  }), E2(fe2, { get when() {
    return i();
  }, get children() {
    var b2 = dg(), w3 = b2.firstChild;
    Pe2(b2, "contextmenu", ct2, true), Pe2(b2, "click", ct2, true), Pe2(b2, "mousedown", ct2, true), Pe2(b2, "pointerdown", ct2, true);
    var h2 = t;
    return typeof h2 == "function" ? Ue2(h2, b2) : t = b2, _2(w3, E2(hr2, { label: "Clear history?", cancelOnEscape: true, get onConfirm() {
      return e.onConfirm;
    }, get onCancel() {
      return e.onCancel;
    } })), Y2((g2) => {
      var v2 = `${$2().top}px`, I2 = `${$2().left}px`, K = s() ? "auto" : "none", Q2 = _s[f()], X2 = s() ? "1" : "0", te2 = s() ? "scale(1)" : "scale(0.95)", ye2 = me2("contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)]", gs);
      return v2 !== g2.e && de2(b2, "top", g2.e = v2), I2 !== g2.t && de2(b2, "left", g2.t = I2), K !== g2.a && de2(b2, "pointer-events", g2.a = K), Q2 !== g2.o && de2(b2, "transform-origin", g2.o = Q2), X2 !== g2.i && de2(b2, "opacity", g2.i = X2), te2 !== g2.n && de2(b2, "transform", g2.n = te2), ye2 !== g2.s && we2(w3, g2.s = ye2), g2;
    }, { e: void 0, t: void 0, a: void 0, o: void 0, i: void 0, n: void 0, s: void 0 }), b2;
  } });
};
Qe2(["pointerdown", "mousedown", "click", "contextmenu"]);
var ug = N2('<div style="position:fixed;top:0;right:0;bottom:0;left:0;pointer-events:none;transition:opacity 100ms ease-out;will-change:opacity;contain:strict;transform:translateZ(0)">');
var Ac = (e) => [E2(Xl, { get crosshairVisible() {
  return e.crosshairVisible;
}, get selectionVisible() {
  return e.selectionVisible;
}, get selectionBounds() {
  return e.selectionBounds;
}, get selectionBoundsMultiple() {
  return e.selectionBoundsMultiple;
}, get selectionShouldSnap() {
  return e.selectionShouldSnap;
}, get selectionIsFading() {
  return e.selectionLabelStatus === "fading";
}, get dragVisible() {
  return e.dragVisible;
}, get dragBounds() {
  return e.dragBounds;
}, get grabbedBoxes() {
  return e.grabbedBoxes;
}, get agentSessions() {
  return e.agentSessions;
}, get labelInstances() {
  return e.labelInstances;
} }), (() => {
  var t = ug();
  return de2(t, "z-index", 2147483645), de2(t, "box-shadow", `inset 0 0 ${bo}px ${So}`), Y2((n2) => de2(t, "opacity", e.isFrozen ? 1 : 0)), t;
})(), E2(oi, { get each() {
  return Fe2(() => !!e.agentSessions)() ? Array.from(e.agentSessions.values()) : [];
}, children: (t) => E2(fe2, { get when() {
  return t().selectionBounds.length > 0;
}, get children() {
  return E2(wi, { get tagName() {
    return t().tagName;
  }, get componentName() {
    return t().componentName;
  }, get selectionBounds() {
    return t().selectionBounds[0];
  }, get mouseX() {
    return t().position.x;
  }, visible: true, hasAgent: true, isAgentConnected: true, get status() {
    return t().isFading ? "fading" : t().isStreaming ? "copying" : "copied";
  }, get statusText() {
    return t().lastStatus || "Thinking…";
  }, get inputValue() {
    return t().context.prompt;
  }, get previousPrompt() {
    return t().context.prompt;
  }, get supportsUndo() {
    return e.supportsUndo;
  }, get supportsFollowUp() {
    return e.supportsFollowUp;
  }, get dismissButtonText() {
    return e.dismissButtonText;
  }, onAbort: () => e.onRequestAbortSession?.(t().id), get onDismiss() {
    return t().isStreaming ? void 0 : () => e.onDismissSession?.(t().id);
  }, get onUndo() {
    return t().isStreaming ? void 0 : () => e.onUndoSession?.(t().id);
  }, get onFollowUpSubmit() {
    return t().isStreaming ? void 0 : (n2) => e.onFollowUpSubmitSession?.(t().id, n2);
  }, get error() {
    return t().error;
  }, onAcknowledgeError: () => e.onAcknowledgeSessionError?.(t().id), onRetry: () => e.onRetrySession?.(t().id), get isPendingAbort() {
    return Fe2(() => !!t().isStreaming)() && e.pendingAbortSessionId === t().id;
  }, onConfirmAbort: () => e.onAbortSession?.(t().id, true), onCancelAbort: () => e.onAbortSession?.(t().id, false), onShowContextMenu: void 0 });
} }) }), E2(fe2, { get when() {
  return Fe2(() => !!e.selectionLabelVisible)() && e.selectionBounds;
}, get children() {
  return E2(wi, { get tagName() {
    return e.selectionTagName;
  }, get componentName() {
    return e.selectionComponentName;
  }, get elementsCount() {
    return e.selectionElementsCount;
  }, get selectionBounds() {
    return e.selectionBounds;
  }, get mouseX() {
    return e.mouseX;
  }, get visible() {
    return e.selectionLabelVisible;
  }, get isPromptMode() {
    return e.isPromptMode;
  }, get inputValue() {
    return e.inputValue;
  }, get replyToPrompt() {
    return e.replyToPrompt;
  }, get hasAgent() {
    return e.hasAgent;
  }, get isAgentConnected() {
    return e.isAgentConnected;
  }, get status() {
    return e.selectionLabelStatus;
  }, get actionCycleState() {
    return e.selectionActionCycleState;
  }, get arrowNavigationState() {
    return e.selectionArrowNavigationState;
  }, get onArrowNavigationSelect() {
    return e.onArrowNavigationSelect;
  }, get filePath() {
    return e.selectionFilePath;
  }, get lineNumber() {
    return e.selectionLineNumber;
  }, get onInputChange() {
    return e.onInputChange;
  }, get onSubmit() {
    return e.onInputSubmit;
  }, get onCancel() {
    return e.onInputCancel;
  }, get onToggleExpand() {
    return e.onToggleExpand;
  }, get isPendingDismiss() {
    return e.isPendingDismiss;
  }, get onConfirmDismiss() {
    return e.onConfirmDismiss;
  }, get onCancelDismiss() {
    return e.onCancelDismiss;
  }, onOpen: () => {
    e.selectionFilePath && Zi(e.selectionFilePath, e.selectionLineNumber);
  }, get isContextMenuOpen() {
    return e.contextMenuPosition !== null;
  } });
} }), E2(oi, { get each() {
  return e.labelInstances ?? [];
}, children: (t) => E2(wi, { get tagName() {
  return t().tagName;
}, get componentName() {
  return t().componentName;
}, get elementsCount() {
  return t().elementsCount;
}, get selectionBounds() {
  return t().bounds;
}, get mouseX() {
  return t().mouseX;
}, visible: true, get status() {
  return t().status;
}, get statusText() {
  return t().statusText;
}, get hasAgent() {
  return !!t().statusText;
}, get isPromptMode() {
  return t().isPromptMode;
}, get inputValue() {
  return t().inputValue;
}, get error() {
  return t().errorMessage;
}, get hideArrow() {
  return t().hideArrow;
}, get onShowContextMenu() {
  let n2 = t();
  if (!(!(n2.status === "copied" || n2.status === "fading") || !qe2(n2.element))) return () => e.onShowContextMenuInstance?.(n2.id);
}, onHoverChange: (n2) => e.onLabelInstanceHoverChange?.(t().id, n2) }) }), E2(fe2, { get when() {
  return e.toolbarVisible !== false;
}, get children() {
  return E2(wc, { get isActive() {
    return e.isActive;
  }, get isContextMenuOpen() {
    return e.contextMenuPosition !== null;
  }, get onToggle() {
    return e.onToggleActive;
  }, get enabled() {
    return e.enabled;
  }, get onToggleEnabled() {
    return e.onToggleEnabled;
  }, get shakeCount() {
    return e.shakeCount;
  }, get onStateChange() {
    return e.onToolbarStateChange;
  }, get onSubscribeToStateChanges() {
    return e.onSubscribeToToolbarStateChanges;
  }, get onSelectHoverChange() {
    return e.onToolbarSelectHoverChange;
  }, get onContainerRef() {
    return e.onToolbarRef;
  }, get historyItemCount() {
    return e.historyItemCount;
  }, get clockFlashTrigger() {
    return e.clockFlashTrigger;
  }, get hasUnreadHistoryItems() {
    return e.hasUnreadHistoryItems;
  }, get onToggleHistory() {
    return e.onToggleHistory;
  }, get onCopyAll() {
    return e.onCopyAll;
  }, get onCopyAllHover() {
    return e.onCopyAllHover;
  }, get onHistoryButtonHover() {
    return e.onHistoryButtonHover;
  }, get isHistoryDropdownOpen() {
    return !!e.historyDropdownPosition;
  }, get isHistoryPinned() {
    return e.isHistoryPinned;
  }, get toolbarActions() {
    return e.toolbarActions;
  }, get onToggleMenu() {
    return e.onToggleMenu;
  }, get isMenuOpen() {
    return !!e.toolbarMenuPosition;
  }, get isClearPromptOpen() {
    return !!e.clearPromptPosition;
  } });
} }), E2(vc, { get position() {
  return e.contextMenuPosition ?? null;
}, get selectionBounds() {
  return e.contextMenuBounds ?? null;
}, get tagName() {
  return e.contextMenuTagName;
}, get componentName() {
  return e.contextMenuComponentName;
}, get hasFilePath() {
  return e.contextMenuHasFilePath ?? false;
}, get actions() {
  return e.actions;
}, get actionContext() {
  return e.actionContext;
}, get onDismiss() {
  return e.onContextMenuDismiss ?? (() => {
  });
}, get onHide() {
  return e.onContextMenuHide ?? (() => {
  });
} }), E2(xc, { get position() {
  return e.toolbarMenuPosition ?? null;
}, get actions() {
  return e.toolbarActions ?? [];
}, get onDismiss() {
  return e.onToolbarMenuDismiss ?? (() => {
  });
} }), E2(Sc, { get position() {
  return e.clearPromptPosition ?? null;
}, get onConfirm() {
  return e.onClearHistoryConfirm ?? (() => {
  });
}, get onCancel() {
  return e.onClearHistoryCancel ?? (() => {
  });
} }), E2(Ec, { get position() {
  return e.historyDropdownPosition ?? null;
}, get items() {
  return e.historyItems ?? [];
}, get disconnectedItemIds() {
  return e.historyDisconnectedItemIds;
}, get onSelectItem() {
  return e.onHistoryItemSelect;
}, get onRemoveItem() {
  return e.onHistoryItemRemove;
}, get onCopyItem() {
  return e.onHistoryItemCopy;
}, get onItemHover() {
  return e.onHistoryItemHover;
}, get onCopyAll() {
  return e.onHistoryCopyAll;
}, get onCopyAllHover() {
  return e.onHistoryCopyAllHover;
}, get onClearAll() {
  return e.onHistoryClear;
}, get onDismiss() {
  return e.onHistoryDismiss;
}, get onDropdownHover() {
  return e.onHistoryDropdownHover;
} })];
var $s = () => ({ activate: () => {
}, deactivate: () => {
}, toggle: () => {
}, comment: () => {
}, isActive: () => false, isEnabled: () => false, setEnabled: () => {
}, getToolbarState: () => null, setToolbarState: () => {
}, onToolbarStateChange: () => () => {
}, dispose: () => {
}, copyElement: () => Promise.resolve(false), getSource: () => Promise.resolve(null), getStackContext: () => Promise.resolve(""), getState: () => ({ isActive: false, isDragging: false, isCopying: false, isPromptMode: false, isCrosshairVisible: false, isSelectionBoxVisible: false, isDragBoxVisible: false, targetElement: null, dragBounds: null, grabbedBoxes: [], labelInstances: [], selectionFilePath: null, toolbarState: null }), setOptions: () => {
}, registerPlugin: () => {
}, unregisterPlugin: () => {
}, getPlugins: () => [], getDisplayName: () => null });
var Tc = () => {
  let e = new AbortController(), t = (o2, l2, a = {}) => {
    window.addEventListener(o2, l2, { ...a, signal: e.signal });
  }, n2 = (o2, l2, a = {}) => {
    document.addEventListener(o2, l2, { ...a, signal: e.signal });
  };
  return { signal: e.signal, abort: () => e.abort(), addWindowListener: t, addDocumentListener: n2 };
};
var fg = "application/x-lexical-editor";
var mg = "application/x-react-grab";
var kc = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (e) => {
  let t = Math.random() * 16 | 0;
  return (e === "x" ? t : t & 3 | 8).toString(16);
});
var gg = (e, t, n2, o2) => ({ detail: 1, format: 0, mode: "segmented", style: "", text: `@${e}`, type: "mention", version: 1, mentionName: e, typeaheadType: n2, storedKey: t, metadata: o2, source: "chat" });
var pg = (e) => ({ detail: 0, format: 0, mode: "normal", style: "", text: e, type: "text", version: 1 });
var hg = (e) => e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var bg = (e, t) => {
  let n2 = String(Math.floor(Math.random() * 1e4)), o2 = kc(), l2 = `<${t}>`, a = { case: "file", path: `${l2}.tsx`, content: e }, i = { key: l2, type: a, payload: { file: { path: `${l2}.tsx`, content: e } }, id: kc(), name: l2, _score: 20, isSlash: false, labelMatch: [{ start: 0, end: 2 }] }, c = { selection: { type: 0 }, selectedOption: i };
  return { plainText: `@${l2}

${e}
`, htmlContent: `<meta charset='utf-8'><pre><code>${hg(e)}</code></pre>`, lexicalData: JSON.stringify({ namespace: `chat-input${o2}-pane`, nodes: [gg(l2, n2, a, c), pg(`

${e}`)] }) };
};
var Gt2 = (e, t) => {
  let n2 = t?.componentName ?? "div", { plainText: o2, htmlContent: l2, lexicalData: a$1 } = bg(e, n2), i = t?.entries ?? [{ tagName: t?.tagName, componentName: n2, content: e, commentText: t?.commentText }], c = { version: mo, content: e, entries: i, timestamp: Date.now() }, s = (f) => {
    f.preventDefault(), f.clipboardData?.setData("text/plain", o2), f.clipboardData?.setData("text/html", l2), f.clipboardData?.setData(fg, a$1), f.clipboardData?.setData(mg, JSON.stringify(c));
  };
  document.addEventListener("copy", s);
  let d2 = document.createElement("textarea");
  d2.value = e, d2.style.position = "fixed", d2.style.left = "-9999px", d2.ariaHidden = "true", document.body.appendChild(d2), d2.select();
  try {
    if (typeof document.execCommand != "function") return false;
    let f = document.execCommand("copy");
    return f && t?.onSuccess?.(), f;
  } finally {
    document.removeEventListener("copy", s), d2.remove();
  }
};
var vr2 = async (e, t = {}) => (await Promise.allSettled(e.map((l2) => Bi(l2, t)))).map((l2) => l2.status === "fulfilled" ? l2.value : "");
var Ai = (e) => e.length <= 1 ? e[0] ?? "" : e.map((t, n2) => `[${n2 + 1}]
${t}`).join(`

`);
var Pc = async (e, t, n2, o2) => {
  let l2 = false, a = "";
  await t.onBeforeCopy(n2);
  try {
    let i, c;
    if (e.getContent) i = await e.getContent(n2);
    else {
      let s = await vr2(n2, { maxLines: e.maxContextLines }), f = (await Promise.all(s.map((p2, y2) => p2.trim() ? t.transformSnippet(p2, n2[y2]) : Promise.resolve("")))).map((p2, y2) => ({ snippet: p2, element: n2[y2] })).filter(({ snippet: p2 }) => p2.trim());
      i = Ai(f.map(({ snippet: p2 }) => p2)), c = f.map(({ snippet: p2, element: y2 }) => ({ tagName: y2.localName, content: p2, commentText: o2 }));
    }
    if (i.trim()) {
      let s = await t.transformCopyContent(i, n2);
      a = o2 ? `${o2}

${s}` : s, l2 = Gt2(a, { componentName: e.componentName, entries: c });
    }
  } catch (i) {
    let c = i instanceof Error ? i : new Error(String(i));
    t.onCopyError(c);
  }
  return l2 && t.onCopySuccess(n2, a), t.onAfterCopy(n2, l2), l2;
};
var yg = (e, t) => {
  let n2 = Math.max(e.left, t.left), o2 = Math.max(e.top, t.top), l2 = Math.min(e.right, t.right), a = Math.min(e.bottom, t.bottom), i = Math.max(0, l2 - n2), c = Math.max(0, a - o2);
  return i * c;
};
var wg = (e, t) => e.left < t.right && e.right > t.left && e.top < t.bottom && e.bottom > t.top;
var zo2 = (e, t, n2) => Math.min(n2, Math.max(t, e));
var xg = (e) => e.sort((t, n2) => {
  if (t === n2) return 0;
  let o2 = t.compareDocumentPosition(n2);
  return o2 & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : o2 & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
});
var vg = (e) => {
  if (e.width <= 0 || e.height <= 0) return [];
  let t = window.innerWidth, n2 = window.innerHeight, o2 = e.x, l2 = e.y, a = e.x + e.width, i = e.y + e.height, c = o2 + e.width / 2, s = l2 + e.height / 2, d2 = zo2(Math.ceil(e.width / Xo), Yo, Zo), f = zo2(Math.ceil(e.height / Xo), Yo, Zo), p2 = d2 * f, y2 = p2 > Ko ? Math.sqrt(Ko / p2) : 1, T2 = zo2(Math.floor(d2 * y2), Yo, Zo), H2 = zo2(Math.floor(f * y2), Yo, Zo), $2 = /* @__PURE__ */ new Set(), b2 = [], w3 = (h2, g2) => {
    let v2 = zo2(Math.round(h2), 0, t - 1), I2 = zo2(Math.round(g2), 0, n2 - 1), K = `${v2}:${I2}`;
    $2.has(K) || ($2.add(K), b2.push({ x: v2, y: I2 }));
  };
  w3(o2 + qo, l2 + qo), w3(a - qo, l2 + qo), w3(o2 + qo, i - qo), w3(a - qo, i - qo), w3(c, l2 + qo), w3(c, i - qo), w3(o2 + qo, s), w3(a - qo, s), w3(c, s);
  for (let h2 = 0; h2 < T2; h2 += 1) {
    let g2 = o2 + (h2 + 0.5) / T2 * e.width;
    for (let v2 = 0; v2 < H2; v2 += 1) {
      let I2 = l2 + (v2 + 0.5) / H2 * e.height;
      w3(g2, I2);
    }
  }
  return b2;
};
var Cg = (e, t, n2) => {
  let o2 = { left: e.x, top: e.y, right: e.x + e.width, bottom: e.y + e.height }, l2 = /* @__PURE__ */ new Set(), a = vg(e);
  Je();
  try {
    for (let c of a) {
      let s = document.elementsFromPoint(c.x, c.y);
      for (let d2 of s) l2.add(d2);
    }
  } finally {
    et();
  }
  let i = [];
  for (let c of l2) {
    if (!n2 && mn(c) || !t(c)) continue;
    let s = c.getBoundingClientRect();
    if (s.width <= 0 || s.height <= 0) continue;
    let d2 = { left: s.left, top: s.top, right: s.left + s.width, bottom: s.top + s.height };
    if (n2) {
      let f = yg(o2, d2), p2 = s.width * s.height;
      p2 > 0 && f / p2 >= Wo && i.push(c);
    } else wg(d2, o2) && i.push(c);
  }
  return xg(i);
};
var Eg = (e) => e.filter((t) => !e.some((n2) => n2 !== t && n2.contains(t)));
var Cr2 = (e, t, n2 = true) => {
  let o2 = Cg(e, t, n2);
  return Eg(o2);
};
var Ti = (e) => {
  let t = window.innerWidth, n2 = window.innerHeight, o2 = Math.max(0, e.x), l2 = Math.min(t, e.x + e.width), a = Math.max(0, e.y), i = Math.min(n2, e.y + e.height);
  return { x: (o2 + l2) / 2, y: (a + i) / 2 };
};
var Mc = () => {
  Fl(), En(), Ea();
};
var ki = (e) => ({ x: e.pageX - window.scrollX, y: e.pageY - window.scrollY, width: e.width, height: e.height, borderRadius: "0px", transform: "none" });
var Bs = (e) => ({ pageX: e.x + window.scrollX, pageY: e.y + window.scrollY, width: e.width, height: e.height });
var Pi = (e) => ({ ...e, borderRadius: "0px", transform: "none" });
var Sg = /* @__PURE__ */ new Set(["c", "C", "с", "С", "ȼ", "Ȼ", "ↄ", "Ↄ", "ᴄ", "ᶜ", "ⱼ", "ⅽ", "Ⅽ", "ç", "Ç", "ć", "Ć", "č", "Č", "ĉ", "Ĉ", "ċ", "Ċ"]);
var Mi = (e, t) => t === "KeyC" ? true : !e || e.length !== 1 ? false : Sg.has(e);
var Ic = (e, t) => {
  let n2 = e.toLowerCase();
  return t === "Space" ? n2 === "space" || n2 === " " : t.startsWith("Key") ? t.slice(3).toLowerCase() === n2 : t.startsWith("Digit") ? t.slice(5) === n2 : false;
};
var Ag = { meta: "metaKey", cmd: "metaKey", command: "metaKey", win: "metaKey", windows: "metaKey", ctrl: "ctrlKey", control: "ctrlKey", shift: "shiftKey", alt: "altKey", option: "altKey", opt: "altKey" };
var _c = (e) => {
  let t = e.split("+").map((o2) => o2.trim().toLowerCase()), n2 = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, key: null };
  for (let o2 of t) {
    let l2 = Ag[o2];
    l2 ? n2[l2] = true : n2.key = o2;
  }
  return n2;
};
var Ii = (e) => {
  if (typeof e == "function") return e;
  let t = _c(e), n2 = t.key;
  return (o2) => {
    if (n2 === null) {
      let c = t.metaKey ? o2.metaKey || o2.key === "Meta" : true, s = t.ctrlKey ? o2.ctrlKey || o2.key === "Control" : true, d2 = t.shiftKey ? o2.shiftKey || o2.key === "Shift" : true, f = t.altKey ? o2.altKey || o2.key === "Alt" : true, p2 = c && s && d2 && f, y2 = [t.metaKey, t.ctrlKey, t.shiftKey, t.altKey].filter(Boolean).length, T2 = [o2.metaKey || o2.key === "Meta", o2.ctrlKey || o2.key === "Control", o2.shiftKey || o2.key === "Shift", o2.altKey || o2.key === "Alt"].filter(Boolean).length;
      return p2 && T2 >= y2;
    }
    let l2 = o2.key?.toLowerCase() === n2 || Ic(n2, o2.code), i = t.metaKey || t.ctrlKey || t.shiftKey || t.altKey ? (t.metaKey ? o2.metaKey : true) && (t.ctrlKey ? o2.ctrlKey : true) && (t.shiftKey ? o2.shiftKey : true) && (t.altKey ? o2.altKey : true) : !o2.metaKey && !o2.ctrlKey && !o2.shiftKey && !o2.altKey;
    return l2 && i;
  };
};
var Oc = (e) => !e || typeof e == "function" ? { metaKey: Cn2(), ctrlKey: !Cn2(), shiftKey: false, altKey: false, key: null } : _c(e);
var _i = (e, t) => {
  if (t.activationKey) return Ii(t.activationKey)(e);
  let o2 = (Cn2() ? e.metaKey : e.ctrlKey) && !e.shiftKey && !e.altKey;
  return !!(e.key && o2 && Mi(e.key, e.code));
};
var Hs = (e) => {
  if (e.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  if (e.length === 1) return e[0];
  let t = 1 / 0, n2 = 1 / 0, o2 = -1 / 0, l2 = -1 / 0;
  for (let a of e) t = Math.min(t, a.x), n2 = Math.min(n2, a.y), o2 = Math.max(o2, a.x + a.width), l2 = Math.max(l2, a.y + a.height);
  return { x: t, y: n2, width: o2 - t, height: l2 - n2 };
};
var ro = { enabled: true, hue: 0, selectionBox: { enabled: true }, dragBox: { enabled: true }, grabbedBoxes: { enabled: true }, elementLabel: { enabled: true }, crosshair: { enabled: true }, toolbar: { enabled: true } };
var Oi = (e, t) => ({ enabled: t.enabled ?? e.enabled, hue: t.hue ?? e.hue, selectionBox: { enabled: t.selectionBox?.enabled ?? e.selectionBox.enabled }, dragBox: { enabled: t.dragBox?.enabled ?? e.dragBox.enabled }, grabbedBoxes: { enabled: t.grabbedBoxes?.enabled ?? e.grabbedBoxes.enabled }, elementLabel: { enabled: t.elementLabel?.enabled ?? e.elementLabel.enabled }, crosshair: { enabled: t.crosshair?.enabled ?? e.crosshair.enabled }, toolbar: { enabled: t.toolbar?.enabled ?? e.toolbar.enabled } });
var Dc = { activationMode: "toggle", keyHoldDuration: 100, allowActivationInsideInput: true, maxContextLines: 3, activationKey: void 0, getContent: void 0, freezeReactUpdates: true };
var Lc = (e = {}) => {
  let t = /* @__PURE__ */ new Map(), n2 = {}, [o2, l2] = ai({ theme: ro, options: { ...Dc, ...e }, actions: [], toolbarActions: [] }), a = (h2) => h2.target === "toolbar", i = () => {
    let h2 = ro, g2 = { ...Dc, ...e }, v2 = [], I2 = [];
    for (let { config: K } of t.values()) if (K.theme && (h2 = Oi(h2, K.theme)), K.options && (g2 = { ...g2, ...K.options }), K.actions) for (let Q2 of K.actions) if (a(Q2)) {
      let X2 = Q2.onAction;
      I2.push({ ...Q2, onAction: () => {
        y2("cancelPendingToolbarActions"), X2();
      } });
    } else v2.push(Q2);
    g2 = { ...g2, ...n2 }, l2("theme", h2), l2("options", g2), l2("actions", v2), l2("toolbarActions", I2);
  }, c = (h2, g2) => {
    n2[h2] = g2, l2("options", h2, g2);
  }, s = (h2) => {
    h2.activationMode !== void 0 && c("activationMode", h2.activationMode), h2.keyHoldDuration !== void 0 && c("keyHoldDuration", h2.keyHoldDuration), h2.allowActivationInsideInput !== void 0 && c("allowActivationInsideInput", h2.allowActivationInsideInput), h2.maxContextLines !== void 0 && c("maxContextLines", h2.maxContextLines), h2.activationKey !== void 0 && c("activationKey", h2.activationKey), h2.getContent !== void 0 && c("getContent", h2.getContent), h2.freezeReactUpdates !== void 0 && c("freezeReactUpdates", h2.freezeReactUpdates);
  }, d2 = (h2, g2) => {
    t.has(h2.name) && f(h2.name);
    let v2 = h2.setup?.(g2, w3) ?? {};
    return h2.theme && (v2.theme = v2.theme ? Oi(Oi(ro, h2.theme), v2.theme) : h2.theme), h2.actions && (v2.actions = [...h2.actions, ...v2.actions ?? []]), h2.hooks && (v2.hooks = v2.hooks ? { ...h2.hooks, ...v2.hooks } : h2.hooks), h2.options && (v2.options = v2.options ? { ...h2.options, ...v2.options } : h2.options), t.set(h2.name, { plugin: h2, config: v2 }), i(), v2;
  }, f = (h2) => {
    let g2 = t.get(h2);
    g2 && (g2.config.cleanup && g2.config.cleanup(), t.delete(h2), i());
  }, p2 = () => Array.from(t.keys()), y2 = (h2, ...g2) => {
    for (let { config: v2 } of t.values()) {
      let I2 = v2.hooks?.[h2];
      I2 && I2(...g2);
    }
  }, T2 = (h2, ...g2) => {
    let v2 = false;
    for (let { config: I2 } of t.values()) {
      let K = I2.hooks?.[h2];
      K && K(...g2) === true && (v2 = true);
    }
    return v2;
  }, H2 = async (h2, ...g2) => {
    for (let { config: v2 } of t.values()) {
      let I2 = v2.hooks?.[h2];
      I2 && await I2(...g2);
    }
  }, $2 = async (h2, g2, ...v2) => {
    let I2 = g2;
    for (let { config: K } of t.values()) {
      let Q2 = K.hooks?.[h2];
      Q2 && (I2 = await Q2(I2, ...v2));
    }
    return I2;
  }, b2 = (h2, g2, ...v2) => {
    let I2 = g2;
    for (let { config: K } of t.values()) {
      let Q2 = K.hooks?.[h2];
      Q2 && (I2 = Q2(I2, ...v2));
    }
    return I2;
  }, w3 = { onActivate: () => y2("onActivate"), onDeactivate: () => y2("onDeactivate"), onElementHover: (h2) => y2("onElementHover", h2), onElementSelect: (h2) => {
    let g2 = false, v2;
    for (let { config: I2 } of t.values()) {
      let K = I2.hooks?.onElementSelect;
      if (K) {
        let Q2 = K(h2);
        Q2 === true ? g2 = true : Q2 instanceof Promise && (g2 = true, v2 = Q2);
      }
    }
    return { wasIntercepted: g2, pendingResult: v2 };
  }, onDragStart: (h2, g2) => y2("onDragStart", h2, g2), onDragEnd: (h2, g2) => y2("onDragEnd", h2, g2), onBeforeCopy: async (h2) => H2("onBeforeCopy", h2), transformCopyContent: async (h2, g2) => $2("transformCopyContent", h2, g2), onAfterCopy: (h2, g2) => y2("onAfterCopy", h2, g2), onCopySuccess: (h2, g2) => y2("onCopySuccess", h2, g2), onCopyError: (h2) => y2("onCopyError", h2), onStateChange: (h2) => y2("onStateChange", h2), onPromptModeChange: (h2, g2) => y2("onPromptModeChange", h2, g2), onSelectionBox: (h2, g2, v2) => y2("onSelectionBox", h2, g2, v2), onDragBox: (h2, g2) => y2("onDragBox", h2, g2), onGrabbedBox: (h2, g2) => y2("onGrabbedBox", h2, g2), onElementLabel: (h2, g2, v2) => y2("onElementLabel", h2, g2, v2), onCrosshair: (h2, g2) => y2("onCrosshair", h2, g2), onContextMenu: (h2, g2) => y2("onContextMenu", h2, g2), cancelPendingToolbarActions: () => y2("cancelPendingToolbarActions"), onOpenFile: (h2, g2) => T2("onOpenFile", h2, g2), transformHtmlContent: async (h2, g2) => $2("transformHtmlContent", h2, g2), transformAgentContext: async (h2, g2) => $2("transformAgentContext", h2, g2), transformActionContext: (h2) => b2("transformActionContext", h2), transformOpenFileUrl: (h2, g2, v2) => b2("transformOpenFileUrl", h2, g2, v2), transformSnippet: async (h2, g2) => $2("transformSnippet", h2, g2) };
  return { register: d2, unregister: f, getPluginNames: p2, setOptions: s, store: o2, hooks: w3 };
};
var zs = "react-grab:agent-sessions";
var Tg = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
var Nc = (e, t, n2, o2, l2) => {
  let a = Date.now();
  return { id: Tg(), context: e, lastStatus: "", isStreaming: true, createdAt: a, lastUpdatedAt: a, position: t, selectionBounds: n2, tagName: o2, componentName: l2 };
};
var ln2 = /* @__PURE__ */ new Map();
var Rc = () => {
  for (; ln2.size > Jo; ) {
    let e = ln2.keys().next().value;
    e !== void 0 && ln2.delete(e);
  }
};
var Di = (e, t) => {
  if (!t) {
    ln2.clear(), e.forEach((n2, o2) => ln2.set(o2, n2)), Rc();
    return;
  }
  try {
    let n2 = Object.fromEntries(e);
    t.setItem(zs, JSON.stringify(n2));
  } catch {
    ln2.clear(), e.forEach((n2, o2) => ln2.set(o2, n2)), Rc();
  }
};
var Li = (e, t) => {
  let n2 = Ri(t);
  n2.set(e.id, e), Di(n2, t);
};
var Ri = (e) => {
  if (!e) return new Map(ln2);
  try {
    let t = e.getItem(zs);
    if (!t) return /* @__PURE__ */ new Map();
    let n2 = JSON.parse(t);
    return new Map(Object.entries(n2));
  } catch {
    return /* @__PURE__ */ new Map();
  }
};
var Ni = (e) => {
  if (!e) {
    ln2.clear();
    return;
  }
  try {
    e.removeItem(zs);
  } catch {
    ln2.clear();
  }
};
var Ks = (e, t) => {
  let n2 = Ri(t);
  n2.delete(e), Di(n2, t);
};
var zn2 = (e, t, n2) => {
  let o2 = { ...e, ...t, lastUpdatedAt: Date.now() };
  return Li(o2, n2), o2;
};
var Vs = (e, t) => {
  let [n2, o2] = B2(/* @__PURE__ */ new Map()), [l2, a] = B2(false), [i, c] = B2(false), s = /* @__PURE__ */ new Map(), d2 = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), p2 = [], y2 = [], T2 = e, H2 = (x2) => f.get(x2)?.agent ?? T2, $2 = (x2) => f.get(x2)?.elements ?? [], b2 = (x2) => {
    let A2 = x2 ?? T2, j2 = A2?.provider?.canUndo?.() ?? false, z2 = A2?.provider?.canRedo?.() ?? false;
    a(j2), c(z2);
  }, w3 = (x2) => {
    T2 = x2, b2();
  }, h2 = () => T2, g2 = () => Array.from(n2().values()).some((x2) => x2.isStreaming), v2 = async (x2, A2, j2, z2) => {
    let ne2 = z2 ?? T2, G2 = ne2?.storage, Ee2 = false, ve2 = () => s.get(x2.id) === j2;
    try {
      for await (let ie2 of A2) {
        if (!ve2()) break;
        let he2 = n2().get(x2.id);
        if (!he2) break;
        let ke2 = zn2(he2, { lastStatus: ie2 }, G2);
        o2((ge2) => new Map(ge2).set(x2.id, ke2)), ne2?.onStatus?.(ie2, ke2);
      }
      if (!ve2()) return;
      let F2 = n2().get(x2.id);
      if (F2) {
        let ie2 = ne2?.provider?.getCompletionMessage?.(), Me2 = zn2(F2, { isStreaming: false, ...ie2 ? { lastStatus: ie2 } : {} }, G2);
        o2((Ce2) => new Map(Ce2).set(x2.id, Me2));
        let he2 = $2(x2.id), ke2 = await ne2?.onComplete?.(Me2, he2), ge2 = y2.findIndex((Ce2) => Ce2.session.id === x2.id);
        if (ge2 !== -1 && y2.splice(ge2, 1), y2.push({ session: Me2, elements: he2, agent: ne2 }), b2(ne2), p2.length = 0, ke2?.error) {
          let Ce2 = zn2(Me2, { error: ke2.error }, G2);
          o2((He2) => new Map(He2).set(x2.id, Ce2));
        }
      }
    } catch (L2) {
      if (!ve2()) return;
      let ie2 = n2().get(x2.id);
      if (L2 instanceof Error && L2.name === "AbortError") {
        if (Ee2 = true, ie2) {
          let Me2 = $2(x2.id);
          ne2?.onAbort?.(ie2, Me2);
        }
      } else {
        let Me2 = L2 instanceof Error ? L2.message : "Unknown error";
        if (ie2) {
          let he2 = zn2(ie2, { error: Me2, isStreaming: false }, G2);
          o2((ke2) => new Map(ke2).set(x2.id, he2)), L2 instanceof Error && ne2?.onError?.(L2, he2);
        }
      }
    } finally {
      if (!ve2()) return;
      if (s.delete(x2.id), Ee2) {
        let L2 = d2.get(x2.id);
        L2 && (clearTimeout(L2), d2.delete(x2.id)), f.delete(x2.id), Ks(x2.id, G2), o2((F2) => {
          let ie2 = new Map(F2);
          return ie2.delete(x2.id), ie2;
        });
      }
    }
  }, I2 = (x2) => {
    let { selectionBounds: A2, tagName: j2 } = x2, z2 = A2[0];
    if (!z2) return;
    let ne2 = z2.x + z2.width / 2, G2 = z2.y + z2.height / 2, Ee2 = document.elementFromPoint(ne2, G2);
    if (!(!Ee2 || j2 && !j2.includes(" ") && v(Ee2) !== j2)) return Ee2;
  }, K = () => {
    let x2 = T2?.storage;
    if (!x2) return;
    let A2 = Ri(x2);
    if (A2.size === 0) return;
    let j2 = Date.now(), z2 = Array.from(A2.values()).filter((G2) => {
      if (G2.isStreaming) return true;
      let Ee2 = G2.lastUpdatedAt ?? G2.createdAt;
      return j2 - Ee2 < 1e4 && !!G2.error;
    });
    if (z2.length === 0) {
      Ni(x2);
      return;
    }
    if (!T2?.provider?.supportsResume || !T2.provider.resume) {
      Ni(x2);
      return;
    }
    d2.forEach((G2) => clearTimeout(G2)), d2.clear(), s.forEach((G2) => G2.abort()), s.clear(), f.clear();
    let ne2 = new Map(z2.map((G2) => [G2.id, G2]));
    o2(ne2), Di(ne2, x2);
    for (let G2 of z2) {
      let Ee2 = I2(G2);
      Ee2 && T2 && f.set(G2.id, { elements: [Ee2], agent: T2 });
      let ve2 = { ...G2, isStreaming: true, error: void 0, lastStatus: G2.lastStatus || "Resuming...", position: G2.position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 } };
      o2((ie2) => new Map(ie2).set(G2.id, ve2)), T2?.onResume?.(ve2);
      let L2 = new AbortController();
      s.set(G2.id, L2);
      let F2 = T2.provider.resume(G2.id, L2.signal, x2);
      v2(G2, F2, L2);
    }
  }, Q2 = async (x2) => {
    let { elements: A2, prompt: j2, position: z2, selectionBounds: ne2, sessionId: G2, agent: Ee2 } = x2, ve2 = Ee2 ?? (G2 ? H2(G2) : T2), L2 = ve2?.storage;
    if (!ve2?.provider || A2.length === 0) return;
    let F2 = A2[0], ie2 = G2 ? n2().get(G2) : void 0, Me2 = !!G2, ke2 = { content: ie2 ? ie2.context.content : (await vr2(A2, { maxLines: 1 / 0 })).filter((Se2) => Se2.trim()), prompt: j2, options: ve2?.getOptions?.(), sessionId: Me2 ? G2 : void 0 }, ge2;
    if (ie2) ge2 = zn2(ie2, { context: ke2, isStreaming: true, lastStatus: "Thinking…" }, L2);
    else {
      let Se2 = A2.length > 1 ? `${A2.length} elements` : v(F2) || void 0, tt2 = A2.length > 1 ? void 0 : await Ui(F2) || void 0;
      ge2 = Nc(ke2, z2, ne2, Se2, tt2), ge2.lastStatus = "Thinking…";
    }
    f.set(ge2.id, { elements: A2, agent: ve2 }), o2((Se2) => new Map(Se2).set(ge2.id, ge2)), Li(ge2, L2), ve2.onStart?.(ge2, A2);
    let Ce2 = new AbortController();
    s.set(ge2.id, Ce2);
    let He2 = { ...ke2, sessionId: G2 ?? ge2.id }, Oe2;
    try {
      Oe2 = t?.transformAgentContext ? await t.transformAgentContext(He2, A2) : He2;
    } catch (Se2) {
      let tt2 = Se2 instanceof Error ? Se2.message : "Context transformation failed", ot = zn2(ge2, { error: tt2, isStreaming: false }, L2);
      o2((ft2) => new Map(ft2).set(ge2.id, ot)), s.delete(ge2.id), Se2 instanceof Error && ve2.onError?.(Se2, ot);
      return;
    }
    let be2 = ve2.provider.send(Oe2, Ce2.signal);
    v2(ge2, be2, Ce2, ve2);
  }, X2 = (x2) => {
    if (x2) {
      let A2 = s.get(x2);
      A2 && A2.abort();
    } else s.forEach((A2) => A2.abort()), s.clear(), d2.forEach((A2) => clearTimeout(A2)), d2.clear(), f.clear(), y2.length = 0, p2.length = 0, o2(/* @__PURE__ */ new Map()), Ni(T2?.storage), b2();
  }, te2 = (x2, A2, j2) => {
    let ne2 = n2().get(x2), G2 = A2 ?? H2(x2), Ee2 = j2 ?? $2(x2);
    if (ne2?.isFading) return;
    ne2 && Ee2.length > 0 && G2?.onDismiss?.(ne2, Ee2), o2((F2) => {
      let ie2 = new Map(F2), Me2 = ie2.get(x2);
      return Me2 && ie2.set(x2, { ...Me2, isFading: true }), ie2;
    });
    let ve2 = d2.get(x2);
    ve2 && clearTimeout(ve2);
    let L2 = setTimeout(() => {
      d2.delete(x2);
      let F2 = s.get(x2);
      F2 && (F2.abort(), s.delete(x2)), f.delete(x2), Ks(x2, G2?.storage), o2((ie2) => {
        let Me2 = new Map(ie2);
        return Me2.delete(x2), Me2;
      });
    }, 150);
    d2.set(x2, L2);
  };
  return { sessions: n2, isProcessing: g2, canUndo: l2, canRedo: i, session: { start: Q2, abort: X2, dismiss: te2, retry: (x2) => {
    let j2 = n2().get(x2), z2 = H2(x2);
    if (!j2 || !z2?.provider) return;
    let ne2 = z2.storage, G2 = $2(x2), Ee2 = zn2(j2, { error: void 0, isStreaming: true, lastStatus: "Retrying…" }, ne2);
    o2((ie2) => new Map(ie2).set(x2, Ee2)), Li(Ee2, ne2), G2.length > 0 && z2.onStart?.(Ee2, G2);
    let ve2 = new AbortController();
    s.set(x2, ve2);
    let L2 = { ...Ee2.context, sessionId: x2 }, F2 = z2.provider.send(L2, ve2.signal);
    v2(Ee2, F2, ve2, z2);
  }, undo: (x2) => {
    let j2 = n2().get(x2), z2 = H2(x2), ne2 = $2(x2);
    if (j2) {
      p2.push({ session: j2, elements: ne2, agent: z2 });
      let G2 = y2.findIndex((Ee2) => Ee2.session.id === x2);
      G2 !== -1 && y2.splice(G2, 1), z2?.onUndo?.(j2, ne2), z2?.provider?.undo?.();
    }
    te2(x2, z2, ne2), b2(z2);
  }, getElement: (x2) => $2(x2)[0], getElements: (x2) => $2(x2), tryResume: K, acknowledgeError: (x2) => {
    let z2 = n2().get(x2)?.context.prompt;
    return te2(x2), z2;
  } }, history: { undo: () => {
    let x2 = y2.pop();
    if (!x2) return;
    let { session: A2, elements: j2, agent: z2 } = x2, ne2 = z2 ?? T2;
    p2.push(x2), ne2?.onUndo?.(A2, j2), ne2?.provider?.undo?.(), te2(A2.id, ne2, j2), b2(ne2);
  }, redo: () => {
    let x2 = p2.pop();
    if (!x2) return;
    let A2 = x2.agent ?? T2, { session: j2, elements: z2 } = x2;
    A2?.provider?.redo?.();
    let ne2 = z2.filter((G2) => qe2(G2));
    if (ne2.length === 0) {
      let G2 = I2(j2);
      G2 && (ne2 = [G2]);
    }
    if (ne2.length > 0 && A2) {
      y2.push(x2);
      let G2 = ne2.map((ve2) => ze2(ve2)), Ee2 = { ...j2, selectionBounds: G2 };
      f.set(j2.id, { elements: ne2, agent: A2 }), o2((ve2) => new Map(ve2).set(j2.id, Ee2));
    }
    b2(A2);
  } }, _internal: { updateBoundsOnViewportChange: () => {
    let x2 = n2();
    if (x2.size === 0) return;
    let A2 = new Map(x2), j2 = false;
    for (let [z2, ne2] of x2) {
      let G2 = $2(z2), Ee2 = G2[0];
      if (qe2(Ee2)) {
        let ve2 = G2.filter((L2) => qe2(L2)).map((L2) => ze2(L2));
        if (ve2.length > 0) {
          let L2 = ne2.selectionBounds[0], F2 = ve2[0], ie2 = li({ currentPosition: ne2.position, previousBounds: L2, nextBounds: F2 });
          A2.set(z2, { ...ne2, selectionBounds: ve2, position: ie2 }), j2 = true;
        }
      }
    }
    j2 && o2(A2);
  }, setOptions: w3, getOptions: h2 } };
};
var $c = (e, t) => {
  let n2 = [], o2 = (d2, f) => {
    let p2 = t(d2), y2 = Ti(p2), T2 = ya(y2.x, y2.y).filter(e), H2 = T2.indexOf(d2);
    return H2 === -1 ? null : T2[H2 + f] ?? null;
  }, l2 = (d2) => {
    let f = o2(d2, 1);
    return f && (n2.push(d2), n2.length > Qo && (n2 = n2.slice(-Qo))), f;
  }, a = (d2) => {
    if (n2.length > 0) {
      let f = n2.pop();
      if (qe2(f)) return f;
    }
    return o2(d2, -1);
  }, i = (d2, f) => {
    let p2 = (H2) => {
      let $2 = Array.from(H2.children), b2 = f ? $2 : $2.reverse();
      for (let w3 of b2) if (f) {
        if (e(w3)) return w3;
        let h2 = p2(w3);
        if (h2) return h2;
      } else {
        let h2 = p2(w3);
        if (h2) return h2;
        if (e(w3)) return w3;
      }
      return null;
    }, y2 = (H2) => f ? H2.nextElementSibling : H2.previousElementSibling, T2 = null;
    if (f && (T2 = p2(d2)), !T2) {
      let H2 = d2;
      for (; H2; ) {
        let $2 = y2(H2);
        for (; $2; ) {
          let w3 = p2($2);
          if (w3) {
            T2 = w3;
            break;
          }
          if (e($2)) {
            T2 = $2;
            break;
          }
          $2 = y2($2);
        }
        if (T2) break;
        let b2 = H2.parentElement;
        if (!f && b2 && e(b2)) {
          T2 = b2;
          break;
        }
        H2 = b2;
      }
    }
    return T2;
  };
  return { findNext: (d2, f) => {
    switch (d2) {
      case "ArrowUp":
        return l2(f);
      case "ArrowDown":
        return a(f);
      case "ArrowRight":
        return i(f, true);
      case "ArrowLeft":
        return i(f, false);
      default:
        return null;
    }
  }, clearHistory: () => {
    n2 = [];
  } };
};
var Bc = (e) => {
  let { metaKey: t, ctrlKey: n2, shiftKey: o2, altKey: l2 } = Oc(e.activationKey);
  return { metaKey: t, ctrlKey: n2, shiftKey: o2, altKey: l2 };
};
var Hc = () => {
  let e = /* @__PURE__ */ new WeakSet(), t = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, "key"), n2 = false;
  if (t?.get && !t.get.__reactGrabPatched) {
    n2 = true;
    let l2 = t.get, a = function() {
      return e.has(this) ? "" : l2.call(this);
    };
    a.__reactGrabPatched = true, Object.defineProperty(KeyboardEvent.prototype, "key", { get: a, configurable: true });
  }
  return { claimedEvents: e, originalKeyDescriptor: t, didPatch: n2, restore: () => {
    n2 && t && Object.defineProperty(KeyboardEvent.prototype, "key", t);
  } };
};
var Us = (e, t) => ({ top: t < 25, bottom: t > window.innerHeight - 25, left: e < 25, right: e > window.innerWidth - 25 });
var Fc = (e, t) => {
  let n2 = null, o2 = () => {
    if (!t()) {
      a();
      return;
    }
    let c = e(), s = Us(c.x, c.y);
    s.top && window.scrollBy(0, -10), s.bottom && window.scrollBy(0, 10), s.left && window.scrollBy(-10, 0), s.right && window.scrollBy(10, 0), s.top || s.bottom || s.left || s.right ? n2 = D(o2) : n2 = null;
  }, l2 = () => {
    o2();
  }, a = () => {
    n2 !== null && (q(n2), n2 = null);
  };
  return { start: l2, stop: a, isActive: () => n2 !== null };
};
var zc = () => {
  let e = globalThis;
  return !!(e.chrome?.runtime?.id || e.browser?.runtime?.id);
};
var Kc = () => {
  try {
    let e = "0.1.27", t = `data:image/svg+xml;base64,${btoa(Ss)}`;
    console.log(`%cReact Grab${e ? ` v${e}` : ""}%c
https://react-grab.com`, `background: #330039; color: #ffffff; border: 1px solid #d75fcb; padding: 4px 4px 4px 24px; border-radius: 4px; background-image: url("${t}"); background-size: 16px 16px; background-repeat: no-repeat; background-position: 4px center; display: inline-block; margin-bottom: 4px;`, ""), navigator.onLine && e && !zc() && fetch(`https://www.react-grab.com/api/version?source=browser&t=${Date.now()}`, { referrerPolicy: "origin", keepalive: true, priority: "low", cache: "no-store" }).then((n2) => n2.text()).then((n2) => {
      n2 && n2 !== e && console.warn(`[React Grab] v${e} is outdated (latest: v${n2})`);
    }).catch(() => null);
  } catch {
  }
};
var Mg = (e) => typeof e != "object" || e === null || !("postTask" in e) ? false : typeof e.postTask == "function";
var Vc = (e) => {
  if (typeof window < "u") {
    let t = window.scheduler;
    if (Mg(t)) {
      t.postTask(e, { priority: "background" });
      return;
    }
    if ("requestIdleCallback" in window) {
      requestIdleCallback(e);
      return;
    }
  }
  setTimeout(e, 0);
};
var Ig = (e) => typeof e == "object" && e !== null;
var _g = (e) => {
  if (!Ig(e)) return null;
  let t = {};
  return typeof e.enabled == "boolean" && (t.enabled = e.enabled), (e.activationMode === "toggle" || e.activationMode === "hold") && (t.activationMode = e.activationMode), typeof e.keyHoldDuration == "number" && Number.isFinite(e.keyHoldDuration) && (t.keyHoldDuration = e.keyHoldDuration), typeof e.allowActivationInsideInput == "boolean" && (t.allowActivationInsideInput = e.allowActivationInsideInput), typeof e.maxContextLines == "number" && Number.isFinite(e.maxContextLines) && (t.maxContextLines = e.maxContextLines), typeof e.activationKey == "string" && (t.activationKey = e.activationKey), typeof e.freezeReactUpdates == "boolean" && (t.freezeReactUpdates = e.freezeReactUpdates), Object.keys(t).length === 0 ? null : t;
};
var Uc = () => {
  if (typeof window > "u") return null;
  try {
    let t = (document.currentScript instanceof HTMLScriptElement ? document.currentScript : null)?.getAttribute("data-options");
    return t ? _g(JSON.parse(t)) : null;
  } catch {
    return null;
  }
};
var io2 = (e) => e === "Enter" || e === "NumpadEnter";
var Gc = { name: "copy", setup: (e) => {
  let t = false;
  return { hooks: { onElementSelect: (n2) => {
    if (t) return t = false, e.copyElement(n2), true;
  }, onDeactivate: () => {
    t = false;
  }, cancelPendingToolbarActions: () => {
    t = false;
  } }, actions: [{ id: "copy", label: "Copy", shortcut: "C", onAction: (n2) => {
    n2.copy?.();
  } }, { id: "copy-toolbar", label: "Copy element", shortcut: "C", target: "toolbar", onAction: () => {
    t = true, e.activate();
  } }] };
} };
var Wc = { name: "comment", setup: (e) => ({ actions: [{ id: "comment", label: "Comment", shortcut: "Enter", onAction: (t) => {
  t.enterPromptMode?.();
} }, { id: "comment-toolbar", label: "Comment", shortcut: "Enter", target: "toolbar", onAction: () => {
  e.comment();
} }] }) };
var jc = { name: "open", actions: [{ id: "open", label: "Open", shortcut: "O", enabled: (e) => !!e.filePath, onAction: (e) => {
  if (!e.filePath) return;
  e.hooks.onOpenFile(e.filePath, e.lineNumber) || Zi(e.filePath, e.lineNumber, e.hooks.transformOpenFileUrl), e.hideContextMenu(), e.cleanup();
} }] };
var Ko2 = (e, t) => t ? `${e}
${t}` : e;
var Xc = { name: "copy-html", setup: (e, t) => {
  let n2 = false;
  return { hooks: { onElementSelect: (o2) => {
    if (n2) return n2 = false, Promise.all([t.transformHtmlContent(o2.outerHTML, [o2]), e.getStackContext(o2)]).then(([l2, a]) => {
      l2 && Gt2(Ko2(l2, a));
    }).catch(() => {
    }), true;
  }, onDeactivate: () => {
    n2 = false;
  }, cancelPendingToolbarActions: () => {
    n2 = false;
  } }, actions: [{ id: "copy-html", label: "Copy HTML", onAction: async (o2) => {
    await o2.performWithFeedback(async () => {
      let l2 = o2.elements.map((c) => c.outerHTML).join(`

`), a = await o2.hooks.transformHtmlContent(l2, o2.elements);
      if (!a) return false;
      let i = await e.getStackContext(o2.element);
      return Gt2(Ko2(a, i), { componentName: o2.componentName, tagName: o2.tagName });
    });
  } }, { id: "copy-html-toolbar", label: "Copy HTML", target: "toolbar", onAction: () => {
    n2 = true, e.activate();
  } }] };
} };
var Yc = { name: "copy-styles", setup: (e) => {
  let t = false;
  return { hooks: { onElementSelect: (n2) => {
    if (!t) return;
    t = false;
    let o2 = Pa(n2);
    return e.getStackContext(n2).then((l2) => {
      Gt2(Ko2(o2, l2));
    }).catch(() => {
    }), true;
  }, onDeactivate: () => {
    t = false;
  }, cancelPendingToolbarActions: () => {
    t = false;
  } }, actions: [{ id: "copy-styles", label: "Copy styles", onAction: async (n2) => {
    await n2.performWithFeedback(async () => {
      let o2 = n2.elements.map(Pa).join(`

`), l2 = await e.getStackContext(n2.element);
      return Gt2(Ko2(o2, l2), { componentName: n2.componentName, tagName: n2.tagName });
    });
  } }, { id: "copy-styles-toolbar", label: "Copy styles", target: "toolbar", onAction: () => {
    t = true, e.activate();
  } }], cleanup: Ma };
} };
var qc = "react-grab-history-items";
var Og = () => {
  try {
    let e = sessionStorage.getItem(qc);
    return e ? JSON.parse(e).map((n2) => ({ ...n2, elementsCount: Math.max(1, n2.elementsCount ?? 1), previewBounds: n2.previewBounds ?? [], elementSelectors: n2.elementSelectors ?? [] })) : [];
  } catch {
    return [];
  }
};
var Dg = (e) => {
  let t = e;
  for (; t.length > 0; ) {
    let n2 = JSON.stringify(t);
    if (new Blob([n2]).size <= ss) return t;
    t = t.slice(0, -1);
  }
  return t;
};
var Gs = (e) => {
  try {
    let t = Dg(e);
    sessionStorage.setItem(qc, JSON.stringify(t));
  } catch {
  }
};
var Wt2 = Og();
var Lg = () => `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
var Ws = () => Wt2;
var Zc = (e) => (Wt2 = [{ ...e, id: Lg() }, ...Wt2].slice(0, os), Gs(Wt2), Wt2);
var js = (e) => (Wt2 = Wt2.filter((t) => t.id !== e), Gs(Wt2), Wt2);
var Jc = () => (Wt2 = [], Gs(Wt2), Wt2);
var jg = [Gc, Wc, Xc, Yc, jc];
var Xs = false;
var Kn2 = /* @__PURE__ */ new Set();
var YC = (e) => {
  if (typeof window > "u") return $s();
  let t = Uc(), n2 = { enabled: true, activationMode: "toggle", keyHoldDuration: 100, allowActivationInsideInput: true, maxContextLines: 3, ...t, ...e };
  if (n2.enabled === false || Xs) return $s();
  Xs = true, Kc();
  let { enabled: o$1, ...l2 } = n2;
  return yn2((a) => {
    let i = Lc(l2), c = () => {
      for (let r of i.store.actions) if (r.agent?.provider) return r.agent;
    }, { store: s, actions: d2 } = zl({ theme: ro, hasAgentProvider: !!c()?.provider, keyHoldDuration: i.store.options.keyHoldDuration ?? 100 }), f = se2(() => s.current.state === "holding"), p$1 = se2(() => s.current.state === "active");
    pe2(Be2(p$1, (r, u) => {
      r && !u ? (Ta(), aa(), document.body.style.touchAction = "none") : !r && u && (ha(), la(), document.body.style.touchAction = "");
    }));
    let y2 = se2(() => s.current.state === "active" && s.current.phase === "frozen"), T$1 = se2(() => s.current.state === "active" && s.current.phase === "dragging"), H2 = se2(() => s.current.state === "active" && s.current.phase === "justDragged"), $2 = se2(() => s.current.state === "copying"), b2 = se2(() => s.current.state === "justCopied"), w3 = se2(() => s.current.state === "active" && s.current.isPromptMode), h2 = se2(() => s.pendingCommentMode || w3()), g2 = se2(() => s.current.state === "active" && s.current.isPromptMode && s.current.isPendingDismiss), v2 = no(), [I2, K] = B2(v2?.enabled ?? true), [Q2, X2] = B2(0), [te2, ye2] = B2(v2), [ue2, W2] = B2(false), [V2, S2] = B2(Ws()), [O2, U2] = B2(null), [q$1, x2] = B2(null), [A2, j2] = B2(null), z2, ne2 = null, G2 = /* @__PURE__ */ new Map(), [Ee2, ve2] = B2(false), [L2, F2] = B2(0), [ie2, Me2] = B2(false), he2 = [], ke2 = (r) => G2.get(r) ?? [], ge2 = (r) => {
      let u = r.elementSelectors ?? [];
      if (u.length === 0) return [];
      let m = [];
      for (let C2 of u) if (C2) try {
        let k2 = document.querySelector(C2);
        qe2(k2) && m.push(k2);
      } catch {
      }
      return m;
    }, Ce2 = (r) => {
      let u = ke2(r.id), m = u.filter((R3) => qe2(R3));
      if (u.length > 0 && m.length === u.length) return m;
      let k2 = ge2(r);
      return k2.length > 0 ? (G2.set(r.id, k2), k2) : m;
    }, He2 = (r) => Ce2(r)[0], Oe2 = se2(() => {
      O2();
      let r = /* @__PURE__ */ new Set();
      for (let u of V2()) Ce2(u).length === 0 && r.add(u.id);
      return r;
    }, void 0, { equals: (r, u) => {
      if (r.size !== u.size) return false;
      for (let m of u) if (!r.has(m)) return false;
      return true;
    } }), be2 = se2(() => s.pendingAbortSessionId), Se2 = se2(() => s.hasAgentProvider), tt2 = () => {
      jt2 !== null && (clearTimeout(jt2), jt2 = null);
    }, ot = () => {
      un2 = false, nn2 = false, Ht2 = null;
    };
    pe2(() => {
      if (s.current.state !== "holding") {
        tt2();
        return;
      }
      Ht2 = Date.now(), jt2 = window.setTimeout(() => {
        if (jt2 = null, un2) {
          nn2 = true;
          return;
        }
        d2.activate();
      }, s.keyHoldDuration), Te2(tt2);
    }), pe2(() => {
      if (s.current.state !== "active" || s.current.phase !== "justDragged") return;
      let r = setTimeout(() => {
        d2.finishJustDragged();
      }, 1500);
      Te2(() => clearTimeout(r));
    }), pe2(() => {
      if (s.current.state !== "justCopied") return;
      let r = setTimeout(() => {
        d2.finishJustCopied();
      }, 1500);
      Te2(() => clearTimeout(r));
    }), pe2(Be2(f, (r, u = false) => {
      !u || r || !p$1() || (i.store.options.activationMode !== "hold" && d2.setWasActivatedByToggle(true), i.hooks.onActivate());
    }));
    let ft2 = (r, u, m) => {
      so2(r, u, m), d2.clearInputText();
    }, _t2 = () => {
      let r = s.frozenElement || Z2();
      r && d2.enterPromptMode({ x: s.pointer.x, y: s.pointer.y }, r);
    }, so2 = (r, u, m) => (d2.setCopyStart({ x: u, y: m }, r), ze2(r)), Vn2 = 0, Sn2 = 0, ht2 = 0, en2 = 0, mt2 = null, [tn2, cn2] = B2(null), dn2 = (r, u) => {
      mt2 !== null && clearTimeout(mt2), cn2(null), mt2 = window.setTimeout(() => {
        cn2({ x: r, y: u }), mt2 = null;
      }, 32);
    }, st2 = null, jt2 = null, Ht2 = null, un2 = false, nn2 = false, Sr2 = 0, Ot2 = false, Dt = null, De2 = null, ao2 = 0, lo2 = 0, gt2 = null, vt2 = null, on2 = false, [Un2, An2] = B2(null), [Ar2, Gn2] = B2(void 0), [rn2, Tr2] = B2([]), [co2, kr2] = B2(null), [Tn2, Pr2] = B2([]), [Fi, uo2] = B2(0), kn2 = $c(qe, ze2), Ft2 = Fc(() => s.pointer, () => T$1()), Tt2 = se2(() => p$1() && !$2()), fo2 = se2(() => i.store.theme.enabled && i.store.theme.crosshair.enabled && Tt2() && !T$1() && !s.isTouchMode && !y2() && !w3() && !ue2() && s.contextMenuPosition === null), fn2 = /* @__PURE__ */ new Map(), bt2 = (r, u) => {
      let m = `grabbed-${Date.now()}-${Math.random()}`, C2 = Date.now(), k2 = { id: m, bounds: r, createdAt: C2, element: u };
      d2.addGrabbedBox(k2), i.hooks.onGrabbedBox(r, u);
      let R3 = window.setTimeout(() => {
        fn2.delete(m), d2.removeGrabbedBox(m);
      }, 1500);
      fn2.set(m, R3);
    }, Mr2 = async (r) => {
      let u = await Promise.all(r.map(async (m) => {
        let C2 = await Ut(m), k2 = null, R3, ae2, le2;
        if (C2 && C2.length > 0) for (let xe2 of C2) {
          let Ve2 = xe2.functionName && B(xe2.functionName), Je2 = xe2.fileName && oe(xe2.fileName);
          if (Ve2 && !k2 && (k2 = xe2.functionName), Je2 && !R3 && (R3 = I(xe2.fileName), ae2 = xe2.lineNumber || void 0, le2 = xe2.columnNumber || void 0), k2 && R3) break;
        }
        k2 || (k2 = zi(m));
        let _e2 = m instanceof HTMLElement ? m.innerText?.slice(0, pe) : void 0;
        return { tagName: v(m), id: m.id || void 0, className: m.getAttribute("class") || void 0, textContent: _e2, componentName: k2 ?? void 0, filePath: R3, lineNumber: ae2, columnNumber: le2 };
      }));
      window.dispatchEvent(new CustomEvent("react-grab:element-selected", { detail: { elements: u } }));
    }, Pn2 = (r, u, m, C2, k2) => {
      d2.clearLabelInstances();
      let R3 = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`, ae2 = r.x + r.width / 2, le2 = r.width / 2, _e2 = k2?.mouseX, xe2 = _e2 !== void 0 ? _e2 - ae2 : void 0, Ve2 = { id: R3, bounds: r, boundsMultiple: k2?.boundsMultiple, tagName: u, componentName: m, status: C2, createdAt: Date.now(), element: k2?.element, elements: k2?.elements, mouseX: _e2, mouseXOffsetFromCenter: xe2, mouseXOffsetRatio: xe2 !== void 0 && le2 > 0 ? xe2 / le2 : void 0, hideArrow: k2?.hideArrow };
      return d2.addLabelInstance(Ve2), R3;
    }, Lt2 = (r) => {
      zt2.delete(r), d2.removeLabelInstance(r);
    }, zt2 = /* @__PURE__ */ new Map(), mn2 = (r) => {
      let u = zt2.get(r);
      u !== void 0 && (window.clearTimeout(u), zt2.delete(r));
    }, Kt2 = (r) => {
      mn2(r);
      let u = window.setTimeout(() => {
        zt2.delete(r), d2.updateLabelInstance(r, "fading"), setTimeout(() => {
          Lt2(r);
        }, 150);
      }, 1500);
      zt2.set(r, u);
    }, Wn2 = (r, u) => {
      if (u) mn2(r);
      else {
        let m = s.labelInstances.find((C2) => C2.id === r);
        m && m.status === "copied" && Kt2(r);
      }
    }, zi2 = async ({ positionX: r, operation: u, bounds: m, tagName: C2, componentName: k2, element: R3, shouldDeactivateAfter: ae2, elements: le2, existingInstanceId: _e2 }) => {
      Ot2 = false, s.current.state !== "copying" && d2.startCopy();
      let xe2 = _e2 ?? null;
      !xe2 && m && C2 && (xe2 = Pn2(m, C2, k2, "copying", { element: R3, mouseX: r, elements: le2 }));
      let Ve2 = false, Je2;
      try {
        await u(), Ve2 = true;
      } catch (it2) {
        Je2 = it2 instanceof Error && it2.message ? it2.message : "Action failed";
      }
      xe2 && (Ve2 ? d2.updateLabelInstance(xe2, "copied") : d2.updateLabelInstance(xe2, "error", Je2 || "Unknown error"), Kt2(xe2)), s.current.state === "copying" && (Ve2 && d2.completeCopy(R3), ae2 ? nt2() : Ve2 ? (d2.activate(), Ot2 = true, Dt !== null && window.clearTimeout(Dt), Dt = window.setTimeout(() => {
        Ot2 = false, Dt = null;
      }, 1500)) : d2.unfreeze());
    }, Ir2 = (r, u, m) => {
      let C2 = r[0], k2 = m ?? (C2 ? zi(C2) : null), R3 = C2 ? v(C2) : null, ae2 = k2 ?? R3 ?? void 0;
      return Pc({ maxContextLines: i.store.options.maxContextLines, getContent: i.store.options.getContent, componentName: ae2 }, { onBeforeCopy: i.hooks.onBeforeCopy, transformSnippet: i.hooks.transformSnippet, transformCopyContent: i.hooks.transformCopyContent, onAfterCopy: i.hooks.onAfterCopy, onCopySuccess: (le2, _e2) => {
        i.hooks.onCopySuccess(le2, _e2);
        let xe2 = le2.length > 0, Ve2 = !!u;
        if (xe2) {
          let Et2 = V2();
          for (let [Yt2, hn2] of G2.entries()) {
            if (!(hn2.length === le2.length && hn2.every((ns2, iu) => ns2 === le2[iu]))) continue;
            let _n2 = Et2.find((ns2) => ns2.id === Yt2);
            if (!_n2) continue;
            if (Ve2 ? _n2.isComment && _n2.commentText === u : !_n2.isComment) {
              js(Yt2), G2.delete(Yt2);
              break;
            }
          }
        }
        let Je2 = le2.map((Et2, Yt2) => xa(Et2, Yt2 === 0)), it2 = Zc({ content: _e2, elementName: ae2 ?? "element", tagName: R3 ?? "div", componentName: k2 ?? void 0, elementsCount: le2.length, previewBounds: le2.map((Et2) => ze2(Et2)), elementSelectors: Je2, isComment: Ve2, commentText: u ?? void 0, timestamp: Date.now() });
        S2(it2), ve2(true), F2((Et2) => Et2 + 1);
        let Nt2 = it2[0];
        Nt2 && xe2 && G2.set(Nt2.id, [...le2]);
        let Xo2 = new Set(it2.map((Et2) => Et2.id));
        for (let Et2 of G2.keys()) Xo2.has(Et2) || G2.delete(Et2);
      }, onCopyError: i.hooks.onCopyError }, r, u);
    }, _r2 = async (r, u, m) => {
      if (r.length === 0) return;
      let C2 = [], k2 = [];
      for (let R3 of r) {
        let { wasIntercepted: ae2, pendingResult: le2 } = i.hooks.onElementSelect(R3);
        ae2 || C2.push(R3), le2 && k2.push(le2), i.store.theme.grabbedBoxes.enabled && bt2(ze2(R3), R3);
      }
      if (await Ns(), C2.length > 0) await Ir2(C2, u, m);
      else if (k2.length > 0 && !(await Promise.all(k2)).every(Boolean)) throw new Error("Failed to copy");
      Mr2(r);
    }, P3 = ({ element: r, positionX: u, elements: m, extraPrompt: C2, shouldDeactivateAfter: k2, onComplete: R3, dragRect: ae2 }) => {
      let le2 = m ?? [r], _e2 = ae2 ?? s.frozenDragRect, xe2;
      _e2 && le2.length > 1 ? xe2 = ki(_e2) : xe2 = Pi(ze2(r));
      let Ve2 = le2.length > 1 ? xe2.x + xe2.width / 2 : u, Je2 = v(r);
      Ot2 = false, d2.startCopy();
      let it2 = Je2 ? Pn2(xe2, Je2, void 0, "copying", { element: r, mouseX: Ve2, elements: m }) : null;
      Ui(r).then((Nt2) => {
        zi2({ positionX: Ve2, operation: () => _r2(le2, C2, Nt2 ?? void 0), bounds: xe2, tagName: Je2, componentName: Nt2 ?? void 0, element: r, shouldDeactivateAfter: k2, elements: m, existingInstanceId: it2 }).then(() => {
          R3?.();
        });
      });
    }, Z2 = se2(() => {
      if (s.viewportVersion, !Tt2() || T$1()) return null;
      let r = s.detectedElement;
      return qe2(r) ? r : null;
    }), M2 = se2(() => s.frozenElement || (y2() ? null : Z2()));
    pe2(() => {
      let r = s.detectedElement;
      if (!r) return;
      let u = setInterval(() => {
        qe2(r) || d2.setDetectedElement(null);
      }, 100);
      Te2(() => clearInterval(u));
    }), pe2(Be2(M2, (r) => {
      if (gt2 !== null && (clearTimeout(gt2), gt2 = null), !r) {
        An2(null);
        return;
      }
      gt2 = window.setTimeout(() => {
        gt2 = null, An2(r);
      }, 100);
    })), Te2(() => {
      gt2 !== null && (clearTimeout(gt2), gt2 = null);
    }), pe2(() => {
      let r = s.frozenElements, u = ia(r);
      Te2(u);
    }), pe2(Be2(p$1, (r) => {
      if (!r || !i.store.options.freezeReactUpdates) return;
      let u = Qi();
      Te2(u);
    }));
    let D2 = () => {
      if (s.isTouchMode && T$1()) {
        let u = s.detectedElement;
        return !u || mn(u) ? void 0 : u;
      }
      let r = M2();
      if (!(!r || mn(r))) return r;
    }, ee2 = se2(() => D2()), oe2 = () => ee2() ? s.isTouchMode && T$1() ? Tt2() : Tt2() && !T$1() : false, ce2 = se2(() => {
      s.viewportVersion;
      let r = s.frozenElements;
      if (r.length === 0) return [];
      let u = s.frozenDragRect;
      return u && r.length > 1 ? [ki(u)] : r.filter((m) => m !== null).map((m) => ze2(m));
    }), Ne2 = se2(() => {
      s.viewportVersion;
      let r = s.frozenElements;
      if (r.length > 0) {
        let m = ce2();
        if (r.length === 1) {
          let k2 = m[0];
          if (k2) return k2;
        }
        let C2 = s.frozenDragRect;
        return C2 ? m[0] ?? ki(C2) : Pi(Hs(m));
      }
      let u = ee2();
      if (u) return ze2(u);
    }), Le2 = se2(() => s.frozenElements.length), Ke2 = (r, u) => {
      let m = r + window.scrollX, C2 = u + window.scrollY;
      return { x: Math.abs(m - s.dragStart.x), y: Math.abs(C2 - s.dragStart.y) };
    }, je2 = se2(() => {
      if (!T$1()) return false;
      let r = Ke2(s.pointer.x, s.pointer.y);
      return r.x > 2 || r.y > 2;
    }), dt2 = (r, u) => {
      let m = r + window.scrollX, C2 = u + window.scrollY, k2 = Math.min(s.dragStart.x, m), R3 = Math.min(s.dragStart.y, C2), ae2 = Math.abs(m - s.dragStart.x), le2 = Math.abs(C2 - s.dragStart.y);
      return { x: k2 - window.scrollX, y: R3 - window.scrollY, width: ae2, height: le2 };
    }, Re2 = se2(() => {
      if (s.viewportVersion, !je2()) return;
      let r = dt2(s.pointer.x, s.pointer.y);
      return { borderRadius: "0px", height: r.height, transform: "none", width: r.width, x: r.x, y: r.y };
    }), Ct2 = se2(() => {
      if (s.viewportVersion, !je2()) return [];
      let r = tn2();
      if (!r) return [];
      let u = dt2(r.x, r.y), m = Cr2(u, qe);
      return (m.length > 0 ? m : Cr2(u, qe, false)).map((k2) => ze2(k2));
    }), kt2 = se2(() => {
      let r = Ct2();
      return r.length > 0 ? r : ce2();
    }), Rt2 = se2(() => {
      if ($2() || w3()) {
        s.viewportVersion;
        let r = s.frozenElement || Z2();
        if (r) {
          let u = ze2(r);
          return { x: xn2(u).x + s.copyOffsetFromCenterX, y: s.copyStart.y };
        }
        return { x: s.copyStart.x, y: s.copyStart.y };
      }
      return { x: s.pointer.x, y: s.pointer.y };
    });
    pe2(Be2(() => [Z2(), s.lastGrabbedElement], ([r, u]) => {
      u && r && u !== r && d2.setLastGrabbed(null), r && i.hooks.onElementHover(r);
    })), pe2(Be2(() => Z2(), (r) => {
      let u = ++ao2, m = () => {
        ao2 === u && d2.setSelectionSource(null, null);
      };
      if (!r) {
        m();
        return;
      }
      Ut(r).then((C2) => {
        if (ao2 === u && C2) {
          for (let k2 of C2) if (k2.fileName && oe(k2.fileName)) {
            d2.setSelectionSource(I(k2.fileName), k2.lineNumber ?? null);
            return;
          }
          m();
        }
      }).catch(() => {
        ao2 === u && d2.setSelectionSource(null, null);
      });
    })), pe2(Be2(() => s.viewportVersion, () => Ze2._internal.updateBoundsOnViewportChange()));
    let Or2 = se2(() => s.grabbedBoxes.map((r) => ({ id: r.id, bounds: r.bounds, createdAt: r.createdAt }))), Ki = se2(() => s.labelInstances.map((r) => ({ id: r.id, status: r.status, tagName: r.tagName, componentName: r.componentName, createdAt: r.createdAt }))), td = se2(() => {
      let r = p$1(), u = T$1(), m = $2(), C2 = w3(), k2 = fo2(), R3 = Z2(), ae2 = Re2(), le2 = i.store.theme.enabled, _e2 = i.store.theme.selectionBox.enabled, xe2 = i.store.theme.dragBox.enabled, Ve2 = je2(), Je2 = M2(), it2 = b2(), Nt2 = !!(le2 && _e2 && r && !m && !it2 && !u && Je2 != null);
      return { isActive: r, isDragging: u, isCopying: m, isPromptMode: C2, isCrosshairVisible: k2 ?? false, isSelectionBoxVisible: Nt2, isDragBoxVisible: !!(le2 && xe2 && r && !m && Ve2), targetElement: R3, dragBounds: ae2 ? { x: ae2.x, y: ae2.y, width: ae2.width, height: ae2.height } : null, grabbedBoxes: Or2(), labelInstances: Ki(), selectionFilePath: s.selectionFilePath, toolbarState: te2() };
    });
    pe2(Be2(td, (r) => {
      i.hooks.onStateChange(r);
    })), pe2(Be2(() => [w3(), s.pointer.x, s.pointer.y, Z2()], ([r, u, m, C2]) => {
      i.hooks.onPromptModeChange(r, { x: u, y: m, targetElement: C2 });
    })), pe2(Be2(() => [qi(), Ne2(), Z2()], ([r, u, m]) => {
      i.hooks.onSelectionBox(!!r, u ?? null, m);
    })), pe2(Be2(() => [Zi2(), Re2()], ([r, u]) => {
      i.hooks.onDragBox(!!r, u ?? null);
    })), pe2(Be2(() => [fo2(), s.pointer.x, s.pointer.y], ([r, u, m]) => {
      i.hooks.onCrosshair(!!r, { x: u, y: m });
    })), pe2(Be2(() => [zd(), Fd(), Rt2(), Z2(), s.selectionFilePath, s.selectionLineNumber], ([r, u, m, C2, k2, R3]) => {
      i.hooks.onElementLabel(!!r, u, { x: m.x, y: m.y, content: "", element: C2 ?? void 0, tagName: C2 && v(C2) || void 0, filePath: k2 ?? void 0, lineNumber: R3 ?? void 0 });
    }));
    let Mn2 = null, Dr2 = (r) => {
      r ? (Mn2 || (Mn2 = document.createElement("style"), Mn2.setAttribute("data-react-grab-cursor", ""), document.head.appendChild(Mn2)), Mn2.textContent = `* { cursor: ${r} !important; }`) : Mn2 && (Mn2.remove(), Mn2 = null);
    };
    pe2(Be2(() => [p$1(), $2(), w3()], ([r, u, m]) => {
      Dr2(u ? "progress" : r && !m ? "crosshair" : null);
    }));
    let jn2 = () => {
      let r = f();
      d2.activate(), r || i.hooks.onActivate();
    }, nd = () => {
      Dt !== null && (window.clearTimeout(Dt), Dt = null), Ot2 = false;
    }, nt2 = () => {
      let r = T$1(), u = s.previouslyFocusedElement;
      d2.deactivate(), Vo2(), vt2 = null, on2 = false, r && (document.body.style.userSelect = ""), st2 && window.clearTimeout(st2), Ft2.stop(), u instanceof HTMLElement && qe2(u) && u.focus(), i.hooks.onDeactivate();
    }, Ys = () => {
      f() && d2.release(), p$1() && nt2(), nd();
    }, Lr2 = () => {
      d2.setWasActivatedByToggle(true), jn2();
    }, qs = (r, u, m) => {
      let C2 = u[0];
      if (qe2(C2)) {
        let k2 = C2.getBoundingClientRect(), R3 = k2.top + k2.height / 2;
        d2.setPointer({ x: r.position.x, y: R3 }), d2.setFrozenElements(u), d2.setInputText(r.context.prompt), d2.setWasActivatedByToggle(true), m && d2.setSelectedAgent(m), p$1() || jn2();
      }
    }, Zs = (r) => ({ ...r, onAbort: (u, m) => {
      r.onAbort?.(u, m), qs(u, m, r);
    }, onUndo: (u, m) => {
      r.onUndo?.(u, m), qs(u, m, r);
    } }), Vi = () => {
      let r = c();
      if (r) return Zs(r);
    }, Ze2 = Vs(Vi(), { transformAgentContext: i.hooks.transformAgentContext }), Js = () => {
      d2.clearLastCopied();
      let r = [...s.frozenElements], u = s.frozenElement || Z2(), m = w3() ? s.inputText.trim() : "";
      if (!u) {
        nt2();
        return;
      }
      let C2 = r.length > 0 ? r : u ? [u] : [], k2 = C2.map((xe2) => ze2(xe2)), R3 = k2[0], ae2 = R3.x + R3.width / 2, le2 = R3.y + R3.height / 2, _e2 = ae2 + s.copyOffsetFromCenterX;
      if ((s.selectedAgent || Se2()) && m) {
        let xe2 = s.replySessionId, Ve2 = s.selectedAgent;
        nt2(), d2.clearReplySessionId(), d2.setSelectedAgent(null), Ze2.session.start({ elements: C2, prompt: m, position: { x: _e2, y: le2 }, selectionBounds: k2, sessionId: xe2 ?? void 0, agent: Ve2 ? Zs(Ve2) : void 0 });
        return;
      }
      d2.setPointer({ x: ae2, y: le2 }), d2.exitPromptMode(), d2.clearInputText(), d2.clearReplySessionId(), P3({ element: u, positionX: _e2, elements: C2, extraPrompt: m || void 0, onComplete: nt2 });
    }, Rr2 = () => {
      if (d2.clearLastCopied(), !w3()) return;
      if (s.inputText.trim() && !g2()) {
        d2.setPendingDismiss(true);
        return;
      }
      d2.clearInputText(), d2.clearReplySessionId(), nt2();
    }, od = () => {
      d2.clearInputText(), d2.clearReplySessionId(), nt2();
    }, rd = () => {
      d2.setPendingDismiss(false);
    }, id = (r, u) => {
      d2.setPendingAbortSessionId(null), u && Ze2.session.abort(r);
    }, sd = () => {
      let r = s.frozenElement || Z2();
      r && ft2(r, s.pointer.x, s.pointer.y), _t2();
    }, ad = (r, u) => {
      let m = Ze2.sessions().get(r), C2 = Ze2.session.getElements(r), k2 = m?.selectionBounds ?? [], R3 = k2[0];
      if (m && C2.length > 0 && R3) {
        let ae2 = m.position.x, le2 = m.context.sessionId ?? r;
        Ze2.session.dismiss(r), Ze2.session.start({ elements: C2, prompt: u, position: { x: ae2, y: R3.y + R3.height / 2 }, selectionBounds: k2, sessionId: le2 });
      }
    }, ld = (r) => {
      let u = Ze2.session.acknowledgeError(r);
      u && d2.setInputText(u);
    }, cd = () => {
      p$1() ? nt2() : I2() && (on2 = true, Lr2());
    }, Qs = (r, u, m) => {
      d2.setPendingCommentMode(false), d2.clearInputText(), d2.enterPromptMode({ x: u, y: m }, r);
    }, Ui2 = (r, u) => {
      d2.showContextMenu(u, r), Vo2(), ga(), i.hooks.onContextMenu(r, u);
    }, dd = () => {
      if (!I2()) return;
      if (p$1() && h2()) {
        nt2();
        return;
      }
      d2.setPendingCommentMode(true), p$1() || Lr2();
    }, ud = () => {
      let r = !I2();
      K(r);
      let u = no(), m = { edge: u?.edge ?? "bottom", ratio: u?.ratio ?? Go, collapsed: u?.collapsed ?? false, enabled: r };
      yr2(m), ye2(m), Kn2.forEach((C2) => C2(m)), r || (Ys(), ga());
    }, fd = (r, u) => {
      if (!I2() || w3() || y2() || s.contextMenuPosition !== null) return;
      d2.setPointer({ x: r, y: u }), ht2 = r, en2 = u;
      let m = performance.now(), C2 = Sn2 > 0 && m - Sn2 < 200;
      if (m - Vn2 >= 32 && !C2 && (Vn2 = m, Sn2 = m, Vc(() => {
        let k2 = Aa(ht2, en2);
        k2 !== s.detectedElement && d2.setDetectedElement(k2), Sn2 = 0;
      })), T$1()) {
        dn2(r, u);
        let k2 = Us(r, u), R3 = k2.top || k2.bottom || k2.left || k2.right;
        R3 && !Ft2.isActive() ? Ft2.start() : !R3 && Ft2.isActive() && Ft2.stop();
      }
    }, md = (r, u) => !Tt2() || $2() ? false : (d2.startDrag({ x: r, y: u }), d2.setPointer({ x: r, y: u }), document.body.style.userSelect = "none", dn2(r, u), i.hooks.onDragStart(r + window.scrollX, u + window.scrollY), true), gd = (r, u) => {
      let m = Cr2(r, qe), C2 = m.length > 0 ? m : Cr2(r, qe, false);
      if (C2.length === 0) return;
      Xr(C2), i.hooks.onDragEnd(C2, r);
      let k2 = C2[0], R3 = xn2(ze2(k2));
      d2.setPointer(R3), d2.setFrozenElements(C2);
      let ae2 = Bs(r);
      if (d2.setFrozenDragRect(ae2), d2.freeze(), d2.setLastGrabbed(k2), s.pendingCommentMode) {
        Qs(k2, R3.x, R3.y);
        return;
      }
      if (on2) {
        on2 = false, Ui2(k2, R3);
        return;
      }
      let le2 = s.wasActivatedByToggle && !u;
      P3({ element: k2, positionX: R3.x, elements: C2, shouldDeactivateAfter: le2, dragRect: ae2 });
    }, pd = (r, u, m) => {
      let C2 = qe2(s.frozenElement) ? s.frozenElement : null, k2 = qe2(vt2) ? vt2 : null, R3 = C2 ?? k2 ?? Aa(r, u) ?? (qe2(s.detectedElement) ? s.detectedElement : null);
      if (!R3) return;
      let ae2 = !C2 && k2 === R3, le2, _e2;
      if (C2) le2 = s.pointer.x, _e2 = s.pointer.y;
      else if (ae2) {
        let Ve2 = xn2(ze2(R3));
        le2 = Ve2.x, _e2 = Ve2.y;
      } else le2 = r, _e2 = u;
      if (vt2 = null, s.pendingCommentMode) {
        Qs(R3, le2, _e2);
        return;
      }
      if (on2) {
        on2 = false;
        let { wasIntercepted: Ve2 } = i.hooks.onElementSelect(R3);
        if (Ve2) return;
        Xr([R3]), d2.setFrozenElement(R3);
        let Je2 = { x: le2, y: _e2 };
        d2.setPointer(Je2), d2.freeze(), Ui2(R3, Je2);
        return;
      }
      let xe2 = s.wasActivatedByToggle && !m;
      d2.setLastGrabbed(R3), P3({ element: R3, positionX: le2, shouldDeactivateAfter: xe2 });
    }, ea = () => {
      T$1() && (d2.cancelDrag(), Ft2.stop(), document.body.style.userSelect = "");
    }, hd = (r, u, m) => {
      if (!T$1()) return;
      mt2 !== null && (clearTimeout(mt2), mt2 = null), cn2(null);
      let C2 = Ke2(r, u), k2 = C2.x > 2 || C2.y > 2, R3 = k2 ? dt2(r, u) : null;
      k2 ? d2.endDrag() : d2.cancelDrag(), Ft2.stop(), document.body.style.userSelect = "", R3 ? gd(R3, m) : pd(r, u, m);
    }, rt2 = Tc(), Nr2 = Hc(), mo2 = (r) => {
      let u;
      try {
        u = Nr2.originalKeyDescriptor?.get ? Nr2.originalKeyDescriptor.get.call(r) : r.key;
      } catch {
        return false;
      }
      let m = u === "Enter" || io2(r.code), C2 = p$1() || f();
      return m && C2 && !w3() && !s.wasActivatedByToggle && A2() === null ? (Nr2.claimedEvents.add(r), r.preventDefault(), r.stopImmediatePropagation(), true) : false;
    };
    rt2.addDocumentListener("keydown", mo2, { capture: true }), rt2.addDocumentListener("keyup", mo2, { capture: true }), rt2.addDocumentListener("keypress", mo2, { capture: true });
    let bd = (r) => {
      if (!(r.code === "KeyZ" && (r.metaKey || r.ctrlKey)) || Array.from(Ze2.sessions().values()).some((k2) => !k2.isStreaming && !k2.error)) return false;
      let C2 = r.shiftKey;
      return C2 && Ze2.canRedo() ? (r.preventDefault(), r.stopPropagation(), Ze2.history.redo(), true) : !C2 && Ze2.canUndo() ? (r.preventDefault(), r.stopPropagation(), Ze2.history.undo(), true) : false;
    }, Vo2 = () => {
      Pr2([]), uo2(0), kn2.clearHistory();
    }, Gi2 = (r) => {
      d2.setFrozenElement(r), d2.freeze(), vt2 = r;
      let u = ze2(r), m = xn2(u);
      d2.setPointer(m), s.contextMenuPosition !== null && d2.showContextMenu(m, r);
    }, ta$1 = (r) => {
      let u = ze2(r), m = Ti(u), C2 = ya(m.x, m.y).filter(qe).reverse();
      Pr2(C2), uo2(Math.max(0, C2.indexOf(r)));
    }, yd = (r) => {
      let u = Tn2()[r];
      u && (uo2(r), kn2.clearHistory(), Gi2(u));
    }, na$1 = (r) => {
      if (!p$1() || w3() || !Ao.has(r.key)) return false;
      let u = M2(), m = !u;
      if (u || (u = Aa(window.innerWidth / 2, window.innerHeight / 2)), !u) return false;
      if (!(r.key === "ArrowUp" || r.key === "ArrowDown")) {
        Vo2();
        let le2 = kn2.findNext(r.key, u);
        return !le2 && !m ? false : (r.preventDefault(), r.stopPropagation(), Gi2(le2 ?? u), true);
      }
      Tn2().length === 0 && ta$1(u);
      let R3 = kn2.findNext(r.key, u) ?? u;
      r.preventDefault(), r.stopPropagation(), Gi2(R3);
      let ae2 = Tn2().indexOf(R3);
      return ae2 !== -1 ? uo2(ae2) : ta$1(R3), true;
    }, wd = (r) => {
      if (!io2(r.code) || xt2(r)) return false;
      let u = s.lastCopiedElement;
      if (!f() && !w3() && !p$1() && u && qe2(u) && !s.labelInstances.some((k2) => k2.status === "copied" || k2.status === "fading")) {
        r.preventDefault(), r.stopImmediatePropagation();
        let k2 = xn2(ze2(u));
        return d2.setPointer(k2), ft2(u, k2.x, k2.y), d2.setFrozenElement(u), d2.clearLastCopied(), _t2(), p$1() || jn2(), true;
      }
      if (f() && !w3()) {
        r.preventDefault(), r.stopImmediatePropagation();
        let k2 = s.frozenElement || Z2();
        return k2 && ft2(k2, s.pointer.x, s.pointer.y), d2.setPointer({ x: s.pointer.x, y: s.pointer.y }), k2 && d2.setFrozenElement(k2), _t2(), st2 !== null && (window.clearTimeout(st2), st2 = null), p$1() || jn2(), true;
      }
      return false;
    }, xd = (r) => {
      if (r.key?.toLowerCase() !== "o" || w3() || !p$1() || !(r.metaKey || r.ctrlKey)) return false;
      let u = s.selectionFilePath, m = s.selectionLineNumber;
      return u ? (r.preventDefault(), r.stopPropagation(), i.hooks.onOpenFile(u, m ?? void 0) || Zi(u, m ?? void 0, i.hooks.transformOpenFileUrl), true) : false;
    }, oa$1 = () => {
      De2 !== null && (window.clearTimeout(De2), De2 = null);
    }, go2 = () => {
      oa$1(), Tr2([]), kr2(null);
    }, ra = se2(() => !!ee2() && Tt2() && !w3() && !T$1() && s.contextMenuPosition === null), vd = se2(() => ({ items: rn2(), activeIndex: co2(), isVisible: co2() !== null && rn2().length > 0 })), Cd = se2(() => Tn2().map((r) => ({ tagName: v(r) || "element", componentName: zi(r) ?? void 0 }))), Ed = se2(() => ({ items: Cd(), activeIndex: Fi(), isVisible: Tn2().length > 0 }));
    pe2(Be2(ee2, () => {
      go2();
    })), pe2(Be2(ra, (r) => {
      r || go2();
    }));
    let Sd = (r) => i.store.actions.find((u) => u.id === r), Ad = () => {
      let r = ee2();
      if (!r) return;
      let u = Ne2();
      return ua$1({ element: r, filePath: s.selectionFilePath ?? void 0, lineNumber: s.selectionLineNumber ?? void 0, tagName: v(r) || void 0, componentName: Ar2(), position: s.pointer, performWithFeedbackOptions: { fallbackBounds: u, fallbackSelectionBounds: u ? [u] : [] }, shouldDeferHideContextMenu: false, onBeforePrompt: go2 });
    }, Td = se2(() => {
      if (!ee2()) return [];
      let r = [];
      for (let u of i.store.actions) typeof u.enabled == "boolean" && !u.enabled || r.push({ id: u.id, label: u.label, shortcut: u.shortcut });
      return r;
    }), kd = () => {
      oa$1(), De2 = window.setTimeout(() => {
        De2 = null;
        let r = co2(), u = rn2();
        if (r === null || u.length === 0) return;
        let m = u[r];
        if (!m) return;
        let C2 = Sd(m.id);
        if (!C2) {
          go2();
          return;
        }
        let k2 = Ad();
        if (!k2 || !wr2(C2, k2)) {
          go2();
          return;
        }
        go2();
        C2.onAction(k2);
      }, 600);
    }, Pd = () => {
      if (!ra()) return false;
      let r = Td();
      if (r.length === 0) return false;
      Tr2(r);
      let u = co2(), C2 = u !== null && u < r.length ? (u + 1) % r.length : 0;
      return kr2(C2), kd(), true;
    }, Md = (r) => r.code !== "KeyC" || r.altKey || r.repeat || xt2(r) || !Pd() ? false : (r.preventDefault(), r.stopPropagation(), (r.metaKey || r.ctrlKey) && r.stopImmediatePropagation(), true), Id = (r) => {
      if (!(!i.store.options.allowActivationInsideInput && xt2(r)) && !(!_i(r, i.store.options) && ((r.metaKey || r.ctrlKey) && !yo.includes(r.key) && !io2(r.code) && (p$1() && !s.wasActivatedByToggle ? nt2() : f() && (tt2(), ot(), d2.release())), !io2(r.code) || !f()))) {
        if ((p$1() || f()) && !w3() && (r.preventDefault(), io2(r.code) && r.stopImmediatePropagation()), p$1()) {
          if (s.wasActivatedByToggle && i.store.options.activationMode !== "hold" || r.repeat) return;
          st2 !== null && window.clearTimeout(st2), st2 = window.setTimeout(() => {
            nt2();
          }, 200);
          return;
        }
        if (f() && r.repeat) {
          if (un2) {
            let u = nn2;
            ot(), u && d2.activate();
          }
          return;
        }
        if (!($2() || b2()) && !f()) {
          let m = i.store.options.keyHoldDuration ?? 100;
          xt2(r) ? Kl(r) ? m += 600 : m += 400 : Vl() && (m += 600), ot(), d2.startHold(m);
        }
      }
    };
    rt2.addWindowListener("keydown", (r) => {
      if (mo2(r), !I2()) {
        _i(r, i.store.options) && !r.repeat && X2((R3) => R3 + 1);
        return;
      }
      if (bd(r)) return;
      let u = io2(r.code) && f() && !w3(), m = At2(r, "data-react-grab-input");
      if (w3() && _i(r, i.store.options) && !r.repeat && !m) {
        r.preventDefault(), r.stopPropagation(), Rr2();
        return;
      }
      if (r.key === "Escape" && A2() !== null) return;
      if (r.key === "Escape" && O2() !== null) {
        Xt2();
        return;
      }
      if (q$1() !== null) {
        if (r.key === "Escape") {
          Yn2();
          return;
        }
        let R3 = i.store.toolbarActions, ae2 = (r.metaKey || r.ctrlKey) && !r.repeat, le2 = R3.find((_e2) => _e2.shortcut ? r.key === "Enter" ? _e2.shortcut === "Enter" : ae2 && r.key.toLowerCase() === _e2.shortcut.toLowerCase() : false);
        le2 && xr2(le2) && (r.preventDefault(), r.stopPropagation(), le2.onAction(), Yn2());
        return;
      }
      let C2 = At2(r, "data-react-grab-ignore-events") && !u;
      if (w3() || C2) return r.key === "Escape" && (be2() ? (r.preventDefault(), r.stopPropagation(), d2.setPendingAbortSessionId(null)) : w3() ? Rr2() : s.wasActivatedByToggle && nt2()), C2 && Ao.has(r.key) && na$1(r), void 0;
      if (r.key === "Escape") {
        if (be2()) {
          r.preventDefault(), r.stopPropagation(), d2.setPendingAbortSessionId(null);
          return;
        }
        if (Ze2.isProcessing()) return;
        if (f() || s.wasActivatedByToggle) {
          nt2();
          return;
        }
      }
      let k2 = Date.now() - Sr2 < 200;
      !k2 && Md(r) || na$1(r) || wd(r) || xd(r) || k2 || Id(r);
    }, { capture: true }), rt2.addWindowListener("keyup", (r) => {
      if (mo2(r)) return;
      let u = Bc(i.store.options), m = u.metaKey || u.ctrlKey ? Cn2() ? !r.metaKey : !r.ctrlKey : u.shiftKey && !r.shiftKey || u.altKey && !r.altKey, C2 = i.store.options.activationKey ? typeof i.store.options.activationKey == "function" ? i.store.options.activationKey(r) : Ii(i.store.options.activationKey)(r) : Mi(r.key, r.code);
      if (b2() || Ot2) {
        (C2 || m) && (Ot2 = false, nt2());
        return;
      }
      if (!f() && !p$1() || w3()) return;
      let k2 = !!i.store.options.activationKey, R3 = i.store.options.activationMode === "hold";
      if (p$1()) {
        let ae2 = s.contextMenuPosition !== null;
        if (m) {
          if (s.wasActivatedByToggle && i.store.options.activationMode !== "hold" || ae2) return;
          nt2();
        } else if (R3 && C2) {
          if (st2 !== null && (window.clearTimeout(st2), st2 = null), ae2) return;
          nt2();
        } else !k2 && C2 && st2 !== null && (window.clearTimeout(st2), st2 = null);
        return;
      }
      if (C2 || m) {
        if (s.wasActivatedByToggle && i.store.options.activationMode !== "hold") return;
        if (f() || nn2 && m) {
          tt2();
          let _e2 = (Ht2 ? Date.now() - Ht2 : 0) >= 200, xe2 = nn2 && _e2 && (i.store.options.allowActivationInsideInput || !xt2(r));
          ot(), xe2 ? d2.activate() : d2.release();
        } else nt2();
      }
    }, { capture: true }), rt2.addDocumentListener("copy", () => {
      f() && (un2 = true);
    }), rt2.addWindowListener("keypress", mo2, { capture: true }), rt2.addWindowListener("pointermove", (r) => {
      if (!r.isPrimary) return;
      let u = r.pointerType === "touch";
      if (d2.setTouchMode(u), At2(r, "data-react-grab-ignore-events") || s.contextMenuPosition !== null || u && !f() && !p$1()) return;
      (u ? f() : p$1()) && !w3() && y2() && (d2.unfreeze(), Vo2()), fd(r.clientX, r.clientY);
    }, { passive: true }), rt2.addWindowListener("pointerdown", (r) => {
      if (r.button !== 0 || !r.isPrimary || (d2.setTouchMode(r.pointerType === "touch"), At2(r, "data-react-grab-ignore-events")) || s.contextMenuPosition !== null || q$1() !== null) return;
      if (w3()) {
        let m = Ne2();
        m && r.clientX >= m.x && r.clientX <= m.x + m.width && r.clientY >= m.y && r.clientY <= m.y + m.height ? Js() : Rr2();
        return;
      }
      md(r.clientX, r.clientY) && (document.documentElement.setPointerCapture(r.pointerId), r.preventDefault(), r.stopImmediatePropagation());
    }, { capture: true }), rt2.addWindowListener("pointerup", (r) => {
      if (r.button !== 0 || !r.isPrimary || At2(r, "data-react-grab-ignore-events") || s.contextMenuPosition !== null) return;
      let u = Tt2() || $2() || T$1(), m = r.metaKey || r.ctrlKey;
      hd(r.clientX, r.clientY, m), u && (r.preventDefault(), r.stopImmediatePropagation());
    }, { capture: true }), rt2.addWindowListener("contextmenu", (r) => {
      if (!Tt2() || $2() || w3()) return;
      let u = At2(r, "data-react-grab-ignore-events");
      if (u && Tn2().length > 0) Vo2();
      else if (u) return;
      if (s.contextMenuPosition !== null) {
        r.preventDefault();
        return;
      }
      r.preventDefault(), r.stopPropagation();
      let m = Aa(r.clientX, r.clientY);
      if (!m) return;
      let C2 = s.frozenElements;
      C2.length > 1 && C2.includes(m) ? Xr(C2) : (Xr([m]), d2.setFrozenElement(m));
      let R3 = { x: r.clientX, y: r.clientY };
      d2.setPointer(R3), d2.freeze(), Ui2(m, R3);
    }, { capture: true }), rt2.addWindowListener("pointercancel", (r) => {
      r.isPrimary && ea();
    }), rt2.addWindowListener("click", (r) => {
      At2(r, "data-react-grab-ignore-events") || s.contextMenuPosition === null && (Tt2() || $2() || H2()) && (r.preventDefault(), r.stopImmediatePropagation(), s.wasActivatedByToggle && !$2() && !w3() && (f() ? d2.setWasActivatedByToggle(false) : nt2()));
    }, { capture: true }), rt2.addDocumentListener("visibilitychange", () => {
      if (document.hidden) {
        d2.clearGrabbedBoxes();
        let r = s.activationTimestamp;
        p$1() && !w3() && r !== null && Date.now() - r > 500 && nt2();
      }
    }), rt2.addWindowListener("blur", () => {
      ea(), f() && (tt2(), d2.release(), ot());
    }), rt2.addWindowListener("focus", () => {
      Sr2 = Date.now();
    });
    let _d = () => {
      if (!(s.isTouchMode && !f() && !p$1()) && I2() && !w3() && !y2() && !T$1() && s.contextMenuPosition === null && s.frozenElements.length === 0) {
        let r = Aa(s.pointer.x, s.pointer.y);
        d2.setDetectedElement(r);
      }
    }, $r2 = () => {
      Mc(), _d(), d2.incrementViewportVersion(), d2.updateSessionBounds(), d2.updateContextMenuPosition();
    };
    rt2.addWindowListener("scroll", $r2, { capture: true });
    let Wi = window.innerWidth, ji = window.innerHeight;
    rt2.addWindowListener("resize", () => {
      let r = window.innerWidth, u = window.innerHeight;
      if (Wi > 0 && ji > 0) {
        let m = r / Wi, C2 = u / ji, k2 = Math.abs(m - C2) < ns, R3 = Math.abs(m - 1) > ns;
        k2 && R3 && d2.setPointer({ x: s.pointer.x * m, y: s.pointer.y * C2 });
      }
      Wi = r, ji = u, $r2();
    });
    let Xi = window.visualViewport;
    if (Xi) {
      let { signal: r } = rt2;
      Xi.addEventListener("resize", $r2, { signal: r }), Xi.addEventListener("scroll", $r2, { signal: r });
    }
    let Xn2 = null, In = null, Od = () => {
      let r = i.store.theme.enabled && (p$1() || $2() || s.labelInstances.length > 0 || s.grabbedBoxes.length > 0 || Ze2.sessions().size > 0);
      r && Xn2 === null ? Xn2 = window.setInterval(() => {
        In === null && (In = D(() => {
          In = null, d2.incrementViewportVersion(), d2.updateSessionBounds();
        }));
      }, 100) : !r && Xn2 !== null && (window.clearInterval(Xn2), Xn2 = null, In !== null && (q(In), In = null));
    };
    pe2(() => {
      i.store.theme.enabled, p$1(), $2(), s.labelInstances.length, s.grabbedBoxes.length, Ze2.sessions().size, Od();
    }), Te2(() => {
      Xn2 !== null && window.clearInterval(Xn2), In !== null && q(In);
    }), rt2.addDocumentListener("copy", (r) => {
      w3() || At2(r, "data-react-grab-ignore-events") || (Tt2() || $2()) && r.preventDefault();
    }, { capture: true }), Te2(() => {
      rt2.abort(), mt2 !== null && window.clearTimeout(mt2), st2 && window.clearTimeout(st2), Dt && window.clearTimeout(Dt), De2 && window.clearTimeout(De2), ne2 !== null && q(ne2), fn2.forEach((r) => window.clearTimeout(r)), fn2.clear(), Ft2.stop(), document.body.style.userSelect = "", document.body.style.touchAction = "", Dr2(null), Nr2.restore();
    });
    let Yi = Gl(As), Uo2 = se2(() => i.store.theme.enabled), Dd = se2(() => i.store.theme.selectionBox.enabled), ia$1 = se2(() => i.store.theme.elementLabel.enabled), Ld = se2(() => i.store.theme.dragBox.enabled), sa$1 = se2(() => b2() || ue2() && !y2()), Rd = se2(() => Ct2().length > 0), qi = se2(() => !Uo2() || !Dd() || sa$1() ? false : Rd() ? true : oe2()), Nd = se2(() => {
      let r = ee2();
      if (r) return v(r) || void 0;
    });
    pe2(Be2(() => Un2(), (r) => {
      let u = ++lo2;
      if (!r) {
        Gn2(void 0);
        return;
      }
      Ui(r).then((m) => {
        lo2 === u && Gn2(m ?? void 0);
      }).catch(() => {
        lo2 === u && Gn2(void 0);
      });
    }));
    let $d = se2(() => s.contextMenuPosition !== null || !ia$1() || sa$1() ? false : oe2()), Br2 = /* @__PURE__ */ new Map(), Bd = se2(() => {
      if (!Uo2()) return [];
      if (!i.store.theme.grabbedBoxes.enabled) return [];
      s.viewportVersion;
      let r = new Set(s.labelInstances.map((u) => u.id));
      for (let u of Br2.keys()) r.has(u) || Br2.delete(u);
      return s.labelInstances.map((u) => {
        let m = u.elements && u.elements.length > 1, C2 = u.element, R3 = !m && C2 && document.body.contains(C2) ? ze2(C2) : u.bounds, ae2 = Br2.get(u.id), le2 = ae2 && ae2.bounds.x === R3.x && ae2.bounds.y === R3.y && ae2.bounds.width === R3.width && ae2.bounds.height === R3.height;
        if (ae2 && ae2.status === u.status && ae2.errorMessage === u.errorMessage && le2) return ae2;
        let _e2 = R3.x + R3.width / 2, xe2 = R3.width / 2, Ve2 = u.mouseXOffsetRatio !== void 0 && xe2 > 0 ? _e2 + u.mouseXOffsetRatio * xe2 : u.mouseXOffsetFromCenter !== void 0 ? _e2 + u.mouseXOffsetFromCenter : u.mouseX, Je2 = { ...u, bounds: R3, mouseX: Ve2 };
        return Br2.set(u.id, Je2), Je2;
      });
    }), Hd = se2(() => Uo2() ? i.store.theme.grabbedBoxes.enabled ? (s.viewportVersion, s.grabbedBoxes.map((r) => !r.element || !document.body.contains(r.element) ? r : { ...r, bounds: ze2(r.element) })) : [] : []), Zi2 = se2(() => Uo2() && Ld() && Tt2() && je2()), Fd = se2(() => $2() ? "processing" : "hover"), zd = se2(() => {
      if (!Uo2()) return false;
      let r = ia$1(), u = w3(), m = $2(), C2 = Tt2(), k2 = T$1(), R3 = !!M2(), ae2 = ue2(), le2 = y2();
      return !r || u || ae2 && !le2 ? false : m ? true : C2 && !k2 && R3;
    }), aa2 = se2(() => {
      s.viewportVersion;
      let r = s.contextMenuElement;
      return r ? ze2(r) : null;
    }), Kd = se2(() => (s.viewportVersion, s.contextMenuPosition)), la2 = se2(() => {
      let r = s.contextMenuElement;
      if (!r) return;
      let u = s.frozenElements.length;
      return u > 1 ? `${u} elements` : v(r) || void 0;
    }), [ca] = Es2(() => ({ element: s.contextMenuElement, frozenCount: s.frozenElements.length }), async ({ element: r, frozenCount: u }) => !r || u > 1 ? void 0 : await Ui(r) ?? void 0), [da] = Es2(() => s.contextMenuElement, async (r) => {
      if (!r) return null;
      let u = await Ut(r);
      return Gi(u);
    }), Vd = (r, u, m, C2, k2) => async (R3) => {
      let ae2 = k2?.fallbackBounds ?? null, le2 = k2?.fallbackSelectionBounds ?? [], _e2 = k2?.position ?? s.contextMenuPosition ?? s.pointer, xe2 = ce2(), Ve2 = aa2() ?? ae2, Je2 = u.length > 1, it2 = Je2 ? Pi(Hs(xe2)) : Ve2, Nt2 = s.wasActivatedByToggle, Xo2 = Je2 ? xe2 : Ve2 ? [Ve2] : le2;
      if (d2.hideContextMenu(), it2) {
        let Et2 = Je2 ? it2.x + it2.width / 2 : _e2.x, Yt2 = Pn2(it2, m || "element", C2, "copying", { element: r, mouseX: Et2, elements: Je2 ? u : void 0, boundsMultiple: Xo2 }), hn2 = false, qn2;
        try {
          hn2 = await R3(), hn2 || (qn2 = "Failed to copy");
        } catch (_n2) {
          qn2 = _n2 instanceof Error && _n2.message ? _n2.message : "Action failed";
        }
        d2.updateLabelInstance(Yt2, hn2 ? "copied" : "error", hn2 ? void 0 : qn2 || "Unknown error"), Kt2(Yt2);
      } else try {
        await R3();
      } catch {
      }
      Nt2 ? nt2() : d2.unfreeze();
    }, Ji = () => {
      setTimeout(() => {
        d2.hideContextMenu();
      }, 0);
    }, ua$1 = (r) => {
      let { element: u, filePath: m, lineNumber: C2, tagName: k2, componentName: R3, position: ae2, performWithFeedbackOptions: le2, shouldDeferHideContextMenu: _e2, onBeforeCopy: xe2, onBeforePrompt: Ve2, customEnterPromptMode: Je2 } = r, it2 = s.frozenElements.length > 0 ? s.frozenElements : [u], Nt2 = _e2 ? Ji : d2.hideContextMenu, Yt2 = { element: u, elements: it2, filePath: m, lineNumber: C2, componentName: R3, tagName: k2, enterPromptMode: Je2 ?? ((qn2) => {
        qn2 && d2.setSelectedAgent(qn2), d2.clearLabelInstances(), Ve2?.(), ft2(u, ae2.x, ae2.y), d2.setPointer({ x: ae2.x, y: ae2.y }), d2.setFrozenElement(u), _t2(), p$1() || jn2(), Nt2();
      }), copy: () => {
        xe2?.(), P3({ element: u, positionX: ae2.x, elements: it2.length > 1 ? it2 : void 0, shouldDeactivateAfter: s.wasActivatedByToggle }), Nt2();
      }, hooks: { transformHtmlContent: i.hooks.transformHtmlContent, onOpenFile: i.hooks.onOpenFile, transformOpenFileUrl: i.hooks.transformOpenFileUrl }, performWithFeedback: Vd(u, it2, k2, R3, le2), hideContextMenu: Nt2, cleanup: () => {
        s.wasActivatedByToggle ? nt2() : d2.unfreeze();
      } }, hn2 = i.hooks.transformActionContext(Yt2);
      return { ...Yt2, ...hn2 };
    }, Ud = se2(() => {
      let r = s.contextMenuElement;
      if (!r) return;
      let u = da(), m = s.contextMenuPosition ?? s.pointer;
      return ua$1({ element: r, filePath: u?.filePath, lineNumber: u?.lineNumber, tagName: la2(), componentName: ca(), position: m, shouldDeferHideContextMenu: true, onBeforeCopy: () => {
        vt2 = null;
      }, customEnterPromptMode: (C2) => {
        C2 && d2.setSelectedAgent(C2), d2.clearLabelInstances(), d2.clearInputText(), d2.enterPromptMode(m, r), Ji();
      } });
    }), Gd = () => {
      setTimeout(() => {
        d2.hideContextMenu(), nt2();
      }, 0);
    }, gn2 = () => {
      for (let { boxId: r, labelId: u } of he2) d2.removeGrabbedBox(r), u && d2.removeLabelInstance(u);
      he2 = [];
    }, Wd = (r, u, m, C2) => {
      if (u.length === 0) return;
      let k2 = r.isComment && r.commentText;
      for (let [R3, ae2] of u.entries()) {
        let le2 = m[R3], _e2 = `${C2}-${r.id}-${R3}`;
        d2.addGrabbedBox({ id: _e2, bounds: ae2, createdAt: 0, element: le2 });
        let xe2 = null;
        R3 === 0 && (xe2 = `${C2}-label-${r.id}`, d2.addLabelInstance({ id: xe2, bounds: ae2, tagName: r.tagName, componentName: r.componentName, elementsCount: r.elementsCount, status: "idle", isPromptMode: !!k2, inputValue: k2 ? r.commentText : void 0, createdAt: 0, element: le2, mouseX: ae2.x + ae2.width / 2 })), he2.push({ boxId: _e2, labelId: xe2 });
      }
    }, fa = (r, u) => {
      let m = Ce2(r), C2 = m.map((k2) => ze2(k2));
      Wd(r, C2, m, u);
    }, Go2 = () => {
      ne2 !== null && (q(ne2), ne2 = null);
    }, Qi2 = (r) => {
      Go2();
      let u = () => {
        r(), ne2 = D(u);
      };
      u();
    }, jd = (r) => {
      let u = r.left + r.width / 2, m = r.top + r.height / 2, C2 = m, k2 = window.innerHeight - m, R3 = u, ae2 = window.innerWidth - u, le2 = Math.min(C2, k2, R3, ae2);
      return le2 === C2 ? "top" : le2 === R3 ? "left" : le2 === ae2 ? "right" : "bottom";
    }, es2 = () => {
      if (!z2) return null;
      let r = z2.getBoundingClientRect(), u = jd(r);
      return u === "left" || u === "right" ? { x: u === "left" ? r.right : r.left, y: r.top + r.height / 2, edge: u, toolbarWidth: r.width } : { x: r.left + r.width / 2, y: u === "top" ? r.bottom : r.top, edge: u, toolbarWidth: r.width };
    }, Xt2 = () => {
      Hr2(), po2(), Go2(), gn2(), U2(null), Me2(false);
    }, ma$1 = () => {
      d2.hideContextMenu(), Yn2(), jo2(), S2(Ws()), ve2(false), Qi2(() => {
        let r = es2();
        r && U2(r);
      });
    }, Wo2 = null, pn2 = null, Hr2 = () => {
      Wo2 !== null && (clearTimeout(Wo2), Wo2 = null);
    }, po2 = () => {
      pn2 !== null && (clearTimeout(pn2), pn2 = null);
    }, Yn2 = () => {
      Go2(), x2(null);
    }, Xd = () => {
      Xt2(), Yn2(), Qi2(() => {
        let r = es2();
        r && j2(r);
      });
    }, jo2 = () => {
      Go2(), j2(null);
    }, ga = () => {
      Xt2(), Yn2(), jo2();
    }, Yd = () => {
      q$1() !== null ? Yn2() : (d2.hideContextMenu(), Xt2(), jo2(), Qi2(() => {
        let r = es2();
        r && x2(r);
      }));
    }, qd = () => {
      Hr2(), po2(), O2() !== null ? ie2() ? (gn2(), Me2(false)) : Xt2() : (gn2(), ma$1());
    }, pa$1 = (r) => {
      Gt2(r.content, { tagName: r.tagName, componentName: r.componentName ?? r.elementName, commentText: r.commentText });
      let u = He2(r);
      u && (d2.clearLabelInstances(), D(() => {
        if (!qe2(u)) return;
        let m = ze2(u), C2 = Pn2(m, r.tagName, r.componentName, "copied", { element: u, mouseX: m.x + m.width / 2 });
        Kt2(C2);
      }));
    }, Zd = (r) => {
      gn2(), w3() && (d2.exitPromptMode(), d2.clearInputText());
      let u = He2(r);
      if (r.isComment && r.commentText && u) {
        let m = ze2(u), C2 = m.x + m.width / 2, k2 = m.y + m.height / 2;
        d2.enterPromptMode({ x: C2, y: k2 }, u), d2.setInputText(r.commentText);
      } else pa$1(r);
    }, Jd = (r) => {
      gn2(), G2.delete(r.id);
      let u = js(r.id);
      S2(u), u.length === 0 && (ve2(false), Xt2());
    }, ha2 = () => {
      gn2();
      let r = V2();
      if (r.length === 0) return;
      let u = Ai(r.map((C2) => C2.content)), m = r[0];
      Gt2(u, { componentName: m.componentName ?? m.tagName, entries: r.map((C2) => ({ tagName: C2.tagName, componentName: C2.componentName ?? C2.elementName, content: C2.content, commentText: C2.commentText })) }), Xd(), d2.clearLabelInstances(), D(() => {
        Qr2(() => {
          for (let C2 of r) {
            let k2 = Ce2(C2);
            for (let R3 of k2) {
              let ae2 = ze2(R3), le2 = `label-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              d2.addLabelInstance({ id: le2, bounds: ae2, tagName: C2.tagName, componentName: C2.componentName, status: "copied", createdAt: Date.now(), element: R3, mouseX: ae2.x + ae2.width / 2 }), Kt2(le2);
            }
          }
        });
      });
    }, Qd = (r) => {
      if (gn2(), !r) return;
      let u = V2().find((m) => m.id === r);
      u && fa(u, "history-hover");
    }, eu = (r) => {
      Hr2(), gn2(), r ? (po2(), O2() === null && A2() === null && (ya$1(), Wo2 = setTimeout(() => {
        Wo2 = null, Me2(true), ma$1();
      }, as))) : ie2() && (pn2 = setTimeout(() => {
        pn2 = null, Xt2();
      }, as));
    }, tu = (r) => {
      r ? po2() : ie2() && (pn2 = setTimeout(() => {
        pn2 = null, Xt2();
      }, as));
    }, ba = (r) => {
      gn2(), r ? (po2(), ya$1()) : ie2() && (pn2 = setTimeout(() => {
        pn2 = null, Xt2();
      }, as));
    }, ya$1 = () => {
      for (let r of V2()) fa(r, "history-all-hover");
    }, wa$1 = () => {
      G2.clear();
      let r = Jc();
      S2(r), ve2(false), Xt2();
    }, nu = (r) => {
      let u = Ze2.sessions().get(r);
      if (!u) return;
      let m = Ze2.session.getElement(r);
      m && qe2(m) && setTimeout(() => {
        p$1() || (d2.setWasActivatedByToggle(true), jn2()), d2.setPointer(u.position), d2.setFrozenElement(m), d2.freeze(), d2.showContextMenu(u.position, m);
      }, 0);
    }, ou = (r) => {
      let u = s.labelInstances.find((R3) => R3.id === r);
      if (!u?.element || !qe2(u.element)) return;
      let m = ze2(u.element), C2 = { x: u.mouseX ?? m.x + m.width / 2, y: m.y + m.height / 2 }, k2 = u.elements && u.elements.length > 0 ? u.elements.filter((R3) => qe2(R3)) : [u.element];
      setTimeout(() => {
        p$1() || (d2.setWasActivatedByToggle(true), jn2()), d2.setPointer(C2), d2.setFrozenElements(k2), k2.length > 1 && u.bounds && d2.setFrozenDragRect(Bs(u.bounds)), d2.freeze(), d2.showContextMenu(C2, u.element);
      }, 0);
    };
    pe2(() => {
      let r = i.store.theme.hue;
      r !== 0 ? Yi.style.filter = `hue-rotate(${r}deg)` : Yi.style.filter = "";
    }), i.store.theme.enabled && Il(() => E2(Ac, { get selectionVisible() {
      return qi();
    }, get selectionBounds() {
      return Ne2();
    }, get selectionBoundsMultiple() {
      return kt2();
    }, get selectionShouldSnap() {
      return s.frozenElements.length > 0 || Ct2().length > 0;
    }, get selectionElementsCount() {
      return Le2();
    }, get selectionFilePath() {
      return s.selectionFilePath ?? void 0;
    }, get selectionLineNumber() {
      return s.selectionLineNumber ?? void 0;
    }, get selectionTagName() {
      return Nd();
    }, get selectionComponentName() {
      return Ar2();
    }, get selectionLabelVisible() {
      return $d();
    }, selectionLabelStatus: "idle", get selectionActionCycleState() {
      return vd();
    }, get selectionArrowNavigationState() {
      return Ed();
    }, onArrowNavigationSelect: yd, get labelInstances() {
      return Bd();
    }, get dragVisible() {
      return Zi2();
    }, get dragBounds() {
      return Re2();
    }, get grabbedBoxes() {
      return Hd();
    }, labelZIndex: 2147483647, get mouseX() {
      return Fe2(() => s.frozenElements.length > 1)() ? void 0 : Rt2().x;
    }, get mouseY() {
      return Rt2().y;
    }, get crosshairVisible() {
      return fo2();
    }, get isFrozen() {
      return y2() || p$1() || ue2();
    }, get inputValue() {
      return s.inputText;
    }, get isPromptMode() {
      return w3();
    }, get hasAgent() {
      return Se2();
    }, get isAgentConnected() {
      return s.isAgentConnected;
    }, get agentSessions() {
      return Ze2.sessions();
    }, get supportsUndo() {
      return s.supportsUndo;
    }, get supportsFollowUp() {
      return s.supportsFollowUp;
    }, get dismissButtonText() {
      return s.dismissButtonText;
    }, get onDismissSession() {
      return Ze2.session.dismiss;
    }, get onUndoSession() {
      return Ze2.session.undo;
    }, onFollowUpSubmitSession: ad, onAcknowledgeSessionError: ld, get onRetrySession() {
      return Ze2.session.retry;
    }, onShowContextMenuSession: nu, onShowContextMenuInstance: ou, onLabelInstanceHoverChange: Wn2, get onInputChange() {
      return d2.setInputText;
    }, onInputSubmit: () => void Js(), onInputCancel: Rr2, onToggleExpand: sd, get isPendingDismiss() {
      return g2();
    }, onConfirmDismiss: od, onCancelDismiss: rd, get pendingAbortSessionId() {
      return be2();
    }, onRequestAbortSession: (r) => d2.setPendingAbortSessionId(r), onAbortSession: id, get theme() {
      return i.store.theme;
    }, get toolbarVisible() {
      return i.store.theme.toolbar.enabled;
    }, get isActive() {
      return p$1();
    }, onToggleActive: cd, get enabled() {
      return I2();
    }, onToggleEnabled: ud, get shakeCount() {
      return Q2();
    }, onToolbarStateChange: (r) => {
      ye2(r), Kn2.forEach((u) => u(r));
    }, onSubscribeToToolbarStateChanges: (r) => (Kn2.add(r), () => {
      Kn2.delete(r);
    }), onToolbarSelectHoverChange: W2, onToolbarRef: (r) => {
      z2 = r;
    }, get contextMenuPosition() {
      return Kd();
    }, get contextMenuBounds() {
      return aa2();
    }, get contextMenuTagName() {
      return la2();
    }, get contextMenuComponentName() {
      return ca();
    }, get contextMenuHasFilePath() {
      return !!da()?.filePath;
    }, get actions() {
      return i.store.actions;
    }, get toolbarActions() {
      return i.store.toolbarActions;
    }, get actionContext() {
      return Ud();
    }, onContextMenuDismiss: Gd, onContextMenuHide: Ji, get historyItems() {
      return V2();
    }, get historyDisconnectedItemIds() {
      return Oe2();
    }, get historyItemCount() {
      return V2().length;
    }, get clockFlashTrigger() {
      return L2();
    }, get hasUnreadHistoryItems() {
      return Ee2();
    }, get historyDropdownPosition() {
      return O2();
    }, get isHistoryPinned() {
      return Fe2(() => O2() !== null)() && !ie2();
    }, onToggleHistory: qd, onCopyAll: ha2, onCopyAllHover: ba, onHistoryButtonHover: eu, onHistoryItemSelect: Zd, onHistoryItemRemove: Jd, onHistoryItemCopy: pa$1, onHistoryItemHover: Qd, onHistoryCopyAll: ha2, onHistoryCopyAllHover: ba, onHistoryClear: wa$1, onHistoryDismiss: Xt2, onHistoryDropdownHover: tu, get toolbarMenuPosition() {
      return q$1();
    }, onToggleMenu: Yd, onToolbarMenuDismiss: Yn2, get clearPromptPosition() {
      return A2();
    }, onClearHistoryConfirm: () => {
      jo2(), wa$1();
    }, onClearHistoryCancel: jo2 }), Yi), Se2() && Ze2.session.tryResume();
    let ru = async (r) => {
      let u = Array.isArray(r) ? r : [r];
      return u.length === 0 ? false : await Ir2(u);
    }, xa$1 = () => {
      let r = Vi();
      r && Ze2._internal.setOptions(r);
      let u = !!r?.provider;
      if (d2.setHasAgentProvider(u), u && r?.provider) {
        let m = r.provider;
        d2.setAgentCapabilities({ supportsUndo: !!m.undo, supportsFollowUp: !!m.supportsFollowUp, dismissButtonText: m.dismissButtonText, isAgentConnected: false }), m.checkConnection && m.checkConnection().then((C2) => {
          Vi()?.provider === m && d2.setAgentCapabilities({ supportsUndo: !!m.undo, supportsFollowUp: !!m.supportsFollowUp, dismissButtonText: m.dismissButtonText, isAgentConnected: C2 });
        }).catch(() => {
        }), Ze2.session.tryResume();
      } else d2.setAgentCapabilities({ supportsUndo: false, supportsFollowUp: false, dismissButtonText: void 0, isAgentConnected: false });
    }, ts2 = { activate: () => {
      d2.setPendingCommentMode(false), !p$1() && I2() && Lr2();
    }, deactivate: () => {
      (p$1() || $2()) && nt2();
    }, toggle: () => {
      p$1() ? nt2() : I2() && Lr2();
    }, comment: dd, isActive: () => p$1(), isEnabled: () => I2(), setEnabled: (r) => {
      r !== I2() && (K(r), r || Ys());
    }, getToolbarState: () => no(), setToolbarState: (r) => {
      let u = no(), m = { edge: r.edge ?? u?.edge ?? "bottom", ratio: r.ratio ?? u?.ratio ?? Go, collapsed: r.collapsed ?? u?.collapsed ?? false, enabled: r.enabled ?? u?.enabled ?? true };
      yr2(m), ye2(m), r.enabled !== void 0 && r.enabled !== I2() && K(r.enabled), Kn2.forEach((C2) => C2(m));
    }, onToolbarStateChange: (r) => (Kn2.add(r), () => {
      Kn2.delete(r);
    }), dispose: () => {
      Xs = false, Hr2(), po2(), Go2(), Kn2.clear(), a();
    }, copyElement: ru, getSource: async (r) => {
      let u = await Ut(r), m = Gi(u);
      return m ? { filePath: m.filePath, lineNumber: m.lineNumber ?? null, componentName: m.componentName } : null;
    }, getStackContext: Rr, getState: () => ({ isActive: p$1(), isDragging: T$1(), isCopying: $2(), isPromptMode: w3(), isCrosshairVisible: fo2() ?? false, isSelectionBoxVisible: qi() ?? false, isDragBoxVisible: Zi2() ?? false, targetElement: Z2(), dragBounds: Re2() ?? null, grabbedBoxes: s.grabbedBoxes.map((r) => ({ id: r.id, bounds: r.bounds, createdAt: r.createdAt })), labelInstances: s.labelInstances.map((r) => ({ id: r.id, status: r.status, tagName: r.tagName, componentName: r.componentName, createdAt: r.createdAt })), selectionFilePath: s.selectionFilePath, toolbarState: te2() }), setOptions: (r) => {
      i.setOptions(r);
    }, registerPlugin: (r) => {
      i.register(r, ts2), xa$1();
    }, unregisterPlugin: (r) => {
      i.unregister(r), xa$1();
    }, getPlugins: () => i.getPluginNames(), getDisplayName: zi };
    for (let r of jg) i.register(r, ts2);
    return setTimeout(() => {
      ie(true);
    }, bs), ts2;
  });
};

// ../../../node_modules/.pnpm/react-grab@0.1.27_@types+react@18.3.27_react@19.2.4/node_modules/react-grab/dist/index.js
var n = null;
var l = () => typeof window > "u" ? n : window.__REACT_GRAB__ ?? n ?? null;
var R2 = (e) => {
  n = e, typeof window < "u" && (e ? window.__REACT_GRAB__ = e : delete window.__REACT_GRAB__);
};
var o = [];
var p = (e) => {
  for (; o.length > 0; ) {
    let t = o.shift();
    t && e.registerPlugin(t);
  }
};
var P2 = (e) => {
  let t = l();
  if (t) {
    t.registerPlugin(e);
    return;
  }
  o.push(e);
};
var w2 = (e) => {
  let t = l();
  if (t) {
    t.unregisterPlugin(e);
    return;
  }
  let r = o.findIndex((a) => a.name === e);
  r !== -1 && o.splice(r, 1);
};
typeof window < "u" && !window.__REACT_GRAB_DISABLED__ && (window.__REACT_GRAB__ ? n = window.__REACT_GRAB__ : (n = YC(), window.__REACT_GRAB__ = n), p(n), window.dispatchEvent(new CustomEvent("react-grab:init", { detail: n })));
export {
  ro as DEFAULT_THEME,
  Wc as commentPlugin,
  Bi as formatElementInfo,
  vr2 as generateSnippet,
  l as getGlobalApi,
  Ut as getStack,
  YC as init,
  R as isInstrumentationActive,
  jc as openPlugin,
  P2 as registerPlugin,
  R2 as setGlobalApi,
  w2 as unregisterPlugin
};
//# sourceMappingURL=react-grab.js.map
