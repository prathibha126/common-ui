import formatter from "common-ui/widgets/utils/formatter";

describe("Simple formatter test", function() {

    it("validate numeric formatting", function() {
        expect(formatter.format(100000, "0,0")).toBe("100,000");
        expect(formatter.format(100000, "0a")).toBe("100k");
        expect(formatter.format(100000, "0.00")).toBe("100000.00");
        expect(formatter.format(100000, "0.0a")).toBe("100.0k");
    });

});