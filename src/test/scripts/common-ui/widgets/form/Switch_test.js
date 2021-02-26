import $ from "jquery";
import Switch from "common-ui/widgets/form/Switch";

describe("Switch widget test", function() {
    var switchWidget;

    it("validate simple Switch", function() {
        var label = "Hey",
            el = $("<div/>");
        switchWidget = new Switch({
            label : label
        }, el);

        expect(switchWidget).toBeDefined();
        expect(switchWidget.domNode).toBeDefined();

        // check the switch label
        expect(switchWidget.label).toBe(label);
        expect(el.find("label").text().trim()).toBe(label);
    });

    it("validate Switch change", function() {
        var spy,
            el = $("<div/>");
        switchWidget = new Switch({}, el);

        // spy on the dispatchEvent method
        spy = spyOn(switchWidget, "dispatchEvent");

        expect(switchWidget).toBeDefined();
        expect(switchWidget.domNode).toBeDefined();

        var switchClickEl = el.find("input");
        expect(switchClickEl).toBeDefined();

        // simulate a click
        switchClickEl.prop("checked", false).change();

        expect(spy).toHaveBeenCalledWith("change", {
            selected : false
        }, true);

        // simulate a click again
        switchClickEl.prop("checked", true).change();

        expect(spy).toHaveBeenCalledWith("change", {
            selected : true
        }, true);
    });

    afterEach(function() {
        switchWidget.remove();
        switchWidget = null;
    });
});