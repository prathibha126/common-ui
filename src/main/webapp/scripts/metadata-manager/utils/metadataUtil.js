define([
    "exports",
    "jquery"
], function(exports, $) {

    var scorecardInfo = {
            data : [{}, {}, {}],
            type : "List<SummaryItem>"
        },
        legendInfo = {},
        widgetInfo = {
            "Button" : {},
            "GridButton" : {},
            "Content" : {},
            "DomainItemOverview" : {},
            "DomainSummary" : {},
            "FileUpload" : {},
            "MeasureItem" : {},
            "SelectionList" : {},
            "SummaryBar" : scorecardInfo,
            "Scorecard" : scorecardInfo,
            "SummaryBarItem" : {},
            "OverviewToggleBar" : legendInfo,
            "Legend" : legendInfo, // alias for OverviewToggleBar
            "MeasureTrendChart" : {},
            "SparkLineChart" : {},
            "ChartGrid" : {},
            "GridTable" : {},
            "LineChart" : {},
            "BubbleLineChart" : {},
            "BarChart" : {},
            "AreaChart" : {},
            "PieChart" : {},
            "PolarAreaChart" : {},
            "RadarChart" : {},
            "Stars" : {},
            "TitleBar" : {},
            "ToggleBar" : {},
            "ToggleBarContainer" : {},
            "SparkBarChart" : {},
            "ComparativeBoxPlot" : {},
            "ComparativeBoxPlotLegend" : {},
            "TextInput" : {}
        },
        TEMPLATE_DOMAIN_SUMMARY = "domainSummary",
        TEMPLATE_DOMAIN_COMPARISON = "domainComparison",
        TEMPLATE_MEASURE_COMPARISON = "measureComparison",
        TEMPLATE_MEASURE_SUMMARY = "measureSummary",
        TEMPLATE_MEASURE_DETAIL = "measureDetail";

    exports.getWidgetInfo  = function(widgetType) {
        return widgetInfo[widgetType];
    };

    exports.getViewTemplateOptions = function() {
        return [
            {name : "Domain Summary", value : TEMPLATE_DOMAIN_SUMMARY},
            {name : "Domain Comparison", value : TEMPLATE_DOMAIN_COMPARISON},
            {name : "Measure Summary", value : TEMPLATE_MEASURE_SUMMARY},
            {name : "Measure Comparison", value : TEMPLATE_MEASURE_COMPARISON},
            {name : "Measure Detail", value : TEMPLATE_MEASURE_DETAIL}
        ];
    };

    exports.generateViewTemplate = function(type, name, viewData) {
        if (type === TEMPLATE_DOMAIN_SUMMARY) {
            viewData.widgets[name + "Scorecard"] = {
                widgetType : "Scorecard",
                widgetProperties : {

                },
                widgetData : {
                    type : "list",
                    data : [{"descr":"First Measure","value":0.020000,"formatString":"0.00%"},{"descr":"Second Measure","value":3341008.87,"formatString":"$0,0"},{"descr":"Third Measure","value":42561.79,"formatString":"$0,0"}]
                },
                index : 1
            };
            /*viewData.widgets[name + "TitleBar"] = {
                widgetType : "TitleBar",
                widgetProperties : {
                    secondary : "true",
                    title : "Summary by Domain"
                },
                widgetData : {

                },
                index : 2
            };*/
            /*viewData.widgets[name + "Legend"] = {
                widgetType : "Legend",
                widgetProperties : {
                    title : "Performance"
                },
                widgetData : {
                    type : "list",
                    data : {
                        0 : {statusId : 1, label : "missing target"},
                        1 : {statusId : 2, label : "at-risk to miss target"},
                        2 : {statusId : 3, label : "meeting or exceeding target"}
                    }
                },
                index : 3
            };*/
            viewData.widgets[name + "DomainSummary"] = {
                widgetType : "DomainSummary",
                widgetProperties : {

                },
                widgetData : {
                    type : "list",
                    data : [{"id":4,"domainDesc":"Domain 1","domainPointCount":34,"domainPossiblePointCount":50,"domainWeightScore":27.2,"domainWeightPercentage":0.4,"domainMeasures":[{"id":14,"statusId":1,"domainId":4,"measureDesc":"Measure 1","measureScore":5.0,"scoreFormatString":"0","domainSortId":0},{"id":15,"statusId":1,"domainId":4,"measureDesc":"Measure 2","measureScore":5.0,"scoreFormatString":"0","domainSortId":0},{"id":12,"statusId":1,"domainId":4,"measureDesc":"Measure 3","measureScore":7.0,"scoreFormatString":"0","domainSortId":0},{"id":13,"statusId":1,"domainId":4,"measureDesc":"Measure 4","measureScore":7.0,"scoreFormatString":"0","domainSortId":0}],"domainStatus":"Included","scoreFormatString":"0","weightFormatString":"0.0%","domainGroupId":"1"},
                        {"id":1,"domainDesc":"Domain 2","domainPointCount":77,"domainPossiblePointCount":100,"domainWeightScore":19.25,"domainWeightPercentage":0.25,"domainMeasures":[{"id":26,"statusId":6,"domainId":1,"measureDesc":"Measure 1","measureScore":20.0,"scoreFormatString":"0","domainSortId":0},{"id":23,"statusId":1,"domainId":1,"measureDesc":"Measure 2","measureScore":4.0,"scoreFormatString":"0","domainSortId":0},{"id":20,"statusId":1,"domainId":1,"measureDesc":"Measure 3","measureScore":4.0,"scoreFormatString":"0","domainSortId":0}],"domainStatus":"Included","scoreFormatString":"0","weightFormatString":"0.0%","domainGroupId":"2"},
                        {"id":3,"domainDesc":"Domain 3","domainPointCount":10,"domainPossiblePointCount":10,"domainWeightScore":25.0,"domainWeightPercentage":0.25,"domainMeasures":[{"id":9,"statusId":1,"domainId":3,"measureDesc":"Measure 1","measureScore":10.0,"scoreFormatString":"0","domainSortId":0}],"domainStatus":"Included","scoreFormatString":"0","weightFormatString":"0.0%","domainGroupId":"3"},
                        {"id":2,"domainDesc":"Domain 4","domainPointCount":26,"domainPossiblePointCount":60,"domainWeightScore":4.33,"domainWeightPercentage":0.1,"domainMeasures":[{"id":6,"statusId":3,"domainId":2,"measureDesc":"Measure 1","measureScore":0.0,"scoreFormatString":"0","domainSortId":0},{"id":8,"statusId":3,"domainId":2,"measureDesc":"Measure 2","measureScore":0.0,"scoreFormatString":"0","domainSortId":0}],"domainStatus":"Included","scoreFormatString":"0","weightFormatString":"0.0%","domainGroupId":"4"}]
                },
                index : 4
            };
        }
        else if (type === TEMPLATE_DOMAIN_COMPARISON) {
            viewData.widgets[name + "Scorecard"] = {
                widgetType : "Scorecard",
                widgetProperties : {

                },
                widgetData : {

                },
                index : 1
            };
            viewData.widgets[name + "TitleBar"] = {
                widgetType : "TitleBar",
                widgetProperties : {
                    title : "Measure Comparison"
                },
                widgetData : {

                },
                index : 2
            };
            viewData.widgets[name + "ComparisonGrid"] = {
                widgetType : "GridTable",
                widgetProperties : {
                    columns : {
                        "1" : {
                            name : "Name"
                        }
                    }
                },
                widgetData : {
                    type : "list",
                    data : {
                        overview : {
                            title : "Performance"
                        },
                        data : [
                            {1 : "Demo 1"},
                            {1 : "Demo 2"}
                        ]
                    }
                },
                index : 3
            };
        }
        else if (type === TEMPLATE_MEASURE_COMPARISON) {
            viewData.widgets[name + "Scorecard"] = {
                widgetType : "Scorecard",
                widgetProperties : {

                },
                widgetData : {

                },
                index : 1
            };
            viewData.widgets[name + "TitleBar"] = {
                widgetType : "TitleBar",
                widgetProperties : {
                    secondary : "true",
                    title : "Measure Comparison"
                },
                widgetData : {

                },
                index : 2
            };
            viewData.widgets[name + "ComparisonGrid"] = {
                widgetType : "GridTable",
                widgetProperties : {
                    columns : {

                    }
                },
                widgetData : {

                },
                index : 3
            };
        }
        else if (type === TEMPLATE_MEASURE_SUMMARY) {
            viewData.widgets[name + "TitleBar"] = {
                widgetType : "TitleBar",
                widgetProperties : {
                    secondary : "true",
                    title : "Measure Summary"
                },
                widgetData : {

                },
                index : 1
            };
            viewData.widgets[name + "Legend"] = {
                widgetType : "Legend",
                widgetProperties : {
                    title : "Measure Performance"
                },
                widgetData : {
                    type : "List",
                    data : {
                        "0" : {statusId : "3", label : "off track"},
                        "1" : {statusId : "2", label : "improving"},
                        "2" : {statusId : "1", label : "met goal"}
                    }
                },
                index : 2
            };
            viewData.widgets[name + "ChartGrid"] = {
                widgetType : "ChartGrid",
                widgetProperties : {
                    columns : {
                        trend : {
                            index : "1",
                            widget : {
                                widgetType : "MeasureTrendChart",
                                widgetProperties : {
                                    chartWidth : 300,
                                    chartHeight : 245
                                }
                            }
                        }
                    }
                },
                widgetData : {

                },
                index : 3
            };
        }
        else if (type === TEMPLATE_MEASURE_DETAIL) {
            viewData.widgets[name + "MeasureTrend"] = {
                widgetType : "MeasureTrendChart",
                widgetProperties : {

                },
                widgetData : {

                },
                index : 1
            };
            viewData.widgets[name + "DimensionSelect"] = {
                widgetType : "SelectionList",
                widgetProperties : {
                    "promptLabel" : "Dimension",
                    "promptHeader" : "Select Dimension"
                },
                widgetData : {

                },
                index : 2
            };
            viewData.widgets[name + "DimensionGrid"] = {
                widgetType : "GridTable",
                widgetProperties : {
                    columns : {

                    }
                },
                widgetData : {

                },
                index : 3
            };
        }
        return viewData;
    };
});