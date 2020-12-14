mapboxgl.accessToken = 'pk.eyJ1Ijoic2FhZGlxbSIsImEiOiJjamJpMXcxa3AyMG9zMzNyNmdxNDlneGRvIn0.wjlI8r1S_-xxtq2d-W5qPA';
const transitland_endpoint = 'http://transit.land/'

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/saadiqm/cjx964vch2dtg1cm9vmsl9bsa', // style URL
    center: [-114, 51], // starting position [lng, lat]
    zoom: 9 // starting zoom
});

var isLoading = d3.select("div#is_loading")
var showTitle = d3.selectAll("div#titles")

var margin = { top: 40, right: 100, bottom: 60, left: 70 }
    , width = 750
    , height = 400

const svg = d3.select("div#container1").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const svg2 = d3.select("div#container2").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const svg3 = d3.select("div#container3").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


let selected_operator = document.getElementById("operator").value
const transitland_url = get_operator(selected_operator)
get_data(transitland_url)

d3.select("select#operator").on("change", function () {
    isLoading.classed("loading loading--s", !isLoading.classed("loading loading--s"));
    var selectedoperator = d3.select(this).property('value')
    console.log(selectedoperator)
    const url = get_operator(selectedoperator)
    get_data(url)
})


function get_data(url){
    d3.json(url).then(data => {

        isLoading.classed("loading loading--s", !isLoading.classed("loading loading--s"));
        
        let routes = data.routes.map(x => {
            let a = {
                onestop_id:x.onestop_id,
                route:x.name,
                route_long_name:x.tags.route_long_name,
                route_stop_patterns:x.route_stop_patterns_by_onestop_id
            }
            return a
        });
    
        let routes2 = routes.filter(x=>x.route_stop_patterns.length>0)

        d3.select("select#routes").html("")
        
        d3.select("select#routes").selectAll("option")
        .data(routes2)
        .enter()
        .append("option")
        .attr("value", (d) => d.onestop_id)
        .text((d) => d.route+" "+d.route_long_name)
    
        let selected_route = document.getElementById("routes").value
        let patterns2 = routes2.filter(x => x.onestop_id === selected_route)[0].route_stop_patterns
    
        d3.select("select#patterns").selectAll("option")
        .data(patterns2)
        .enter()
        .append("option")
        .attr("value", (d) => d)
        .text((d) => d)
    
        get_drive_cycle(patterns2[0])
        isLoading.classed("loading loading--s", !isLoading.classed("loading loading--s"));
        
        d3.select("select#routes").on("change", function () {
            var selectedroute = d3.select(this).property('value')
    
            let patterns = routes2.filter(x => x.onestop_id === selectedroute)[0].route_stop_patterns
    
            get_drive_cycle(patterns[0])
            isLoading.classed("loading loading--s", !isLoading.classed("loading loading--s"));
        
            d3.select("select#patterns").html("")
    
            d3.select("select#patterns").selectAll("option")
            .data(patterns)
            .enter()
            .append("option")
            .attr("value", (d) => d)
            .text((d) => d)
    
        })
    
        d3.select("select#patterns").on("change", function () {
            isLoading.classed("loading loading--s", !isLoading.classed("loading loading--s"));
            var selectedpattern = d3.select(this).property('value')
            get_drive_cycle(selectedpattern)
    
        });
    })
}

function get_drive_cycle(pattern) {

    const drivecycle_endpoint = 'https://b9d8625q6c.execute-api.us-east-1.amazonaws.com/'

    const params = {
        onestop_id:pattern
    }

    const transitland = new URL('/api/v1/route_stop_patterns.geojson',transitland_endpoint)
    const url = new URL('/dev/drivecycle',drivecycle_endpoint)

    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    Object.keys(params).forEach(key => transitland.searchParams.append(key, params[key]))

    const drivecycle_url = decodeURIComponent(url.href)
    const transitland_route_url = decodeURIComponent(transitland.href)
    
    Promise.all([
        d3.json(drivecycle_url),
        d3.json(transitland_route_url)
    ]).then(([drivecycle,route]) =>{

        isLoading.classed("loading loading--s", !isLoading.classed("loading loading--s"));
        showTitle.classed("none", false);

        if (map.getLayer("route")) {
                map.removeLayer("route");
            }
            if (map.getSource("route")) {
                map.removeSource("route");
        }

        map.addSource('route', {
            'type': 'geojson',
            'data': route
        });
        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#ff8987',
                'line-width': 3
            }
        });

        map.on('sourcedata', function (e) {
            if (e.sourceId !== 'route' || !e.isSourceLoaded) return
            var f = map.querySourceFeatures('route')
            if (f.length === 0) return
            var bbox = turf.bbox(route);
            map.fitBounds(bbox, {padding: 30});    
        })
        
        svg.selectAll("*").remove();
        svg2.selectAll("*").remove();
        svg3.selectAll("*").remove();

        const xScale = d3.scaleLinear().range([0, width]);
        const yScale = d3.scaleLinear().range([height, 0]);

        xScale.domain(d3.extent(drivecycle.data, d => d[0]));
        yScale.domain(d3.extent(drivecycle.data, d => d[1]));

        const yaxis = d3.axisLeft()
            .scale(yScale);

        const xaxis = d3.axisBottom()
            .scale(xScale)

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xaxis);

        svg.append("g")
            .attr("class", "axis")
            .call(yaxis);

        svg.append("path")
        .datum(drivecycle.data)
        .attr("fill", "none")
        .attr("stroke", "#4096ff")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return xScale(d[0]) })
            .y(function(d) { return yScale(d[1]) })
            )

            // Add the text label for X Axis
        svg.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate(" + (width / 2) + "," + (height + 40) + ")")  // centre below axis
            .text("Time (s)")
            .style("font", "12px sans-serif")

        // Add the text label for Y Axis
        svg.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate(" + (0 - 50) + "," + (height / 2) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
            .text("Speed (m/s)")
            .style("font", "12px sans-serif")


        const yScale2 = d3.scaleLinear().range([height, 0]);
        yScale2.domain(d3.extent(drivecycle.data, d => d[2]));

        const yaxis2 = d3.axisLeft()
            .scale(yScale2);

        const xaxis2 = d3.axisBottom()
            .scale(xScale)

        svg2.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xaxis2);

        svg2.append("g")
            .attr("class", "axis")
            .call(yaxis2);

        svg2.append("path")
            .datum(drivecycle.data)
            .attr("fill", "none")
            .attr("stroke", "#4096ff")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
            .x(function(d) { return xScale(d[0]) })
            .y(function(d) { return yScale2(d[2]) })
            )

            // Add the text label for X Axis
        svg2.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate(" + (width / 2) + "," + (height + 40) + ")")  // centre below axis
            .text("Time (s)")
            .style("font", "12px sans-serif")

        // Add the text label for Y Axis
        svg2.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate(" + (0 - 50) + "," + (height / 2) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
            .text("Distance (m)")
            .style("font", "12px sans-serif")


        const xScale3 = d3.scaleLinear().range([0, width]);
        const yScale3 = d3.scaleLinear().range([height, 0]);

        xScale3.domain(d3.extent(drivecycle.data, d => d[2]));
        yScale3.domain(d3.extent(drivecycle.data, d => d[1]));

        const yaxis3 = d3.axisLeft()
            .scale(yScale3);

        const xaxis3 = d3.axisBottom()
            .scale(xScale3)

        svg3.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xaxis3);

        svg3.append("g")
            .attr("class", "axis")
            .call(yaxis3);

        svg3.append("path")
        .datum(drivecycle.data)
        .attr("fill", "none")
        .attr("stroke", "#4096ff")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return xScale3(d[2]) })
            .y(function(d) { return yScale3(d[1]) })
            )

            // Add the text label for X Axis
        svg3.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate(" + (width / 2) + "," + (height + 40) + ")")  // centre below axis
            .text("Distance (m)")
            .style("font", "12px sans-serif")

        // Add the text label for Y Axis
        svg3.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate(" + (0 - 50) + "," + (height / 2) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
            .text("Speed (m/s)")
            .style("font", "12px sans-serif")
    })

}

function get_operator(operator){
    const params = {
        include_geometry: false,
        per_page:1000,
        operated_by:operator
    }
    const url = new URL('/api/v1/routes',transitland_endpoint)
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    
    return decodeURIComponent(url.href)
}