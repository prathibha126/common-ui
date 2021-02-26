import templateUtil from "common-ui/widgets/utils/templateUtil";

describe("template util test", function() {

    it("validate replace template placeholders", function() {
        expect(templateUtil.replaceTemplatePlaceholders("hey ${demo1} ${demo2}", {
                demo1 : "hello",
                demo2 : "hi"
            }, true, true)).toBe("hey hello hi");

        expect(templateUtil.replaceTemplatePlaceholders("hey ${demo.a} ${demo.b}", {
            demo : {
                a : "hi",
                b : "hello"
            }
        }, false, true).trim()).toBe("hey");

        expect(templateUtil.replaceTemplatePlaceholders("hey ${demo.a} ${demo.b}", {
            demo : {
                a : "hi",
                b : "hello"
            }
        }, true, true)).toBe("hey hi hello");

        expect(templateUtil.replaceTemplatePlaceholders("hey ${demo}", {
            demo : "https://www.demo.com:8000"
        }, true, true)).toBe("hey https://www.demo.com:8000");

        expect(templateUtil.replaceTemplatePlaceholders("hey ${demo}", {
            demo : "https://www.demo.com:8000"
        }, true, true)).toBe("hey https://www.demo.com:8000");
    });
});
