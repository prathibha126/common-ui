import formUtil from "common-ui/widgets/utils/formUtil";

describe("form util test", function() {

    it("validate simple query params", function() {
        let query = "a=1&b=2",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 1, b : 2}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : 2, b : 2}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 2, b : 1}, queryParams)).toBe(false);
    });

    it("validate query params not equals", function() {
        let query = "a!=1",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 1}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 2}, queryParams)).toBe(true);
    });

    it("validate wildcard query params", function() {
        let query = "a=*",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 0}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : ""}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : null}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : undefined}, queryParams)).toBe(false);
    });

    it("validate null and undefined query params", function() {
        let query = "a!=*",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 0}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : ""}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : null}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : undefined}, queryParams)).toBe(true);
    });

    it("validate deep query params", function() {
        let query = "a.b.c=1&a.b.d.e.f=2",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : {b : {c : 1, d : {e : {f : 2}}}}}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : {b : {c : 1, d : {e : {f : 3}}}}}, queryParams)).toBe(false);
    });

    it("validate query params or", function() {
        let query = "a==1||b==2",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 1, b : 2}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : 2, b : 2}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : 2, b : 1}, queryParams)).toBe(false);
    });

    it("validate query params double equals", function() {
        let query = "a==1&b==2",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 1, b : 2}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : 2, b : 2}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 2, b : 1}, queryParams)).toBe(false);
    });

    it("validate query params double ampersand", function() {
        let query = "a==1&&b==2&&c=3",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 1, b : 2, c : 3}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : 3, b : 1, c : 2}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 3, b : 2, c : 1}, queryParams)).toBe(false);
    });

    it("validate query params contains", function() {
        let query = "a~=b",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : "abc"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : "ac"}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : ["a", "b", "c"]}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : ["a", "c"]}, queryParams)).toBe(false);
    });

    it("validate query params not contains", function() {
        let query = "a^=b",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : "abc"}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : "ac"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : ["a", "b", "c"]}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : ["a", "c"]}, queryParams)).toBe(true);
    });

    it("validate query params numeric", function() {
        let query = "a>=10&b<=20",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : 10, b : 20}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : 20, b : 21}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 9, b : 10}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 9, b : 21}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : 100, b : 0}, queryParams)).toBe(true);
    });

    it("validate query params regex", function() {
        let query = "a==REGEX:([A-C][D-F]\\w\\w)",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : "no"}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : "ADbc"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : ""}, queryParams)).toBe(false);
    });

    it("validate query params negated regex", function() {
        let query = "a!=REGEX:([A-C][D-F]\\w\\w)",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : "no"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : "ADbc"}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : ""}, queryParams)).toBe(true);
    });

    it("validate query params regex and null or undefined", function() {
        let query = "a!=REGEX:([A-C][D-F]\\w\\w)||a!=*",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : "no"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : null}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : undefined}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : "ADbc"}, queryParams)).toBe(false);
    });

    it("validate query params double regex", function() {
        let query = "a==REGEX:([A-C][D-F]\\w\\w)&&b!=REGEX:([A-C][D-F]\\w\\w)",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({a : "ADbc", b : "no"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : "no", b : "ADbc"}, queryParams)).toBe(false);

        expect(formUtil.doesDataMatchQueryParams({a : "ADbc", b : "ABcd"}, queryParams)).toBe(true);

        expect(formUtil.doesDataMatchQueryParams({a : null, b : null}, queryParams)).toBe(false);
    });

    it("validate static query params", function() {
        let query = "#true===true||#false==false",
            queryParams = formUtil.extractQueryParams(query);

        expect(formUtil.doesDataMatchQueryParams({}, queryParams)).toBe(true);
    });
});
