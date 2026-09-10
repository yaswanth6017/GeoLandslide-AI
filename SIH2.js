/* ============================================================
   GEOLANDSLIDE AI
   Functional Application Controller
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

/*
   DEMO MODE

   true  = functional demo data updates automatically
   false = use your real IoT API

   For your SIH demonstration, keep this TRUE.
*/

const DEMO_MODE = true;


/*
   When you have a real backend, change this URL and set
   DEMO_MODE = false.
*/

const SENSOR_API_URL =
    "http://YOUR-SERVER/api/sensors";


/* ============================================================
   DATA
   ============================================================ */

const zones = [

    {
        name: "Shillong",
        lat: 25.5788,
        lng: 91.8933,

        rainfall: 82,
        soil: 74,
        movement: 6.8,
        tilt: 3.2,

        slope: 38,
        elevation: 1496,
        historical: 88
    },

    {
        name: "Aizawl",
        lat: 23.7271,
        lng: 92.7176,

        rainfall: 68,
        soil: 67,
        movement: 5.1,
        tilt: 2.4,

        slope: 34,
        elevation: 1132,
        historical: 79
    },

    {
        name: "Imphal",
        lat: 24.8170,
        lng: 93.9368,

        rainfall: 61,
        soil: 62,
        movement: 4.4,
        tilt: 2.0,

        slope: 29,
        elevation: 790,
        historical: 74
    },

    {
        name: "Guwahati",
        lat: 26.1445,
        lng: 91.7362,

        rainfall: 46,
        soil: 48,
        movement: 2.0,
        tilt: 1.1,

        slope: 18,
        elevation: 55,
        historical: 48
    },

    {
        name: "Gangtok",
        lat: 27.3389,
        lng: 88.6065,

        rainfall: 52,
        soil: 55,
        movement: 2.8,
        tilt: 1.5,

        slope: 27,
        elevation: 1650,
        historical: 56
    },

    {
        name: "Nagaon",
        lat: 26.2006,
        lng: 92.9376,

        rainfall: 29,
        soil: 38,
        movement: 1.0,
        tilt: 0.7,

        slope: 12,
        elevation: 61,
        historical: 28
    }

];


/* ============================================================
   STATE
   ============================================================ */

let selectedZone = zones[0];

let map = null;

let markers = {};

let sensorChart = null;

let sensorTimer = null;

let history = {

    labels: [],
    rainfall: [],
    soil: [],
    movement: []

};


/*
   Used to create smooth, controlled demo changes.
   This is NOT random data.
*/

let demoStep = 0;


/* ============================================================
   HELPERS
   ============================================================ */

function clamp(value, min = 0, max = 100) {

    return Math.max(
        min,
        Math.min(
            max,
            Number(value) || 0
        )
    );

}


/* ============================================================
   RISK CALCULATION
   ============================================================ */

function calculateRisk(zone) {

    const rainfallScore =
        clamp(zone.rainfall);

    const soilScore =
        clamp(zone.soil);

    const movementScore =
        clamp(
            (zone.movement / 8) * 100
        );

    const tiltScore =
        clamp(
            (zone.tilt / 4) * 100
        );

    const slopeScore =
        clamp(
            (zone.slope / 45) * 100
        );

    const historicalScore =
        clamp(zone.historical);


    let score =

        rainfallScore * 0.25 +

        soilScore * 0.18 +

        movementScore * 0.17 +

        tiltScore * 0.10 +

        slopeScore * 0.15 +

        historicalScore * 0.15;


    /*
       Safety override.
    */

    if (
        zone.movement >= 7 ||
        zone.tilt >= 3.8
    ) {

        score =
            Math.max(
                score,
                85
            );

    }


    return Math.round(
        clamp(score)
    );

}


/* ============================================================
   RISK LEVEL
   ============================================================ */

function getRiskLevel(score) {

    if (score < 30)
        return "LOW";

    if (score < 55)
        return "MODERATE";

    if (score < 80)
        return "HIGH";

    return "CRITICAL";

}


/* ============================================================
   STATUS
   ============================================================ */

function getStatus(level) {

    if (
        level === "CRITICAL" ||
        level === "HIGH"
    ) {

        return "UNSAFE";

    }

    if (level === "MODERATE")
        return "WATCH";

    return "SAFE";

}


/* ============================================================
   RISK CSS CLASS
   ============================================================ */

function riskClass(level) {

    return level.toLowerCase();

}


/* ============================================================
   INITIAL RISK SCORES
   ============================================================ */

zones.forEach(zone => {

    zone.score =
        calculateRisk(zone);

});


/* ============================================================
   PAGE TITLES
   ============================================================ */

const pageTitles = {

    dashboard: [
        "Dashboard",
        "AI-based Early Warning & Landslide Risk Monitoring System"
    ],

    map: [
        "Live Zone Map",
        "Interactive geographical risk monitoring"
    ],

    sensors: [
        "Live IoT Sensors",
        "Real-time environmental telemetry"
    ],

    prediction: [
        "AI Prediction",
        "Explainable multi-factor landslide risk prediction"
    ],

    sources: [
        "Data Sources",
        "Environmental and historical monitoring inputs"
    ],

    architecture: [
        "System Architecture",
        "End-to-end monitoring and prediction workflow"
    ],

    feasibility: [
        "Feasibility",
        "Practical implementation of the proposed solution"
    ],

    impact: [
        "Impact",
        "Expected benefits and disaster preparedness outcomes"
    ]

};


/* ============================================================
   NAVIGATION
   ============================================================ */

function openPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.remove("active");

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.classList.remove("active");

        });


    const target =
        document.getElementById(page);

    if (!target)
        return;


    target.classList.add("active");


    const nav =
        document.querySelector(
            `.nav-item[data-page="${page}"]`
        );

    if (nav)
        nav.classList.add("active");


    const title =
        document.getElementById("pageTitle");

    if (
        title &&
        pageTitles[page]
    ) {

        title.textContent =
            pageTitles[page][0];

    }


    const description =
        document.getElementById(
            "pageDescription"
        );

    if (
        description &&
        pageTitles[page]
    ) {

        description.textContent =
            pageTitles[page][1];

    }


    /*
       Leaflet needs this after the map becomes visible.
    */

    if (page === "map") {

        setTimeout(() => {

            if (map)
                map.invalidateSize();

        }, 250);

    }


    /*
       Chart needs updating after the sensor page
       becomes visible.
    */

    if (page === "sensors") {

        setTimeout(() => {

            updateSensorChart();

        }, 250);

    }

}


/* ============================================================
   SIDEBAR NAVIGATION
   ============================================================ */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openPage(
                    button.dataset.page
                );

            }
        );

    });


/* ============================================================
   DATA-OPEN BUTTONS
   ============================================================ */

document
    .querySelectorAll("[data-open]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openPage(
                    button.dataset.open
                );

            }
        );

    });


/* ============================================================
   CLOCK
   ============================================================ */

function updateClock() {

    const clock =
        document.getElementById("clock");

    if (!clock)
        return;


    clock.textContent =
        new Date()
            .toLocaleTimeString();

}


setInterval(
    updateClock,
    1000
);

updateClock();


/* ============================================================
   MAP MARKER
   ============================================================ */

function createMarkerIcon(level) {

    let color =
        "#22c55e";


    if (level === "CRITICAL") {

        color =
            "#dc2626";

    }
    else if (level === "HIGH") {

        color =
            "#ea580c";

    }
    else if (level === "MODERATE") {

        color =
            "#eab308";

    }


    return L.divIcon({

        className: "",

        html: `
            <div style="
                width:22px;
                height:22px;
                border-radius:50%;
                background:${color};
                border:3px solid white;
                box-shadow:0 0 12px ${color};
            "></div>
        `,

        iconSize: [
            22,
            22
        ],

        iconAnchor: [
            11,
            11
        ]

    });

}


/* ============================================================
   INITIALIZE MAP
   ============================================================ */

function initializeMap() {

    const mapElement =
        document.getElementById(
            "riskMap"
        );

    if (!mapElement)
        return;


    map =
        L.map(
            "riskMap"
        ).setView(
            [
                25.8,
                91.9
            ],
            6
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            attribution:
                "&copy; OpenStreetMap contributors"

        }
    ).addTo(map);


    zones.forEach(zone => {

        const level =
            getRiskLevel(
                zone.score
            );


        const marker =
            L.marker(
                [
                    zone.lat,
                    zone.lng
                ],
                {
                    icon:
                        createMarkerIcon(
                            level
                        )
                }
            ).addTo(map);


        marker.bindTooltip(
            `
                <strong>
                    ${zone.name}
                </strong>
                <br>
                ${level} — ${zone.score}/100
            `
        );


        marker.bindPopup(
            `
            <div style="min-width:180px">

                <strong>
                    ${zone.name}
                    Monitoring Zone
                </strong>

                <hr>

                <b>Risk:</b>
                ${level}

                <br>

                <b>Score:</b>
                ${zone.score}/100

                <br>

                <b>Status:</b>
                ${getStatus(level)}

                <br><br>

                <button
                    onclick="selectZone('${zone.name}')"
                    style="
                        padding:6px 10px;
                        cursor:pointer;
                    "
                >
                    Open Zone
                </button>

            </div>
            `
        );


        marker.on(
            "click",
            () => {

                selectZone(
                    zone.name
                );

            }
        );


        markers[
            zone.name
        ] =
            marker;

    });

}


/* ============================================================
   SELECT ZONE
   ============================================================ */

function selectZone(name) {

    const zone =
        zones.find(
            item =>
                item.name === name
        );


    if (!zone)
        return;


    selectedZone =
        zone;


    /*
       Reset graph for newly selected zone.
    */

    initializeHistory();


    updateEverything();


    openPage("map");


    setTimeout(() => {

        if (!map)
            return;


        map.flyTo(
            [
                zone.lat,
                zone.lng
            ],
            12,
            {
                duration:
                    1.2
            }
        );


        if (
            markers[
                zone.name
            ]
        ) {

            markers[
                zone.name
            ].openPopup();

        }

    }, 300);

}


window.selectZone =
    selectZone;


/* ============================================================
   MAP DETAILS
   ============================================================ */

function renderMapDetails() {

    const zone =
        selectedZone;


    const level =
        getRiskLevel(
            zone.score
        );


    const name =
        document.getElementById(
            "selectedZoneName"
        );


    if (name) {

        name.textContent =
            zone.name +
            " Monitoring Zone";

    }


    const riskElement =
        document.getElementById(
            "selectedZoneRisk"
        );


    if (riskElement) {

        riskElement.textContent =
            level;

        riskElement.className =
            "status-pill " +
            riskClass(level);

    }


    const score =
        document.getElementById(
            "selectedScore"
        );


    if (score) {

        score.textContent =
            zone.score;

    }


    const rows = [

        [
            "Current Status",
            getStatus(level)
        ],

        [
            "Rainfall",
            zone.rainfall.toFixed(0) +
            " mm"
        ],

        [
            "Soil Moisture",
            zone.soil.toFixed(0) +
            " %"
        ],

        [
            "Ground Movement",
            zone.movement.toFixed(1) +
            " mm"
        ],

        [
            "Tilt",
            zone.tilt.toFixed(1) +
            "°"
        ],

        [
            "Slope",
            zone.slope +
            "°"
        ],

        [
            "Elevation",
            zone.elevation +
            " m"
        ],

        [
            "Historical Susceptibility",
            zone.historical +
            "/100"
        ],

        [
            "Coordinates",
            zone.lat.toFixed(4) +
            ", " +
            zone.lng.toFixed(4)
        ]

    ];


    const container =
        document.getElementById(
            "zoneInputs"
        );


    if (!container)
        return;


    container.innerHTML =
        rows
            .map(
                row => `

                    <div class="input-row">

                        <span>
                            ${row[0]}
                        </span>

                        <strong>
                            ${row[1]}
                        </strong>

                    </div>

                `
            )
            .join("");

}


/* ============================================================
   ZOOM BUTTON
   ============================================================ */

const zoomButton =
    document.getElementById(
        "zoomZone"
    );


if (zoomButton) {

    zoomButton.addEventListener(
        "click",
        () => {

            if (!map)
                return;


            map.flyTo(
                [
                    selectedZone.lat,
                    selectedZone.lng
                ],
                14,
                {
                    duration:
                        1.2
                }
            );

        }
    );

}


/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {

    const zone =
        selectedZone;


    const level =
        getRiskLevel(
            zone.score
        );


    const rain =
        document.getElementById(
            "dashboardRain"
        );

    if (rain)
        rain.textContent =
            Math.round(
                zone.rainfall
            );


    const soil =
        document.getElementById(
            "dashboardSoil"
        );

    if (soil)
        soil.textContent =
            Math.round(
                zone.soil
            );


    const movement =
        document.getElementById(
            "dashboardMovement"
        );

    if (movement)
        movement.textContent =
            zone.movement.toFixed(1);


    const risk =
        document.getElementById(
            "dashboardRisk"
        );

    if (risk)
        risk.textContent =
            level;


    const score =
        document.getElementById(
            "dashboardScore"
        );

    if (score)
        score.textContent =
            zone.score +
            "/100";


    const dashboardZone =
        document.getElementById(
            "dashboardZone"
        );

    if (dashboardZone)
        dashboardZone.textContent =
            zone.name;


    const circleScore =
        document.getElementById(
            "dashboardCircleScore"
        );

    if (circleScore)
        circleScore.textContent =
            zone.score;


    const status =
        document.getElementById(
            "dashboardStatus"
        );


    if (status) {

        status.textContent =
            level;

        status.className =
            "status-pill " +
            riskClass(level);

    }


    const circle =
        document.getElementById(
            "dashboardCircle"
        );


    if (circle) {

        if (level === "CRITICAL") {

            circle.style.borderColor =
                "#dc2626";

        }
        else if (level === "HIGH") {

            circle.style.borderColor =
                "#ea580c";

        }
        else if (level === "MODERATE") {

            circle.style.borderColor =
                "#eab308";

        }
        else {

            circle.style.borderColor =
                "#22c55e";

        }

    }


    const reason =
        document.getElementById(
            "dashboardReason"
        );


    if (reason)
        reason.textContent =
            generateReason(zone);


    renderZoneList();

}


/* ============================================================
   AI EXPLANATION
   ============================================================ */

function generateReason(zone) {

    const reasons = [];


    if (zone.rainfall >= 70) {

        reasons.push(
            "high rainfall"
        );

    }


    if (zone.soil >= 70) {

        reasons.push(
            "high soil moisture"
        );

    }


    if (zone.movement >= 5) {

        reasons.push(
            "elevated ground movement"
        );

    }


    if (zone.tilt >= 2.5) {

        reasons.push(
            "abnormal ground tilt"
        );

    }


    if (zone.slope >= 30) {

        reasons.push(
            "steep slope"
        );

    }


    if (reasons.length === 0) {

        return (
            "Environmental conditions are currently within monitored limits."
        );

    }


    return (
        reasons.join(", ") +
        " detected."
    );

}


/* ============================================================
   DASHBOARD ZONE LIST
   ============================================================ */

function renderZoneList() {

    const container =
        document.getElementById(
            "dashboardZones"
        );


    if (!container)
        return;


    container.innerHTML =
        zones
            .slice()
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            )
            .map(
                zone => {

                    const level =
                        getRiskLevel(
                            zone.score
                        );


                    return `

                        <div
                            class="zone-row"
                            onclick="
                                selectZone(
                                    '${zone.name}'
                                )
                            "
                        >

                            <div class="zone-name">

                                <strong>
                                    ${zone.name}
                                </strong>

                                <small>
                                    ${getStatus(level)}
                                </small>

                            </div>

                            <span
                                class="
                                    status-pill
                                    ${riskClass(level)}
                                "
                            >
                                ${level}
                                ·
                                ${zone.score}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   SENSOR DISPLAY
   ============================================================ */

function updateSensors() {

    const zone =
        selectedZone;


    const rain =
        document.getElementById(
            "sensorRain"
        );

    if (rain)
        rain.textContent =
            zone.rainfall.toFixed(0);


    const soil =
        document.getElementById(
            "sensorSoil"
        );

    if (soil)
        soil.textContent =
            zone.soil.toFixed(0);


    const movement =
        document.getElementById(
            "sensorMovement"
        );

    if (movement)
        movement.textContent =
            zone.movement.toFixed(1);


    const tilt =
        document.getElementById(
            "sensorTilt"
        );

    if (tilt)
        tilt.textContent =
            zone.tilt.toFixed(1);


    const rainBar =
        document.getElementById(
            "rainBar"
        );

    if (rainBar)
        rainBar.style.width =
            clamp(
                zone.rainfall
            ) +
            "%";


    const soilBar =
        document.getElementById(
            "soilBar"
        );

    if (soilBar)
        soilBar.style.width =
            clamp(
                zone.soil
            ) +
            "%";


    const movementBar =
        document.getElementById(
            "movementBar"
        );

    if (movementBar)
        movementBar.style.width =
            clamp(
                (zone.movement / 8) *
                100
            ) +
            "%";


    const tiltBar =
        document.getElementById(
            "tiltBar"
        );

    if (tiltBar)
        tiltBar.style.width =
            clamp(
                (zone.tilt / 4) *
                100
            ) +
            "%";


    const update =
        document.getElementById(
            "sensorUpdate"
        );


    if (update) {

        update.textContent =
            new Date()
                .toLocaleTimeString();

    }


    /*
       Update individual sensor connection labels.
    */

    updateConnectionStatus();

}


/* ============================================================
   SENSOR CONNECTION STATUS
   ============================================================ */

function updateConnectionStatus(
    connected = true
) {

    const status =
        document.getElementById(
            "sensorConnectionStatus"
        );


    if (!status)
        return;


    if (connected) {

        status.textContent =
            "CONNECTED";

        status.style.color =
            "#16a34a";

    }
    else {

        status.textContent =
            "OFFLINE";

        status.style.color =
            "#dc2626";

    }

}


/* ============================================================
   FUNCTIONAL DEMO SENSOR ENGINE
   ============================================================ */

/*
   This creates controlled sensor movement.

   IMPORTANT:

   This is intentionally NOT Math.random().

   The values follow a predictable environmental pattern
   so the graph visibly changes during your presentation.
*/

function generateDemoSensorData() {

    demoStep++;


    /*
       Smooth wave values.
    */

    const rainfallChange =
        Math.sin(
            demoStep / 2
        ) * 3;


    const soilChange =
        Math.sin(
            demoStep / 3
        ) * 1.5;


    const movementChange =
        Math.sin(
            demoStep / 2.5
        ) * 0.20;


    const tiltChange =
        Math.sin(
            demoStep / 2.8
        ) * 0.06;


    selectedZone.rainfall =
        clamp(
            selectedZone.rainfall +
            rainfallChange,
            5,
            110
        );


    selectedZone.soil =
        clamp(
            selectedZone.soil +
            soilChange,
            10,
            98
        );


    selectedZone.movement =
        clamp(
            selectedZone.movement +
            movementChange,
            0.1,
            9
        );


    selectedZone.tilt =
        clamp(
            selectedZone.tilt +
            tiltChange,
            0.1,
            4.5
        );


    /*
       Recalculate AI risk.
    */

    selectedZone.score =
        calculateRisk(
            selectedZone
        );


    /*
       Add new graph reading.
    */

    addHistoryReading();


    /*
       Update entire application.
    */

    updateEverything();


    /*
       Update graph immediately.
    */

    updateSensorChart();


    /*
       Connected because demo engine is active.
    */

    updateConnectionStatus(true);

}


/* ============================================================
   ADD GRAPH READING
   ============================================================ */

function addHistoryReading() {

    history.labels.push(
        new Date()
            .toLocaleTimeString()
    );


    history.rainfall.push(
        selectedZone.rainfall
    );


    history.soil.push(
        selectedZone.soil
    );


    history.movement.push(
        selectedZone.movement
    );


    /*
       Keep only latest 15 readings.
    */

    while (
        history.labels.length > 15
    ) {

        history.labels.shift();

        history.rainfall.shift();

        history.soil.shift();

        history.movement.shift();

    }

}


/* ============================================================
   REAL SENSOR API
   ============================================================ */

async function fetchRealSensorUpdate() {

    try {

        const response =
            await fetch(
                SENSOR_API_URL,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    },

                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Sensor API returned HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        /*
           Validate API response.
        */

        if (
            typeof data.rainfall !== "number" ||
            typeof data.soil !== "number" ||
            typeof data.movement !== "number" ||
            typeof data.tilt !== "number"
        ) {

            throw new Error(
                "Invalid sensor data format"
            );

        }


        /*
           Update selected zone.
        */

        selectedZone.rainfall =
            clamp(
                data.rainfall,
                0,
                110
            );


        selectedZone.soil =
            clamp(
                data.soil,
                0,
                100
            );


        selectedZone.movement =
            clamp(
                data.movement,
                0,
                9
            );


        selectedZone.tilt =
            clamp(
                data.tilt,
                0,
                4.5
            );


        /*
           Recalculate risk.
        */

        selectedZone.score =
            calculateRisk(
                selectedZone
            );


        /*
           Add graph reading.
        */

        addHistoryReading();


        /*
           Refresh interface.
        */

        updateEverything();

        updateSensorChart();

        updateConnectionStatus(true);

    }
    catch (error) {

        console.error(
            "Real sensor API error:",
            error
        );

        updateConnectionStatus(false);

    }

}


/* ============================================================
   SENSOR UPDATE CONTROLLER
   ============================================================ */

async function updateSensorData() {

    if (DEMO_MODE) {

        /*
           Functional demo mode.
        */

        generateDemoSensorData();

    }
    else {

        /*
           Real IoT backend mode.
        */

        await fetchRealSensorUpdate();

    }

}


/* ============================================================
   REFRESH SENSOR BUTTON
   ============================================================ */

const refreshButton =
    document.getElementById(
        "refreshSensors"
    );


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        () => {

            updateSensorData();

        }
    );

}


/* ============================================================
   START LIVE SENSOR MONITORING
   ============================================================ */

function startSensorPolling() {

    if (sensorTimer) {

        clearInterval(
            sensorTimer
        );

    }


    /*
       Update every 5 seconds.
    */

    sensorTimer =
        setInterval(
            updateSensorData,
            5000
        );

}


/* ============================================================
   SENSOR CHART
   ============================================================ */

function initializeSensorChart() {

    const canvas =
        document.getElementById(
            "sensorChart"
        );


    if (!canvas)
        return;


    /*
       Destroy existing chart.
    */

    if (sensorChart) {

        sensorChart.destroy();

        sensorChart = null;

    }


    sensorChart =
        new Chart(
            canvas,
            {

                type:
                    "line",


                data: {

                    labels:
                        history.labels,


                    datasets: [

                        {

                            label:
                                "Rainfall",

                            data:
                                history.rainfall,

                            borderColor:
                                "#0891b2",

                            backgroundColor:
                                "rgba(8,145,178,.08)",

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            fill:
                                true,

                            pointRadius:
                                2,

                            pointHoverRadius:
                                5

                        },


                        {

                            label:
                                "Soil Moisture",

                            data:
                                history.soil,

                            borderColor:
                                "#7c3aed",

                            backgroundColor:
                                "rgba(124,58,237,.06)",

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            fill:
                                true,

                            pointRadius:
                                2,

                            pointHoverRadius:
                                5

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    animation:
                        false,

                    resizeDelay:
                        100,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    plugins: {

                        legend: {

                            display:
                                true,

                            position:
                                "top",

                            labels: {

                                boxWidth:
                                    30,

                                padding:
                                    10,

                                font: {

                                    size:
                                        11

                                }

                            }

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                maxTicksLimit:
                                    8,

                                autoSkip:
                                    true

                            }

                        },


                        y: {

                            beginAtZero:
                                true,

                            max:
                                100,

                            ticks: {

                                stepSize:
                                    20

                            }

                        }

                    }

                }

            }
        );

}


/* ============================================================
   UPDATE SENSOR CHART
   ============================================================ */

function updateSensorChart() {

    if (!sensorChart)
        return;


    sensorChart.data.labels =
        history.labels;


    sensorChart.data.datasets[0].data =
        history.rainfall;


    sensorChart.data.datasets[1].data =
        history.soil;


    sensorChart.update(
        "none"
    );

}


/* ============================================================
   AI PREDICTION
   ============================================================ */

function renderAI() {

    const zone =
        selectedZone;


    const level =
        getRiskLevel(
            zone.score
        );


    const aiScore =
        document.getElementById(
            "aiScore"
        );


    if (aiScore)
        aiScore.textContent =
            zone.score;


    const levelElement =
        document.getElementById(
            "aiLevel"
        );


    if (levelElement) {

        levelElement.textContent =
            level +
            " RISK";


        levelElement.className =
            "prediction-level " +
            riskClass(level);

    }


    const aiMessage =
        document.getElementById(
            "aiMessage"
        );


    if (aiMessage)
        aiMessage.textContent =
            generateReason(zone);


    const factors = [

        {
            name:
                "Rainfall",

            value:
                zone.rainfall,

            weight:
                25
        },


        {
            name:
                "Soil Condition",

            value:
                zone.soil,

            weight:
                18
        },


        {
            name:
                "Ground Movement",

            value:
                (zone.movement / 8) *
                100,

            weight:
                17
        },


        {
            name:
                "Tilt",

            value:
                (zone.tilt / 4) *
                100,

            weight:
                10
        },


        {
            name:
                "Slope",

            value:
                (zone.slope / 45) *
                100,

            weight:
                15
        },


        {
            name:
                "Historical Risk",

            value:
                zone.historical,

            weight:
                15
        }

    ];


    const riskFactors =
        document.getElementById(
            "riskFactors"
        );


    if (!riskFactors)
        return;


    riskFactors.innerHTML =
        factors
            .map(
                factor => `

                    <div class="factor">

                        <div class="factor-head">

                            <span>
                                ${factor.name}
                            </span>

                            <strong>
                                ${Math.round(
                                    factor.value
                                )}%
                            </strong>

                        </div>


                        <div class="factor-bar">

                            <i
                                style="
                                    width:${clamp(
                                        factor.value
                                    )}%
                                "
                            ></i>

                        </div>


                        <small>
                            Model weight:
                            ${factor.weight}%
                        </small>

                    </div>

                `
            )
            .join("");

}


/* ============================================================
   UPDATE EVERYTHING
   ============================================================ */

function updateEverything() {

    renderDashboard();

    renderMapDetails();

    updateSensors();

    renderAI();

}


/* ============================================================
   INITIAL GRAPH HISTORY
   ============================================================ */

function initializeHistory() {

    history.labels = [];

    history.rainfall = [];

    history.soil = [];

    history.movement = [];


    /*
       Create a short historical baseline.

       These are only initial display values.
       After this, actual demo updates are added every 5 sec.
    */

    for (
        let i = 10;
        i >= 0;
        i--
    ) {

        const timestamp =
            new Date(
                Date.now() -
                i * 5000
            );


        history.labels.push(
            timestamp.toLocaleTimeString()
        );


        /*
           Slight historical variation so the graph
           doesn't begin as a completely flat line.
        */

        const rainfall =
            clamp(
                selectedZone.rainfall +
                Math.sin(i / 2) * 2
            );


        const soil =
            clamp(
                selectedZone.soil +
                Math.sin(i / 3) * 1
            );


        const movement =
            clamp(
                selectedZone.movement +
                Math.sin(i / 2) * 0.1
            );


        history.rainfall.push(
            rainfall
        );


        history.soil.push(
            soil
        );


        history.movement.push(
            movement
        );

    }

}


/* ============================================================
   INITIALIZATION
   ============================================================ */

function initializeApplication() {

    /*
       Calculate initial risk.
    */

    zones.forEach(zone => {

        zone.score =
            calculateRisk(zone);

    });


    /*
       Prepare graph data.
    */

    initializeHistory();


    /*
       Initialize map.
    */

    initializeMap();


    /*
       Initialize graph.
    */

    initializeSensorChart();


    /*
       Render application.
    */

    updateEverything();


    /*
       Start live monitoring.
    */

    startSensorPolling();


    /*
       Initial connection state.
    */

    if (DEMO_MODE) {

        updateConnectionStatus(
            true
        );

    }

}


/* ============================================================
   START APPLICATION
   ============================================================ */

initializeApplication();


/* ============================================================
   PUBLIC API
   ============================================================ */

window.GeoLandslide = {

    selectZone:

        selectZone,


    refresh:

        updateSensorData,


    getSelectedZone:

        () => selectedZone,


    getAllZones:

        () => zones,


    calculateRisk:

        calculateRisk,


    getRiskLevel:

        getRiskLevel,


    fetchSensorUpdate:

        updateSensorData

};