import React from "react";
import ReactDom from "react-dom";

export function createWidget(WidgetConstructor, widgetProperties, domNode) {
    return ReactDom.render(
        React.createElement(WidgetConstructor, widgetProperties), domNode);
}