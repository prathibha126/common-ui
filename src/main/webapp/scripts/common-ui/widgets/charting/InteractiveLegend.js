define([
    "d3"
], function(d3) {

    "use strict";

    function legend() {
        var margin = {top: 20, right: -10, bottom: 0, left: 0},
            width = 500,
            height = 500,
            legendWidth = 100,
            color = d3.scale.category20c().range(),
            dispatch = d3.dispatch('legendClick');

        function chart(selection){
            selection.each(function(data){
                var wrap = d3.select(this).selectAll('g.legend').data([data]);
                wrap.enter().append('g').attr('class', 'legend').append('g');

                var g = wrap.select('g')
                    .attr('transform', 'translate('+ margin.left +', '+ margin.top +')');

                g.empty();
                var series = g.selectAll('.series')
                    .data(function(d){return d;});

                var seriesEnter = series.enter().append('g').attr('class', 'series')
                    .on('click', function(d, i){
                        dispatch.legendClick(d, i);
                    });

                seriesEnter.append('circle')
                    .style('fill', function(d, i){return color[i % 15];})
                    .style('stroke', function(d, i){return color[i % 15];})
                    .attr('r', 5);

                seriesEnter.append('text')
                    .text(function(d){return d.label.substring(0, 16);})
                    .attr('text-anchor', 'start')
                    .attr('dy', '.32em')
                    .attr('dx', '15');

                series.classed('disabled', function(d){return d.disabled;});
                series.exit().remove();

                var xpos = 5,
                    ypos = -10;

                series.attr('transform', function(d, i){
                    ypos += 20;
                    return 'translate('+ xpos +', '+ ypos +')';
                });
                g.attr('transform', 'translate('+ (width - margin.right - legendWidth) +', '+ margin.top +')');
            });
            return chart;
        }

        chart.dispatch = dispatch;

        chart.margin = function (_) {
            if (!arguments.length) {
                return margin;
            }
            margin = _;
            return chart;
        };

        chart.width = function (_) {
            if (!arguments.length) {
                return width;
            }
            width = _;
            return chart;
        };

        chart.legendWidth = function (_) {
            if (!arguments.length) {
                return legendWidth;
            }
            legendWidth = _;
            return chart;
        };

        chart.height = function (_) {
            if (!arguments.length) {
                return height;
            }
            height = _;
            return chart;
        };

        chart.color = function (_) {
            if (!arguments.length) {
                return color;
            }
            color = _;
            return chart;
        };
        return chart;
    }

    return legend;

});