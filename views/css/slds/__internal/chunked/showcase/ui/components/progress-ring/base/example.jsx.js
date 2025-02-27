var SLDS=SLDS||{};SLDS["__internal/chunked/showcase/ui/components/progress-ring/base/example.jsx.js"]=webpackJsonpSLDS___internal_chunked_showcase([1,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149],{0:function(e,t){e.exports=React},45:function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.examples=void 0;var n=s(r(0)),a=s(r(46)),i=r(5);function s(e){return e&&e.__esModule?e:{default:e}}t.default=n.default.createElement(a.default,{percent:100});t.examples=[{id:"progress-ring-partially-drained",label:"Progress Ring Partially Drained",element:n.default.createElement(a.default,{percent:88})},{id:"progress-ring-warning",label:"With Warning Icon",element:n.default.createElement(a.default,{percent:20,isWarning:!0},n.default.createElement(i.UtilityIcon,{symbol:"warning",title:"Warning",assistiveText:"Warning"}))},{id:"progress-ring-expired",label:"With Expired Icon",element:n.default.createElement(a.default,{percent:0,isExpired:!0},n.default.createElement(i.UtilityIcon,{symbol:"error",title:"Expired",assistiveText:"Expired"}))},{id:"progress-ring-complete",label:"Complete",element:n.default.createElement(a.default,{percent:100,isComplete:!0},n.default.createElement(i.UtilityIcon,{symbol:"check",title:"Complete",assistiveText:"Complete"}))}]},46:function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}(),a=r(0),i=o(a),s=o(r(1)),l=o(r(11));function o(e){return e&&e.__esModule?e:{default:e}}var c=function(e){function t(){return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).apply(this,arguments))}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,a.Component),n(t,[{key:"getCoordinatesForPercent",value:function(e){var t=e/100;return{x:Math.cos(2*Math.PI*t),y:Math.sin(2*Math.PI*t)}}},{key:"render",value:function(){var e=this.props,t=e.percent,r=e.isWarning,n=e.isComplete,a=e.isExpired,l=this.getCoordinatesForPercent(t),o=l.x,c=l.y,u=t>50?1:0,p=void 0;return r&&(p="slds-progress-ring_warning"),a&&(p="slds-progress-ring_expired"),n&&(p="slds-progress-ring_complete"),i.default.createElement("div",{className:(0,s.default)("slds-progress-ring",p)},i.default.createElement("div",{className:"slds-progress-ring__progress",role:"progressbar","aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":t},i.default.createElement("svg",{viewBox:"-1 -1 2 2"},i.default.createElement("path",{className:"slds-progress-ring__path",id:"slds-progress-ring-path",d:"M 1 0 A 1 1 0 "+u+" 1 "+o+" "+c+" L 0 0"}))),i.default.createElement("div",{className:"slds-progress-ring__content"},this.props.children))}}]),t}();c.propTypes={percent:l.default.number},c.defaultProps={percent:55},t.default=c}},[45]);