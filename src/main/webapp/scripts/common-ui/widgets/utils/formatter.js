define([
    "numeral",
    "moment"
], function(numeral, moment) {

    "use strict";

    var FORMAT_STRING_DATE = "MM/DD/YYYY";

    return {

        format : function(value, formatString) {
            if (formatString !== null && formatString !== undefined && typeof formatString === "string" && formatString) {
                var prefix = "", postfix = "", parts;
                if (value === null || value === undefined || value === "") {
                    return "";
                }
                if (formatString === FORMAT_STRING_DATE) {
                    return this.formatDate(value);
                }
                else if (formatString.indexOf("MOMENT|") === 0) {
                    return moment(value).format(formatString.substring(7));
                }
                // format strings can be prefixed with a static value and separated by a |
                // for ex: "FY |0" would result in FY 2016 with a value of 2016
                else if (formatString.indexOf("||") > 0) {
                    parts = formatString.split("||");
                    postfix = parts[1];
                    formatString = parts[0];
                }
                else if (formatString.indexOf("|") > 0) {
                    parts = formatString.split("|");
                    prefix = parts[0];
                    formatString = parts[1];
                }

                // prevent things from blowing up if there is a non-numerical value passed in
                if (isNaN(value)) {
                    return prefix + value;
                }
                return prefix + numeral(value).format(formatString) + postfix;
            }
            return value;
        },

        formatCode : function(code, enclosingTag) {
            if (code && typeof code === "string") {
                var codeReplacer = function(codeToReplace) {
                    return codeToReplace
                        ? codeToReplace.replace(/(".*?")/g, "<span class='code-str'>$1</span>") : codeToReplace;
                };
                if (enclosingTag) {
                    return code.trim().replace(new RegExp("(<" + enclosingTag + ".*?>)((?:.|\\s)+?)(</" + enclosingTag + ">)", "gi"), function(match, p1, p2, p3) {
                        return p1 + codeReplacer(p2) + p3;
                    });
                }
                else {
                    return codeReplacer(code);
                }
            }
            return code;
        },

        formatDate : function(dateString){
            var formattedDate = "";
            if (dateString) {
                var dte = new Date(!isNaN(dateString) ? dateString : dateString.replace(/-/g, '/')), mm, dd;
                if (dte) {
                    mm = (dte.getMonth() + 1);
                    if (mm < 10) {
                        mm = "0" + mm;
                    }
                    dd = dte.getDate();
                    if (dd < 10) {
                        dd = "0" + dd;
                    }
                    formattedDate = mm + "/" + dd + "/" + dte.getFullYear();
                }
            }
            return formattedDate;
        }, 

        formatDateAndTime : function(date) {
            var formattedDate = this.formatDate(date)
                , formattedTime = new Date(date)
                , minutes = ("00" + formattedTime.getMinutes()).slice(-2)
                , hours = formattedTime.getHours()
                , amPm;
            if (hours >= 12) {
                amPm = "PM";
                hours -= 12;
            } else {
                amPm = "AM";
            }
            hours = (hours === 0) ? 12 : hours;
            return formattedDate+" "+hours+":"+minutes+" "+amPm;
        }
    };
});