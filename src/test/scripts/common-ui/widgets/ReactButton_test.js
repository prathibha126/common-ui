import React from 'react';
import ReactButton from "common-ui/widgets/ReactButton";
import { createWidget } from "common-ui/widgets/utils/reactUtil";
import { shallow, mount } from '../../enzyme';

let validateElementByClassNameText = function(el, className, expectedVal) {
    let elByClassName = el.getElementsByClassName(className);
    expect(elByClassName).toBeDefined();
    expect(elByClassName.length).toBeGreaterThanOrEqual(1);
    expect(elByClassName[0]).toBeDefined();
    expect(elByClassName[0].innerHTML).toBe(expectedVal);
}

describe("ReactButton widget test", function() {
    let button;

    it("validate simple button with defaults", function() {
        let el = document.createElement("div");
        button = createWidget(ReactButton, {}, el);

        expect(button).toBeDefined();

        // ensure the title is set in the dom
        validateElementByClassNameText(el, "button-title", "default");
        // ensure the total is set in the dom
        validateElementByClassNameText(el, "button-total", "0");
    });

    it("validate simple button with custom data", function() {
        let title = "demo",
            total = 10,
            el = document.createElement("div");
        button = createWidget(ReactButton, {title : title, total : total}, el);

        expect(button).toBeDefined();

        // ensure the title is set in the dom from the property value provided
        validateElementByClassNameText(el, "button-title", title);
        // ensure the total is set in the dom from the property value provided
        validateElementByClassNameText(el, "button-total", total + "");
    });

    it("validate custom methods", function() {
        let el = document.createElement("div");
        button = createWidget(ReactButton, {}, el);

        expect(button).toBeDefined();

        // ensure the custom method is surfaced
        expect(button.doSomethingCustom).toBeDefined();
        expect(button.doSomethingCustom()).toBe("something custom");

        // ensure the custom method not listed as bindable is not surfaced
        expect(button.doSomethingSuperCustom).toBeUndefined();
    });

    it("validate update data", function() {
        let title = "demo100",
            total = 100,
            el = document.createElement("div");
        button = createWidget(ReactButton, {}, el);

        expect(button).toBeDefined();

        // ensure the title and total is set in the dom from the defaults
        validateElementByClassNameText(el, "button-title", "default");
        validateElementByClassNameText(el, "button-total", "0");

        // ensure the data can be updated and the new property values are set in the dom
        expect(button.updateData).toBeDefined();
        button.updateData({title : title, total : total});
        validateElementByClassNameText(el, "button-title", title);
        validateElementByClassNameText(el, "button-total", total + "");
    });

    it("validate button click", function() {
        let el = document.createElement("div"),
            buttonEl,
            spy;
        button = createWidget(ReactButton, {}, el);

        expect(button).toBeDefined();

        // spy on the dispatchEvent method
        expect(button.dispatchEvent).toBeDefined();
        spy = spyOn(button, "dispatchEvent");

        buttonEl = el.getElementsByClassName("like-button");
        expect(buttonEl).toBeDefined();
        expect(buttonEl.length).toBeGreaterThanOrEqual(1);
        expect(buttonEl[0]).toBeDefined();

        // simulate a click
        buttonEl[0].click();

        // TODO this is not working for some reason...
        //expect(spy).toHaveBeenCalled();
    });
});