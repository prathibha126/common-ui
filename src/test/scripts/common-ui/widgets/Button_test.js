import $ from "jquery";
import Button from "common-ui/widgets/Button";

var getButtonEl = function(button) {
    return button.domNode.children("[data-attach-point='button']");
};

describe("Button widget test", function() {
    var button;

    it("validate simple button", function() {
        var buttonClass = "demo",
            label = "Hey",
            el = $("<div/>");
        button = new Button({
            buttonClass : buttonClass,
            label : label
        }, el);

        expect(button).toBeDefined();
        expect(button.domNode).toBeDefined();

        // check the button label
        expect(button.label).toBe(label);
        expect(button.labelClass).toBeDefined();
        expect(el.find("." + button.labelClass).text()).toBe(label);

        expect(getButtonEl(button).hasClass(buttonClass)).toBeTruthy();
    });

    it("validate button click", function() {
        var data = {demo : true},
            spy;
        button = new Button({
            data : data
        }, $("<div/>"));

        // spy on the dispatchEvent method
        spy = spyOn(button, "dispatchEvent");

        expect(button).toBeDefined();
        expect(button.domNode).toBeDefined();

        // simulate a click
        getButtonEl(button).click();

        expect(spy).toHaveBeenCalledWith("click", data, true);
    });

    afterEach(function() {
        button.remove();
        button = null;
    });
});