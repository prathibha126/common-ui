define([
    "jquery",
    "common-ui/widgets/_TemplatedWidget",
    "common-ui/widgets/utils/cssUtil",
    "common-ui/widgets/utils/colorUtil",
    "lib/topojson",
    "lib/leaflet",
    "lib/chroma",
    "common-ui/widgets/utils/formatter",
    "text!common-ui/widgets/mapping/templates/InteractiveMap.html"
], function ($, _TemplatedWidget, cssUtil, colorUtil, topojsonjs, leafletjs, chromajs, formatterjs, template) {

    var MAP_CSS = "leaflet",
        TOPOJSON_TYPE_MAP = {
            "3zip" : "scripts/lib/topojson/3zip.topo.json"
        };

    return _TemplatedWidget.extend({

        template: template,

        topoJsonType : "3zip",

        label: "Filter: ",

        placeholder: "Enter the first 3 digits...",

        //Colors are numerical values without the "#"
        startColor: 'e4f3f9',

        endColor: colorUtil.COLORS.secondary4,

        highlightColor: colorUtil.COLORS.secondary1,

        undefinedColor: '#e4f3f9',

        numberOfValues: 6,

        formatString: "0[.]00a",

        minValue: null,

        maxValue: null,

        maxSelect: 10,

        mapHeight: 500,

        infoTitle: "Encounters",

        onTemplateNodesAttached: function (nodes) {
            if (nodes) {
                this.mapPoint = nodes.map;
                this.mapInput = nodes.mapInput;
            }
        },

        updateData: function (data) {
            if (data) {
                this.minValue = null;
                this.maxValue = null;

                var i = 0, curr, val;
                for (i; i < data.length; i++) {
                    curr = data[i];
                    if (curr !== null && curr !== undefined && curr.value !== null && curr.value !== undefined) {
                        val = Number(curr.value);
                        if (this.minValue === null || val < this.minValue) {
                            this.minValue = val;
                        }
                        if (this.maxValue === null || val > this.maxValue) {
                            this.maxValue = val;
                        }
                    }
                }

            }
            this.data = data;

            if (data) {
                this._renderInteractiveMap();
                this.dispatchChange(this.selectedValues, true);
            }
        },

        onInit: function () {
            cssUtil.loadStylesheet(MAP_CSS);
        },

        _renderInteractiveMap: function () {
            if (!this.firstTime && this.data) {
                this.firstTime = this.interactiveMap(TOPOJSON_TYPE_MAP[this.topoJsonType] || TOPOJSON_TYPE_MAP["3zip"], this.data);
            }

            else if (this.firstTime && this.data) {
                this.refreshMap();
            }
        },

        getTemplateData: function () {
            return {
                placeholder: this.placeholder || "",
                label: this.label
            };
        },

        dispatchChange: function (mapArray, userFired) {
            if (mapArray) {
                if (mapArray.length < 1) {
                    mapArray = [-1];
                }
                this.dispatchEvent("change", {
                    selectedMapValues: mapArray.slice(0)
                }, userFired);
            }
        },

        interactiveMap: function (dataSource, data) {
            var formatString = this.formatString,
                infoTitle = this.infoTitle,
                label = this.label;
            this.mapPoint.height(this.mapHeight);
            this.valuesList = this.calculateBounds(this.minValue, this.maxValue);
            this.colorScale = this.generateColor();
            this.selectedValues = [];
            this.dispatchValues = [];

            //Adding the map to the page
            leafletjs.TopoJSON = leafletjs.GeoJSON.extend({
                addData: function (jsonData) {
                    if (jsonData.type === "Topology") {
                        var key;
                        for (key in jsonData.objects) {
                            geojson = topojsonjs.feature(jsonData, jsonData.objects[key]);
                            leafletjs.GeoJSON.prototype.addData.call(this, geojson);
                        }
                    }
                    else {
                        leafletjs.GeoJSON.prototype.addData.call(this, jsonData);
                    }
                }
            });

            this.map = leafletjs.map(this.mapPoint[0]).setView([37.8, -96], 4);
            this.map.attributionControl.remove();

            //Sets the maximum that the user can zoom out
            this.map.options.minZoom = 3;

            //Sets the maximum that the user can zoom in
            this.map.options.maxZoom = 7;

            //Grab the topoJson with the boundaries and bind data to it
            $.getJSON(dataSource).done(this.mapDataToLabel.bind(this));

            this.info = leafletjs.control();

            this.info.onAdd = function (map) {
                this._div = $("<div/>", {"class" : "map_info"})[0]; // create a div with a class "info"
                this.updateInfoBox();
                return this._div;
            };

            //Updates the html in the top right of the map
            this.info.updateInfoBox = function (props) {
                this._div.innerHTML = '<h4 style = "margin: 0px; margin-bottom: 5px;">' + infoTitle + '</h4>' + (props ?
                    '<b>' + label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() + " " + props.ZIP + '</b><br />'
                    + ((props.density !== null && props.density !== undefined) ? formatterjs.format(props.density, formatString)
                    + ' total ' + infoTitle.toLowerCase() + '</sup>'
                        : 'No data available</sup>') : 'Hover over a region');
            };
            this.info.addTo(this.map);

            this.legend = leafletjs.control({position: 'bottomleft'});

            //Creates the legend in the bottom left of the map
            this.legend.onAdd = function (map) {
                this.mapDiv = $('<div/>', {"class" : 'map_info map_legend'})[0];
                return this.updateLegend(this.mapDiv);
            };

            this.legend.updateLegend = function (div) {
                div.innerHTML = "";
                var i;
                for (i = 0; i < this.valuesList.length; i++) {
                    var currVal = this.valuesList[i],
                        nextValue = this.valuesList[i + 1];

                    div.innerHTML +=
                        '<div><i style="background:' + this.getColor(currVal + 1, this.valuesList, this.colorScale) + '"></i> ' +
                        formatterjs.format(currVal, formatString) + (nextValue ? '&ndash;' +
                        formatterjs.format(nextValue, formatString) : '+') + "</div>";
                }
                this.mapDiv = div;

                if(this.data && this.data.length > 0){
                    this.domNode.find('div.map_info.map_legend').show();
                }

                else{
                    this.domNode.find('div.map_info.map_legend').hide();
                }

                return div;
            }.bind(this);


            var delay = (function () {
                var timer = 0;
                return function (callback, ms) {
                    clearTimeout(timer);
                    timer = setTimeout(callback, ms);
                };
            }());

            this.legend.addTo(this.map);

            //Moves the map as the user types
            this.connect(this.attachPoints.mapInput, "keyup", function (e) {
                delay(function () {
                    this.moveMap(e);
                }.bind(this), 100);
            }.bind(this));

            return true;
        },

        //Uses Chroma.js to generate a list of colors from the startColor to the endColor
        generateColor: function () {
            var generatedColors = chromajs.scale([this.startColor, this.endColor]).mode('rgb').colors(this.numberOfValues);

            return generatedColors;
        },

        //Calculates the range values of the sorting bins
        calculateBounds: function (minimum, maximum) {
            if (minimum === null || maximum === null) {
                return [];
            }
            var range = maximum - minimum,
                gap = range / (this.numberOfValues - 1),
                binValues = [];

            var i;
            binValues.push(minimum);
            for (i = 0; i < this.numberOfValues - 2; i++) {
                binValues.push(Math.round(binValues[i] + gap));
            }
            binValues.push(maximum);

            return binValues;
        },

        mapDataToLabel: function (topoData) {
            var zipMap = {};

            var i, j;

            for (i = 0; i < topoData.objects.zip3.geometries.length; i++) {
                var currTop = topoData.objects.zip3.geometries[i];

                if (zipMap[currTop.properties.ZIP]) {
                    zipMap[currTop.properties.ZIP].push(currTop);
                } else {
                    zipMap[currTop.properties.ZIP] = [currTop];
                }
            }

            for (i = 0; i < this.data.length; i++) {
                var currData = this.data[i];
                if (zipMap[currData.label]) {
                    for (j = 0; j < zipMap[currData.label].length; j++) {
                        zipMap[currData.label][j].properties.density = currData.value;
                    }
                }
            }
            this.addTopoData(topoData);
        },

        addTopoData: function (topoData) {
            this.data = topoData;
            var style = this.style.bind(this),
                onEachFeature = this.onEachFeature.bind(this);

            setTimeout(function () {
                this.topoLayer = new leafletjs.TopoJSON(topoData, {
                    style: style,
                    onEachFeature: onEachFeature
                });
                this.topoLayer.addTo(this.map);
                this.resetHighlight();

            }.bind(this), 1);
        },

        getColor: function (d, values, colors) {
            if (d === null || d === undefined) {
                return this.undefinedColor;
            }

            var j;
            for (j = 0; j < values.length; j++) {
                if (values[j + 1]) {
                    if (d >= values[j] && d < values[j + 1]) {
                        return colors[j];
                    }
                }
                else {
                    return colors[j];
                }
            }
        },

        //Initial Styling
        style: function (feature) {
            return {
                fillColor: this.getColor(feature.properties.density, this.valuesList, this.colorScale),
                weight: 0.5,
                opacity: 1,
                color: '#999',
                fillOpacity: 1
            };
        },

        //Hover over styling
        highlightFeature: function (e) {
            var layer = e;

            layer.setStyle({
                weight: 2,
                color: '#' + this.highlightColor,
                dashArray: ''
            });

            if (!leafletjs.Browser.ie && !leafletjs.Browser.opera) {
                layer.bringToFront();
            }

            var property;
            for (property in layer._layers) {
                if (property) {
                    this.info.updateInfoBox(layer._layers[property].feature.properties);
                    break;
                }
            }
        },

        resetHighlight: function (e) {
            var topoLayer = this.topoLayer,
                selectedValues = this.selectedValues,
                highlightColor = this.highlightColor;

            topoLayer.eachLayer(function (l) {
                //Reset the styling is the zip isn't selected
                var inx = $.inArray(l.feature.properties.ZIP, selectedValues);
                if (inx < 0) {
                    topoLayer.resetStyle(l);
                }

                //If the user hovered over a selected value, change the styling back to selected
                else {
                    l.setStyle({
                        weight: 2,
                        fillColor: '#' + highlightColor,
                        color: '#999',
                        dashArray: '',
                        fillOpacity: 0.6
                    });
                }
            });

            this.topoLayer = topoLayer;
            //only resets the info box if the selected object is no longer highlighted
            if (e && e.type === 'mouseout') {
                this.info.updateInfoBox();
            }
        },

        resetColors: function (e, type, zip) {
            if (type === "click") {
                if ($.inArray(zip, this.selectedValues) < 0) {
                    this.resetHighlight();
                    e.setStyle({
                        weight: 2,
                        color: '#' + this.highlightColor,
                        dashArray: ''
                    });
                }
                else {
                    e.setStyle({
                        weight: 2,
                        fillColor: '#' + this.highlightColor,
                        color: '#999',
                        dashArray: '',
                        fillOpacity: 0.6
                    });
                }
            }
            else {
                if (zip) {
                    e.setStyle({
                        weight: 2,
                        color: '#' + this.highlightColor,
                        dashArray: ''
                    });
                }
                else {
                    this.resetHighlight();
                }
            }
        },

        zoomToFeature: function (e, type, zip) {
            if (!e._layers) {
                this.map.fitBounds(e.target.getBounds());
                this.mapPoint.trigger("regionClick", [e.target.feature.properties.ZIP]);
            } else {
                if (zip && type != "click") {
                    this.map.fitBounds(e.getBounds());
                    this.info.updateInfoBox();
                }
                this.resetColors(e, type, zip);
            }
        },

        onEachFeature: function (feature, layer) {
            var mouseover = this.mouseover.bind(this),
                resetHighlight = this.resetHighlight.bind(this),
                mapClick = this.mapClick.bind(this);

            layer.on({
                mouseover: mouseover,
                mouseout: resetHighlight,
                click: mapClick
            });
        },

        moveMap: function (e, zip) {
            var group = [];
            if (!zip) {
                zip = this.mapInput.val().trim();
                if (!zip) {
                    this.resetHighlight();
                }
            }
            if (zip) {
                var i = 0;
                var property;
                //Loops through and finds all instances of the zip given
                for (property in this.map._targets) {
                    if (this.map._targets.hasOwnProperty(property)) {
                        var currProp = this.map._targets[property];

                        if (i != 0 && currProp.feature.properties.ZIP.substring(0, zip.length) == zip) {
                            group.push(currProp);
                        }

                        //Resetting the styling while using the input field
                        else if (i != 0) {
                            if ($.inArray(currProp.feature.properties.ZIP, this.selectedValues) < 0) {
                                currProp.setStyle({
                                    fillColor: this.getColor(currProp.feature.properties.density, this.valuesList, this.colorScale),
                                    weight: 0.5,
                                    color: '#999',
                                    opacity: 1,
                                    fillOpacity: 1
                                });
                            }
                            else {
                                currProp.setStyle({
                                    weight: 2,
                                    fillColor: '#' + this.highlightColor,
                                    color: '#999',
                                    dashArray: '',
                                    fillOpacity: 0.6
                                });
                            }
                        }
                        i++;
                    }
                }
            }

            var featureGroup = new leafletjs.featureGroup(group);
            if (e.type === "mouseover") {
                this.highlightFeature(featureGroup);
            }
            else {
                this.zoomToFeature(featureGroup, e.type, zip);

                // Uncomment to add objects to dispatch event
                // i = 0;
                // featureGroup.eachLayer(function (layer) {
                //     var inx = $.inArray(layer.feature.properties.ZIP, this.selectedValues);
                //     if (inx > -1 && i < 1) {
                //         this.dispatchValues.push(layer);
                //     }
                //     i++;
                // }.bind(this));

                if (e.type === "click") {
                    this.dispatchChange(this.selectedValues, true);
                }
            }
        },

        mapClick: function (e) {
            var currZip = e.target.feature.properties.ZIP;
            if (currZip !== null && currZip !== undefined) {
                var inx = $.inArray(currZip, this.selectedValues);
                if ((this.maxSelect && this.selectedValues.length < this.maxSelect) || !this.maxSelect) {
                    if (inx < 0) {
                        this.selectedValues.push(currZip);
                        this.mapInput.val(currZip);
                        this.moveMap(e, currZip);
                    }
                }
                else if(inx < 0){
                    alert("ERROR: Maximum Selected");
                }

                if (inx > -1) {
                    this.selectedValues.splice(inx, 1);
                    var i;
                    for (i = 0; i < this.dispatchValues.length; i++) {
                        if (this.dispatchValues[i].feature.properties.ZIP === currZip) {
                            this.dispatchValues.splice(i, 1);
                        }
                    }

                    this.mapInput.val(currZip);
                    this.moveMap(e, currZip);
                }
            }

        },

        mouseover: function (e) {
            var zip = e.target.feature.properties.ZIP,
                group = [];

            var i = 0,
                property;
            //Loops through and finds all instances of the zip given
            for (property in this.map._targets) {
                if (this.map._targets.hasOwnProperty(property)) {
                    var currProp = this.map._targets[property];
                    if (i !== 0 && currProp.feature.properties.ZIP.substring(0, zip.length) === zip) {
                        group.push(this.map._targets[property]);
                    }

                    //Resetting the styling while using the input field
                    else if (i !== 0) {
                        if ($.inArray(currProp.feature.properties.ZIP, this.selectedValues) < 0) {
                            currProp.setStyle({
                                fillColor: this.getColor(currProp.feature.properties.density, this.valuesList, this.colorScale),
                                weight: 0.5,
                                color: '#999',
                                opacity: 1,
                                fillOpacity: 1
                            });
                        }
                        else {
                            currProp.setStyle({
                                weight: 2,
                                fillColor: '#' + this.highlightColor,
                                color: '#999',
                                dashArray: '',
                                fillOpacity: 0.6
                            });
                        }
                    }
                    i++;
                }
            }

            this.highlightFeature(new leafletjs.featureGroup(group));
        },

        refreshMap: function () {
            this.valuesList = this.calculateBounds(this.minValue, this.maxValue);
            this.colorScale = this.generateColor();
            this.legend.updateLegend(this.mapDiv);

            var data = this.data,
                dataMap = {};

            var i;
            for (i = 0; i < data.length; i++) {
                var curr = data[i];
                if (curr && curr.label !== undefined && curr.label !== null) {
                    dataMap[curr.label] = curr.value;
                }
            }

            this.topoLayer.eachLayer(function (l) {
                var currLayer = l.feature.properties;

                if (l && l.feature && currLayer && currLayer.ZIP !== null && currLayer.ZIP !== undefined) {
                    var currMap = dataMap[currLayer.ZIP];

                    //reset the density property
                    if (currMap !== null && currMap !== undefined) {
                        currLayer.density = currMap;
                    }
                    else{
                        currLayer.density = null;
                    }

                    //Reset the styling is the zip isn't selected
                    var inx = $.inArray(currLayer.ZIP, this.selectedValues);
                    if (inx < 0) {
                        l.setStyle({
                            fillColor: this.getColor(currLayer.density, this.valuesList, this.colorScale),
                            weight: 0.5,
                            opacity: 1,
                            color: '#999',
                            fillOpacity: 1
                        });
                    }

                    //If the user hovered over a selected value, change the styling back to selected
                    else {
                        l.setStyle({
                            weight: 2,
                            fillColor: '#' + this.highlightColor,
                            color: '#999',
                            dashArray: '',
                            fillOpacity: 0.6
                        });
                    }
                }
            }.bind(this));
        },

        remove: function () {
            if (this.map){
                this.map.remove();
            }

            this._super.apply(this, arguments);
        }
    });
});
